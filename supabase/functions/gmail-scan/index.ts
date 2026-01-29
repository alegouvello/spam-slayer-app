import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Note: Gmail API integration requires OAuth tokens stored in the user's profile
// For this demo, we'll simulate the Gmail API response structure

serve(async (req) => {
  // Handle CORS preflight requests
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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action } = await req.json();
    console.log(`Processing action: ${action} for user: ${user.id}`);

    if (action === 'scan') {
      // In production, this would:
      // 1. Get the user's Gmail OAuth tokens from profiles table
      // 2. Use Gmail API to fetch spam folder emails
      // 3. Parse List-Unsubscribe headers and content for unsubscribe links
      
      // For demo purposes, return sample data that shows the app structure
      const sampleEmails = [
        {
          id: 'msg_001',
          sender: 'Newsletter Weekly',
          senderEmail: 'news@newsletter-weekly.com',
          subject: '🎉 This Week\'s Top Stories You Can\'t Miss!',
          snippet: 'Don\'t miss out on the latest news and updates from around the world...',
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          hasListUnsubscribe: true,
          unsubscribeLink: 'https://example.com/unsubscribe/1',
        },
        {
          id: 'msg_002',
          sender: 'Promo Deals',
          senderEmail: 'deals@promo-deals.net',
          subject: 'EXCLUSIVE: 90% OFF Everything Today Only!!!',
          snippet: 'Limited time offer! Shop now and save big on all items...',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          hasListUnsubscribe: true,
          unsubscribeLink: null,
        },
        {
          id: 'msg_003',
          sender: 'Tech Updates',
          senderEmail: 'updates@techblog.io',
          subject: 'New JavaScript Framework Released - Breaking Changes',
          snippet: 'A new JavaScript framework has been released with major improvements...',
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          hasListUnsubscribe: false,
          unsubscribeLink: 'https://example.com/unsubscribe/3',
        },
        {
          id: 'msg_004',
          sender: 'Crypto Alerts',
          senderEmail: 'alerts@crypto-gains.xyz',
          subject: '🚀 Make $10,000 Daily with This ONE Simple Trick',
          snippet: 'Learn how ordinary people are making thousands daily...',
          date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          hasListUnsubscribe: true,
          unsubscribeLink: 'https://example.com/unsubscribe/4',
        },
        {
          id: 'msg_005',
          sender: 'Your Bank',
          senderEmail: 'security@your-bank-verify.com',
          subject: 'URGENT: Verify Your Account Immediately',
          snippet: 'Your account has been compromised. Click here to verify...',
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          hasListUnsubscribe: false,
          unsubscribeLink: null,
        },
        {
          id: 'msg_006',
          sender: 'Fashion Weekly',
          senderEmail: 'style@fashion-weekly.com',
          subject: 'Spring Collection Preview - VIP Early Access',
          snippet: 'Be the first to see our stunning new spring collection...',
          date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
          hasListUnsubscribe: true,
          unsubscribeLink: 'https://example.com/unsubscribe/6',
        },
      ];

      console.log(`Returning ${sampleEmails.length} sample emails`);

      return new Response(JSON.stringify({ emails: sampleEmails }), {
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
