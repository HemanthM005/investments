import { NextResponse } from 'next/server';

const PRICE_CACHE_TTL = 5 * 60 * 1000;    // 5 min  — crypto / stock / gold
const FX_CACHE_TTL   = 60 * 60 * 1000;   // 1 hour — exchange rate
const MF_CACHE_TTL   = 4 * 60 * 60 * 1000; // 4 hrs — MF NAV updates once/day

const TROY_OZ_TO_GRAMS = 31.1035;

// ── Module-level caches ───────────────────────────────────────────────────────
const cache: {
  prices:  { data: Record<string, number>; fetchedAt: number } | null; // coin_id → USD
  stock:   { data: Record<string, number>; fetchedAt: number } | null; // ticker → INR
  mf:      { data: Record<string, number>; fetchedAt: number } | null; // scheme_code → INR NAV
  gold:    { usdPerGram: number; fetchedAt: number } | null;
  fx:      { usdToInr: number; fetchedAt: number } | null;
} = { prices: null, stock: null, mf: null, gold: null, fx: null };

// ── USD → INR exchange rate via Frankfurter (ECB data, free, no key) ─────────
async function fetchUsdToInr(): Promise<number> {
  const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=INR', {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Frankfurter error: ${res.status}`);
  const data = await res.json() as { rates: { INR: number } };
  return data.rates.INR;
}

async function getUsdToInr(): Promise<number> {
  const hit = cache.fx;
  if (hit && (Date.now() - hit.fetchedAt) < FX_CACHE_TTL) return hit.usdToInr;
  const usdToInr = await fetchUsdToInr();
  cache.fx = { usdToInr, fetchedAt: Date.now() };
  return usdToInr;
}

// ── Crypto prices in USD via CoinGecko ───────────────────────────────────────
async function fetchUsdPrices(ids: string[]): Promise<Record<string, number>> {
  const key = process.env.COINGECKO_API_KEY;
  const url  = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd${key ? `&x_cg_demo_api_key=${key}` : ''}`;

  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
    cache: 'no-store',
  });

  const raw = await res.json() as Record<string, { usd?: number }>;

  if (!res.ok) throw new Error(`CoinGecko ${res.status}: ${JSON.stringify(raw)}`);

  const prices: Record<string, number> = {};
  for (const [id, val] of Object.entries(raw)) {
    if (val && typeof val.usd === 'number') prices[id] = val.usd;
  }
  return prices;
}

// ── NSE/BSE stock prices via Yahoo Finance (ticker.NS or ticker.BO) ──────────
// Prices are already in INR — no conversion needed
async function fetchStockPrices(tickers: string[]): Promise<Record<string, number>> {
  const results = await Promise.allSettled(
    tickers.map(async (ticker) => {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`,
        { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' },
      );
      if (!res.ok) throw new Error(`${ticker}: HTTP ${res.status}`);
      const data = await res.json() as {
        chart: { result: Array<{ meta: { regularMarketPrice: number } }> | null };
      };
      const price = data.chart.result?.[0]?.meta?.regularMarketPrice;
      if (typeof price !== 'number') throw new Error(`${ticker}: no price in response`);
      return [ticker, price] as [string, number];
    }),
  );

  const prices: Record<string, number> = {};
  for (const r of results) {
    if (r.status === 'fulfilled') prices[r.value[0]] = r.value[1];
  }
  return prices;
}

// ── Mutual Fund NAV via mfapi.in (AMFI scheme code → INR NAV) ────────────────
// NAV updates once per day after market close (~9 PM IST). 4-hour cache is fine.
async function fetchMfNavs(schemeCodes: string[]): Promise<Record<string, number>> {
  const results = await Promise.allSettled(
    schemeCodes.map(async (code) => {
      const res = await fetch(`https://api.mfapi.in/mf/${code}/latest`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`mfapi ${code}: HTTP ${res.status}`);
      const data = await res.json() as {
        status: string;
        data: Array<{ date: string; nav: string }>;
      };
      if (data.status !== 'SUCCESS' || !data.data?.[0]?.nav)
        throw new Error(`mfapi ${code}: no NAV in response`);
      const nav = parseFloat(data.data[0].nav);
      if (isNaN(nav)) throw new Error(`mfapi ${code}: invalid NAV "${data.data[0].nav}"`);
      return [code, nav] as [string, number];
    }),
  );

  const navs: Record<string, number> = {};
  for (const r of results) {
    if (r.status === 'fulfilled') navs[r.value[0]] = r.value[1];
  }
  return navs;
}

// ── India 24K gold price via COMEX (Yahoo Finance GC=F) + India duty ─────────
// COMEX gives international USD/oz. India domestic price includes:
//   Basic Customs Duty (6%) + Agriculture Cess (5%) + GST (3%) ≈ 13% premium
// Last verified vs goodreturns.in Hyderabad rate: 2026-03-19
const INDIA_GOLD_DUTY_FACTOR = 1.13;

