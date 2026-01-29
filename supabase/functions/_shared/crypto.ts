// AES-GCM encryption utilities for Gmail tokens

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function getKey(): Promise<CryptoKey> {
  const keyString = Deno.env.get('GMAIL_TOKEN_ENCRYPTION_KEY');
  if (!keyString) {
    throw new Error('GMAIL_TOKEN_ENCRYPTION_KEY not configured');
  }
  
  // Decode base64 key and derive a proper AES key
  const keyData = Uint8Array.from(atob(keyString), c => c.charCodeAt(0));
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
  
  return crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintextBytes = encoder.encode(plaintext);
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintextBytes
  );
  
  // Combine IV + ciphertext and encode as base64
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

export async function decrypt(encrypted: string): Promise<string> {
  const key = await getKey();
  
  // Decode base64 and split IV + ciphertext
  const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  
  const plaintextBytes = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  
  return decoder.decode(plaintextBytes);
}
