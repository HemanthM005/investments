# AI Research Integration — Plan & Tracker

> Living document. Tick boxes as work lands. Each phase is independently shippable.

---

## Locked decisions (Phase 0 outcomes)

| Decision | Choice | Notes |
|---|---|---|
| What AI generates | (a) Deep research note in **Paras format**, (b) Recent **news** 3-5 bullets | No buy-range opinion. No standalone summary/risks (risks live inside the note). |
| Cache TTLs | Research: **30 days**, News: **24 hours** | Per-section, per-ticker. |
| Trigger | **Lazy on drawer open** for tickers missing AI data; manual **Refresh** button always available. | No nightly cron in Phase 1. |
| Display | New section in `StockAnalysisDrawer` below fundamentals — renders Paras format via existing `parseResearch()` so visuals match hand-written notes. | News rendered separately as compact list with citation chips. |
| Storage | `data/ai-research-cache.json` — gitignored, AI-only, never mixed with `portfolio.json`. | Hand-written `inv.research` is sacred — AI never overwrites it. |
| Privacy rule | Prompts contain only **ticker + Yahoo public data**. Never personal portfolio quantities, P&L, or anything from `portfolio.json`. | Free-tier providers may train on prompts. |
| Phase 1 provider | **Gemini 2.5 Flash + Google Search grounding** (free tier). | Swap is config-only; see provider abstraction below. |
| Source-quality steering | System prompt restricts to filings (BSE/NSE/SEC), screener.in, trendlyne, official IR pages. Yahoo fundamentals injected as ground truth. Every numerical claim cites a URL. | Reduces hallucination risk on financials. |

---

## Architecture — extensibility baked in

```
lib/ai/
├── config.ts                  # ACTIVE_PROVIDER + per-model settings + TTLs
├── types.ts                   # AIProvider interface (contract for all providers)
├── cache.ts                   # File-based cache, per-section TTL, atomic writes
├── index.ts                   # getProvider() factory + public API used by routes
├── providers/
│   ├── gemini.ts              # Phase 1
│   ├── perplexity.ts          # Phase 2 (optional, news-only fallback)
│   └── claude.ts              # Future
└── prompts/
    ├── research.ts            # Paras-format system prompt + JSON output schema
    └── news.ts                # News bullets system prompt + JSON output schema
```

**To swap models / providers later:** edit `lib/ai/config.ts` only. No call sites touched.

**To add a new provider:**
1. Create `lib/ai/providers/<name>.ts` implementing the `AIProvider` interface.
2. Add a `<name>: {...}` block to `aiConfig.models` in `config.ts`.
3. Register in the `getProvider()` switch in `lib/ai/index.ts`.
4. Set `provider: '<name>'` in `aiConfig` to activate.

### Config shape (illustrative — finalized in Phase 1)
```ts
export const aiConfig = {
  provider: 'gemini',            // ← single switch to change active provider
  models: {
    gemini:     { name: 'gemini-2.5-flash', searchEnabled: true },
    perplexity: { name: 'sonar',           searchDepth: 'medium' },
    claude:     { name: 'claude-haiku-4-5', searchEnabled: true },
  },
  cache: { researchTtlDays: 30, newsTtlHours: 24 },
  rateLimits: { refreshPerTickerPerHour: 1 },
};
```

### Provider contract (illustrative)
```ts
export interface AIProvider {
  name: string;
  generateResearch(input: ResearchInput): Promise<ResearchOutput>;
  generateNews(input: NewsInput):         Promise<NewsOutput>;
}
```

---

## Phase 0 — Design & decisions

- [x] Lock what AI generates (deep note + news; no buy-range)
- [x] Lock cache TTLs (30d / 24h)
- [x] Lock trigger model (lazy + manual refresh)
- [x] Lock display location (drawer section below fundamentals)
- [x] Lock storage (`data/ai-research-cache.json`, gitignored)
- [x] Lock Phase 1 provider (Gemini 2.5 Flash + Search grounding)
- [x] Lock source-quality strategy (prompt steering + Yahoo as ground truth)
- [x] Sketch provider abstraction for extensibility
- [x] Document "how to add a new provider" steps
- [x] Confirm Paras format for AI-generated notes
- [x] Privacy rule: never send personal data in prompts

---

## Phase 1 — Backend foundation

### 1a. Scaffolding
- [x] Create `lib/ai/` directory
- [x] Add `lib/ai/types.ts` — `AIProvider`, `ResearchInput/Output`, `NewsInput/Output` types
- [x] Add `lib/ai/config.ts` — single source of truth for provider + model settings
- [x] Add `lib/ai/index.ts` — `getProvider()` factory + public helpers
- [x] Add `lib/ai/cache.ts` — read/write `data/ai-research-cache.json` with TTL logic + atomic writes
- [x] Add `data/ai-research-cache.json` to `.gitignore` (covered by existing `data/*` rule)

