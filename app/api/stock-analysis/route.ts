import { NextResponse } from 'next/server';

const CACHE_TTL = 5 * 60 * 1000; // 5 min

export interface StockFundamentals {
  ticker: string;
  // Price
  currentPrice: number | null;
  previousClose: number | null;
  dayChangePercent: number | null;
  // Valuation
  peRatio: number | null;
  pegRatio: number | null;
  priceToBook: number | null;
  // Size
  marketCap: number | null;
  enterpriseValue: number | null;
  // Per-share
  eps: number | null;
  bookValue: number | null;
  // Income
  totalRevenue: number | null;
  grossProfit: number | null;
  profitMargin: number | null;
  returnOnEquity: number | null;
  revenueGrowthYOY: number | null;
  // Dividend & risk
  dividendYield: number | null;
  beta: number | null;
  // Range
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  fiftyDayAvg: number | null;
  twoHundredDayAvg: number | null;
  // Analyst
  recommendationMean: number | null;
  recommendationKey: string | null;
  targetMeanPrice: number | null;
  numberOfAnalysts: number | null;
  // Meta
  fetchedAt: number;
  cached: boolean;
  source: string;   // which APIs provided data
}

const cache = new Map<string, { data: StockFundamentals; fetchedAt: number }>();

function num(obj: unknown): number | null {
  if (obj === null || obj === undefined) return null;
  if (typeof obj === 'number') return isNaN(obj) ? null : obj;
  const raw = (obj as Record<string, unknown>)?.raw;
  if (typeof raw === 'number') return isNaN(raw) ? null : raw;
  const n = Number(obj);
  return isNaN(n) ? null : n;
}

function str(obj: unknown): string | null {
  if (typeof obj === 'string' && obj.trim() !== '' && obj !== 'None') return obj.trim();
  return null;
}

// ── Yahoo crumb / cookie auth ────────────────────────────────────────────────
// Yahoo started requiring a crumb cookie for quoteSummary in 2024. Cache for 24h.
const CRUMB_TTL = 24 * 60 * 60 * 1000;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
let crumbCache: { crumb: string; cookie: string; fetchedAt: number } | null = null;

async function getYahooCrumb(): Promise<{ crumb: string; cookie: string } | null> {
  if (crumbCache && Date.now() - crumbCache.fetchedAt < CRUMB_TTL) {
    return { crumb: crumbCache.crumb, cookie: crumbCache.cookie };
  }
  try {
    // Step 1: hit fc.yahoo.com to get an A1/A3 cookie
    const cookieRes = await fetch('https://fc.yahoo.com', {
      headers: { 'User-Agent': UA, Accept: '*/*' },
      redirect: 'manual',
      cache: 'no-store',
    });
    const setCookie = cookieRes.headers.get('set-cookie') ?? '';
    // Combine cookies (set-cookie can be multiple, joined by comma in undici)
    const cookie = setCookie
      .split(/,(?=\s*[A-Za-z0-9_-]+=)/)
      .map((c) => c.split(';')[0].trim())
      .filter(Boolean)
      .join('; ');
    if (!cookie) return null;

    // Step 2: ask for a crumb using that cookie
    const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
      headers: { 'User-Agent': UA, Cookie: cookie, Accept: 'text/plain' },
      cache: 'no-store',
    });
    if (!crumbRes.ok) return null;
    const crumb = (await crumbRes.text()).trim();
    if (!crumb || crumb.includes('<') || crumb.length > 64) return null;

    crumbCache = { crumb, cookie, fetchedAt: Date.now() };
    return { crumb, cookie };
  } catch {
    return null;
  }
}

