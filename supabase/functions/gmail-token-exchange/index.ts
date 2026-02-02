import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encrypt } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Allowlist of valid redirect URIs for OAuth flow
const ALLOWED_REDIRECT_URI_PATTERNS = [
  /^http:\/\/localhost:\d+\/gmail\/callback$/,
  /^https:\/\/[a-zA-Z0-9-]+\.lovable\.app\/gmail\/callback$/,
  /^https:\/\/[a-zA-Z0-9-]+-preview--[a-zA-Z0-9-]+\.lovable\.app\/gmail\/callback$/,
  /^https:\/\/[a-zA-Z0-9-]+\.lovableproject\.com\/gmail\/callback$/,
  /^https:\/\/(www\.)?spamslayer\.info\/gmail\/callback$/,
];

function isValidRedirectUri(uri: string): boolean {
  try {
    const url = new URL(uri);
    return ALLOWED_REDIRECT_URI_PATTERNS.some(pattern => pattern.test(uri));
  } catch {
    return false;
  }
}

async function getGmailEmail(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.emailAddress || null;
  } catch {
    return null;
  }
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

    const { code, redirectUri } = await req.json();
    if (!code || !redirectUri) {
      return new Response(JSON.stringify({ error: 'Missing code or redirectUri' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!isValidRedirectUri(redirectUri)) {
      return new Response(JSON.stringify({ error: 'Invalid redirect URI' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
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

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();
    console.log('Token exchange response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokens);
      return new Response(JSON.stringify({
        error: 'Token exchange failed',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the Gmail email address for this account
    const gmailEmail = await getGmailEmail(tokens.access_token);
    if (!gmailEmail) {
      console.error('Failed to get Gmail email address');
      return new Response(JSON.stringify({ error: 'Failed to get Gmail profile' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 0) * 1000).toISOString();

    // Encrypt tokens before storing
    const encryptedAccessToken = await encrypt(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token 
      ? await encrypt(tokens.refresh_token) 
      : undefined;

    // Check if this account already exists for this user
    const { data: existingAccount } = await supabase
      .from('gmail_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('gmail_email', gmailEmail)
      .single();

    // Check if user has any connected accounts (for setting is_primary)
    const { data: existingAccounts } = await supabase
      .from('gmail_accounts')
      .select('id')
      .eq('user_id', user.id)
      .not('gmail_access_token', 'is', null);

    const isFirstAccount = !existingAccounts || existingAccounts.length === 0;

    if (existingAccount) {
      // Update existing account
      const { error: updateError } = await supabase
        .from('gmail_accounts')
        .update({
          gmail_access_token: encryptedAccessToken,
          gmail_refresh_token: encryptedRefreshToken || undefined,
          gmail_token_expires_at: expiresAt,
        })
        .eq('id', existingAccount.id);

      if (updateError) {
        console.error('Failed to update tokens:', updateError);
        return new Response(JSON.stringify({ error: 'Failed to store tokens' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      // Insert new account
      const { error: insertError } = await supabase
        .from('gmail_accounts')
        .insert({
          user_id: user.id,
          gmail_email: gmailEmail,
          gmail_access_token: encryptedAccessToken,
          gmail_refresh_token: encryptedRefreshToken,
          gmail_token_expires_at: expiresAt,
          is_primary: isFirstAccount,
        });

      if (insertError) {
        console.error('Failed to insert tokens:', insertError);
        return new Response(JSON.stringify({ error: 'Failed to store tokens' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log(`Gmail account ${gmailEmail} connected successfully`);

    return new Response(JSON.stringify({ success: true, email: gmailEmail }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Token exchange error:', error);
    return new Response(JSON.stringify({
      error: 'An error occurred',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
