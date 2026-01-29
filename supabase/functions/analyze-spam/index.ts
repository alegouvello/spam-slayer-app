import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

    const { emails } = await req.json();
    console.log(`Analyzing ${emails.length} emails for user: ${user.id}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare email summaries for AI analysis
    const emailSummaries = emails.map((email: any) => ({
      id: email.id,
      sender: email.sender,
      senderEmail: email.senderEmail,
      subject: email.subject,
      snippet: email.snippet,
      hasListUnsubscribe: email.hasListUnsubscribe,
    }));

    const systemPrompt = `You are an email spam classifier. Analyze emails and classify each as:
- "definitely_spam": Obvious spam, scams, phishing, or aggressive marketing
- "likely_spam": Marketing newsletters or promotional emails the user probably doesn't want
- "might_be_important": Could be legitimate, needs user review

For each email, provide a brief reasoning (max 15 words) explaining your classification.

Respond with a JSON array where each item has:
- id: the email id
- spamConfidence: one of the three categories above
- reasoning: brief explanation`;

    const userPrompt = `Analyze these emails:\n${JSON.stringify(emailSummaries, null, 2)}`;

    console.log('Calling AI gateway for spam analysis...');
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        console.error('Rate limited by AI gateway');
        return new Response(JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        console.error('Payment required for AI gateway');
        return new Response(JSON.stringify({ error: 'AI credits exhausted, please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    
    console.log('AI response received, parsing results...');

    // Parse AI response - handle various response formats
    let results = [];
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        results = JSON.parse(jsonMatch[0]);
      } else {
        console.warn('Could not parse AI response as JSON, using fallback');
        // Fallback: map emails with default classifications
        results = emails.map((email: any) => ({
          id: email.id,
          spamConfidence: email.hasListUnsubscribe ? 'likely_spam' : 'might_be_important',
          reasoning: 'Classification based on email headers',
        }));
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      results = emails.map((email: any) => ({
        id: email.id,
        spamConfidence: 'likely_spam',
        reasoning: 'Auto-classified based on spam folder location',
      }));
    }

    console.log(`Returning ${results.length} analyzed emails`);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
