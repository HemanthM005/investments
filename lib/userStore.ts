// Registered users, persisted as a document alongside the app's other data.
//
// Env-declared users (APP_USERS) still work and take precedence; this store
// holds people who signed up through /register. Passwords are PBKDF2 hashes —
// the plaintext is never written anywhere.

import { readStore, writeStore } from './storage';

const USERS_DOC = 'auth-users.json';

export interface StoredUser {
  name: string;
  /** PBKDF2 hash from lib/password.ts — never a plaintext password. */
  password: string;
  created_at: string;
}

interface UsersDoc {
  users: StoredUser[];
}

const EMPTY: UsersDoc = { users: [] };

// proxy.ts checks the user on every request, so hitting Blob each time would
// add a round trip to every page load. A short cache keeps that cheap while
// still picking up new registrations quickly.
const CACHE_MS = 30_000;
let cache: { at: number; users: StoredUser[] } | null = null;

export async function loadUsers(force = false): Promise<StoredUser[]> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.users;
  const doc = await readStore<UsersDoc>(USERS_DOC, EMPTY, null);
  const users = Array.isArray(doc.users) ? doc.users : [];
  cache = { at: Date.now(), users };
  return users;
}

export async function saveUsers(users: StoredUser[]): Promise<void> {
  await writeStore(USERS_DOC, { users }, null);
  cache = { at: Date.now(), users };
}

export async function findUser(name: string): Promise<StoredUser | null> {
  const wanted = name.trim().toLowerCase();
  return (await loadUsers()).find((u) => u.name === wanted) ?? null;
}

export async function addUser(user: StoredUser): Promise<void> {
  const users = await loadUsers(true);
  if (users.some((u) => u.name === user.name)) throw new Error('Username already taken');
  await saveUsers([...users, user]);
}
