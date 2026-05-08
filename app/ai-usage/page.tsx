'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, Database, AlertTriangle, Zap, RefreshCw } from 'lucide-react';
import type { UsageEntry } from '@/lib/ai/usage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type FetchState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; entries: UsageEntry[] }
  | { kind: 'error'; message: string };

const fmt = (n: number) => new Intl.NumberFormat('en-IN').format(n);

function dayKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

export default function AIUsagePage() {
  const [state, setState] = useState<FetchState>({ kind: 'idle' });

  const load = async () => {
    setState({ kind: 'loading' });
    try {
      const res = await fetch('/api/ai-usage', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setState({ kind: 'ok', entries: json.entries ?? [] });
    } catch (err) {
      setState({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  };

  useEffect(() => { void load(); }, []);

  const stats = useMemo(() => {
    if (state.kind !== 'ok') return null;
    const all = state.entries;
    const live = all.filter((e) => !e.cached && !e.failed);
    const cached = all.filter((e) => e.cached);
    const failed = all.filter((e) => e.failed);

    const tokensIn  = live.reduce((s, e) => s + (e.inputTokens  ?? 0), 0);
    const tokensOut = live.reduce((s, e) => s + (e.outputTokens ?? 0), 0);

    // Per-day spend
    const byDay = new Map<string, { calls: number; tokensIn: number; tokensOut: number; failed: number; cached: number }>();
    for (const e of all) {
      const k = dayKey(e.timestamp);
      const cur = byDay.get(k) ?? { calls: 0, tokensIn: 0, tokensOut: 0, failed: 0, cached: 0 };
      cur.calls += 1;
      cur.tokensIn  += e.inputTokens  ?? 0;
      cur.tokensOut += e.outputTokens ?? 0;
      if (e.failed) cur.failed += 1;
      if (e.cached) cur.cached += 1;
      byDay.set(k, cur);
    }
    const days = [...byDay.entries()]
      .map(([day, v]) => ({ day, ...v }))
      .sort((a, b) => (a.day < b.day ? 1 : -1));

    // Per-ticker breakdown
    const byTicker = new Map<string, { calls: number; tokensIn: number; tokensOut: number; failed: number; cached: number }>();
    for (const e of all) {
      const k = e.ticker;
      const cur = byTicker.get(k) ?? { calls: 0, tokensIn: 0, tokensOut: 0, failed: 0, cached: 0 };
      cur.calls += 1;
      cur.tokensIn  += e.inputTokens  ?? 0;
      cur.tokensOut += e.outputTokens ?? 0;
      if (e.failed) cur.failed += 1;
      if (e.cached) cur.cached += 1;
      byTicker.set(k, cur);
    }
    const tickers = [...byTicker.entries()]
      .map(([ticker, v]) => ({ ticker, ...v }))
      .sort((a, b) => b.tokensIn + b.tokensOut - (a.tokensIn + a.tokensOut));

    return {
      total: all.length,
      live: live.length,
      cached: cached.length,
      failed: failed.length,
      tokensIn,
      tokensOut,
      cacheHitRate: all.length ? cached.length / all.length : 0,
      days,
      tickers,
      recentFailures: failed.slice(-10).reverse(),
    };
  }, [state]);

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">AI Usage</h1>
          <p className="text-sm text-slate-400">Token consumption and cache health for /api/ai-research</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={state.kind === 'loading'}>
          <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', state.kind === 'loading' && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {state.kind === 'loading' && <p className="text-slate-400">Loading…</p>}
      {state.kind === 'error' && <p className="text-red-400">Error: {state.message}</p>}

      {state.kind === 'ok' && stats && (
        <>
          {stats.total === 0 ? (
            <Card><CardContent className="p-6 text-slate-400">No usage logged yet. Open the AI drawer on any investment to populate this dashboard.</CardContent></Card>
          ) : (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Kpi icon={<Activity className="h-4 w-4 text-indigo-400" />} label="Total calls" value={fmt(stats.total)} sub={`${stats.live} live · ${stats.cached} cached · ${stats.failed} failed`} />
                <Kpi icon={<Zap className="h-4 w-4 text-amber-400" />} label="Input tokens" value={fmt(stats.tokensIn)} sub="live calls only" />
                <Kpi icon={<Zap className="h-4 w-4 text-emerald-400" />} label="Output tokens" value={fmt(stats.tokensOut)} sub="live calls only" />
                <Kpi icon={<Database className="h-4 w-4 text-sky-400" />} label="Cache hit rate" value={`${(stats.cacheHitRate * 100).toFixed(0)}%`} sub={`${stats.cached} of ${stats.total} served from cache`} />
              </div>

              {/* Per-day */}
              <Card className="mb-6">
                <CardHeader><CardTitle className="text-base">Per day</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-slate-400 border-b border-[#2a2d3e]">
                      <tr><th className="px-4 py-2">Day</th><th className="px-4 py-2 text-right">Calls</th><th className="px-4 py-2 text-right">Cached</th><th className="px-4 py-2 text-right">Failed</th><th className="px-4 py-2 text-right">Input</th><th className="px-4 py-2 text-right">Output</th></tr>
                    </thead>
                    <tbody>
                      {stats.days.map((d) => (
                        <tr key={d.day} className="border-b border-[#2a2d3e]/50">
                          <td className="px-4 py-2 text-slate-200">{d.day}</td>
                          <td className="px-4 py-2 text-right text-slate-300">{fmt(d.calls)}</td>
                          <td className="px-4 py-2 text-right text-sky-400">{fmt(d.cached)}</td>
                          <td className={cn('px-4 py-2 text-right', d.failed > 0 ? 'text-red-400' : 'text-slate-500')}>{fmt(d.failed)}</td>
                          <td className="px-4 py-2 text-right text-slate-300">{fmt(d.tokensIn)}</td>
                          <td className="px-4 py-2 text-right text-slate-300">{fmt(d.tokensOut)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* Per-ticker */}
              <Card className="mb-6">
                <CardHeader><CardTitle className="text-base">By ticker</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-slate-400 border-b border-[#2a2d3e]">
                      <tr><th className="px-4 py-2">Ticker</th><th className="px-4 py-2 text-right">Calls</th><th className="px-4 py-2 text-right">Cached</th><th className="px-4 py-2 text-right">Failed</th><th className="px-4 py-2 text-right">Input</th><th className="px-4 py-2 text-right">Output</th></tr>
                    </thead>
                    <tbody>
                      {stats.tickers.map((t) => (
                        <tr key={t.ticker} className="border-b border-[#2a2d3e]/50">
                          <td className="px-4 py-2 text-slate-200 font-mono text-xs">{t.ticker}</td>
                          <td className="px-4 py-2 text-right text-slate-300">{fmt(t.calls)}</td>
                          <td className="px-4 py-2 text-right text-sky-400">{fmt(t.cached)}</td>
                          <td className={cn('px-4 py-2 text-right', t.failed > 0 ? 'text-red-400' : 'text-slate-500')}>{fmt(t.failed)}</td>
                          <td className="px-4 py-2 text-right text-slate-300">{fmt(t.tokensIn)}</td>
                          <td className="px-4 py-2 text-right text-slate-300">{fmt(t.tokensOut)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* Recent failures */}
              {stats.recentFailures.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-400" /> Recent failures</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs text-slate-400 border-b border-[#2a2d3e]">
                        <tr><th className="px-4 py-2">Time</th><th className="px-4 py-2">Ticker</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Error</th></tr>
                      </thead>
                      <tbody>
                        {stats.recentFailures.map((e, i) => (
                          <tr key={i} className="border-b border-[#2a2d3e]/50">
                            <td className="px-4 py-2 text-slate-400 text-xs">{new Date(e.timestamp).toLocaleString()}</td>
                            <td className="px-4 py-2 text-slate-200 font-mono text-xs">{e.ticker}</td>
                            <td className="px-4 py-2 text-slate-300">{e.type}</td>
                            <td className="px-4 py-2 text-red-400 text-xs">{e.error ?? 'unknown'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}

function Kpi({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2 text-xs text-slate-400">{icon}<span>{label}</span></div>
        <div className="text-2xl font-bold text-slate-100">{value}</div>
        {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}
