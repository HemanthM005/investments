'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sparkles, RefreshCw, AlertTriangle, ExternalLink, BookOpen, Newspaper, ChevronRight } from 'lucide-react';
import type { Investment } from '@/lib/types';
import type { Citation, NewsItem, NewsOutput, ResearchOutput } from '@/lib/ai/types';

interface Props {
  investment: Investment;
  // Yahoo fundamentals (optional) injected as ground truth in research generation.
  fundamentals?: Record<string, number | null | undefined>;
}

interface ResearchSection { title: string; lines: string[]; }

function parseResearch(text: string): ResearchSection[] {
  const sections: ResearchSection[] = [];
  let current: ResearchSection | null = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const headingMatch = line.match(/^\*\*(.+)\*\*$/);
    if (headingMatch) {
      if (current) sections.push(current);
      current = { title: headingMatch[1], lines: [] };
    } else if (current && line) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);
  return sections;
}

function relativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30)  return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

type ResearchState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; data: ResearchOutput; cached: boolean; stale?: boolean }
  | { kind: 'error'; message: string };

type NewsState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; data: NewsOutput; cached: boolean; stale?: boolean }
  | { kind: 'error'; message: string };

export default function AIResearchSection({ investment, fundamentals }: Props) {
  const [research, setResearch] = useState<ResearchState>({ kind: 'idle' });
  const [news, setNews]         = useState<NewsState>({ kind: 'idle' });
  const [refreshLockUntil, setRefreshLockUntil] = useState(0);

  const ticker = investment.ticker?.trim();
  const supportsAI = !!ticker && ['Stock', 'ETF', 'Crypto'].includes(investment.asset_type);

  const fetchResearch = useCallback(async (force = false) => {
    if (!supportsAI) return;
    setResearch({ kind: 'loading' });
    try {
      const url = `/api/ai-research?ticker=${encodeURIComponent(ticker!)}&type=research&assetName=${encodeURIComponent(investment.asset_name)}&sector=${encodeURIComponent(investment.sector)}&assetType=${encodeURIComponent(investment.asset_type)}${fundamentals ? `&fundamentals=${encodeURIComponent(JSON.stringify(fundamentals))}` : ''}`;
      const res  = force
        ? await fetch('/api/ai-research', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticker, type: 'research', assetName: investment.asset_name, sector: investment.sector, assetType: investment.asset_type, fundamentals, force: true }),
          })
        : await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setResearch({ kind: 'ready', data: json, cached: !!json.cached, stale: !!json.stale });
    } catch (e) {
      setResearch({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }, [ticker, supportsAI, investment.asset_name, investment.sector, investment.asset_type, fundamentals]);

  const fetchNews = useCallback(async (force = false) => {
    if (!supportsAI) return;
    setNews({ kind: 'loading' });
    try {
      const url = `/api/ai-research?ticker=${encodeURIComponent(ticker!)}&type=news&assetName=${encodeURIComponent(investment.asset_name)}&assetType=${encodeURIComponent(investment.asset_type)}`;
      const res = force
        ? await fetch('/api/ai-research', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticker, type: 'news', assetName: investment.asset_name, assetType: investment.asset_type, force: true }),
          })
        : await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setNews({ kind: 'ready', data: json, cached: !!json.cached, stale: !!json.stale });
    } catch (e) {
      setNews({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }, [ticker, supportsAI, investment.asset_name]);

  // Lazy-load on mount. Skip research if user already wrote hand-written notes.
  useEffect(() => {
    if (!supportsAI) return;
    if (!investment.research?.trim()) fetchResearch(false);
    fetchNews(false);
  }, [supportsAI, investment.research, fetchResearch, fetchNews]);

  const handleRefresh = useCallback(() => {
    if (Date.now() < refreshLockUntil) return;
    setRefreshLockUntil(Date.now() + 5_000); // 5s UI debounce
    if (!investment.research?.trim()) fetchResearch(true);
    fetchNews(true);
  }, [refreshLockUntil, investment.research, fetchResearch, fetchNews]);

  if (!supportsAI) return null;

  const isLoading = research.kind === 'loading' || news.kind === 'loading';
  const refreshDisabled = isLoading || Date.now() < refreshLockUntil;

  // Combined freshest timestamp across the two loaded sections.
  const newestTs = Math.max(
    research.kind === 'ready' ? research.data.generatedAt : 0,
    news.kind     === 'ready' ? news.data.generatedAt     : 0,
  );

  return (
    <div className="rounded-lg border border-indigo-900/40 bg-indigo-950/10 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">AI Research</span>
          {newestTs > 0 && (
            <span className="text-[10px] text-slate-500">· updated {relativeTime(newestTs)}</span>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshDisabled}
          className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-slate-400 hover:text-indigo-300 hover:bg-indigo-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title={refreshDisabled ? 'Please wait…' : 'Force refresh from AI'}
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* If user has hand-written research, suppress AI research note (their notes win) */}
      {!investment.research?.trim() && (
        <ResearchBlock state={research} />
      )}

      {/* News */}
      <NewsBlock state={news} />

      <p className="text-[10px] text-slate-600 text-center pt-1 border-t border-[#2a2d3e]">
        AI-generated · Verify before making any investment decision
      </p>
    </div>
  );
}

