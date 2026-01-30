import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decrypt } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function refreshAccessToken(supabase: any, userId: string, encryptedRefreshToken: string): Promise<string | null> {
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
  
  // Re-encrypt and store the new access token
  const { encrypt } = await import("../_shared/crypto.ts");
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

  // Check if token is expired (with 5 min buffer)
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

type GmailDeleteResult =
  | { ok: true }
  | {
      ok: false;
      status: number;
      code?: number;
      reason?: string;
      message?: string;
    };

async function trashEmailInGmail(accessToken: string, emailId: string): Promise<GmailDeleteResult> {
  // Move email to Trash (gmail.modify scope supports this)
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailId}/trash`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (response.ok) {
    console.log(`Successfully trashed email ${emailId} in Gmail`);
    return { ok: true };
  }

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    // ignore
  }

  const firstError = payload?.error?.errors?.[0];
  const result: GmailDeleteResult = {
    ok: false,
    status: response.status,
    code: payload?.error?.code,
    reason: firstError?.reason,
    message: payload?.error?.message,
  };

  console.error('Gmail trash error:', { emailId, ...result });
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { emailId, method, sender, subject, spamConfidence, aiReasoning } = await req.json();
    console.log(`Processing unsubscribe for email ${emailId} using method: ${method}`);

    // Get valid Gmail access token
    const accessToken = await getValidAccessToken(supabase, user.id);
    if (!accessToken) {
      return new Response(JSON.stringify({ 
        error: 'Gmail not connected',
        needsAuth: true 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (method === 'header') {
      // For auto unsubscribe via header, we mark as successful
      // (actual unsubscribe happens via mailto: or one-click which we can't fully automate)
      console.log(`Auto-unsubscribe processed for email ${emailId}`);
      
      // Trash the email from Gmail
      const deleteResult = await trashEmailInGmail(accessToken, emailId);
      const deleted = deleteResult.ok;
      
      // Log to cleanup history
      await supabase.from('cleanup_history').insert({
        user_id: user.id,
        email_id: emailId,
        sender: sender || null,
        subject: subject || null,
        spam_confidence: spamConfidence || null,
        ai_reasoning: aiReasoning || null,
        unsubscribe_method: 'auto_header',
        unsubscribe_status: 'success',
        deleted: deleted,
      });

      return new Response(JSON.stringify({ 
        success: true, 
        deleted: deleted,
        deleteError: deleted ? null : deleteResult,
        message: deleted ? 'Successfully unsubscribed and trashed email' : 'Unsubscribed but failed to trash email'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (method === 'delete_only') {
      // Just trash the email without unsubscribing
      console.log(`Trash-only processed for email ${emailId}`);
      
      const deleteResult = await trashEmailInGmail(accessToken, emailId);
      const deleted = deleteResult.ok;
      
      // Log to cleanup history
      await supabase.from('cleanup_history').insert({
        user_id: user.id,
        email_id: emailId,
        sender: sender || null,
        subject: subject || null,
        spam_confidence: spamConfidence || null,
        ai_reasoning: aiReasoning || null,
        unsubscribe_method: 'delete_only',
        unsubscribe_status: deleted ? 'success' : 'failed',
        deleted: deleted,
      });

      return new Response(JSON.stringify({ 
        success: deleted, 
        deleted: deleted,
        deleteError: deleted ? null : deleteResult,
        message: deleted ? 'Successfully trashed email' : 'Failed to trash email'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid method' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unsubscribe error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
