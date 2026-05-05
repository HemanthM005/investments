import type { NewsInput } from '../types';

export function buildNewsPrompt(input: NewsInput): { system: string; user: string } {
  const lookback = input.lookbackDays ?? 30;

  const system = `You are a financial news curator. Surface 3-5 substantive, recent news items for a single ticker.

OUTPUT FORMAT — STRICT JSON:
Return ONLY a JSON array, no prose, no code fences. Schema:
[
  {
    "headline": "string (concise, 8-15 words)",
    "summary":  "string (1-2 sentences, factual)",
    "date":     "YYYY-MM-DD or null if unknown",
    "url":      "string (canonical source URL)"
  }
]

SELECTION RULES:
- Filter to material company news only: earnings, orders/contracts, M&A, regulatory actions, leadership changes, guidance, major partnerships, credit-rating changes.
- Exclude: stock-price commentary, target-price changes by analysts, generic "stock surges/falls" headlines, opinion pieces, and rumor/speculation.
- Only include items from the last ${lookback} days.
- Source preference: company press releases > BSE/NSE/SEC filings > Reuters/Bloomberg > Moneycontrol/Economic Times. Avoid anonymous blogs and tip sites.
- If fewer than 3 substantive items exist in the window, return only what qualifies — do not pad.
- Sort newest first.`;

  const user = `Find recent news for:

Company: ${input.assetName}
Ticker: ${input.ticker}
Window: last ${lookback} days
Today: ${new Date().toISOString().slice(0, 10)}`;

  return { system, user };
}
