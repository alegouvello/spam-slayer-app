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

interface EmailSummary {
  id: string;
  sender: string;
  senderEmail: string;
  subject: string;
  snippet: string;
  hasListUnsubscribe: boolean;
  folder: string;
  accountId: string;
}

// ─────────────────────────────────────────────────────────────
// Gmail helpers
// ─────────────────────────────────────────────────────────────

async function fetchAllMessagesFromLabel(
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

async function fetchMessageDetails(
  accessToken: string,
  messageIds: Array<{ id: string }>,
  accountId: string,
): Promise<EmailSummary[]> {
  const results: EmailSummary[] = [];
  const BATCH = 50;

  for (let i = 0; i < messageIds.length; i += BATCH) {
    const batch = messageIds.slice(i, i + BATCH);
    const batchResults = await Promise.all(
      batch.map(async (msg) => {
        try {
          const resp = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=List-Unsubscribe`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          );
          if (!resp.ok) return null;
          const data = await resp.json();
          const headers = data.payload?.headers || [];
          const getHeader = (n: string) =>
            headers.find((h: any) => h.name.toLowerCase() === n.toLowerCase())?.value || '';

          const fromHeader = getHeader('From');
          const senderMatch = fromHeader.match(/^([^<]+)?<?([^>]+@[^>]+)>?$/);
          const senderName = senderMatch?.[1]?.trim() || senderMatch?.[2] || fromHeader;
          const senderEmail = senderMatch?.[2] || fromHeader;

          return {
            id: msg.id,
            sender: senderName,
            senderEmail,
            subject: getHeader('Subject') || '(No subject)',
            snippet: data.snippet || '',
            hasListUnsubscribe: !!getHeader('List-Unsubscribe'),
            folder: (data.labelIds || []).includes('SPAM') ? 'spam' : 'trash',
            accountId,
          } as EmailSummary;
        } catch {
          return null;
        }
      }),
    );
    results.push(...(batchResults.filter(Boolean) as EmailSummary[]));
  }
  return results;
}

async function deleteEmailPermanently(
  accessToken: string,
  emailId: string,
): Promise<{ success: boolean; notFound: boolean }> {
  try {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailId}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (response.status === 204 || response.status === 200) {
      console.log(`Deleted ${emailId}`);
      return { success: true, notFound: false };
    }
    if (response.status === 404) {
      console.log(`Email ${emailId} not found (already deleted)`);
      return { success: false, notFound: true };
    }
    console.error(`Gmail delete error ${emailId}: status=${response.status}`);
    return { success: false, notFound: false };
  } catch (err) {
    console.error(`Exception deleting ${emailId}:`, err);
    return { success: false, notFound: false };
  }
}

// ─────────────────────────────────────────────────────────────
// AI spam analysis
// ─────────────────────────────────────────────────────────────

interface AnalysisResult {
  id: string;
  spamConfidence: 'definitely_spam' | 'likely_spam' | 'might_be_important';
  reasoning: string;
}

async function analyzeEmailsWithAI(emails: EmailSummary[]): Promise<AnalysisResult[]> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    console.warn('LOVABLE_API_KEY not set, skipping AI analysis');
    return [];
  }

  const summaries = emails.map((e) => ({
    id: e.id,
    sender: e.sender,
    senderEmail: e.senderEmail,
    subject: e.subject,
    snippet: e.snippet,
    hasListUnsubscribe: e.hasListUnsubscribe,
  }));

  const systemPrompt = `You are an email spam classifier. Analyze emails and classify each as:
- "definitely_spam": Obvious spam, scams, phishing, or aggressive marketing
- "likely_spam": Marketing newsletters or promotional emails the user probably doesn't want
- "might_be_important": Could be legitimate, needs user review

For each email, provide a brief reasoning (max 15 words).
Respond with a JSON array: [{ "id": "<id>", "spamConfidence": "<category>", "reasoning": "<text>" }, ...]`;

  const userPrompt = `Analyze these emails:\n${JSON.stringify(summaries, null, 2)}`;

  console.log(`Calling AI for ${emails.length} emails...`);
  const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
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

  if (!resp.ok) {
    console.error('AI gateway error:', resp.status, await resp.text());
    return [];
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || '';
  try {
    const match = content.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]) as AnalysisResult[];
    }
  } catch (e) {
    console.error('Failed to parse AI response:', e);
  }
  return [];
}

// ─────────────────────────────────────────────────────────────
// Schedule helpers
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// Main processing
// ─────────────────────────────────────────────────────────────

async function processUserCleanup(
  supabase: any,
  schedule: ScheduledCleanup,
): Promise<{ scanned: number; analyzed: number; deleted: number; unsubscribed: number }> {
  console.log('Processing scheduled cleanup for user', schedule.user_id);

  const tokenResults = await getValidAccessTokensForAllAccounts(supabase, schedule.user_id);
  if (tokenResults.length === 0) {
    console.log('No valid Gmail tokens for user, skipping');
    return { scanned: 0, analyzed: 0, deleted: 0, unsubscribed: 0 };
  }

  // 1) Fetch emails from Spam folder across all connected accounts
  const allEmails: EmailSummary[] = [];
  for (const { accessToken, account } of tokenResults) {
    const spamMsgs = await fetchAllMessagesFromLabel(accessToken, 'SPAM');
    console.log(`Account ${account.gmail_email}: ${spamMsgs.length} spam messages`);
    const details = await fetchMessageDetails(accessToken, spamMsgs, account.id);
    allEmails.push(...details);
  }

  if (allEmails.length === 0) {
    console.log('No spam emails found');
    await supabase.from('scheduled_cleanup').update({
      last_run_at: new Date().toISOString(),
      next_run_at: calculateNextRun(schedule.frequency),
    }).eq('id', schedule.id);
    
    // Create a cleanup run record even for empty runs
    await supabase.from('cleanup_runs').insert({
      user_id: schedule.user_id,
      emails_scanned: 0,
      emails_deleted: 0,
      emails_unsubscribed: 0,
      top_senders: [],
    });
    
    return { scanned: 0, analyzed: 0, deleted: 0, unsubscribed: 0 };
  }

  console.log(`Total spam emails to analyze: ${allEmails.length}`);

  // 2) Run AI analysis in batches of 20
  const analysisMap = new Map<string, AnalysisResult>();
  const BATCH = 20;
  for (let i = 0; i < allEmails.length; i += BATCH) {
    const chunk = allEmails.slice(i, i + BATCH);
    const results = await analyzeEmailsWithAI(chunk);
    for (const r of results) {
      analysisMap.set(r.id, r);
    }
  }

  console.log(`AI analyzed ${analysisMap.size} emails`);

  // 3) Delete only definitely_spam (auto_approve must be true)
  let deleted = 0;
  let alreadyGone = 0;
  let failed = 0;
  let unsubscribed = 0;
  
  // Track sender counts for summary
  const senderCounts = new Map<string, { email: string; name: string; count: number }>();

  if (schedule.auto_approve) {
    const definitelySpam = allEmails.filter(
      (e) => analysisMap.get(e.id)?.spamConfidence === 'definitely_spam',
    );
    console.log(`Emails marked definitely_spam: ${definitelySpam.length}`);

    for (const email of definitelySpam) {
      // Track sender counts
      const senderKey = email.senderEmail.toLowerCase();
      const existing = senderCounts.get(senderKey);
      if (existing) {
        existing.count++;
      } else {
        senderCounts.set(senderKey, { email: email.senderEmail, name: email.sender, count: 1 });
      }

      // Find the token for this account
      const tokenEntry = tokenResults.find((t) => t.account.id === email.accountId);
      if (!tokenEntry) continue;

      const result = await deleteEmailPermanently(tokenEntry.accessToken, email.id);

      // Record in cleanup_history
      const analysis = analysisMap.get(email.id);
      await supabase.from('cleanup_history').insert({
        user_id: schedule.user_id,
        email_id: email.id,
        sender: email.senderEmail,
        subject: email.subject,
        spam_confidence: analysis?.spamConfidence || null,
        ai_reasoning: analysis?.reasoning || null,
        unsubscribe_method: email.hasListUnsubscribe ? 'auto_header' : 'scheduled_auto',
        unsubscribe_status: result.success || result.notFound ? 'success' : 'failed',
        deleted: result.success || result.notFound,
      });

      if (result.success) {
        deleted++;
        if (email.hasListUnsubscribe) unsubscribed++;
      }
      else if (result.notFound) alreadyGone++;
      else failed++;
    }

    console.log(`Cleanup complete: ${deleted} deleted, ${alreadyGone} already gone, ${failed} failed`);
  } else {
    console.log('auto_approve disabled, skipping deletion');
  }

  // Get top 5 senders
  const topSenders = Array.from(senderCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(s => ({ email: s.email, name: s.name, count: s.count }));

  // Create cleanup run summary record
  await supabase.from('cleanup_runs').insert({
    user_id: schedule.user_id,
    emails_scanned: allEmails.length,
    emails_deleted: deleted,
    emails_unsubscribed: unsubscribed,
    top_senders: topSenders,
  });

  console.log('Created cleanup run summary');

  // Update schedule timestamps
  await supabase.from('scheduled_cleanup').update({
    last_run_at: new Date().toISOString(),
    next_run_at: calculateNextRun(schedule.frequency),
  }).eq('id', schedule.id);

  return { scanned: allEmails.length, analyzed: analysisMap.size, deleted, unsubscribed };
}

// ─────────────────────────────────────────────────────────────
// HTTP handler
// ─────────────────────────────────────────────────────────────

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
      console.error('Error fetching schedules:', error);
      throw error;
    }

    console.log(`Schedules due: ${dueSchedules?.length || 0}`);

    const results = [];
    for (const schedule of dueSchedules || []) {
      try {
        const r = await processUserCleanup(supabase, schedule);
        results.push({ ...r, success: true });
      } catch (err) {
        console.error('Error processing schedule:', err);
        results.push({ success: false, error: err instanceof Error ? err.message : 'Unknown' });
      }
    }

    console.log('Scheduled cleanup finished:', JSON.stringify(results));

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Scheduled cleanup error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
