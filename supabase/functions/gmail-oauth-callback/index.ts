import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // Contains user_id

    if (!code || !state) {
      console.error('Missing code or state parameter');
      return new Response('Missing authorization code or state', { status: 400 });
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${supabaseUrl}/functions/v1/gmail-oauth-callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();
    console.log('Token exchange response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokens);
      return new Response(`Token exchange failed: ${tokens.error_description || tokens.error}`, { status: 400 });
    }

    // Store tokens in profiles table
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        gmail_access_token: tokens.access_token,
        gmail_refresh_token: tokens.refresh_token,
        gmail_token_expires_at: expiresAt,
      })
      .eq('user_id', state);

    if (updateError) {
      console.error('Failed to store tokens:', updateError);
      return new Response('Failed to store tokens', { status: 500 });
    }

    console.log('Gmail tokens stored successfully for user:', state);

    // Redirect back to the app
    const appUrl = Deno.env.get('APP_URL') || 'https://id-preview--fb0c5dde-e9e5-4ac9-b436-4b754d555bce.lovable.app';
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${appUrl}?gmail_connected=true`,
      },
    });

  } catch (error) {
    console.error('OAuth callback error:', error);
    return new Response(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
  }
});
