import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { aiConfig } from '../config';
import { buildResearchPrompt } from '../prompts/research';
import { buildNewsPrompt } from '../prompts/news';
import type {
  AIProvider,
  Citation,
  NewsInput,
  NewsItem,
  NewsOutput,
  ResearchInput,
  ResearchOutput,
} from '../types';

const NewsItemSchema = z.object({
  headline: z.string().min(1),
  summary:  z.string().min(1),
  date:     z.string().nullable().optional(),
  url:      z.string().url().optional(),
});
const NewsArraySchema = z.array(NewsItemSchema);

function getClient(): GoogleGenAI {
  const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY is not set. Add it to .env.local to enable Gemini.');
  }
  return new GoogleGenAI({ apiKey });
}

function extractCitations(response: unknown): Citation[] {
  const r = response as {
    candidates?: Array<{
      groundingMetadata?: {
        groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
      };
    }>;
  };
  const chunks = r.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const seen = new Set<string>();
  const out: Citation[] = [];
  for (const c of chunks) {
    const url = c.web?.uri;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ url, title: c.web?.title });
  }
  return out;
}

function extractText(response: unknown): string {
  const r = response as {
    text?: string;
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  if (typeof r.text === 'string' && r.text.length > 0) return r.text;
  const parts = r.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p) => p.text ?? '').join('').trim();
}

function extractTokens(response: unknown): { input?: number; output?: number } {
  const r = response as {
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };
  return {
    input:  r.usageMetadata?.promptTokenCount,
    output: r.usageMetadata?.candidatesTokenCount,
  };
}

function stripCodeFences(s: string): string {
  // Some models wrap JSON in ```json ... ``` even when told not to.
  return s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
}

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
  readonly model = aiConfig.models.gemini.name;

  async generateResearch(input: ResearchInput): Promise<ResearchOutput> {
    const ai = getClient();
    const { system, user } = buildResearchPrompt(input);

    const response = await ai.models.generateContent({
      model: this.model,
      contents: [{ role: 'user', parts: [{ text: user }] }],
      config: {
        systemInstruction: system,
        tools: aiConfig.models.gemini.searchEnabled ? [{ googleSearch: {} }] : undefined,
        temperature: 0.3,
      },
    });

    const text = extractText(response);
    if (!text || text.length < 100) {
      throw new Error('Gemini returned an empty or too-short research note');
    }
    if (!text.includes('**Executive Summary**')) {
      throw new Error('Gemini response did not follow the required Paras format');
    }

    const tokens = extractTokens(response);
    return {
      research:    text,
      citations:   extractCitations(response),
      generatedAt: Date.now(),
      provider:    this.name,
      model:       this.model,
      tokensIn:    tokens.input,
      tokensOut:   tokens.output,
    };
  }

  async generateNews(input: NewsInput): Promise<NewsOutput> {
    const ai = getClient();
    const { system, user } = buildNewsPrompt(input);

    const response = await ai.models.generateContent({
      model: this.model,
      contents: [{ role: 'user', parts: [{ text: user }] }],
      config: {
        systemInstruction: system,
        tools: aiConfig.models.gemini.searchEnabled ? [{ googleSearch: {} }] : undefined,
        temperature: 0.2,
      },
    });

    const text = stripCodeFences(extractText(response));
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('Gemini news response was not valid JSON');
    }

    const validated = NewsArraySchema.safeParse(parsed);
    if (!validated.success) {
      throw new Error(`Gemini news response failed schema validation: ${validated.error.message}`);
    }

    // Map url → citation per item; merge into a single citation set in cache shape.
    const items: NewsItem[] = validated.data.map((it) => ({
      headline: it.headline,
      summary:  it.summary,
      date:     it.date ?? undefined,
      citation: it.url ? { url: it.url } : undefined,
    }));

    const tokens = extractTokens(response);
    return {
      items,
      generatedAt: Date.now(),
      provider:    this.name,
      model:       this.model,
      tokensIn:    tokens.input,
      tokensOut:   tokens.output,
    };
  }
}
