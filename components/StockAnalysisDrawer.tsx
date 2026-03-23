'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, GitCompare, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatPercent, getPnlPercent } from '@/lib/utils';
import type { Investment } from '@/lib/types';
import type { StockFundamentals } from '@/app/api/stock-analysis/route';
import type { PricePoint, HistoryRange } from '@/app/api/price-history/route';

interface Props {
  investment: Investment | null;
  onClose: () => void;
}

function fmt(n: number | null | undefined, suffix = '', decimals = 2): string {
  if (n === null || n === undefined) return '—';
  return `${n.toLocaleString('en-IN', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}${suffix}`;
}

function fmtCr(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  if (n >= 1e12) return `₹${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e7)  return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5)  return `₹${(n / 1e5).toFixed(2)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function pct(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return `${n >= 0 ? '+' : ''}${(n * 100).toFixed(2)}%`;
}

function RatingBadge({ mean, label }: { mean: number | null; label: string | null }) {
  if (!mean && !label) return <span className="text-slate-500">—</span>;
  const display = label
    ? label.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim()
    : `${mean?.toFixed(1)}/5`;
  const color = mean !== null
    ? mean <= 2 ? 'text-emerald-400' : mean <= 3 ? 'text-amber-400' : 'text-red-400'
    : 'text-slate-400';
  return <span className={`font-semibold ${color}`}>{display}</span>;
}

function MetricRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#2a2d3e] last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs font-semibold text-slate-200">{value}</span>
    </div>
  );
}

const RANGES: { label: string; value: HistoryRange }[] = [
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '6M', value: '6mo' },
  { label: '1Y', value: '1y'  },
  { label: '2Y', value: '2y'  },
];

const tooltipStyle = {
  backgroundColor: '#1a1d2e',
  border: '1px solid #2a2d3e',
  borderRadius: '8px',
  color: '#e2e8f0',
  fontSize: '11px',
};

