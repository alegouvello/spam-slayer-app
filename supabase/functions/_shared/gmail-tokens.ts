import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encrypt, decrypt } from "./crypto.ts";

export interface GmailAccount {
  id: string;
  user_id: string;
  gmail_email: string;
  gmail_access_token: string | null;
  gmail_refresh_token: string | null;
  gmail_token_expires_at: string | null;
  is_primary: boolean;
}

export async function refreshAccessToken(
  supabase: any, 
  accountId: string, 
  encryptedRefreshToken: string
): Promise<string | null> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

  const refreshToken = await decrypt(encryptedRefreshToken);

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
  const encryptedAccessToken = await encrypt(tokens.access_token);
  
  await supabase.from('gmail_accounts').update({
    gmail_access_token: encryptedAccessToken,
    gmail_token_expires_at: expiresAt,
  }).eq('id', accountId);

  return tokens.access_token;
}

export async function getValidAccessToken(
  supabase: any, 
  userId: string, 
  accountId?: string
): Promise<{ accessToken: string; account: GmailAccount } | null> {
  let query = supabase
    .from('gmail_accounts')
    .select('*')
    .eq('user_id', userId);
  
  if (accountId) {
    query = query.eq('id', accountId);
  } else {
    // Get primary account if no specific account requested
    query = query.eq('is_primary', true);
  }

  const { data: account } = await query.single();

  if (!account?.gmail_access_token) {
    // If no primary, try to get any connected account
    if (!accountId) {
      const { data: anyAccount } = await supabase
        .from('gmail_accounts')
        .select('*')
        .eq('user_id', userId)
        .not('gmail_access_token', 'is', null)
        .limit(1)
        .single();
      
      if (!anyAccount?.gmail_access_token) {
        return null;
      }
      return getValidAccessTokenForAccount(supabase, anyAccount);
    }
    return null;
  }

  return getValidAccessTokenForAccount(supabase, account);
}

async function getValidAccessTokenForAccount(
  supabase: any,
  account: GmailAccount
): Promise<{ accessToken: string; account: GmailAccount } | null> {
  if (!account.gmail_access_token) return null;

  // Check if token is expired (with 5 min buffer)
  const expiresAt = new Date(account.gmail_token_expires_at || 0);
  if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    if (account.gmail_refresh_token) {
      const newToken = await refreshAccessToken(supabase, account.id, account.gmail_refresh_token);
      if (newToken) {
        return { accessToken: newToken, account };
      }
    }
    return null;
  }

  try {
    const accessToken = await decrypt(account.gmail_access_token);
    return { accessToken, account };
  } catch (error) {
    console.error('Failed to decrypt access token:', error);
    return null;
  }
}

export async function getAllConnectedAccounts(
  supabase: any,
  userId: string
): Promise<GmailAccount[]> {
  const { data: accounts } = await supabase
    .from('gmail_accounts')
    .select('*')
    .eq('user_id', userId)
    .not('gmail_access_token', 'is', null)
    .order('is_primary', { ascending: false });
  
  return accounts || [];
}

export async function getValidAccessTokensForAllAccounts(
  supabase: any,
  userId: string
): Promise<Array<{ accessToken: string; account: GmailAccount }>> {
  const accounts = await getAllConnectedAccounts(supabase, userId);
  const results: Array<{ accessToken: string; account: GmailAccount }> = [];

  for (const account of accounts) {
    const result = await getValidAccessTokenForAccount(supabase, account);
    if (result) {
      results.push(result);
    }
  }

  return results;
}