// ── 1. Yahoo Finance quoteSummary (primary — no key needed) ──────────────────
async function fetchYahoo(ticker: string): Promise<Partial<StockFundamentals>> {
  const auth = await getYahooCrumb();
  const modules = 'price,summaryDetail,defaultKeyStatistics,financialData';
  const baseUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=${modules}`;
  const url = auth ? `${baseUrl}&crumb=${encodeURIComponent(auth.crumb)}` : baseUrl;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': UA,
      ...(auth ? { Cookie: auth.cookie } : {}),
    },
    cache: 'no-store',
  });
  if (res.status === 401 || res.status === 403) {
    // Invalidate crumb and retry once
    crumbCache = null;
    const retryAuth = await getYahooCrumb();
    if (retryAuth) {
      const retryRes = await fetch(`${baseUrl}&crumb=${encodeURIComponent(retryAuth.crumb)}`, {
        headers: { Accept: 'application/json', 'User-Agent': UA, Cookie: retryAuth.cookie },
        cache: 'no-store',
      });
      if (retryRes.ok) return parseYahooResponse(await retryRes.json());
    }
    throw new Error(`Yahoo Finance ${res.status}`);
  }
  if (!res.ok) throw new Error(`Yahoo Finance ${res.status}`);
  return parseYahooResponse(await res.json());
}

function parseYahooResponse(json: unknown): Partial<StockFundamentals> {
  const j = json as {
    quoteSummary?: {
      result?: Array<{
        price?: Record<string, unknown>;
        summaryDetail?: Record<string, unknown>;
        defaultKeyStatistics?: Record<string, unknown>;
        financialData?: Record<string, unknown>;
      }> | null;
      error?: unknown;
    };
  };

  if (j.quoteSummary?.error) throw new Error(String(j.quoteSummary.error));
  const r = j.quoteSummary?.result?.[0];
  if (!r) throw new Error('No data from Yahoo Finance');

  const p  = r.price                 ?? {};
  const sd = r.summaryDetail         ?? {};
  const ks = r.defaultKeyStatistics  ?? {};
  const fd = r.financialData         ?? {};

  const currentPrice = num(p.regularMarketPrice) ?? num(sd.regularMarketPrice);
  const prevClose    = num(p.regularMarketPreviousClose) ?? num(sd.previousClose);

  return {
    currentPrice,
    previousClose:     prevClose,
    dayChangePercent:  (currentPrice !== null && prevClose !== null && prevClose !== 0)
                         ? ((currentPrice - prevClose) / prevClose) * 100
                         : null,
    peRatio:           num(sd.trailingPE)   ?? num(ks.trailingPE),
    pegRatio:          num(ks.pegRatio),
    priceToBook:       num(ks.priceToBook),
    marketCap:         num(p.marketCap)     ?? num(sd.marketCap),
    enterpriseValue:   num(ks.enterpriseValue),
    eps:               num(ks.trailingEps),
    bookValue:         num(ks.bookValue),
    totalRevenue:      num(fd.totalRevenue),
    grossProfit:       num(fd.grossProfits),
    profitMargin:      num(fd.profitMargins),
    returnOnEquity:    num(fd.returnOnEquity),
    revenueGrowthYOY:  num(fd.revenueGrowth),
    dividendYield:     num(sd.dividendYield),
    beta:              num(sd.beta)         ?? num(ks.beta),
    fiftyTwoWeekHigh:  num(sd.fiftyTwoWeekHigh),
    fiftyTwoWeekLow:   num(sd.fiftyTwoWeekLow),
    fiftyDayAvg:       num(sd.fiftyDayAverage),
    twoHundredDayAvg:  num(sd.twoHundredDayAverage),
    recommendationMean: num(fd.recommendationMean),
    recommendationKey:  str(fd.recommendationKey),
    targetMeanPrice:    num(fd.targetMeanPrice),
    numberOfAnalysts:   num(fd.numberOfAnalystOpinions),
  };
}

// ── 2. Alpha Vantage (optional supplement — set ALPHA_VANTAGE_API_KEY) ────────
// Free tier: 25 req/day. Provides PEG, P/B, ROE, profit margin, target price.
// Note: Indian stock symbols need BSE format e.g. "HAL.BSE" instead of "HAL.NS"
async function fetchAlphaVantage(ticker: string): Promise<Partial<StockFundamentals>> {
  const key = process.env.ALPHA_VANTAGE_API_KEY;
  if (!key) return {};

  // Convert NSE (.NS) / BSE (.BO) to Alpha Vantage BSE format
  const avSymbol = ticker.replace('.NS', '.BSE').replace('.BO', '.BSE');
  const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(avSymbol)}&apikey=${key}`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return {};

  const data = await res.json() as Record<string, string>;
  if (!data.Symbol || data.Information?.includes('rate limit')) return {}; // rate limited or not found

  return {
    pegRatio:         num(data.PEGRatio),
    priceToBook:      num(data.PriceToBookRatio),
    bookValue:        num(data.BookValue),
    profitMargin:     num(data.ProfitMargin),
    returnOnEquity:   num(data.ReturnOnEquityTTM),
    revenueGrowthYOY: num(data.QuarterlyRevenueGrowthYOY),
    targetMeanPrice:  num(data.AnalystTargetPrice),
  };
}

