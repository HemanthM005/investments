import { NextResponse } from 'next/server';
import { aiConfig } from '@/lib/ai/config';
import {
  getCachedNews,
  getCachedResearch,
  getProvider,
  isNewsFresh,
  isResearchFresh,
  setCachedNews,
  setCachedResearch,
} from '@/lib/ai';
import type { ResearchInput } from '@/lib/ai/types';

type Section = 'research' | 'news';

// Per-ticker rate limit: at most N forced refreshes per hour.
const tickerLastForce = new Map<string, number>();
// Global force-refresh budget per hour.
const globalForceLog: number[] = [];

function checkRateLimits(ticker: string): { ok: true } | { ok: false; status: number; message: string; retryAfter: number } {
  const now = Date.now();
  const hour = 60 * 60 * 1000;

  // Clean old entries from global log
  while (globalForceLog.length > 0 && now - globalForceLog[0] > hour) globalForceLog.shift();

  if (globalForceLog.length >= aiConfig.globalForceRefreshPerHour) {
    return {
      ok: false,
      status: 429,
      message: 'Global hourly refresh limit reached. Try again later.',
      retryAfter: Math.ceil((globalForceLog[0] + hour - now) / 1000),
    };
  }

  const last = tickerLastForce.get(ticker.toUpperCase());
  if (last) {
    const tickerWindow = hour / aiConfig.rateLimits.refreshPerTickerPerHour;
    if (now - last < tickerWindow) {
      return {
        ok: false,
        status: 429,
        message: `Refresh for ${ticker} rate-limited. Cached value still valid.`,
        retryAfter: Math.ceil((last + tickerWindow - now) / 1000),
      };
    }
  }
  return { ok: true };
}

function recordForceRefresh(ticker: string): void {
  const now = Date.now();
  tickerLastForce.set(ticker.toUpperCase(), now);
  globalForceLog.push(now);
}

// GET /api/ai-research?ticker=HAL.NS&type=research|news
// Returns cached data if fresh; otherwise generates and caches.
// On any AI error after a cached entry exists, the cached entry is returned with a `stale: true` flag.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get('ticker')?.trim();
  const type   = (searchParams.get('type') ?? 'research') as Section;

  if (!ticker)                                return NextResponse.json({ error: 'ticker is required' }, { status: 400 });
  if (type !== 'research' && type !== 'news') return NextResponse.json({ error: 'type must be research|news' }, { status: 400 });

  // Optional: caller may pass company metadata so we don't need a separate lookup.
  const assetName = searchParams.get('assetName') ?? ticker;
  const sector    = searchParams.get('sector')    ?? '';
  const assetType = searchParams.get('assetType') ?? 'Stock';

  if (type === 'research') {
    const cached = await getCachedResearch(ticker);
    if (cached && isResearchFresh(cached)) {
      return NextResponse.json({ ...cached, cached: true });
    }
    try {
      const provider = getProvider();
      const fundamentals = parseFundamentalsParam(searchParams.get('fundamentals'));
      const result = await provider.generateResearch({ ticker, assetName, sector, assetType, fundamentals });
      await setCachedResearch(ticker, result);
      return NextResponse.json({ ...result, cached: false });
    } catch (err) {
      if (cached) return NextResponse.json({ ...cached, cached: true, stale: true, refreshError: String(err) });
      return NextResponse.json({ error: String(err) }, { status: 502 });
    }
  } else {
    const cached = await getCachedNews(ticker);
    if (cached && isNewsFresh(cached)) {
      return NextResponse.json({ ...cached, cached: true });
    }
    try {
      const provider = getProvider();
      const result = await provider.generateNews({ ticker, assetName });
      await setCachedNews(ticker, result);
      return NextResponse.json({ ...result, cached: false });
    } catch (err) {
      if (cached) return NextResponse.json({ ...cached, cached: true, stale: true, refreshError: String(err) });
      return NextResponse.json({ error: String(err) }, { status: 502 });
    }
  }
}

// POST /api/ai-research  body: { ticker, type, assetName?, sector?, assetType?, fundamentals?, force?: boolean }
// `force: true` bypasses cache (subject to rate limits).
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as null | {
    ticker?: string;
    type?: Section;
    assetName?: string;
    sector?: string;
    assetType?: string;
    fundamentals?: ResearchInput['fundamentals'];
    force?: boolean;
  };

  if (!body?.ticker)                                          return NextResponse.json({ error: 'ticker is required' }, { status: 400 });
  const type = body.type ?? 'research';
  if (type !== 'research' && type !== 'news')                 return NextResponse.json({ error: 'type must be research|news' }, { status: 400 });

  const ticker = body.ticker.trim();
  const force  = !!body.force;

  if (force) {
    const rl = checkRateLimits(ticker);
    if (!rl.ok) {
      return NextResponse.json(
        { error: rl.message, retryAfter: rl.retryAfter },
        { status: rl.status, headers: { 'Retry-After': String(rl.retryAfter) } },
      );
    }
  }

  const provider = getProvider();
  try {
    if (type === 'research') {
      if (!force) {
        const cached = await getCachedResearch(ticker);
        if (cached && isResearchFresh(cached)) return NextResponse.json({ ...cached, cached: true });
      }
      const result = await provider.generateResearch({
        ticker,
        assetName: body.assetName ?? ticker,
        sector:    body.sector    ?? '',
        assetType: body.assetType ?? 'Stock',
        fundamentals: body.fundamentals,
      });
      await setCachedResearch(ticker, result);
      if (force) recordForceRefresh(ticker);
      return NextResponse.json({ ...result, cached: false });
    } else {
      if (!force) {
        const cached = await getCachedNews(ticker);
        if (cached && isNewsFresh(cached)) return NextResponse.json({ ...cached, cached: true });
      }
      const result = await provider.generateNews({
        ticker,
        assetName: body.assetName ?? ticker,
      });
      await setCachedNews(ticker, result);
      if (force) recordForceRefresh(ticker);
      return NextResponse.json({ ...result, cached: false });
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}

function parseFundamentalsParam(raw: string | null): ResearchInput['fundamentals'] | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as ResearchInput['fundamentals'];
  } catch {
    return undefined;
  }
}