async function getGoldInrPerGram(): Promise<number> {
  const hit = cache.gold;
  if (hit && (Date.now() - hit.fetchedAt) < PRICE_CACHE_TTL) return hit.usdPerGram; // stored as INR/gram

  const res = await fetch(
    'https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=1d',
    { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' },
  );
  if (!res.ok) throw new Error(`Yahoo Finance error: ${res.status}`);
  const data = await res.json() as { chart: { result: Array<{ meta: { regularMarketPrice: number } }> } };
  const usdPerOz = data.chart.result[0].meta.regularMarketPrice;

  const usdToInr = await getUsdToInr();
  const inrPerGram = Math.round((usdPerOz / TROY_OZ_TO_GRAMS) * usdToInr * INDIA_GOLD_DUTY_FACTOR * 100) / 100;

  cache.gold = { usdPerGram: inrPerGram, fetchedAt: Date.now() }; // field reused for INR/gram
  return inrPerGram;
}

// ── GET /api/prices?type=crypto&ids=ripple,internet-computer ─────────────────
// ── GET /api/prices?type=gold&ids=XAU ────────────────────────────────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type  = searchParams.get('type');
  const ids   = searchParams.get('ids')?.split(',').filter(Boolean) ?? [];
  const debug = searchParams.get('debug') === 'true';

  if (!type || ids.length === 0) {
    return NextResponse.json({ error: 'type and ids are required' }, { status: 400 });
  }

  if (type === 'crypto') {
    try {
      // 1. Get USD prices (use cache if fresh)
      let usdPrices: Record<string, number>;
      const priceHit = cache.prices;
      const pricesFresh = priceHit && (Date.now() - priceHit.fetchedAt) < PRICE_CACHE_TTL;
      const allCached   = pricesFresh && ids.every((id) => id in priceHit!.data);

      if (allCached) {
        usdPrices = Object.fromEntries(ids.map((id) => [id, priceHit!.data[id]]));
      } else {
        const fresh = await fetchUsdPrices(ids);
        cache.prices = {
          data: { ...priceHit?.data, ...fresh },
          fetchedAt: Date.now(),
        };
        usdPrices = fresh;
      }

      // 2. Get USD → INR rate (cached for 1 hour)
      const usdToInr = await getUsdToInr();

      // 3. Convert to INR
      const prices: Record<string, number> = {};
      for (const [id, usd] of Object.entries(usdPrices)) {
        prices[id] = Math.round(usd * usdToInr * 100) / 100; // round to 2 dp
      }

      const gotPrices = Object.keys(prices).length > 0;

      return NextResponse.json({
        prices,
        usdToInr,                        // expose rate for display
        cached: allCached,
        fetchedAt: cache.prices!.fetchedAt,
        fxFetchedAt: cache.fx!.fetchedAt,
        ...(!gotPrices && {
          hint: !process.env.COINGECKO_API_KEY
            ? 'Add COINGECKO_API_KEY to .env.local — get a free key at coingecko.com/en/api'
            : 'CoinGecko returned no data — verify coin IDs (XRP = "ripple", BTC = "bitcoin")',
        }),
        ...(debug && { usdPrices }),
      });
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 502 });
    }
  }

  if (type === 'stock') {
    try {
      const stockHit = cache.stock;
      const fresh     = stockHit && (Date.now() - stockHit.fetchedAt) < PRICE_CACHE_TTL;
      const allCached = fresh && ids.every((id) => id in stockHit!.data);

      let prices: Record<string, number>;
      if (allCached) {
        prices = Object.fromEntries(ids.map((id) => [id, stockHit!.data[id]]));
      } else {
        const fetched = await fetchStockPrices(ids);
        cache.stock = { data: { ...stockHit?.data, ...fetched }, fetchedAt: Date.now() };
        prices = fetched;
      }

      const missing = ids.filter((id) => !(id in prices));
      return NextResponse.json({
        prices,
        cached: allCached,
        fetchedAt: cache.stock!.fetchedAt,
        ...(missing.length > 0 && {
          hint: `No price for: ${missing.join(', ')} — use NSE ticker + .NS (e.g. HAL.NS, TATAPOW.NS)`,
        }),
      });
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 502 });
    }
  }

  if (type === 'mf') {
    try {
      const mfHit    = cache.mf;
      const fresh     = mfHit && (Date.now() - mfHit.fetchedAt) < MF_CACHE_TTL;
      const allCached = fresh && ids.every((id) => id in mfHit!.data);

      let prices: Record<string, number>;
      if (allCached) {
        prices = Object.fromEntries(ids.map((id) => [id, mfHit!.data[id]]));
      } else {
        const fetched = await fetchMfNavs(ids);
        cache.mf = { data: { ...mfHit?.data, ...fetched }, fetchedAt: Date.now() };
        prices = fetched;
      }

      const missing = ids.filter((id) => !(id in prices));
      return NextResponse.json({
        prices,
        cached: allCached,
        fetchedAt: cache.mf!.fetchedAt,
        ...(missing.length > 0 && {
          hint: `No NAV for scheme(s): ${missing.join(', ')} — find the AMFI code at mfapi.in`,
        }),
      });
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 502 });
    }
  }

  if (type === 'gold') {
    try {
      const inrPerGram = await getGoldInrPerGram();
      return NextResponse.json({
        prices: { XAU: inrPerGram },
        dutyFactor: INDIA_GOLD_DUTY_FACTOR,
        fetchedAt: cache.gold!.fetchedAt,
        fxFetchedAt: cache.fx?.fetchedAt,
        ...(debug && { source: 'COMEX GC=F via Yahoo Finance + India duty factor' }),
      });
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 502 });
    }
  }

  return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
}
