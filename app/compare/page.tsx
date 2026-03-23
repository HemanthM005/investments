'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { X, Loader2, AlertTriangle, ChevronDown } from 'lucide-react';
import { useInvestmentStore } from '@/lib/store';
import { formatCurrency, formatPercent, getPnlPercent, cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import CompareRadarChart from '@/components/CompareRadarChart';
import type { StockFundamentals } from '@/app/api/stock-analysis/route';
import type { Investment } from '@/lib/types';

const MAX_COMPANIES = 4;
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

// ── Metric definitions ────────────────────────────────────────────────────────
type MetricKey = keyof StockFundamentals;

interface MetricDef {
  key: MetricKey;
  label: string;
  lowerIsBetter: boolean;
  format: (v: number) => string;
}

function fmtCr(n: number): string {
  if (n >= 1e12) return `₹${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e7)  return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5)  return `₹${(n / 1e5).toFixed(2)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

const METRICS: MetricDef[] = [
  { key: 'currentPrice',       label: 'Current Price',  lowerIsBetter: false, format: (v) => formatCurrency(v) },
  { key: 'peRatio',            label: 'P/E Ratio',      lowerIsBetter: true,  format: (v) => `${v.toFixed(1)}x` },
  { key: 'eps',                label: 'EPS (TTM)',       lowerIsBetter: false, format: (v) => formatCurrency(v) },
  { key: 'marketCap',          label: 'Market Cap',     lowerIsBetter: false, format: fmtCr },
  { key: 'totalRevenue',       label: 'Revenue (TTM)',  lowerIsBetter: false, format: fmtCr },
  { key: 'dividendYield',      label: 'Dividend Yield', lowerIsBetter: false, format: (v) => `${(v * 100).toFixed(2)}%` },
  { key: 'beta',               label: 'Beta',           lowerIsBetter: true,  format: (v) => v.toFixed(2) },
  {
    key: 'recommendationMean',
    label: 'Analyst Rating',
    lowerIsBetter: true,
    format: (v) => {
      const labels: Record<number, string> = { 1: 'Strong Buy', 2: 'Buy', 3: 'Hold', 4: 'Sell', 5: 'Strong Sell' };
      return labels[Math.round(v)] ?? `${v.toFixed(1)}/5`;
    },
  },
];

function getCellClass(value: number | null, allValues: (number | null)[], lowerIsBetter: boolean): string {
  const valid = allValues.filter((v): v is number => v !== null);
  if (valid.length < 2 || value === null) return 'text-slate-300';
  const best  = lowerIsBetter ? Math.min(...valid) : Math.max(...valid);
  const worst = lowerIsBetter ? Math.max(...valid) : Math.min(...valid);
  if (value === best)  return 'text-emerald-400 font-semibold';
  if (value === worst) return 'text-red-400';
  return 'text-slate-300';
}

const SECTOR_COLORS = [
  'bg-sky-900/50 text-sky-300',
  'bg-violet-900/50 text-violet-300',
  'bg-amber-900/50 text-amber-300',
  'bg-teal-900/50 text-teal-300',
  'bg-rose-900/50 text-rose-300',
  'bg-lime-900/50 text-lime-300',
  'bg-cyan-900/50 text-cyan-300',
  'bg-fuchsia-900/50 text-fuchsia-300',
];

function sectorColor(sector: string): string {
  let hash = 0;
  for (let i = 0; i < sector.length; i++) hash = (hash * 31 + sector.charCodeAt(i)) >>> 0;
  return SECTOR_COLORS[hash % SECTOR_COLORS.length];
}

// ── Selected company entry ────────────────────────────────────────────────────
interface SelectedCompany {
  id: string;           // investment id — stable key
  inv: Investment;
  fundamentals: StockFundamentals | 'loading' | 'error' | null; // null = no ticker
}

function ComparePage() {
  const searchParams = useSearchParams();
  const { investments, hydrated } = useInvestmentStore();

  const [selected, setSelected] = useState<SelectedCompany[]>([]);

  // All investments (active + watchlist), not deleted
  const allOptions = useMemo(() => {
    if (!hydrated) return [];
    return investments
      .filter((inv) => !inv._deleted)
      .sort((a, b) => a.sector.localeCompare(b.sector) || a.asset_name.localeCompare(b.asset_name));
  }, [investments, hydrated]);

  // Group by sector for the dropdown
  const sectorGroups = useMemo(() => {
    const map = new Map<string, Investment[]>();
    for (const inv of allOptions) {
      if (!map.has(inv.sector)) map.set(inv.sector, []);
      map.get(inv.sector)!.push(inv);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [allOptions]);

  // Seed from URL ?tickers=HAL.NS on first load
  useEffect(() => {
    const param = searchParams.get('tickers');
    if (!param || !hydrated) return;
    const tickerList = param.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean);
    const toAdd = investments
      .filter((inv) => inv.ticker && tickerList.includes(inv.ticker.toUpperCase()) && !inv._deleted)
      .slice(0, MAX_COMPANIES);
    if (toAdd.length > 0) {
      setSelected(toAdd.map((inv) => ({ id: inv.id, inv, fundamentals: inv.ticker ? 'loading' : null })));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // Fetch fundamentals for any selected company that has a ticker and is in 'loading' state
  useEffect(() => {
    selected.forEach((entry, idx) => {
      if (entry.fundamentals !== 'loading' || !entry.inv.ticker) return;
      fetch(`/api/stock-analysis?ticker=${encodeURIComponent(entry.inv.ticker)}`)
        .then((r) => r.json())
        .then((json: StockFundamentals & { error?: string }) => {
          if (json.error) throw new Error(json.error);
          setSelected((prev) => prev.map((e, i) => i === idx ? { ...e, fundamentals: json } : e));
        })
        .catch(() => {
          setSelected((prev) => prev.map((e, i) => i === idx ? { ...e, fundamentals: 'error' } : e));
        });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.map((s) => s.id + s.fundamentals).join(',')]);

  function addCompany(invId: string) {
    if (selected.length >= MAX_COMPANIES) return;
    if (selected.find((s) => s.id === invId)) return;
    const inv = investments.find((i) => i.id === invId);
    if (!inv) return;
    setSelected((prev) => [
      ...prev,
      { id: inv.id, inv, fundamentals: inv.ticker ? 'loading' : null },
    ]);
  }

  function removeCompany(id: string) {
    setSelected((prev) => prev.filter((s) => s.id !== id));
  }

  const selectedIds = new Set(selected.map((s) => s.id));
  const remainingSlots = MAX_COMPANIES - selected.length;

  // Companies with fundamentals loaded (for table/radar)
  const readyCompanies = selected.filter(
    (s): s is SelectedCompany & { fundamentals: StockFundamentals } =>
      s.fundamentals !== null && s.fundamentals !== 'loading' && s.fundamentals !== 'error',
  );

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-100">
      <div className="mx-auto max-w-[1400px] px-4 py-8 space-y-6">

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Company Compare</h1>
          <p className="text-sm text-slate-400 mt-1">
            Pick up to {MAX_COMPANIES} companies and compare side by side.
          </p>
        </div>

        {/* Selector card */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[260px] max-w-sm">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1.5">Select company</p>
                <Select
                  value=""
                  onValueChange={addCompany}
                  disabled={remainingSlots === 0}
                >
                  <SelectTrigger className="w-full">
                    <div className="flex items-center gap-2 text-slate-400">
                      <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                      <span className="text-sm">
                        {remainingSlots === 0 ? 'Max 4 selected' : `Add company (${allOptions.length} available)…`}
                      </span>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="max-h-[400px]">
                    {sectorGroups.map(([sector, items]) => (
                      <div key={sector}>
                        <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500 border-b border-[#2a2d3e]">
                          {sector}
                        </div>
                        {items.map((inv) => {
                          const already = selectedIds.has(inv.id);
                          return (
                            <SelectItem
                              key={inv.id}
                              value={inv.id}
                              disabled={already}
                              className={already ? 'opacity-40' : ''}
                            >
                              <div className="flex items-center justify-between gap-3 w-full">
                                <span className="truncate">{inv.asset_name}</span>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  {inv.status === 'watchlist' && (
                                    <span className="rounded-full bg-violet-900/50 px-1.5 py-0.5 text-[9px] text-violet-300">watch</span>
                                  )}
                                  {inv.ticker
                                    ? <span className="font-mono text-[10px] text-slate-500">{inv.ticker}</span>
                                    : <span className="text-[10px] text-slate-600">no ticker</span>
                                  }
                                </div>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Selected chips */}
            {selected.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selected.map((entry, i) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs"
                    style={{ borderColor: COLORS[i % COLORS.length] + '50', backgroundColor: COLORS[i % COLORS.length] + '12' }}
                  >
                    {entry.fundamentals === 'loading' && <Loader2 className="h-3 w-3 animate-spin" style={{ color: COLORS[i % COLORS.length] }} />}
                    {entry.fundamentals === 'error'   && <AlertTriangle className="h-3 w-3 text-red-400" />}
                    <div className="flex flex-col leading-none gap-0.5">
                      <span className="font-medium text-slate-200">{entry.inv.asset_name}</span>
                      <div className="flex items-center gap-1.5">
                        {entry.inv.ticker
                          ? <span className="font-mono text-[10px]" style={{ color: COLORS[i % COLORS.length] }}>{entry.inv.ticker}</span>
                          : <span className="text-[10px] text-slate-600">no ticker</span>
                        }
                        <span className="text-[10px] text-slate-500">{entry.inv.sector}</span>
                      </div>
                    </div>
                    <button onClick={() => removeCompany(entry.id)} className="ml-1 text-slate-500 hover:text-slate-300 transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {remainingSlots > 0 && (
                  <div className="flex items-center rounded-lg border border-dashed border-[#2a2d3e] px-3 py-1.5 text-xs text-slate-600">
                    + {remainingSlots} slot{remainingSlots !== 1 ? 's' : ''} remaining
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {selected.length === 0 && (
          <div className="rounded-lg border border-[#2a2d3e] bg-[#1a1d2e] p-12 text-center text-slate-500">
            Select at least 2 companies to start comparing.
          </div>
        )}

        {/* Metrics comparison table */}
        {selected.length >= 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Fundamentals Comparison</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#2a2d3e]">
                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-36">Metric</th>
                      {selected.map((entry, i) => (
                        <th key={entry.id} className="px-5 py-4 text-right min-w-[160px]">
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-slate-200 font-semibold truncate max-w-[150px]">{entry.inv.asset_name}</span>
                            {entry.inv.ticker
                              ? <span className="font-mono text-[10px]" style={{ color: COLORS[i % COLORS.length] }}>{entry.inv.ticker}</span>
                              : <span className="text-[10px] text-slate-600">no ticker</span>
                            }
                            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', sectorColor(entry.inv.sector))}>
                              {entry.inv.sector}
                            </span>
                            <span className="text-[10px] text-slate-600">{entry.inv.asset_type}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2a2d3e]">
                    {METRICS.map((metric) => {
                      const allValues = selected.map((entry) => {
                        const f = entry.fundamentals;
                        if (!f || f === 'loading' || f === 'error') return null;
                        const v = f[metric.key];
                        return typeof v === 'number' ? v : null;
                      });
                      return (
                        <tr key={metric.key} className="hover:bg-[#1a1d2e]/50">
                          <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">
                            {metric.label}
                            {metric.lowerIsBetter && <span className="ml-1 text-[10px] text-slate-600">↓ better</span>}
                          </td>
                          {selected.map((entry, i) => {
                            const f = entry.fundamentals;
                            if (f === 'loading') return (
                              <td key={entry.id} className="px-5 py-3 text-right">
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-600 ml-auto" />
                              </td>
                            );
                            if (f === 'error' || f === null) return (
                              <td key={entry.id} className="px-5 py-3 text-right text-slate-600">—</td>
                            );
                            const raw   = f[metric.key];
                            const value = typeof raw === 'number' ? raw : null;
                            return (
                              <td key={entry.id} className={cn('px-5 py-3 text-right', getCellClass(value, allValues, metric.lowerIsBetter))}>
                                {value !== null ? metric.format(value) : '—'}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Radar chart — only for companies with fundamentals loaded */}
        {readyCompanies.length >= 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Radar Comparison</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">All axes normalized 0–100. Outward = better on every axis.</p>
            </CardHeader>
            <CardContent>
              <CompareRadarChart
                companies={readyCompanies.map((e) => ({
                  name: e.inv.asset_name,
                  ticker: e.inv.ticker ?? e.inv.id,
                  fundamentals: e.fundamentals as StockFundamentals,
                }))}
              />
            </CardContent>
          </Card>
        )}

        {/* Portfolio positions */}
        {selected.length >= 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Your Portfolio Positions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#2a2d3e]">
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Metric</th>
                      {selected.map((entry, i) => (
                        <th key={entry.id} className="px-5 py-3 text-right min-w-[140px]">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-slate-300 text-xs font-medium truncate max-w-[130px]">{entry.inv.asset_name}</span>
                            <span className="font-mono text-[10px]" style={{ color: COLORS[i % COLORS.length] }}>
                              {entry.inv.ticker ?? entry.inv.asset_type}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2a2d3e]">
                    {(
                      [
                        {
                          label: 'Sector',
                          render: (inv: Investment) => (
                            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', sectorColor(inv.sector))}>{inv.sector}</span>
                          ),
                        },
                        { label: 'Status',       render: (inv: Investment) => <span className="capitalize text-slate-400">{inv.status ?? 'active'}</span> },
                        { label: 'Buy Price',    render: (inv: Investment) => formatCurrency(inv.buy_price) },
                        { label: 'Qty',          render: (inv: Investment) => `${inv.quantity}` },
                        { label: 'Invested',     render: (inv: Investment) => formatCurrency(inv.buy_price * inv.quantity) },
                        { label: 'Current Val',  render: (inv: Investment) => formatCurrency(inv.current_price * inv.quantity) },
                        {
                          label: 'P&L %',
                          render: (inv: Investment) => {
                            const pct = getPnlPercent(inv);
                            return (
                              <span className={pct >= 0 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                                {formatPercent(pct)}
                              </span>
                            );
                          },
                        },
                      ] as { label: string; render: (inv: Investment) => React.ReactNode }[]
                    ).map((row) => (
                      <tr key={row.label} className="hover:bg-[#1a1d2e]/50">
                        <td className="px-5 py-3 text-xs text-slate-500">{row.label}</td>
                        {selected.map((entry) => (
                          <td key={entry.id} className="px-5 py-3 text-right text-slate-300">
                            {row.render(entry.inv)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function ComparePageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
      </div>
    }>
      <ComparePage />
    </Suspense>
  );
}
