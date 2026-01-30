import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decrypt, encrypt } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduledCleanup {
  id: string;
  user_id: string;
  frequency: string;
  auto_approve: boolean;
  is_active: boolean;
  next_run_at: string;
}

interface Profile {
  gmail_access_token: string;
  gmail_refresh_token: string;
  gmail_token_expires_at: string;
}

async function refreshAccessToken(
  supabase: any,
  userId: string,
  encryptedRefreshToken: string
): Promise<string | null> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

  const refreshToken = await decrypt(encryptedRefreshToken);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const tokens = await response.json();
  if (!response.ok) {
    console.error('Token refresh failed:', tokens);
    return null;
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  const encryptedAccessToken = await encrypt(tokens.access_token);

  await supabase.from('profiles').update({
    gmail_access_token: encryptedAccessToken,
    gmail_token_expires_at: expiresAt,
  }).eq('user_id', userId);

  return tokens.access_token;
}

async function getValidAccessToken(supabase: any, userId: string): Promise<string | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('gmail_access_token, gmail_refresh_token, gmail_token_expires_at')
    .eq('user_id', userId)
    .single();

  if (!profile?.gmail_access_token) {
    return null;
  }

  const expiresAt = new Date(profile.gmail_token_expires_at);
  if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    if (profile.gmail_refresh_token) {
      return await refreshAccessToken(supabase, userId, profile.gmail_refresh_token);
    }
    return null;
  }

  try {
    return await decrypt(profile.gmail_access_token);
  } catch (error) {
    console.error('Failed to decrypt access token:', error);
    return null;
  }
}

async function fetchMessagesFromLabel(
  accessToken: string,
  labelId: 'SPAM' | 'TRASH',
): Promise<Array<{ id: string }>> {
  const allMessages: Array<{ id: string }> = [];
  let pageToken: string | null = null;

  do {
    const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
    url.searchParams.set('labelIds', labelId);
    url.searchParams.set('maxResults', '100');
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const response = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${labelId} messages:`, await response.json());
      break;
    }

    const data = await response.json();
    const messages = (data.messages || []).map((m: any) => ({ id: m.id }));
    allMessages.push(...messages);
    pageToken = data.nextPageToken || null;
  } while (pageToken && allMessages.length < 500); // Limit to 500 per run

  return allMessages;
}

async function deleteEmailFromGmail(accessToken: string, emailId: string): Promise<boolean> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    console.error('Gmail delete error for', emailId);
    return false;
  }
  return true;
}

function calculateNextRun(frequency: string): string {
  const now = new Date();
  switch (frequency) {
    case 'daily':
      now.setDate(now.getDate() + 1);
      break;
    case 'weekly':
      now.setDate(now.getDate() + 7);
      break;
    case 'monthly':
      now.setMonth(now.getMonth() + 1);
      break;
  }
  return now.toISOString();
}

async function processUserCleanup(
  supabase: any,
  schedule: ScheduledCleanup
): Promise<{ processed: number; deleted: number }> {
  console.log(`Processing scheduled cleanup for user ${schedule.user_id}`);

  const accessToken = await getValidAccessToken(supabase, schedule.user_id);
  if (!accessToken) {
    console.log(`User ${schedule.user_id} has no valid Gmail token, skipping`);
    return { processed: 0, deleted: 0 };
  }

  const [spamMessages, trashMessages] = await Promise.all([
    fetchMessagesFromLabel(accessToken, 'SPAM'),
    fetchMessagesFromLabel(accessToken, 'TRASH'),
  ]);

  const allMessageIds = [...spamMessages, ...trashMessages]
    .map((m) => m.id)
    .filter((id, idx, arr) => arr.indexOf(id) === idx);

  console.log(
    `Found ${spamMessages.length} spam + ${trashMessages.length} trash (${allMessageIds.length} unique) for user ${schedule.user_id}`
  );

  let deleted = 0;

  if (schedule.auto_approve) {
    // Auto-delete spam + trash messages permanently
    for (const emailId of allMessageIds) {
      const success = await deleteEmailFromGmail(accessToken, emailId);
      if (success) {
        deleted++;
        // Log to cleanup history
        await supabase.from('cleanup_history').insert({
          user_id: schedule.user_id,
          email_id: emailId,
          unsubscribe_method: 'scheduled_auto',
          unsubscribe_status: 'success',
          deleted: true,
        });
      }
    }
    console.log(`Deleted ${deleted} spam/trash emails for user ${schedule.user_id}`);
  } else {
    console.log(`User ${schedule.user_id} has auto_approve disabled, skipping deletion`);
  }

  // Update schedule timestamps
  await supabase.from('scheduled_cleanup').update({
    last_run_at: new Date().toISOString(),
    next_run_at: calculateNextRun(schedule.frequency),
  }).eq('id', schedule.id);

  return { processed: allMessageIds.length, deleted };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find all active schedules that are due
    const now = new Date().toISOString();
    const { data: dueSchedules, error } = await supabase
      .from('scheduled_cleanup')
      .select('*')
      .eq('is_active', true)
      .lte('next_run_at', now);

    if (error) {
      console.error('Error fetching due schedules:', error);
      throw error;
    }

    console.log(`Found ${dueSchedules?.length || 0} schedules due for processing`);

    const results = [];
    for (const schedule of dueSchedules || []) {
      try {
        const result = await processUserCleanup(supabase, schedule);
        results.push({
          user_id: schedule.user_id,
          ...result,
          success: true,
        });
      } catch (err) {
        console.error(`Error processing user ${schedule.user_id}:`, err);
        results.push({
          user_id: schedule.user_id,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    console.log('Scheduled cleanup completed:', JSON.stringify(results));

    return new Response(JSON.stringify({
      processed: results.length,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Scheduled cleanup error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
