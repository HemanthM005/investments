import { z } from 'zod';

// News: structured JSON array from the model.
export const NewsItemSchema = z.object({
  headline: z.string().min(1),
  summary:  z.string().min(1),
  date:     z.string().nullable().optional(),
  url:      z.string().url().optional(),
});
export const NewsArraySchema = z.array(NewsItemSchema);

// Research: free-form markdown in the Paras format. parseResearch() in the UI
// keys off `**Heading**` lines, so we require the two sections that anchor the
// drawer (Executive Summary at the top, Final Verdict at the bottom) and a
// reasonable minimum length to catch truncated or empty outputs.
export const ResearchTextSchema = z
  .string()
  .min(200, 'research note is too short')
  .refine((s) => s.includes('**Executive Summary**'), {
    message: 'research note is missing the **Executive Summary** section',
  })
  .refine((s) => s.includes('**Final Verdict**'), {
    message: 'research note is missing the **Final Verdict** section',
  });

// Run a generator function; if it throws a ValidationError-shaped error, run
// it once more before giving up. Other errors (auth, network, rate limit)
// surface immediately — retrying them just wastes the budget.
export async function withParseRetry<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!isParseError(msg)) throw err;
    console.warn(`[ai] ${label}: parse/schema failure, retrying once — ${msg}`);
    return await fn();
  }
}

function isParseError(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes('schema validation') ||
    m.includes('not valid json') ||
    m.includes('too short') ||
    m.includes('missing the')
  );
}
