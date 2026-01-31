import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getValidAccessTokensForAllAccounts } from "../_shared/gmail-tokens.ts";

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
  } while (pageToken && allMessages.length < 500);

  return allMessages;
}

async function deleteEmailPermanently(accessToken: string, emailId: string): Promise<{ success: boolean; notFound: boolean }> {
  try {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    // 204 = success, 404 = email no longer exists (already deleted by Gmail)
    if (response.status === 204 || response.status === 200) {
      console.log(`Successfully deleted email ${emailId}`);
      return { success: true, notFound: false };
    }
    
    if (response.status === 404) {
      console.log(`Email ${emailId} not found (already deleted by Gmail)`);
      return { success: false, notFound: true };
    }

    const errorData = await response.json().catch(() => ({}));
    console.error(`Gmail delete error for ${emailId}: status=${response.status}`, errorData);
    return { success: false, notFound: false };
  } catch (error) {
    console.error(`Exception deleting email ${emailId}:`, error);
    return { success: false, notFound: false };
  }
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
  console.log('Processing scheduled cleanup');

  // Get all connected accounts for this user
  const tokenResults = await getValidAccessTokensForAllAccounts(supabase, schedule.user_id);
  if (tokenResults.length === 0) {
    console.log('User has no valid Gmail tokens, skipping');
    return { processed: 0, deleted: 0 };
  }

  // Get emails that were previously flagged as spam by the app but not yet deleted
  const { data: flaggedEmails, error: historyError } = await supabase
    .from('cleanup_history')
    .select('email_id')
    .eq('user_id', schedule.user_id)
    .eq('deleted', false)
    .in('spam_confidence', ['definitely_spam', 'likely_spam']);

  if (historyError) {
    console.error('Error fetching flagged emails:', historyError);
    return { processed: 0, deleted: 0 };
  }

  const emailIdsToDelete = (flaggedEmails || []).map((e: any) => e.email_id);
  console.log(`Found ${emailIdsToDelete.length} flagged spam emails to delete`);

  if (emailIdsToDelete.length === 0) {
    // Also fetch current spam folder for new spam from all accounts
    let totalSpam = 0;
    for (const { accessToken } of tokenResults) {
      const spamMessages = await fetchMessagesFromLabel(accessToken, 'SPAM');
      totalSpam += spamMessages.length;
    }
    console.log(`Found ${totalSpam} new spam messages across all accounts`);
    
    await supabase.from('scheduled_cleanup').update({
      last_run_at: new Date().toISOString(),
      next_run_at: calculateNextRun(schedule.frequency),
    }).eq('id', schedule.id);
    
    return { processed: totalSpam, deleted: 0 };
  }

  let deleted = 0;
  let alreadyGone = 0;
  let failed = 0;

  if (schedule.auto_approve) {
    console.log(`Starting deletion of ${emailIdsToDelete.length} emails with auto_approve enabled`);
    
    // Try to delete from each connected account
    for (const emailId of emailIdsToDelete) {
      let handled = false;
      
      for (const { accessToken } of tokenResults) {
        const result = await deleteEmailPermanently(accessToken, emailId);
        
        if (result.success) {
          deleted++;
          handled = true;
          await supabase.from('cleanup_history')
            .update({ deleted: true })
            .eq('user_id', schedule.user_id)
            .eq('email_id', emailId);
          break;
        } else if (result.notFound) {
          // Email was already deleted by Gmail - mark as deleted in our records too
          alreadyGone++;
          handled = true;
          await supabase.from('cleanup_history')
            .update({ deleted: true })
            .eq('user_id', schedule.user_id)
            .eq('email_id', emailId);
          break;
        }
      }
      
      if (!handled) {
        failed++;
      }
    }
    console.log(`Cleanup complete: ${deleted} deleted, ${alreadyGone} already gone, ${failed} failed`);
  } else {
    console.log('User has auto_approve disabled, skipping deletion');
  }

  await supabase.from('scheduled_cleanup').update({
    last_run_at: new Date().toISOString(),
    next_run_at: calculateNextRun(schedule.frequency),
  }).eq('id', schedule.id);

  return { processed: emailIdsToDelete.length, deleted };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
          ...result,
          success: true,
        });
      } catch (err) {
        console.error('Error processing scheduled cleanup:', err);
        results.push({
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