export default function StockAnalysisDrawer({ investment, onClose }: Props) {
  const router = useRouter();

  const [data, setData]           = useState<StockFundamentals | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [errorData, setErrorData] = useState<string | null>(null);

  const [history, setHistory]         = useState<PricePoint[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [range, setRange]             = useState<HistoryRange>('6mo');

  const open = investment !== null;

  // Fetch fundamentals when investment changes
  useEffect(() => {
    if (!investment?.ticker) { setData(null); return; }
    setLoadingData(true);
    setErrorData(null);
    setData(null);
    fetch(`/api/stock-analysis?ticker=${encodeURIComponent(investment.ticker)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json as StockFundamentals);
      })
      .catch((e) => setErrorData(String(e)))
      .finally(() => setLoadingData(false));
  }, [investment]);

  // Fetch price history when investment or range changes
  useEffect(() => {
    if (!investment?.ticker) { setHistory([]); return; }
    setLoadingChart(true);
    fetch(`/api/price-history?ticker=${encodeURIComponent(investment.ticker)}&range=${range}`)
      .then((r) => r.json())
      .then((json) => { if (!json.error) setHistory(json.points ?? []); })
      .catch(() => {})
      .finally(() => setLoadingChart(false));
  }, [investment, range]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const inv = investment!;
  const pnlPct = getPnlPercent(inv);
  const invested = inv.buy_price * inv.quantity;
  const value    = inv.current_price * inv.quantity;
  const pnl      = value - invested;

  // 52w range bar
  let rangePos: number | null = null;
  if (data?.fiftyTwoWeekHigh && data?.fiftyTwoWeekLow && data.currentPrice) {
    const span = data.fiftyTwoWeekHigh - data.fiftyTwoWeekLow;
    if (span > 0) rangePos = Math.min(100, Math.max(0,
      ((data.currentPrice - data.fiftyTwoWeekLow) / span) * 100,
    ));
  }

  // Chart min/max for Y axis
  const prices   = history.map((p) => p.close);
  const chartMin = prices.length ? Math.min(...prices) * 0.98 : 0;
  const chartMax = prices.length ? Math.max(...prices) * 1.02 : 100;
  const chartColor = prices.length >= 2 && prices[prices.length - 1] >= prices[0]
    ? '#10b981' : '#ef4444';

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 h-full w-[460px] max-w-[98vw] flex flex-col bg-[#12151f] border-l border-[#2a2d3e] shadow-2xl overflow-y-auto">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-10 border-b border-[#2a2d3e] bg-[#12151f] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-100 leading-tight">{inv.asset_name}</h2>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                {inv.ticker && (
                  <span className="rounded bg-indigo-900/50 px-2 py-0.5 text-xs font-mono text-indigo-300">{inv.ticker}</span>
                )}
                <span className="rounded bg-[#1a1d2e] border border-[#2a2d3e] px-2 py-0.5 text-xs text-slate-400">{inv.sector}</span>
                <span className="rounded bg-[#1a1d2e] border border-[#2a2d3e] px-2 py-0.5 text-xs text-slate-500">{inv.asset_type}</span>
                {data?.source && (
                  <span className="text-[10px] text-slate-600">via {data.source}</span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#1a1d2e] transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Live price + day change */}
          {data?.currentPrice !== null && data?.currentPrice !== undefined && (
            <div className="mt-3 flex items-end gap-3">
              <span className="text-2xl font-bold text-slate-100">{formatCurrency(data.currentPrice)}</span>
              {data.dayChangePercent !== null && (
                <span className={`text-sm font-semibold mb-0.5 flex items-center gap-1 ${data.dayChangePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {data.dayChangePercent >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {data.dayChangePercent >= 0 ? '+' : ''}{data.dayChangePercent.toFixed(2)}% today
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="flex-1 space-y-4 p-5">

          {/* Price chart */}
          {inv.ticker && (
            <div className="rounded-lg border border-[#2a2d3e] bg-[#1a1d2e] p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Price History</p>
                <div className="flex items-center gap-1">
                  {loadingChart && <RefreshCw className="h-3 w-3 animate-spin text-slate-600 mr-1" />}
                  {RANGES.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setRange(r.value)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        range === r.value
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {history.length > 0 ? (
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={history} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={chartColor} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={chartColor} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#475569', fontSize: 9 }}
                      axisLine={false} tickLine={false}
                      tickFormatter={(d) => d.slice(5)} // MM-DD
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={[chartMin, chartMax]}
                      tick={{ fill: '#475569', fontSize: 9 }}
                      axisLine={false} tickLine={false}
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                      width={42}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v: number) => [formatCurrency(v), 'Close']}
                      labelFormatter={(l) => l}
                    />
                    {inv.buy_price && (
                      <ReferenceLine y={inv.buy_price} stroke="#6366f1" strokeDasharray="4 2" strokeWidth={1} label={{ value: 'Buy', fill: '#6366f1', fontSize: 9, position: 'insideTopRight' }} />
                    )}
                    <Area
                      type="monotone"
                      dataKey="close"
                      stroke={chartColor}
                      strokeWidth={1.5}
                      fill="url(#chartGrad)"
                      dot={false}
                      activeDot={{ r: 3, fill: chartColor }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : loadingChart ? (
                <div className="h-[150px] flex items-center justify-center">
                  <RefreshCw className="h-4 w-4 animate-spin text-slate-600" />
                </div>
              ) : (
                <div className="h-[150px] flex items-center justify-center text-xs text-slate-600">No chart data</div>
              )}
            </div>
          )}

          {/* Your position */}
          <div className="rounded-lg border border-[#2a2d3e] bg-[#1a1d2e] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Your Position</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Buy Price</p>
                <p className="text-sm font-semibold text-slate-200">{formatCurrency(inv.buy_price)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Current Price</p>
                <p className="text-sm font-semibold text-slate-200">{formatCurrency(inv.current_price)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Quantity</p>
                <p className="text-sm font-semibold text-slate-200">{inv.quantity}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Invested</p>
                <p className="text-sm font-semibold text-slate-200">{formatCurrency(invested)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">P&amp;L</p>
                <p className={`text-sm font-bold flex items-center gap-1 ${pnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {pnlPct >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {formatCurrency(pnl)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">P&amp;L %</p>
                <p className={`text-sm font-bold ${pnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatPercent(pnlPct)}
                </p>
              </div>
            </div>
          </div>

          {/* Fundamentals */}
          {!inv.ticker ? (
            <div className="rounded-lg border border-[#2a2d3e] bg-[#1a1d2e] p-4 text-center text-sm text-slate-500">
              Add a ticker symbol to see live fundamentals.
            </div>
          ) : loadingData ? (
            <div className="space-y-2">
              {[1,2,3].map((i) => <div key={i} className="h-14 rounded-lg bg-[#1a1d2e] animate-pulse" />)}
            </div>
          ) : errorData ? (
            <div className="rounded-lg border border-red-800/40 bg-red-950/20 p-4 text-sm text-red-400">
              {errorData}
            </div>
          ) : data ? (
            <>
              {/* Valuation */}
              <div className="rounded-lg border border-[#2a2d3e] bg-[#1a1d2e] p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Valuation</p>
                <MetricRow label="P/E Ratio"        value={fmt(data.peRatio, 'x', 1)} />
                <MetricRow label="PEG Ratio"        value={fmt(data.pegRatio, '', 2)} />
                <MetricRow label="Price / Book"     value={fmt(data.priceToBook, 'x', 2)} />
                <MetricRow label="Book Value"       value={data.bookValue !== null ? formatCurrency(data.bookValue) : '—'} />
                <MetricRow label="EPS (TTM)"        value={data.eps !== null ? formatCurrency(data.eps) : '—'} />
                <MetricRow label="Market Cap"       value={fmtCr(data.marketCap)} />
                <MetricRow label="Enterprise Value" value={fmtCr(data.enterpriseValue)} />
              </div>

              {/* Financials */}
              <div className="rounded-lg border border-[#2a2d3e] bg-[#1a1d2e] p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Financials</p>
                <MetricRow label="Revenue (TTM)"    value={fmtCr(data.totalRevenue)} />
                <MetricRow label="Gross Profit"     value={fmtCr(data.grossProfit)} />
                <MetricRow label="Profit Margin"    value={data.profitMargin !== null ? `${(data.profitMargin * 100).toFixed(1)}%` : '—'} />
                <MetricRow label="Return on Equity" value={data.returnOnEquity !== null ? `${(data.returnOnEquity * 100).toFixed(1)}%` : '—'} />
                <MetricRow label="Revenue Growth YoY" value={data.revenueGrowthYOY !== null ? <span className={data.revenueGrowthYOY >= 0 ? 'text-emerald-400' : 'text-red-400'}>{pct(data.revenueGrowthYOY)}</span> : '—'} />
                <MetricRow label="Dividend Yield"   value={data.dividendYield !== null ? `${(data.dividendYield * 100).toFixed(2)}%` : '—'} />
                <MetricRow label="Beta"             value={fmt(data.beta, '', 2)} />
              </div>

              {/* Moving averages */}
              {(data.fiftyDayAvg || data.twoHundredDayAvg) && (
                <div className="rounded-lg border border-[#2a2d3e] bg-[#1a1d2e] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Moving Averages</p>
                  <MetricRow
                    label="50-Day MA"
                    value={
                      data.fiftyDayAvg !== null ? (
                        <span className={data.currentPrice !== null && data.currentPrice > data.fiftyDayAvg ? 'text-emerald-400' : 'text-red-400'}>
                          {formatCurrency(data.fiftyDayAvg)}
                        </span>
                      ) : '—'
                    }
                  />
                  <MetricRow
                    label="200-Day MA"
                    value={
                      data.twoHundredDayAvg !== null ? (
                        <span className={data.currentPrice !== null && data.currentPrice > data.twoHundredDayAvg ? 'text-emerald-400' : 'text-red-400'}>
                          {formatCurrency(data.twoHundredDayAvg)}
                        </span>
                      ) : '—'
                    }
                  />
                </div>
              )}

              {/* 52-week range */}
              {(data.fiftyTwoWeekHigh || data.fiftyTwoWeekLow) && (
                <div className="rounded-lg border border-[#2a2d3e] bg-[#1a1d2e] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">52-Week Range</p>
                  <div className="relative h-2 rounded-full bg-[#0f1117] mb-2">
                    <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-gradient-to-r from-red-500/30 via-amber-500/30 to-emerald-500/30" />
                    {rangePos !== null && (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-indigo-400 border-2 border-[#12151f] shadow"
                        style={{ left: `calc(${rangePos}% - 7px)` }}
                      />
                    )}
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>{data.fiftyTwoWeekLow !== null ? formatCurrency(data.fiftyTwoWeekLow) : '—'}</span>
                    {data.currentPrice !== null && (
                      <span className="text-indigo-300 font-medium">{formatCurrency(data.currentPrice)}</span>
                    )}
                    <span>{data.fiftyTwoWeekHigh !== null ? formatCurrency(data.fiftyTwoWeekHigh) : '—'}</span>
                  </div>
                </div>
              )}

              {/* Analyst consensus */}
              <div className="rounded-lg border border-[#2a2d3e] bg-[#1a1d2e] p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Analyst Consensus</p>
                <MetricRow label="Rating"          value={<RatingBadge mean={data.recommendationMean} label={data.recommendationKey} />} />
                <MetricRow label="Score (1–5)"     value={fmt(data.recommendationMean, '', 1)} />
                <MetricRow label="Target Price"    value={data.targetMeanPrice !== null ? formatCurrency(data.targetMeanPrice) : '—'} />
                <MetricRow label="# Analysts"      value={data.numberOfAnalysts !== null ? `${data.numberOfAnalysts}` : '—'} />
                {data.targetMeanPrice !== null && data.currentPrice !== null && (
                  <MetricRow
                    label="Upside to Target"
                    value={
                      <span className={data.targetMeanPrice > data.currentPrice ? 'text-emerald-400' : 'text-red-400'}>
                        {((data.targetMeanPrice - data.currentPrice) / data.currentPrice * 100).toFixed(1)}%
                      </span>
                    }
                  />
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="sticky bottom-0 border-t border-[#2a2d3e] bg-[#12151f] p-4 flex gap-2">
          {inv.ticker && (
            <Button
              className="flex-1 gap-2"
              onClick={() => { router.push(`/compare?tickers=${inv.ticker}`); onClose(); }}
            >
              <GitCompare className="h-4 w-4" />
              Compare
            </Button>
          )}
          <Button variant="outline" className="flex-1 gap-2" onClick={onClose}>
            <Minus className="h-4 w-4" />
            Close
          </Button>
        </div>
      </div>
    </>
  );
}
