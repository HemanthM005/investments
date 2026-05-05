// Single source of truth for AI provider + model selection.
// To switch providers: change `provider` below. No call site changes.
// To add a provider: drop a file in lib/ai/providers/, register in lib/ai/index.ts,
// add a model entry here, then flip `provider`.

export type ProviderName = 'gemini' | 'perplexity' | 'claude';

export interface AIConfig {
  provider: ProviderName;
  models: {
    gemini:     { name: string; searchEnabled: boolean };
    perplexity: { name: string; searchDepth: 'low' | 'medium' | 'high' };
    claude:     { name: string; searchEnabled: boolean };
  };
  cache: {
    researchTtlDays: number;
    newsTtlHours: number;
  };
  rateLimits: {
    refreshPerTickerPerHour: number;
  };
  // Hard cap on how many tickers can be force-refreshed per process per hour
  // to protect free-tier quotas. Cached reads are unbounded.
  globalForceRefreshPerHour: number;
}

export const aiConfig: AIConfig = {
  provider: 'gemini',
  models: {
    gemini:     { name: 'gemini-2.5-flash', searchEnabled: true },
    perplexity: { name: 'sonar',            searchDepth: 'medium' },
    claude:     { name: 'claude-haiku-4-5', searchEnabled: true },
  },
  cache: {
    researchTtlDays: 30,
    newsTtlHours: 24,
  },
  rateLimits: {
    refreshPerTickerPerHour: 1,
  },
  globalForceRefreshPerHour: 30,
};
