import fs from 'node:fs/promises';
import path from 'node:path';

const USAGE_PATH = path.join(process.cwd(), 'data', 'ai-usage.json');

export interface UsageEntry {
  timestamp: number;        // ms since epoch
  ticker: string;
  type: 'research' | 'news';
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  cached: boolean;          // true if served from cache (no tokens consumed)
  forced: boolean;          // true if force-refresh bypassed cache
  failed?: boolean;         // true if generation threw (still counted because tokens were consumed)
  error?: string;           // present when failed: short error message for debugging
}

let writeQueue: Promise<void> = Promise.resolve();

async function readUsage(): Promise<UsageEntry[]> {
  try {
    const raw = await fs.readFile(USAGE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as UsageEntry[]) : [];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    // If the file is corrupt, don't blow up the request — start fresh.
    return [];
  }
}

export async function logUsage(entry: UsageEntry): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    const all = await readUsage();
    all.push(entry);
    const tmp = `${USAGE_PATH}.tmp`;
    await fs.mkdir(path.dirname(USAGE_PATH), { recursive: true });
    await fs.writeFile(tmp, JSON.stringify(all, null, 2), 'utf-8');
    await fs.rename(tmp, USAGE_PATH);
  });
  // Don't surface logger failures to the caller — usage logging is best-effort.
  return writeQueue.catch(() => undefined);
}
