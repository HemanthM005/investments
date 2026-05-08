import type { NewsInput } from '../types';

export function buildNewsPrompt(input: NewsInput): { system: string; user: string } {
  const lookback = input.lookbackDays ?? 30;
  const isCrypto = (input.assetType ?? '').toLowerCase() === 'crypto';

  const subject     = isCrypto ? 'protocol/project'                : 'company';
  const newsKinds   = isCrypto
    ? 'protocol upgrades, mainnet/fork events, exchange listings, regulatory actions, major partnerships, security incidents, governance votes, treasury/foundation announcements'
    : 'earnings, orders/contracts, M&A, regulatory actions, leadership changes, guidance, major partnerships, credit-rating changes';
  const sources     = isCrypto
    ? 'official project blog/foundation announcements > major news (CoinDesk, The Block, Reuters) > exchange announcements. Avoid anonymous Twitter threads and tip sites.'
    : 'company press releases > BSE/NSE/SEC filings > Reuters/Bloomberg > Moneycontrol/Economic Times. Avoid anonymous blogs and tip sites.';

  const system = `You are a financial news curator. Surface 3-5 substantive, recent news items for a single ${subject}.

OUTPUT FORMAT — STRICT JSON:
Return ONLY a JSON array, no prose, no code fences, no explanation. Schema:
[
  {
    "headline": "string (concise, 8-15 words)",
    "summary":  "string (1-2 sentences, factual)",
    "date":     "YYYY-MM-DD or null if unknown",
    "url":      "string (canonical source URL)"
  }
]

EMPTY RESULT RULE — CRITICAL:
If you find NO qualifying items (unknown ticker, no news in window, search returned nothing), return exactly: []
Do NOT explain. Do NOT apologise. Do NOT say "I could not find". The output must be parseable JSON in every case.

SELECTION RULES:
- Filter to material ${subject} news only: ${newsKinds}.
- Exclude: price commentary, analyst target changes, generic "surges/falls" headlines, opinion pieces, rumors.
- Only include items from the last ${lookback} days.
- Source preference: ${sources}
- If fewer than 3 substantive items exist in the window, return only what qualifies — do not pad.
- Sort newest first.`;

  const user = `Find recent news for:

${isCrypto ? 'Project' : 'Company'}: ${input.assetName}
${isCrypto ? 'Symbol' : 'Ticker'}: ${input.ticker}
Window: last ${lookback} days
Today: ${new Date().toISOString().slice(0, 10)}`;

  return { system, user };
}
