// Multi-user password gate.
//
// Users are declared in one env var:
//     APP_USERS="alice:pbkdf2$600000$<salt>$<hash>,bob:pbkdf2$..."
//
// Generate an entry with:  npx tsx scripts/hash-password.ts <user> <password>
// Plaintext entries still work so an existing list keeps functioning, but
// they are reported by `hasPlaintextPasswords()`.
//
// The session cookie is `<user>.<hmac>`, where the HMAC covers the username
// and is keyed by AUTH_SECRET. Without the secret it can't be forged, and no
// password ever leaves the server. Web Crypto is used (not node:crypto) so
// this runs unchanged in proxy.ts, which may execute on the Edge runtime.

import { verifyPassword, isHashed } from './password';
import { loadUsers, findUser } from './userStore';

export const SESSION_COOKIE = 'ip_session';
/** Set by proxy.ts from the verified cookie; routes read the user from here. */
export const USER_HEADER = 'x-app-user';

// Usernames become Blob path segments, so keep them boring.
const VALID_USER = /^[a-z0-9_-]+$/;

export interface AppUser {
  name: string;
  password: string;
}

/**
 * Parses APP_USERS. Falls back to APP_PASSWORD as a single user named
 * "primary" so the original single-user setup keeps working untouched.
 */
export function appUsers(): AppUser[] {
  const raw = process.env.APP_USERS?.trim();
  if (raw) {
    return raw
      .split(',')
      .map((pair) => pair.trim())
      .filter(Boolean)
      .map((pair) => {
        // Only split on the FIRST colon — a pbkdf2 hash contains none, but
        // a plaintext password might.
        const idx = pair.indexOf(':');
        const name = pair.slice(0, idx).trim().toLowerCase();
        const password = pair.slice(idx + 1);
        return { name, password };
      })
      .filter((u) => u.name && u.password && VALID_USER.test(u.name));
  }
  const solo = process.env.APP_PASSWORD;
  return solo ? [{ name: 'primary', password: solo }] : [];
}

/**
 * The first user keeps the original un-prefixed document paths, so enabling
 * multi-user needs no data migration. Everyone else gets their own namespace.
 */
export function primaryUser(): string | null {
  return appUsers()[0]?.name ?? null;
}

export function authEnabled(): boolean {
  // The gate must stay on whenever anyone can hold an account.
  return appUsers().length > 0 || registrationEnabled();
}

/** Registration is on unless explicitly switched off. */
export function registrationEnabled(): boolean {
  return process.env.REGISTRATION_ENABLED !== 'false';
}

/**
 * The invite code, or null when none is required.
 *
 * An unset or empty REGISTER_CODE means anyone who reaches /register can
 * create an account. Set REGISTRATION_ENABLED=false to close it entirely.
 */
export function registerCode(): string | null {
  const code = process.env.REGISTER_CODE?.trim();
  return code ? code : null;
}

export function minPasswordLength(): number {
  const n = Number(process.env.MIN_PASSWORD_LENGTH);
  return Number.isFinite(n) && n >= 4 ? n : 6;
}

function bytesToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmac(message: string): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not set');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return bytesToHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
}

/** Cookie value for a signed-in user. */
export async function sessionToken(user: string): Promise<string> {
  return `${user}.${await hmac(`authenticated:v1:${user}`)}`;
}

/** Constant-time comparison — avoids leaking a match via timing. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Returns the username the cookie proves, or null. */
export async function userFromCookie(cookieValue: string | undefined): Promise<string | null> {
  if (!cookieValue) return null;
  const dot = cookieValue.indexOf('.');
  if (dot < 1) return null;
  const user = cookieValue.slice(0, dot);
  if (!VALID_USER.test(user)) return null;
  // Only trust a name that still exists (env-declared or registered)
  const known = await allUsers();
  if (!known.some((u) => u.name === user)) return null;
  try {
    return safeEqual(cookieValue, await sessionToken(user)) ? user : null;
  } catch {
    return null; // AUTH_SECRET missing — fail closed
  }
}

/**
 * Verifies a username + password pair.
 *
 * Both are required: matching on password alone would mean two people who
 * happened to choose the same PIN could land in each other's account, which
 * is a real risk with short numeric passwords.
 *
 * Always walks the full list and always runs a comparison so the work does
 * not reveal whether the username existed.
 */
/** Env-declared users plus anyone who registered. Env wins on a name clash. */
export async function allUsers(): Promise<AppUser[]> {
  const env = appUsers();
  const envNames = new Set(env.map((u) => u.name));
  const registered = (await loadUsers())
    .filter((u) => !envNames.has(u.name))
    .map((u) => ({ name: u.name, password: u.password }));
  return [...env, ...registered];
}

export async function verifyCredentials(
  username: string,
  password: string
): Promise<AppUser | null> {
  const wanted = username.trim().toLowerCase();
  let found: AppUser | null = null;
  for (const u of await allUsers()) {
    // Always verify, even when the name does not match, so the time taken
    // does not reveal whether the username exists.
    const passOk = await verifyPassword(password, u.password);
    if (safeEqual(wanted, u.name) && passOk) found = u;
  }
  return found;
}

/** A name is taken if it is declared in env or already registered. */
export async function isNameTaken(name: string): Promise<boolean> {
  const wanted = name.trim().toLowerCase();
  if (appUsers().some((u) => u.name === wanted)) return true;
  return (await findUser(wanted)) !== null;
}

export const USERNAME_RE = VALID_USER;

/** True when any configured user still has a plaintext password. */
export function hasPlaintextPasswords(): boolean {
  return appUsers().some((u) => !isHashed(u.password));
}
