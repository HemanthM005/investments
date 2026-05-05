import { aiConfig } from './config';
import type { ProviderName } from './config';
import { GeminiProvider } from './providers/gemini';
import type { AIProvider } from './types';

let cachedProvider: AIProvider | null = null;
let cachedProviderName: ProviderName | null = null;

// Factory — single place that maps config → concrete provider instance.
// To register a new provider:
//   1) import its class above
//   2) add a case below
//   3) add an entry in lib/ai/config.ts -> aiConfig.models
//   4) flip aiConfig.provider to activate it
export function getProvider(): AIProvider {
  if (cachedProvider && cachedProviderName === aiConfig.provider) return cachedProvider;

  switch (aiConfig.provider) {
    case 'gemini':
      cachedProvider = new GeminiProvider();
      break;
    case 'perplexity':
    case 'claude':
      throw new Error(`Provider "${aiConfig.provider}" is not yet implemented`);
    default: {
      const _exhaustive: never = aiConfig.provider;
      throw new Error(`Unknown provider: ${String(_exhaustive)}`);
    }
  }

  cachedProviderName = aiConfig.provider;
  return cachedProvider;
}

export type { AIProvider } from './types';
export {
  getCachedNews,
  getCachedResearch,
  isNewsFresh,
  isResearchFresh,
  setCachedNews,
  setCachedResearch,
} from './cache';
