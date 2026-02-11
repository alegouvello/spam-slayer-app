import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getValidAccessToken } from "../_shared/gmail-tokens.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type GmailDeleteResult =
  | { ok: true }
  | {
      ok: false;
      status: number;
      code?: number;
      reason?: string;
      message?: string;
    };

async function trashEmail(accessToken: string, emailId: string): Promise<GmailDeleteResult> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailId}/trash`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (response.ok) {
    console.log(`Successfully trashed email ${emailId}`);
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
    
    // Try to get user from token - handle both HS256 and ES256 JWTs
    let user = null;
    
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    
    if (!authError && userData?.user) {
      user = userData.user;
    } else {
      // For ES256 tokens (Lovable Cloud OAuth), decode and verify via admin API
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          const userId = payload.sub;
          
          if (userId) {
            const { data: authUser } = await supabase.auth.admin.getUserById(userId);
            if (authUser?.user) {
              user = authUser.user;
            }
          }
        }
      } catch (decodeError) {
        console.error('Token decode error:', decodeError);
      }
    }
    
    if (!user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { emailId, method, sender, subject, spamConfidence, aiReasoning, accountId } = await req.json();
    console.log(`Processing unsubscribe using method: ${method}`);

    // Get valid Gmail access token for the specified account
    const tokenResult = await getValidAccessToken(supabase, user.id, accountId);
    if (!tokenResult) {
      return new Response(JSON.stringify({ 
        error: 'Gmail not connected',
        needsAuth: true 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { accessToken } = tokenResult;

    if (method === 'header') {
      console.log(`Auto-unsubscribe processed for email ${emailId}`);
      
      const deleteResult = await trashEmail(accessToken, emailId);
      const deleted = deleteResult.ok;
      
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
      console.log(`Trash processed for email ${emailId}`);
      
      const deleteResult = await trashEmail(accessToken, emailId);
      const deleted = deleteResult.ok;
      
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
