// Single-user password gate.
//
// The session cookie does not store the password — it stores an HMAC of a
// fixed message keyed by AUTH_SECRET. Without the secret the value can't be
// forged, and the password itself never leaves the server.
//
// Web Crypto is used (not node:crypto) so this runs unchanged in `proxy.ts`,
// which may execute on the Edge runtime.

export const SESSION_COOKIE = 'ip_session';

function bytesToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Derive the session token. Same input always yields the same token. */
export async function sessionToken(): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not set');

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('authenticated:v1'));
  return bytesToHex(sig);
}

/** Constant-time string comparison — avoids leaking a match via timing. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** True when the request carries a valid session cookie. */
export async function isAuthed(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false;
  try {
    return safeEqual(cookieValue, await sessionToken());
  } catch {
    return false; // AUTH_SECRET missing — fail closed
  }
}

/**
 * Auth is only enforced when APP_PASSWORD is set. Local development without
 * it behaves exactly as before, so the gate never gets in the way offline.
 */
export function authEnabled(): boolean {
  return Boolean(process.env.APP_PASSWORD);
}
