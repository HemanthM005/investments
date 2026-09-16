// Maps an account name mentioned in an SMS onto one of the user's accounts.
//
// Bank messages write names loosely — "HDFC Bank Credit Card XX7788",
// "A/c XX1234", "ICICI Savings" — so this scores candidates rather than
// looking for an exact match. It deliberately returns null when nothing
// scores well: leaving a field blank is better than silently filing a
// transfer against the wrong account.

import type { AssetAccount } from './types';

const STOPWORDS = new Set([
  'bank', 'account', 'ac', 'a', 'card', 'xx', 'the', 'your', 'my', 'ending', 'no',
]);

function normalize(s: string): string {
  return s
    .toLowerCase()
    // "xx1234" / "****1234" is a masked account number, not a word — keep only
    // the digits so it can't be compared against an account's name.
    .replace(/[x*•]{2,}\s*(\d+)/g, ' $1 ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokens(s: string): string[] {
  return normalize(s)
    .split(' ')
    // Pure digit runs are handled by digitGroups, never as words. Fragments
    // shorter than three characters are dropped too — a stray "c" from "A/c"
    // otherwise substring-matches "icici".
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

/** Trailing digit groups, e.g. "XX7788" → "7788". Masked digits are dropped. */
function digitGroups(s: string): string[] {
  return (s.match(/\d{4,}/g) ?? []).map((d) => d.slice(-4));
}

const isCard = (a: AssetAccount) => /credit card/i.test(a.category);

export interface MatchOptions {
  /** 'card' prefers credit cards, 'funding' prefers everything else. */
  prefer?: 'card' | 'funding';
}

/** Best matching account id, or null when nothing is convincing enough. */
export function matchAccount(
  query: string | null | undefined,
  accounts: AssetAccount[],
  { prefer }: MatchOptions = {}
): string | null {
  if (!query) return null;

  const qTokens = tokens(query);
  const qDigits = digitGroups(query);
  if (!qTokens.length && !qDigits.length) return null;

  let best: { id: string; score: number } | null = null;

  for (const a of accounts) {
    const aTokens = tokens(a.name);

    // Evidence that this is actually the same account: a shared word or a
    // matching last-4. Category and preference bonuses are tie-breakers and
    // must never be enough on their own, or "Paytm Wallet" would match any
    // wallet the user happens to own.
    let content = 0;
    for (const t of qTokens) {
      if (aTokens.includes(t)) content += 3;
      else if (aTokens.some((x) => x.length > 3 && (x.includes(t) || t.includes(x)))) content += 2;
    }
    const aDigits = digitGroups(a.name);
    if (qDigits.length && aDigits.some((d) => qDigits.includes(d))) content += 6;

    if (content === 0) continue; // no evidence — never guess

    let score = content;

    // A card payment's destination must be a card; its source must not be.
    if (prefer === 'card') score += isCard(a) ? 2 : -3;
    if (prefer === 'funding') score += isCard(a) ? -3 : 1;

    // "ICICI Savings" should beat the ICICI fixed deposit.
    if (qTokens.some((t) => ['savings', 'saving'].includes(t)) && /savings/i.test(a.category)) score += 2;
    if (qTokens.some((t) => ['fd', 'deposit'].includes(t)) && /deposit/i.test(a.category)) score += 2;
    if (qTokens.some((t) => ['wallet', 'upi'].includes(t)) && /wallet/i.test(a.category)) score += 2;
    if (qTokens.some((t) => ['cash'].includes(t)) && /cash/i.test(a.category)) score += 2;

    if (score > (best?.score ?? 0)) best = { id: a.id, score };
  }

  return best && best.score >= 3 ? best.id : null;
}