function ResearchBlock({ state }: { state: ResearchState }) {
  if (state.kind === 'idle')    return null;
  if (state.kind === 'loading') return <SkeletonBlock label="Generating research note (~20s on first call)" />;
  if (state.kind === 'error')   return <ErrorBlock message={state.message} />;

  const sections = parseResearch(state.data.research);
  if (sections.length === 0) return <ErrorBlock message="AI response was empty or unparseable" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <BookOpen className="h-3 w-3" />
        <span>Deep research note</span>
        {state.stale && <StaleBadge />}
      </div>
      {sections.map((s) => {
        const isVerdict = s.title === 'Final Verdict';
        return (
          <div
            key={s.title}
            className={
              isVerdict
                ? 'rounded border border-fuchsia-800/40 bg-fuchsia-950/20 p-3'
                : 'rounded border border-[#2a2d3e] bg-[#1a1d2e]/60 p-3'
            }
          >
            <p className={`text-xs font-semibold mb-1.5 ${isVerdict ? 'text-fuchsia-300' : 'text-indigo-300'}`}>
              {s.title}
            </p>
            <div className="space-y-1">
              {s.lines.map((line, i) => {
                const content = line.startsWith('-') ? line.slice(1).trim() : line;
                const isBullet = line.startsWith('-');
                return (
                  <div key={i} className="flex items-start gap-1.5">
                    {isBullet && (
                      <ChevronRight className={`h-3 w-3 mt-0.5 flex-shrink-0 ${isVerdict ? 'text-fuchsia-500' : 'text-slate-600'}`} />
                    )}
                    <span className={`text-xs leading-relaxed ${isVerdict ? 'text-fuchsia-100' : 'text-slate-300'}`}>
                      {linkifyCitations(content)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {state.data.citations.length > 0 && (
        <CitationStrip citations={state.data.citations} label="Research sources" />
      )}
    </div>
  );
}

function NewsBlock({ state }: { state: NewsState }) {
  if (state.kind === 'idle')    return null;
  if (state.kind === 'loading') return <SkeletonBlock label="Fetching recent news…" />;
  if (state.kind === 'error')   return <ErrorBlock message={state.message} />;
  if (state.data.items.length === 0) {
    return (
      <div className="text-xs text-slate-500 text-center py-2">No material news in the last 30 days.</div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <Newspaper className="h-3 w-3" />
        <span>Recent news</span>
        {state.stale && <StaleBadge />}
      </div>
      {state.data.items.map((item, i) => (
        <NewsRow key={i} item={item} />
      ))}
    </div>
  );
}

function NewsRow({ item }: { item: NewsItem }) {
  return (
    <div className="rounded border border-[#2a2d3e] bg-[#1a1d2e]/60 p-2.5">
      <div className="flex items-start justify-between gap-2 mb-0.5">
        <p className="text-xs font-semibold text-slate-200 leading-snug">{item.headline}</p>
        {item.citation?.url && (
          <a
            href={item.citation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 text-slate-500 hover:text-indigo-300"
            title={item.citation.url}
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">{item.summary}</p>
      {item.date && <p className="text-[10px] text-slate-600 mt-1">{item.date}</p>}
    </div>
  );
}

function CitationStrip({ citations, label }: { citations: Citation[]; label: string }) {
  return (
    <div className="pt-1">
      <p className="text-[10px] uppercase tracking-wider text-slate-600 mb-1">{label}</p>
      <div className="flex flex-wrap gap-1">
        {citations.slice(0, 12).map((c, i) => {
          const host = (() => {
            try { return new URL(c.url).hostname.replace(/^www\./, ''); } catch { return c.url; }
          })();
          return (
            <a
              key={i}
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded border border-[#2a2d3e] bg-[#1a1d2e] px-1.5 py-0.5 text-[10px] text-slate-400 hover:border-indigo-700 hover:text-indigo-300 transition-colors"
              title={c.title ?? c.url}
            >
              <ExternalLink className="h-2.5 w-2.5" />
              {host}
            </a>
          );
        })}
        {citations.length > 12 && (
          <span className="text-[10px] text-slate-600 self-center">+{citations.length - 12} more</span>
        )}
      </div>
    </div>
  );
}

function SkeletonBlock({ label }: { label: string }) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] text-slate-500 flex items-center gap-2">
        <RefreshCw className="h-3 w-3 animate-spin" />
        {label}
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-12 rounded bg-[#1a1d2e]/60 animate-pulse" />
      ))}
    </div>
  );
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded border border-amber-800/40 bg-amber-950/20 p-2.5 text-xs text-amber-300/90">
      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
      <span className="leading-relaxed">{message}</span>
    </div>
  );
}

function StaleBadge() {
  return (
    <span className="rounded bg-amber-900/40 border border-amber-800/40 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-amber-300">
      stale · refresh failed
    </span>
  );
}

// Strips inline `(source: <url>)` markers the model sometimes adds and renders them as a small link.
// Falls back to plain text if no marker is present.
function linkifyCitations(text: string): React.ReactNode {
  const m = text.match(/^(.*?)\s*\(source:\s*(https?:\/\/\S+?)\s*\)\s*$/);
  if (!m) return text;
  return (
    <>
      {m[1]}{' '}
      <a
        href={m[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-0.5 text-indigo-400 hover:text-indigo-300"
        title={m[2]}
      >
        <ExternalLink className="h-2.5 w-2.5" />
      </a>
    </>
  );
}
