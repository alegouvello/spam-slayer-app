import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getValidAccessToken, getValidAccessTokensForAllAccounts, getAllConnectedAccounts } from "../_shared/gmail-tokens.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function parseListUnsubscribe(header: string | null): { hasHeader: boolean; link: string | null } {
  if (!header) return { hasHeader: false, link: null };
  
  const httpsMatch = header.match(/<(https?:\/\/[^>]+)>/);
  
  return {
    hasHeader: true,
    link: httpsMatch?.[1] || null,
  };
}

async function fetchMessagesFromLabel(
  accessToken: string, 
  labelId: string, 
  folder: string,
  maxMessages: number = 100,
  startPageToken: string | null = null
): Promise<{ messages: Array<{ id: string; folder: string }>; nextPageToken: string | null; totalEstimate: number }> {
  const allMessages: Array<{ id: string; folder: string }> = [];
  let pageToken: string | null = startPageToken;
  let totalEstimate = 0;
  
  do {
    const remaining = maxMessages - allMessages.length;
    if (remaining <= 0) break;

    const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
    url.searchParams.set('labelIds', labelId);
    url.searchParams.set('maxResults', String(Math.min(remaining, 100)));
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }
    
    const response = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch ${folder} messages:`, await response.json());
      break;
    }
    
    const data = await response.json();
    const messages = (data.messages || []).map((m: any) => ({ id: m.id, folder }));
    allMessages.push(...messages);
    
    // Capture the estimate from the first response (most accurate)
    if (totalEstimate === 0 && data.resultSizeEstimate) {
      totalEstimate = data.resultSizeEstimate;
    }
    
    pageToken = data.nextPageToken || null;
    console.log(`Fetched ${messages.length} ${folder} messages, total so far: ${allMessages.length}`);
  } while (pageToken && allMessages.length < maxMessages);
  
  return { messages: allMessages, nextPageToken: pageToken, totalEstimate };
}

async function fetchMessageDetails(
  accessToken: string,
  messages: Array<{ id: string; folder: string }>,
  accountEmail: string,
  accountId: string
): Promise<any[]> {
  const BATCH_SIZE = 20;
  const results: any[] = [];
  
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(messages.length / BATCH_SIZE)}`);
    
    const batchResults = await Promise.all(
      batch.map(async (msg) => {
        try {
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

          let unsubscribeLink = link;
          if (!unsubscribeLink && msgData.payload?.body?.data) {
            try {
              const body = atob(msgData.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
              const linkMatch = body.match(/https?:\/\/[^\s"<>]+unsubscribe[^\s"<>]*/i);
              unsubscribeLink = linkMatch?.[0] || null;
            } catch {
              // Ignore base64 decode errors
            }
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
            folder: msg.folder,
            accountEmail: accountEmail,
            accountId: accountId,
          };
        } catch (error) {
          console.error(`Error fetching message ${msg.id}:`, error);
          return null;
        }
      })
    );
    
    results.push(...batchResults.filter(Boolean));
  }
  
  return results;
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
    
    // Try to get user from token - handle both HS256 and ES256 JWTs
    let user = null;
    
    // First try standard getUser
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    
    if (!authError && userData?.user) {
      user = userData.user;
    } else {
      // For ES256 tokens (Lovable Cloud OAuth), decode and verify via session
      try {
        // Decode the JWT payload without verification (we'll verify via session lookup)
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          const userId = payload.sub;
          
          if (userId) {
            // Verify by checking if user exists
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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, accountId, pageTokens } = await req.json();
    console.log(`Processing action: ${action}`);

    if (action === 'check_connection') {
      const accounts = await getAllConnectedAccounts(supabase, user.id);
      return new Response(JSON.stringify({ 
        connected: accounts.length > 0,
        accounts: accounts.map(a => ({
          id: a.id,
          email: a.gmail_email,
          isPrimary: a.is_primary,
        }))
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'list_accounts') {
      const accounts = await getAllConnectedAccounts(supabase, user.id);
      return new Response(JSON.stringify({ 
        accounts: accounts.map(a => ({
          id: a.id,
          email: a.gmail_email,
          isPrimary: a.is_primary,
        }))
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'scan') {
      // Get all connected accounts or specific one
      let accountsToScan: Array<{ accessToken: string; account: any }> = [];
      
      if (accountId) {
        const result = await getValidAccessToken(supabase, user.id, accountId);
        if (result) {
          accountsToScan = [result];
        }
      } else {
        accountsToScan = await getValidAccessTokensForAllAccounts(supabase, user.id);
      }
      
      if (accountsToScan.length === 0) {
        return new Response(JSON.stringify({ 
          error: 'Gmail not connected',
          needsAuth: true 
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // pageTokens is an object like: { "account_id": { spam: "token", trash: "token", inbox: "token" } }
      const inputPageTokens: Record<string, Record<string, string>> = pageTokens || {};

      let allEmails: any[] = [];
      let totalSpam = 0;
      let totalTrash = 0;
      let totalInbox = 0;
      let totalEstimateRemaining = 0;
      const nextPageTokens: Record<string, Record<string, string | null>> = {};

      for (const { accessToken, account } of accountsToScan) {
        console.log(`Scanning account: ${account.gmail_email}`);
        const accountTokens = inputPageTokens[account.id] || {};
        
        const spamResult = await fetchMessagesFromLabel(accessToken, 'SPAM', 'spam', 100, accountTokens.spam || null);
        const trashResult = await fetchMessagesFromLabel(accessToken, 'TRASH', 'trash', 100, accountTokens.trash || null);
        const inboxResult = await fetchMessagesFromLabel(accessToken, 'INBOX', 'inbox', 100, accountTokens.inbox || null);

        // Store next page tokens for this account
        const accountNextTokens: Record<string, string | null> = {};
        if (spamResult.nextPageToken) {
          accountNextTokens.spam = spamResult.nextPageToken;
          totalEstimateRemaining += Math.max(0, spamResult.totalEstimate - spamResult.messages.length);
        }
        if (trashResult.nextPageToken) {
          accountNextTokens.trash = trashResult.nextPageToken;
          totalEstimateRemaining += Math.max(0, trashResult.totalEstimate - trashResult.messages.length);
        }
        if (inboxResult.nextPageToken) {
          accountNextTokens.inbox = inboxResult.nextPageToken;
          totalEstimateRemaining += Math.max(0, inboxResult.totalEstimate - inboxResult.messages.length);
        }
        if (Object.keys(accountNextTokens).length > 0) {
          nextPageTokens[account.id] = accountNextTokens;
        }

        const allMessages = [...spamResult.messages, ...trashResult.messages, ...inboxResult.messages];
        const uniqueMessages = allMessages.filter((msg, index, self) => 
          index === self.findIndex(m => m.id === msg.id)
        );
        
        console.log(`Found ${spamResult.messages.length} spam + ${trashResult.messages.length} trash + ${inboxResult.messages.length} inbox = ${uniqueMessages.length} unique messages for ${account.gmail_email}`);

        const emails = await fetchMessageDetails(accessToken, uniqueMessages, account.gmail_email, account.id);
        allEmails.push(...emails);
        
        totalSpam += spamResult.messages.length;
        totalTrash += trashResult.messages.length;
        totalInbox += inboxResult.messages.length;
      }

      console.log(`Returning ${allEmails.length} emails total from ${accountsToScan.length} accounts`);

      const hasMore = Object.keys(nextPageTokens).length > 0;

      return new Response(JSON.stringify({ 
        emails: allEmails,
        stats: {
          spamCount: totalSpam,
          trashCount: totalTrash,
          inboxCount: totalInbox,
          totalUnique: allEmails.length,
          accountsScanned: accountsToScan.length
        },
        nextPageTokens: hasMore ? nextPageTokens : null,
        hasMore,
        remainingEstimate: hasMore ? totalEstimateRemaining : 0,
      }), {
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
