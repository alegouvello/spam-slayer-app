import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
];

function isValidRedirectUri(uri: string): boolean {
  try {
    const url = new URL(uri);
    return ALLOWED_REDIRECT_URI_PATTERNS.some(pattern => pattern.test(uri));
  } catch {
    return false;
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

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!;

    // Redirect back to the web app (NOT to a backend URL) to avoid Google OAuth domain restrictions.
    const { redirectUri } = await req.json().catch(() => ({}));
    if (!redirectUri) {
      return new Response(JSON.stringify({ error: 'Missing redirectUri' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate redirectUri against allowlist
    if (!isValidRedirectUri(redirectUri)) {
      return new Response(JSON.stringify({ error: 'Invalid redirect URI' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Full mail.google.com scope is required for permanent email deletion
    // gmail.modify only allows trashing, not permanent deletion
    const scopes = [
      'https://mail.google.com/',
    ];

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    // State is optional here; we rely on the app session when exchanging the code.
    authUrl.searchParams.set('state', crypto.randomUUID());

    console.log('Generated Gmail auth URL for user:', user.id);

    return new Response(JSON.stringify({ url: authUrl.toString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Gmail auth URL error:', error);
    return new Response(JSON.stringify({ 
      error: 'An error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
