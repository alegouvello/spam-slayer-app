import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function refreshAccessToken(supabase: any, userId: string, refreshToken: string): Promise<string | null> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

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
  await supabase.from('profiles').update({
    gmail_access_token: tokens.access_token,
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

  return profile.gmail_access_token;
}

function parseListUnsubscribe(header: string | null): { hasHeader: boolean; link: string | null } {
  if (!header) return { hasHeader: false, link: null };
  
  // Extract mailto: or https: links from List-Unsubscribe header
  const httpsMatch = header.match(/<(https?:\/\/[^>]+)>/);
  const mailtoMatch = header.match(/<mailto:([^>]+)>/);
  
  return {
    hasHeader: true,
    link: httpsMatch?.[1] || null,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action } = await req.json();
    console.log(`Processing action: ${action} for user: ${user.id}`);

    if (action === 'check_connection') {
      const accessToken = await getValidAccessToken(supabase, user.id);
      return new Response(JSON.stringify({ connected: !!accessToken }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'scan') {
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

      // Fetch spam folder messages
      const listResponse = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=SPAM&maxResults=50',
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      if (!listResponse.ok) {
        const error = await listResponse.json();
        console.error('Gmail API list error:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch emails' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const listData = await listResponse.json();
      const messages = listData.messages || [];
      console.log(`Found ${messages.length} messages in spam folder`);

      // Fetch full message details for each
      const emails = await Promise.all(
        messages.slice(0, 30).map(async (msg: { id: string }) => {
          const msgResponse = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
            {
              headers: { 'Authorization': `Bearer ${accessToken}` },
            }
          );

          if (!msgResponse.ok) return null;

          const msgData = await msgResponse.json();
          const headers = msgData.payload?.headers || [];
          
          const getHeader = (name: string) => 
            headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value;

          const fromHeader = getHeader('From') || '';
          const senderMatch = fromHeader.match(/^([^<]+)?<?([^>]+@[^>]+)>?$/);
          const senderName = senderMatch?.[1]?.trim() || senderMatch?.[2] || fromHeader;
          const senderEmail = senderMatch?.[2] || fromHeader;

          const listUnsubscribe = getHeader('List-Unsubscribe');
          const { hasHeader, link } = parseListUnsubscribe(listUnsubscribe);

          // Try to find unsubscribe link in body if no header
          let unsubscribeLink = link;
          if (!unsubscribeLink && msgData.payload?.body?.data) {
            const body = atob(msgData.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
            const linkMatch = body.match(/https?:\/\/[^\s"<>]+unsubscribe[^\s"<>]*/i);
            unsubscribeLink = linkMatch?.[0] || null;
          }

          return {
            id: msg.id,
            sender: senderName,
            senderEmail: senderEmail,
            subject: getHeader('Subject') || '(No subject)',
            snippet: msgData.snippet || '',
            date: new Date(parseInt(msgData.internalDate)).toISOString(),
            hasListUnsubscribe: hasHeader,
            unsubscribeLink: unsubscribeLink,
          };
        })
      );

      const validEmails = emails.filter(Boolean);
      console.log(`Returning ${validEmails.length} emails with details`);

      return new Response(JSON.stringify({ emails: validEmails }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Gmail scan error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
