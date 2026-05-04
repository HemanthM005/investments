import { NextResponse } from 'next/server';

export interface PricePoint {
  date: string;   // YYYY-MM-DD
  close: number;
  open: number;
  high: number;
  low: number;
  volume: number;
}

export type HistoryRange = '1mo' | '3mo' | '6mo' | '1y' | '2y';

// Cache: `${ticker}:${range}` → { data, fetchedAt }
const cache = new Map<string, { data: PricePoint[]; fetchedAt: number }>();

const TTL: Record<HistoryRange, number> = {
  '1mo': 30 * 60 * 1000,   // 30 min
  '3mo': 60 * 60 * 1000,   // 1 hr
  '6mo': 60 * 60 * 1000,
  '1y':  2  * 60 * 60 * 1000,
  '2y':  4  * 60 * 60 * 1000,
};

const INTERVAL: Record<HistoryRange, string> = {
  '1mo': '1d',
  '3mo': '1d',
  '6mo': '1d',
  '1y':  '1wk',
  '2y':  '1wk',
};

// ── Yahoo crumb / cookie (cached 24h) — chart endpoint sometimes 401s without it
const CRUMB_TTL = 24 * 60 * 60 * 1000;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
let crumbCache: { cookie: string; fetchedAt: number } | null = null;

async function getYahooCookie(): Promise<string | null> {
  if (crumbCache && Date.now() - crumbCache.fetchedAt < CRUMB_TTL) return crumbCache.cookie;
  try {
    const res = await fetch('https://fc.yahoo.com', {
      headers: { 'User-Agent': UA, Accept: '*/*' },
      redirect: 'manual',
      cache: 'no-store',
    });
    const setCookie = res.headers.get('set-cookie') ?? '';
    const cookie = setCookie
      .split(/,(?=\s*[A-Za-z0-9_-]+=)/)
      .map((c) => c.split(';')[0].trim())
      .filter(Boolean)
      .join('; ');
    if (!cookie) return null;
    crumbCache = { cookie, fetchedAt: Date.now() };
    return cookie;
  } catch {
    return null;
  }
}

// ── Yahoo Finance chart (primary — no key needed) ─────────────────────────────
async function fetchYahoo(ticker: string, range: HistoryRange): Promise<PricePoint[]> {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${range}&interval=${INTERVAL[range]}`;
  const cookie = await getYahooCookie();
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': UA,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    cache: 'no-store',
  });
  if (res.status === 401 || res.status === 403) {
    crumbCache = null;
    const retryCookie = await getYahooCookie();
    if (retryCookie) {
      const retryRes = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': UA, Cookie: retryCookie },
        cache: 'no-store',
      });
      if (retryRes.ok) return parseYahooChart(await retryRes.json());
    }
    throw new Error(`Yahoo Finance ${res.status}`);
  }
  if (!res.ok) throw new Error(`Yahoo Finance ${res.status}`);
  return parseYahooChart(await res.json());
}

function parseYahooChart(json: unknown): PricePoint[] {
  const j = json as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: { quote?: Array<{ open?: number[]; high?: number[]; low?: number[]; close?: number[]; volume?: number[] }> };
      }> | null;
      error?: unknown;
    };
  };

  if (j.chart?.error) throw new Error(String(j.chart.error));
  const r = j.chart?.result?.[0];
  if (!r) throw new Error('No data from Yahoo Finance');

  const timestamps = r.timestamp ?? [];
  const q = r.indicators?.quote?.[0] ?? {};
  const points: PricePoint[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const close = q.close?.[i];
    if (!close || isNaN(close)) continue;
    points.push({
      date:   new Date(timestamps[i] * 1000).toISOString().slice(0, 10),
      close:  Math.round(close * 100) / 100,
      open:   Math.round((q.open?.[i]   ?? close) * 100) / 100,
      high:   Math.round((q.high?.[i]   ?? close) * 100) / 100,
      low:    Math.round((q.low?.[i]    ?? close) * 100) / 100,
      volume: Math.round(q.volume?.[i]  ?? 0),
    });
  }
  return points;
}

// ── Twelve Data (fallback — set TWELVE_DATA_API_KEY in .env.local) ───────────
// Free tier: 800 req/day, better international coverage than Alpha Vantage
async function fetchTwelveData(ticker: string, range: HistoryRange): Promise<PricePoint[]> {
  const key = process.env.TWELVE_DATA_API_KEY;
  if (!key) throw new Error('No Twelve Data key');

  // Twelve Data uses outputsize or start_date. Use outputsize based on range.
  const outputSize: Record<HistoryRange, number> = { '1mo': 30, '3mo': 90, '6mo': 180, '1y': 365, '2y': 730 };
  const interval = INTERVAL[range] === '1wk' ? '1week' : '1day';

  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(ticker)}&interval=${interval}&outputsize=${outputSize[range]}&apikey=${key}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Twelve Data ${res.status}`);

  const json = await res.json() as {
    status?: string;
    message?: string;
    values?: Array<{ datetime: string; open: string; high: string; low: string; close: string; volume: string }>;
  };

  if (json.status === 'error') throw new Error(json.message ?? 'Twelve Data error');
  if (!json.values?.length) throw new Error('No data from Twelve Data');

  return json.values
    .map((v) => ({
      date:   v.datetime.slice(0, 10),
      close:  parseFloat(v.close),
      open:   parseFloat(v.open),
      high:   parseFloat(v.high),
      low:    parseFloat(v.low),
      volume: parseInt(v.volume, 10) || 0,
    }))
    .filter((p) => !isNaN(p.close))
    .reverse(); // Twelve Data returns newest first
}

// GET /api/price-history?ticker=HAL.NS&range=6mo
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get('ticker')?.trim().toUpperCase();
  const range  = (searchParams.get('range') ?? '6mo') as HistoryRange;

  if (!ticker) return NextResponse.json({ error: 'ticker is required' }, { status: 400 });
  if (!['1mo', '3mo', '6mo', '1y', '2y'].includes(range))
    return NextResponse.json({ error: 'invalid range' }, { status: 400 });

  const cacheKey = `${ticker}:${range}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.fetchedAt < TTL[range]) {
    return NextResponse.json({ ticker, range, points: hit.data, cached: true, source: 'cache' });
  }

  // Try Yahoo Finance first, fall back to Twelve Data
  let points: PricePoint[] | null = null;
  let source = 'yahoo';
  let error: string | null = null;

  try {
    points = await fetchYahoo(ticker, range);
  } catch (e) {
    error = String(e);
    try {
      points = await fetchTwelveData(ticker, range);
      source = 'twelvedata';
      error = null;
    } catch (e2) {
      error = `Yahoo: ${error} | TwelveData: ${String(e2)}`;
    }
  }

  if (!points || points.length === 0) {
    return NextResponse.json({ error: error ?? 'No price history data' }, { status: 502 });
  }

  cache.set(cacheKey, { data: points, fetchedAt: Date.now() });
  return NextResponse.json({ ticker, range, points, cached: false, source });
}
