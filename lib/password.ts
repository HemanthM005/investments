// Password hashing for the APP_USERS credential list.
//
// PBKDF2-SHA256 via Web Crypto, so this runs unchanged on the Edge runtime
// where proxy.ts may execute. bcrypt/argon2 would be stronger per-iteration
// but need native or WASM builds that Edge can't load.
//
// Stored form:  pbkdf2.<iterations>.<saltB64url>.<hashB64url>
//
// Dots and base64url, deliberately: dotenv expands `$VAR` inside double-quoted
// values, so a `$`-separated hash silently loses its salt when read from
// .env.local or a Vercel env var. base64url also avoids `+` and `/`.

const PREFIX = 'pbkdf2';
const SEP = '.';
// OWASP's 2023 floor for PBKDF2-SHA256.
export const DEFAULT_ITERATIONS = 600_000;
const KEY_BITS = 256;

function toB64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    key,
    KEY_BITS
  );
  return new Uint8Array(bits);
}

/** Produce a stored hash for a plaintext password. */
export async function hashPassword(
  password: string,
  iterations = DEFAULT_ITERATIONS
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, iterations);
  return [PREFIX, iterations, toB64(salt), toB64(hash)].join(SEP);
}

export function isHashed(stored: string): boolean {
  return stored.startsWith(PREFIX + SEP);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * Verify a password against a stored value.
 *
 * A plaintext stored value is still accepted so an existing APP_USERS keeps
 * working while it is migrated; `isHashed` lets callers warn about it.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!isHashed(stored)) {
    // Plaintext fallback — compared in constant time all the same.
    const a = new TextEncoder().encode(password);
    const b = new TextEncoder().encode(stored);
    return constantTimeEqual(a, b);
  }

  const [, iterStr, saltB64, hashB64] = stored.split(SEP);
  const iterations = Number(iterStr);
  if (!Number.isFinite(iterations) || iterations < 1 || !saltB64 || !hashB64) return false;

  try {
    const expected = fromB64(hashB64);
    const actual = await derive(password, fromB64(saltB64), iterations);
    return constantTimeEqual(actual, expected);
  } catch {
    return false;
  }
}
