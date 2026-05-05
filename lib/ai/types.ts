// Contract every AI provider must implement. Adding a new provider = create a
// file in lib/ai/providers/<name>.ts that exports an AIProvider conforming to this.

export interface ResearchInput {
  ticker: string;
  assetName: string;
  sector: string;
  assetType: string;
  // Yahoo public data injected as ground truth so the model doesn't re-derive
  // numbers and hallucinate. Pass through what we already have.
  fundamentals?: {
    currentPrice?: number | null;
    marketCap?: number | null;
    peRatio?: number | null;
    eps?: number | null;
    bookValue?: number | null;
    fiftyTwoWeekHigh?: number | null;
    fiftyTwoWeekLow?: number | null;
    dividendYield?: number | null;
    beta?: number | null;
    profitMargin?: number | null;
    returnOnEquity?: number | null;
    revenueGrowthYOY?: number | null;
    targetMeanPrice?: number | null;
  };
}

export interface NewsInput {
  ticker: string;
  assetName: string;
  // Look-back window. Default 30 days.
  lookbackDays?: number;
}

export interface Citation {
  url: string;
  title?: string;
}

export interface ResearchOutput {
  // Free-form markdown in the Paras format (**Heading** lines + bullet `-` items).
  // Renders through the existing parseResearch() function in ResearchModal/Drawer.
  research: string;
  citations: Citation[];
  generatedAt: number;
  provider: string;
  model: string;
  tokensIn?: number;
  tokensOut?: number;
}

export interface NewsItem {
  headline: string;
  summary: string;
  date?: string;        // YYYY-MM-DD if known
  citation?: Citation;
}

export interface NewsOutput {
  items: NewsItem[];
  generatedAt: number;
  provider: string;
  model: string;
  tokensIn?: number;
  tokensOut?: number;
}

export interface AIProvider {
  /** Stable identifier — appears in cache + logs. */
  readonly name: string;
  /** Model id in use, e.g. 'gemini-2.5-flash'. */
  readonly model: string;
  generateResearch(input: ResearchInput): Promise<ResearchOutput>;
  generateNews(input: NewsInput): Promise<NewsOutput>;
}

// ── Cache file shape ─────────────────────────────────────────────────────────
export interface CacheEntry {
  research?: ResearchOutput;
  news?: NewsOutput;
}

export type AIResearchCache = Record<string, CacheEntry>;
