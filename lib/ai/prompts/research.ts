import type { ResearchInput } from '../types';

// The drawer's parseResearch() function expects markdown of the form:
//   **Section Title**
//   - bullet line
//   - bullet line
//
// These section names match SECTION_META in components/ResearchModal.tsx so the
// AI output renders with the exact same colors, icons, and layout as Paras.

const REQUIRED_SECTIONS = [
  'Executive Summary',
  'Company Overview',
  'Recent Financials',
  'Key Orders & Partnerships',
  'Competitive Position & Moat',
  'Management & Ownership',
  'Valuation Metrics',
  'Analyst Coverage & Targets',
  'Risks',
  'Financial Snapshot',
  'Final Verdict',
] as const;

function fmtFundamentals(f: ResearchInput['fundamentals']): string {
  if (!f) return 'No live fundamentals available — rely on web sources.';
  const rows: string[] = [];
  if (f.currentPrice != null)     rows.push(`- Current price: ${f.currentPrice}`);
  if (f.marketCap != null)        rows.push(`- Market cap: ${f.marketCap}`);
  if (f.peRatio != null)          rows.push(`- P/E ratio: ${f.peRatio}`);
  if (f.eps != null)              rows.push(`- EPS (TTM): ${f.eps}`);
  if (f.bookValue != null)        rows.push(`- Book value: ${f.bookValue}`);
  if (f.fiftyTwoWeekHigh != null) rows.push(`- 52-week high: ${f.fiftyTwoWeekHigh}`);
  if (f.fiftyTwoWeekLow != null)  rows.push(`- 52-week low: ${f.fiftyTwoWeekLow}`);
  if (f.dividendYield != null)    rows.push(`- Dividend yield: ${(f.dividendYield * 100).toFixed(2)}%`);
  if (f.beta != null)             rows.push(`- Beta: ${f.beta}`);
  if (f.profitMargin != null)     rows.push(`- Profit margin: ${(f.profitMargin * 100).toFixed(2)}%`);
  if (f.returnOnEquity != null)   rows.push(`- Return on equity: ${(f.returnOnEquity * 100).toFixed(2)}%`);
  if (f.revenueGrowthYOY != null) rows.push(`- Revenue growth YoY: ${(f.revenueGrowthYOY * 100).toFixed(2)}%`);
  if (f.targetMeanPrice != null)  rows.push(`- Analyst target: ${f.targetMeanPrice}`);
  return rows.length ? rows.join('\n') : 'No live fundamentals available — rely on web sources.';
}

export function buildResearchPrompt(input: ResearchInput): {
  system: string;
  user: string;
  requiredSections: readonly string[];
} {
  const system = `You are an equity research analyst writing a structured deep-dive note for a personal investor.

OUTPUT FORMAT — STRICT:
Return ONLY a markdown research note with these exact section headings, in this order, each as **Bold Title** on its own line followed by bulleted lines starting with "- ":

${REQUIRED_SECTIONS.map((s) => `**${s}**`).join('\n')}

Use 3-7 bullets per section. Each bullet must be a single concise sentence. No paragraphs. No additional sections.

SOURCE QUALITY RULES:
- Prioritize: official filings (BSE, NSE, SEC EDGAR), company annual reports, IR pages, screener.in, trendlyne, moneycontrol, reuters, bloomberg.
- Avoid: anonymous blogs, paid newsletters, stock-tip sites, social media speculation.
- Cite a source URL inline at the end of any bullet that contains a numerical claim, in the form (source: <url>).
- If a fact cannot be verified from a quality source, mark the bullet "(unverified)" — do not invent.

CONTENT RULES:
- Use the LIVE FUNDAMENTALS provided below as authoritative ground truth — do not contradict them.
- Recent Financials: most recent 2-3 quarterly results with revenue, profit, margin trends.
- Risks: at least 3 substantive risks; do not include generic "market risk" filler.
- Financial Snapshot: 4-6 key metric bullets in "Label: Value" form (e.g. "- P/E: 32.5", "- Market cap: ₹50,000 Cr").
- Final Verdict: this is the actionable bottom-line section. Include EXACTLY these 6 bullets in this order:
    - "Valuation: <Overvalued | Fairly valued | Undervalued> — <one-sentence reasoning citing P/E, P/B, growth, peer comparison>"
    - "Suggested entry zone: <price range, e.g. ₹3,200-3,500> — <one-sentence reasoning>"
    - "Short-term outlook (6-12 months): <Bullish | Neutral | Bearish> — <one-sentence reasoning citing near-term catalysts or headwinds>"
    - "Long-term outlook (3-5 years): <Bullish | Neutral | Bearish> — <one-sentence reasoning citing structural drivers>"
    - "Action: <Strong Buy | Buy | Hold | Wait for dip | Avoid> — <one-sentence justification>"
    - "Confidence: <High | Medium | Low> — <one-sentence justification based on data quality and how unanimous the signals are>"
  Be decisive — do not hedge with "depends on your goals" or "consult an advisor". The investor knows it's not advice.
- Do not include disclaimers, summaries about yourself, or wrapping prose. Output the markdown note only.`;

  const user = `Generate the research note for:

Company: ${input.assetName}
Ticker: ${input.ticker}
Asset type: ${input.assetType}
Sector: ${input.sector}

LIVE FUNDAMENTALS (ground truth):
${fmtFundamentals(input.fundamentals)}

Today's date: ${new Date().toISOString().slice(0, 10)}`;

  return { system, user, requiredSections: REQUIRED_SECTIONS };
}