// GET /api/stock-analysis?ticker=HAL.NS
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get('ticker')?.trim().toUpperCase();

  if (!ticker) return NextResponse.json({ error: 'ticker is required' }, { status: 400 });

  const hit = cache.get(ticker);
  if (hit && Date.now() - hit.fetchedAt < CACHE_TTL) {
    return NextResponse.json({ ...hit.data, cached: true });
  }

  try {
    // Run Yahoo + Alpha Vantage in parallel; either failure is non-fatal
    let yahooErr: string | null = null;
    const [yahoo, alpha] = await Promise.all([
      fetchYahoo(ticker).catch((e) => { yahooErr = String(e); return {} as Partial<StockFundamentals>; }),
      fetchAlphaVantage(ticker).catch(() => ({})),
    ]);

    const sources: string[] = [];
    if (Object.keys(yahoo).length > 0) sources.push('yahoo');
    if (Object.keys(alpha).length > 0) sources.push('alphavantage');

    if (sources.length === 0) {
      return NextResponse.json({ error: yahooErr ?? 'No fundamentals available' }, { status: 502 });
    }

    // Merge: Alpha Vantage fills gaps that Yahoo left null
    const merged = { ...yahoo };
    for (const [k, v] of Object.entries(alpha)) {
      if (v !== null && v !== undefined && merged[k as keyof typeof merged] === null) {
        (merged as Record<string, unknown>)[k] = v;
      }
    }

    const data: StockFundamentals = {
      ticker,
      currentPrice:      merged.currentPrice      ?? null,
      previousClose:     merged.previousClose      ?? null,
      dayChangePercent:  merged.dayChangePercent   ?? null,
      peRatio:           merged.peRatio            ?? null,
      pegRatio:          merged.pegRatio           ?? null,
      priceToBook:       merged.priceToBook        ?? null,
      marketCap:         merged.marketCap          ?? null,
      enterpriseValue:   merged.enterpriseValue    ?? null,
      eps:               merged.eps                ?? null,
      bookValue:         merged.bookValue          ?? null,
      totalRevenue:      merged.totalRevenue       ?? null,
      grossProfit:       merged.grossProfit        ?? null,
      profitMargin:      merged.profitMargin       ?? null,
      returnOnEquity:    merged.returnOnEquity     ?? null,
      revenueGrowthYOY:  merged.revenueGrowthYOY  ?? null,
      dividendYield:     merged.dividendYield      ?? null,
      beta:              merged.beta               ?? null,
      fiftyTwoWeekHigh:  merged.fiftyTwoWeekHigh  ?? null,
      fiftyTwoWeekLow:   merged.fiftyTwoWeekLow   ?? null,
      fiftyDayAvg:       merged.fiftyDayAvg        ?? null,
      twoHundredDayAvg:  merged.twoHundredDayAvg  ?? null,
      recommendationMean: merged.recommendationMean ?? null,
      recommendationKey:  merged.recommendationKey  ?? null,
      targetMeanPrice:   merged.targetMeanPrice    ?? null,
      numberOfAnalysts:  merged.numberOfAnalysts   ?? null,
      fetchedAt:         Date.now(),
      cached:            false,
      source:            sources.join('+'),
    };

    cache.set(ticker, { data, fetchedAt: Date.now() });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