### 1b. Prompts
- [x] `lib/ai/prompts/research.ts` — Paras-format system prompt, output schema (matches `parseResearch()` heading markers), source-restriction rules, citation requirements
- [x] `lib/ai/prompts/news.ts` — news-bullets system prompt, JSON array output schema, last-N-days window
- [x] Inject Yahoo fundamentals (price, P/E, market cap, 52w, etc.) into research prompt as ground-truth context block

### 1c. Gemini provider
- [x] `lib/ai/providers/gemini.ts` — implements `AIProvider`
- [x] Use `@google/genai` SDK (newer unified SDK; `@google/generative-ai` is the older variant)
- [x] Enable Google Search grounding for both calls
- [x] Parse + validate news response with Zod schema; reject malformed responses
- [x] Surface citations from `groundingMetadata.groundingChunks`
- [x] Document `GOOGLE_API_KEY` in `.env.local.example` (user adds the actual key to `.env.local`)

### 1d. API route
- [x] `app/api/ai-research/route.ts`
  - [x] `GET ?ticker=X&type=research|news` — returns cached or freshly generated; falls back to stale cache on AI error
  - [x] `POST` with `{ ticker, type, force: true }` — bypasses cache, forces regeneration
  - [x] Per-ticker rate limit (1 forced refresh per hour) + global hourly cap, in-memory
  - [x] Response always includes `generatedAt`, `cached`, `provider`, `model`

### 1e. Smoke test
- [x] Hit news endpoint for HAL.NS — 3 valid items, real citations (NSE official + 2 sources), ~19s generation
- [x] Hit research endpoint for HAL.NS with Yahoo fundamentals injected — all 10 Paras sections present, 33 citations, ~21s
- [x] Cache file written to `data/ai-research-cache.json` after first call
- [x] Second call hits cache — returns in 7ms with `cached: true`
- [x] Citations populated from Gemini grounding metadata

---

## Phase 2 — Drawer integration

- [x] Create `components/AIResearchSection.tsx`
  - [x] Accepts `Investment`; fetches from `/api/ai-research` on mount when no `inv.research`
  - [x] Loading skeleton state
  - [x] Error state (rate-limited / API down / invalid JSON) — soft amber banner
  - [x] "Updated X ago — Refresh" header with relative timestamp
  - [x] Citation chips inline (clickable, open in new tab) + per-bullet `(source: <url>)` linkified
  - [x] Bottom disclaimer: "AI-generated · Verify before making any investment decision"
- [x] Hook into `components/StockAnalysisDrawer.tsx`
  - [x] Show AI research note only when `inv.research` is empty (hand-written notes win)
  - [x] News subsection always shown when AI is supported for the asset type
  - [x] Refresh button calls `POST /api/ai-research` with `force: true` + 5s UI debounce
  - [x] Yahoo fundamentals from drawer state passed through to AI prompt as ground truth
- [ ] Visual parity check — run in browser, click into a stock, confirm Paras sections render identically

---

## Phase 3 — Guardrails

- [ ] Zod schema validation for both research and news outputs; reject + retry once on parse failure
- [ ] Token usage logging → append-only `data/ai-usage.json` (gitignored): timestamp, ticker, provider, input_tokens, output_tokens, cached
- [ ] UI debounce on Refresh button (5s) to prevent accidental double-clicks
- [ ] Server-side rate limit: 1 forced refresh per ticker per hour, returns 429 with `retry_after` seconds
- [ ] Test with edge cases: ticker with no Yahoo data, brand-new IPO with no news, foreign ticker, crypto
- [ ] Document failure modes in `docs/ai-integration-plan.md` (this file)

---

## Phase 4 — Polish (optional, do later)

- [ ] Cost dashboard route (`/ai-usage`) reading `data/ai-usage.json` — shows per-day token spend
- [ ] Watchlist news alert: highlight watchlist row when fresh news lands
- [ ] Compare page: AI head-to-head paragraph for two selected tickers
- [ ] Nightly batch refresh (cron) for top-N tracked tickers — only if free-tier limits allow

---

## Open questions / future decisions

- [ ] If Gemini news quality disappoints, swap **news-only** to Perplexity Sonar (research stays on Gemini). Decide after 1-2 weeks of real use.
- [ ] Should AI section also auto-refresh when stale (>30d) on drawer open, or only via manual button? (Default: auto on open, manual override always available.)
- [ ] Consider exposing the `provider` config switch in a settings UI later — for now it lives in code only.
