import { NextResponse } from 'next/server';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const cache: {
  crypto: { prices: Record<string, number>; fetchedAt: number } | null;
} = { crypto: null };

async function fetchCryptoPrices(ids: string[]): Promise<{
  prices: Record<string, number>;
  rawBody: unknown;
}> {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=inr`;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0',
  };

  // Use Demo API key if set in .env.local  (free at coingecko.com/en/api)
  const apiKey = process.env.COINGECKO_API_KEY;
  if (apiKey) headers['x-cg-demo-api-key'] = apiKey;

  const res = await fetch(url, { headers, cache: 'no-store' });

  const rawBody = await res.json();

  if (!res.ok) {
    throw new Error(`CoinGecko ${res.status}: ${JSON.stringify(rawBody)}`);
  }

  // CoinGecko returns: { "bitcoin": { "inr": 6800000 }, ... }
  // If rate-limited without a key it returns {} — check for that
  const data = rawBody as Record<string, { inr?: number }>;
  const prices: Record<string, number> = {};

  for (const [id, val] of Object.entries(data)) {
    if (val && typeof val.inr === 'number') {
      prices[id] = val.inr;
    }
  }

  return { prices, rawBody };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type  = searchParams.get('type');
  const ids   = searchParams.get('ids')?.split(',').filter(Boolean) ?? [];
  const debug = searchParams.get('debug') === 'true';

  if (!type || ids.length === 0) {
    return NextResponse.json({ error: 'type and ids are required' }, { status: 400 });
  }

  if (type === 'crypto') {
    const hit     = cache.crypto;
    const isFresh = hit && (Date.now() - hit.fetchedAt) < CACHE_TTL;

    if (isFresh) {
      const prices = Object.fromEntries(
        ids.filter((id) => id in hit!.prices).map((id) => [id, hit!.prices[id]])
      );
      if (Object.keys(prices).length === ids.length) {
        return NextResponse.json({ prices, cached: true, fetchedAt: hit!.fetchedAt });
      }
    }

    try {
      const { prices, rawBody } = await fetchCryptoPrices(ids);

      cache.crypto = { prices: { ...cache.crypto?.prices, ...prices }, fetchedAt: Date.now() };

      const noKey = !process.env.COINGECKO_API_KEY;
      const gotPrices = Object.keys(prices).length > 0;

      return NextResponse.json({
        prices,
        cached: false,
        fetchedAt: cache.crypto.fetchedAt,
        // Always show hint when prices are empty
        ...((!gotPrices) && {
          hint: noKey
            ? 'CoinGecko returned empty data — add a free COINGECKO_API_KEY to .env.local (see coingecko.com/en/api)'
            : 'CoinGecko returned empty data — check the coin IDs are correct',
        }),
        // Include raw response when ?debug=true or prices are empty
        ...((debug || !gotPrices) && { rawBody }),
      });
    } catch (err) {
      if (cache.crypto) {
        return NextResponse.json({
          prices: cache.crypto.prices,
          cached: true,
          stale: true,
          fetchedAt: cache.crypto.fetchedAt,
          error: String(err),
        });
      }
      return NextResponse.json({ error: String(err) }, { status: 502 });
    }
  }

  return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
}
