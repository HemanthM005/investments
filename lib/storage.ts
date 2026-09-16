// Storage adapter — the app's JSON documents live either on the local
// filesystem (development) or in a private Vercel Blob store (production).
//
// Vercel's filesystem is read-only outside /tmp, so `fs.writeFileSync` throws
// EROFS there. Blob is the writable equivalent, and because every deployment
// and every phone talks to the same store, the web app and the APK stay in
// sync automatically.

import fs from 'fs';
import path from 'path';
import { del, get, head, put } from '@vercel/blob';
import { primaryUser } from './auth';

export type Driver = 'file' | 'blob';

/**
 * STORAGE_DRIVER wins when set, otherwise Blob on Vercel and files locally.
 *
 * Deliberately NOT keyed off BLOB_READ_WRITE_TOKEN: linking the store writes
 * that token into .env.local, which would silently drag local development
 * onto production data.
 */
export function driver(): Driver {
  const explicit = process.env.STORAGE_DRIVER;
  if (explicit === 'blob' || explicit === 'file') return explicit;
  return process.env.VERCEL ? 'blob' : 'file';
}

const DATA_DIR = path.join(process.cwd(), 'data');

/**
 * Where a user's document lives.
 *
 * The first user in APP_USERS keeps the original un-prefixed paths, so
 * turning on multi-user needs no data migration and cannot disturb data that
 * is already there. Everyone else gets their own namespace.
 */
export function docPath(name: string, user?: string | null): string {
  const primary = primaryUser();
  if (!user || !primary || user === primary) return name;
  return `users/${user}/${name}`;
}

const localPath = (name: string) => path.join(DATA_DIR, name);

// ── File driver ───────────────────────────────────────────────────────────

function readLocal<T>(name: string, empty: T): T {
  const file = localPath(name);
  try {
    if (!fs.existsSync(file)) return empty;
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
  } catch {
    return empty;
  }
}

// Atomic write: temp file then rename (POSIX rename is atomic — either the
// old file or the new one exists, never a half-written state). Rotates up to
// three backups first so a bad write is always recoverable.
function writeLocal(name: string, data: unknown): void {
  const file = localPath(name);
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const bak = (n: number) => `${file}.bak${n}`;
  if (fs.existsSync(bak(2))) fs.renameSync(bak(2), bak(3));
  if (fs.existsSync(bak(1))) fs.renameSync(bak(1), bak(2));
  if (fs.existsSync(file)) fs.copyFileSync(file, bak(1));

  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, file);
}

// ── Blob driver ───────────────────────────────────────────────────────────

async function readBlob<T>(name: string, empty: T): Promise<T> {
  try {
    // useCache:false — a read-modify-write against a CDN-cached copy would
    // silently drop whatever was written since the cache filled.
    const res = await get(name, { access: 'private', useCache: false });
    if (!res || res.statusCode !== 200 || !res.stream) return empty;
    return JSON.parse(await new Response(res.stream).text()) as T;
  } catch {
    return empty; // blob absent on first run
  }
}

async function writeBlob(name: string, data: unknown): Promise<void> {
  await put(name, JSON.stringify(data, null, 2), {
    access: 'private',
    addRandomSuffix: false, // stable pathname — this is a document, not an upload
    allowOverwrite: true,
    contentType: 'application/json',
  });
}

// ── Public API ────────────────────────────────────────────────────────────

/** Does a user's document exist yet? */
export async function existsStore(name: string, user?: string | null): Promise<boolean> {
  const p = docPath(name, user);
  if (driver() === 'file') return fs.existsSync(localPath(p));
  try {
    await head(p);
    return true;
  } catch {
    return false;
  }
}

/** Remove a user's document. Missing documents are not an error. */
export async function deleteStore(name: string, user?: string | null): Promise<void> {
  const p = docPath(name, user);
  if (driver() === 'file') {
    const file = localPath(p);
    if (fs.existsSync(file)) fs.rmSync(file);
    return;
  }
  try {
    await del(p);
  } catch {
    /* already gone */
  }
}

/** The document names every user has. */
export const USER_DOCS = ['portfolio.json', 'daily-tracker.json', 'daily-planner.json'] as const;

/** Read a JSON document for a user, returning `empty` when it does not exist. */
export async function readStore<T>(name: string, empty: T, user?: string | null): Promise<T> {
  const p = docPath(name, user);
  return driver() === 'blob' ? readBlob(p, empty) : readLocal(p, empty);
}

/** Overwrite a user's JSON document. */
export async function writeStore(name: string, data: unknown, user?: string | null): Promise<void> {
  const p = docPath(name, user);
  if (driver() === 'blob') await writeBlob(p, data);
  else writeLocal(p, data);
}
