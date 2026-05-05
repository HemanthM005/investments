import fs from 'node:fs/promises';
import path from 'node:path';
import { aiConfig } from './config';
import type { AIResearchCache, NewsOutput, ResearchOutput } from './types';

const CACHE_PATH = path.join(process.cwd(), 'data', 'ai-research-cache.json');

// In-flight read lock so concurrent writes don't clobber each other.
let writeQueue: Promise<void> = Promise.resolve();

async function readCache(): Promise<AIResearchCache> {
  try {
    const raw = await fs.readFile(CACHE_PATH, 'utf-8');
    return JSON.parse(raw) as AIResearchCache;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw err;
  }
}

async function writeCache(cache: AIResearchCache): Promise<void> {
  // Atomic write: write to a temp file, then rename.
  const tmp = `${CACHE_PATH}.tmp`;
  await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await fs.writeFile(tmp, JSON.stringify(cache, null, 2), 'utf-8');
  await fs.rename(tmp, CACHE_PATH);
}

function tickerKey(ticker: string): string {
  return ticker.trim().toUpperCase();
}

export function isResearchFresh(entry: ResearchOutput | undefined): boolean {
  if (!entry) return false;
  const ttlMs = aiConfig.cache.researchTtlDays * 24 * 60 * 60 * 1000;
  return Date.now() - entry.generatedAt < ttlMs;
}

export function isNewsFresh(entry: NewsOutput | undefined): boolean {
  if (!entry) return false;
  const ttlMs = aiConfig.cache.newsTtlHours * 60 * 60 * 1000;
  return Date.now() - entry.generatedAt < ttlMs;
}

export async function getCachedResearch(ticker: string): Promise<ResearchOutput | null> {
  const cache = await readCache();
  const entry = cache[tickerKey(ticker)]?.research;
  return entry ?? null;
}

export async function getCachedNews(ticker: string): Promise<NewsOutput | null> {
  const cache = await readCache();
  const entry = cache[tickerKey(ticker)]?.news;
  return entry ?? null;
}

export async function setCachedResearch(ticker: string, value: ResearchOutput): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    const cache = await readCache();
    const key = tickerKey(ticker);
    cache[key] = { ...cache[key], research: value };
    await writeCache(cache);
  });
  return writeQueue;
}

export async function setCachedNews(ticker: string, value: NewsOutput): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    const cache = await readCache();
    const key = tickerKey(ticker);
    cache[key] = { ...cache[key], news: value };
    await writeCache(cache);
  });
  return writeQueue;
}
