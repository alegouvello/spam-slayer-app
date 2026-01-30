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

async function fetchAllMessagesFromLabel(
  accessToken: string, 
  labelId: string, 
  folder: string
): Promise<Array<{ id: string; folder: string }>> {
  const allMessages: Array<{ id: string; folder: string }> = [];
  let pageToken: string | null = null;
  
  do {
    const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
    url.searchParams.set('labelIds', labelId);
    url.searchParams.set('maxResults', '500');
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
    
    pageToken = data.nextPageToken || null;
    console.log(`Fetched ${messages.length} ${folder} messages, total so far: ${allMessages.length}`);
  } while (pageToken);
  
  return allMessages;
}

async function fetchMessageDetails(
  accessToken: string,
  messages: Array<{ id: string; folder: string }>,
  accountEmail: string,
  accountId: string
): Promise<any[]> {
  const BATCH_SIZE = 50;
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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, accountId } = await req.json();
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

      let allEmails: any[] = [];
      let totalSpam = 0;
      let totalTrash = 0;

      for (const { accessToken, account } of accountsToScan) {
        console.log(`Scanning account: ${account.gmail_email}`);
        
        const spamMessages = await fetchAllMessagesFromLabel(accessToken, 'SPAM', 'spam');
        const trashMessages = await fetchAllMessagesFromLabel(accessToken, 'TRASH', 'trash');

        const allMessages = [...spamMessages, ...trashMessages];
        const uniqueMessages = allMessages.filter((msg, index, self) => 
          index === self.findIndex(m => m.id === msg.id)
        );
        
        console.log(`Found ${spamMessages.length} spam + ${trashMessages.length} trash = ${uniqueMessages.length} unique messages for ${account.gmail_email}`);

        const emails = await fetchMessageDetails(accessToken, uniqueMessages, account.gmail_email, account.id);
        allEmails.push(...emails);
        
        totalSpam += spamMessages.length;
        totalTrash += trashMessages.length;
      }

      console.log(`Returning ${allEmails.length} emails total from ${accountsToScan.length} accounts`);

      return new Response(JSON.stringify({ 
        emails: allEmails,
        stats: {
          spamCount: totalSpam,
          trashCount: totalTrash,
          totalUnique: allEmails.length,
          accountsScanned: accountsToScan.length
        }
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
