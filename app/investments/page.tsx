'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Plus, Pencil, Trash2, AlertTriangle, RefreshCw, Wifi, WifiOff, Eye, Info } from 'lucide-react';
import { useInvestmentStore } from '@/lib/store';
import {
  formatCurrency,
  formatPercent,
  getPnlPercent,
  computeStats,
  cn,
} from '@/lib/utils';
import InvestmentModal from '@/components/InvestmentModal';
import ResearchModal from '@/components/ResearchModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import type { Investment } from '@/lib/types';

function apiType(assetType: string): 'crypto' | 'stock' | 'mf' | 'gold' {
  if (assetType === 'Crypto')      return 'crypto';
  if (assetType === 'Gold')        return 'gold';
  if (assetType === 'Mutual Fund') return 'mf';
  return 'stock';
}

const ASSET_TYPE_COLORS: Record<string, string> = {
  Stock: 'bg-indigo-900/50 text-indigo-300',
  ETF: 'bg-purple-900/50 text-purple-300',
  Crypto: 'bg-orange-900/50 text-orange-300',
  'Mutual Fund': 'bg-blue-900/50 text-blue-300',
  Gold: 'bg-yellow-900/50 text-yellow-300',
  Other: 'bg-slate-700/50 text-slate-300',
};

export default function InvestmentsPage() {
  const { investments, addInvestment, updateInvestment, deleteInvestment } = useInvestmentStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Investment | null>(null);
  const [filterType, setFilterType] = useState('all');
  const [filterSector, setFilterSector] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [researchInv, setResearchInv] = useState<Investment | null>(null);

  // Split active vs watchlist — must come before ticker memos
  const activeInvestments  = useMemo(() => investments.filter((inv) => inv.status !== 'watchlist'), [investments]);
  const watchlistItems     = useMemo(() => investments.filter((inv) => inv.status === 'watchlist'), [investments]);

  // ── Live price refresh ────────────────────────────────────────────────────
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());
  const [liveIds, setLiveIds]             = useState<Set<string>>(new Set()); // rows that got a live price
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [globalError, setGlobalError]     = useState<string | null>(null);

  const cryptoWithTicker = useMemo(
    () => activeInvestments.filter((inv) => inv.asset_type === 'Crypto' && inv.ticker?.trim()),
    [activeInvestments],
  );
  const stocksWithTicker = useMemo(
    () => activeInvestments.filter((inv) => (inv.asset_type === 'Stock' || inv.asset_type === 'ETF') && inv.ticker?.trim()),
    [activeInvestments],
  );
  const mfWithTicker = useMemo(
    () => activeInvestments.filter((inv) => inv.asset_type === 'Mutual Fund' && inv.ticker?.trim()),
    [activeInvestments],
  );
  // Gold always uses XAU — no ticker needed from user
  const goldInvestments = useMemo(
    () => activeInvestments.filter((inv) => inv.asset_type === 'Gold'),
    [activeInvestments],
  );
  const liveTrackedCount = cryptoWithTicker.length + stocksWithTicker.length + mfWithTicker.length + goldInvestments.length;

  // Watchlist — all stocks, scoped separately so main refresh is unaffected
  const watchlistWithTicker = useMemo(
    () => watchlistItems.filter((inv) => inv.ticker?.trim()),
    [watchlistItems],
  );

  // Fetch prices for a list of investments of the same category and apply to store
  const fetchAndApply = useCallback(async (targets: typeof investments, type: 'crypto' | 'stock' | 'mf' | 'gold') => {
    const ids = type === 'gold' ? ['XAU'] : [...new Set(targets.map((inv) => inv.ticker!))];
    const res = await fetch(`/api/prices?type=${type}&ids=${ids.join(',')}`);
    if (!res.ok) throw new Error(`Price fetch error ${res.status}`);
    const { prices } = await res.json() as { prices: Record<string, number> };
    targets.forEach((inv) => {
      const key   = type === 'gold' ? 'XAU' : inv.ticker!;
      const price = prices[key];
      if (typeof price === 'number') {
        updateInvestment(inv.id, { current_price: price });
        setLiveIds((prev) => new Set(prev).add(inv.id));
      }
    });
    setLastRefreshed(new Date());
    setGlobalError(null);
  }, [updateInvestment]);

  // Refresh a single investment row
  const refreshOne = useCallback(async (inv: typeof investments[0]) => {
    if (inv.asset_type !== 'Gold' && !inv.ticker) return;
    setRefreshingIds((prev) => new Set(prev).add(inv.id));
    try {
      await fetchAndApply([inv], apiType(inv.asset_type));
    } catch (err) {
      setGlobalError(`Failed for ${inv.asset_name}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRefreshingIds((prev) => { const s = new Set(prev); s.delete(inv.id); return s; });
    }
  }, [fetchAndApply]);

  // Refresh all live-tracked investments at once
  const refreshAll = useCallback(async () => {
    if (liveTrackedCount === 0) return;
    [...cryptoWithTicker, ...stocksWithTicker, ...mfWithTicker, ...goldInvestments].forEach((inv) =>
      setRefreshingIds((prev) => new Set(prev).add(inv.id))
    );
    try {
      await Promise.all([
        cryptoWithTicker.length > 0 ? fetchAndApply(cryptoWithTicker, 'crypto') : Promise.resolve(),
        stocksWithTicker.length > 0 ? fetchAndApply(stocksWithTicker, 'stock')  : Promise.resolve(),
        mfWithTicker.length     > 0 ? fetchAndApply(mfWithTicker,     'mf')     : Promise.resolve(),
        goldInvestments.length  > 0 ? fetchAndApply(goldInvestments,  'gold')   : Promise.resolve(),
      ]);
    } catch (err) {
      setGlobalError(`Refresh failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRefreshingIds(new Set());
    }
  }, [cryptoWithTicker, stocksWithTicker, mfWithTicker, goldInvestments, liveTrackedCount, fetchAndApply]);

  // Refresh all watchlist stocks at once
  const refreshAllWatchlist = useCallback(async () => {
    if (watchlistWithTicker.length === 0) return;
    watchlistWithTicker.forEach((inv) =>
      setRefreshingIds((prev) => new Set(prev).add(inv.id))
    );
    try {
      await fetchAndApply(watchlistWithTicker, 'stock');
    } catch (err) {
      setGlobalError(`Watchlist refresh failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRefreshingIds((prev) => {
        const s = new Set(prev);
        watchlistWithTicker.forEach((inv) => s.delete(inv.id));
        return s;
      });
    }
  }, [watchlistWithTicker, fetchAndApply]);

  // Use a ref so the interval always calls the latest refreshAll
  const refreshAllRef = useRef(refreshAll);
  useEffect(() => { refreshAllRef.current = refreshAll; }, [refreshAll]);

  // Auto-refresh every 5 minutes + initial fetch on mount
  useEffect(() => {
    if (liveTrackedCount === 0) return;
    refreshAllRef.current();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') refreshAllRef.current();
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally once on mount


  // Group watchlist by sector for display
  const watchlistBySector = useMemo(() => {
    const groups: Record<string, Investment[]> = {};
    for (const inv of watchlistItems) {
      (groups[inv.sector] ??= []).push(inv);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [watchlistItems]);

  const allSectors = useMemo(
    () => Array.from(new Set(activeInvestments.map((inv) => inv.sector))).sort(),
    [activeInvestments]
  );
  const allTypes = useMemo(
    () => Array.from(new Set(activeInvestments.map((inv) => inv.asset_type))).sort(),
    [activeInvestments]
  );

  const filtered = useMemo(() => {
    return activeInvestments.filter((inv) => {
      const typeMatch = filterType === 'all' || inv.asset_type === filterType;
      const sectorMatch = !filterSector || inv.sector.toLowerCase().includes(filterSector.toLowerCase());
      return typeMatch && sectorMatch;
    });
  }, [activeInvestments, filterType, filterSector]);

  const stats = useMemo(() => computeStats(activeInvestments), [activeInvestments]);

  // Concentration risk (active only)
  const totalValue = activeInvestments.reduce((s, inv) => s + inv.current_price * inv.quantity, 0);
  const concentrationRisk = activeInvestments.find(
    (inv) => totalValue > 0 && ((inv.current_price * inv.quantity) / totalValue) * 100 > 40
  );

  // Watchlist helpers
  function parseWatchlistType(notes: string): { type: string; insight: string } {
    const match = notes.match(/^\[([^\]]+)\]\s*(.*)/);
    if (match) return { type: match[1], insight: match[2] };
    return { type: '', insight: notes };
  }

  function parseBuyRange(range?: string): { lo: number; hi: number } | null {
    if (!range) return null;
    const [lo, hi] = range.split('-').map(Number);
    return isFinite(lo) && isFinite(hi) ? { lo, hi } : null;
  }

  function buyZoneStatus(current: number, range?: string): 'in-zone' | 'just-above' | 'above' {
    const r = parseBuyRange(range);
    if (!r) return 'above';
    if (current <= r.hi) return 'in-zone';
    const pctAbove = ((current - r.hi) / r.hi) * 100;
    return pctAbove <= 10 ? 'just-above' : 'above';
  }

  const WATCHLIST_TYPE_COLORS: Record<string, string> = {
    'Core':       'bg-indigo-900/50 text-indigo-300',
    'Growth':     'bg-emerald-900/50 text-emerald-300',
    'Emerging':   'bg-violet-900/50 text-violet-300',
    'Hidden Gem': 'bg-yellow-900/50 text-yellow-300',
    'Premium':    'bg-orange-900/50 text-orange-300',
    'Risky':      'bg-red-900/50 text-red-300',
    'Safe':       'bg-teal-900/50 text-teal-300',
    'Turnaround': 'bg-amber-900/50 text-amber-300',
    'Medium':     'bg-slate-700/50 text-slate-300',
    'Small Cap':  'bg-pink-900/50 text-pink-300',
  };

  const openAdd = () => {
    setEditTarget(null);
    setModalOpen(true);
  };

  const openEdit = (inv: Investment) => {
    setEditTarget(inv);
    setModalOpen(true);
  };

  const handleSubmit = (data: Omit<Investment, 'id'>) => {
    if (editTarget) {
      updateInvestment(editTarget.id, data);
    } else {
      addInvestment(data);
    }
    setModalOpen(false);
    setEditTarget(null);
  };

  const handleDelete = (id: string) => {
    if (deleteConfirm === id) {
      deleteInvestment(id);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">My Investments</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {activeInvestments.length} position{activeInvestments.length !== 1 ? 's' : ''} &mdash; Total value {formatCurrency(stats.currentValue)}
            {watchlistItems.length > 0 && <span className="ml-2 text-slate-500">· {watchlistItems.length} on watchlist</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Refresh button — shown when crypto or gold investments have tickers */}
          {liveTrackedCount > 0 && (
            <div className="flex flex-col items-end gap-0.5">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshAll}
                disabled={refreshingIds.size > 0}
                className="gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshingIds.size > 0 ? 'animate-spin' : ''}`} />
                {refreshingIds.size > 0 ? 'Refreshing…' : `Refresh Live Prices (${liveTrackedCount})`}
              </Button>
              {lastRefreshed && !globalError && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Wifi className="h-3 w-3 text-emerald-500" />
                  Updated {lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  <span className="text-slate-600">· auto every 5 min</span>
                </span>
              )}
              {globalError && (
                <span className="text-xs text-amber-500 flex items-center gap-1">
                  <WifiOff className="h-3 w-3" />{globalError}
                </span>
              )}
            </div>
          )}
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Investment
          </Button>
        </div>
      </div>

      {/* Mini stats dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Total Invested</p>
            <p className="text-2xl font-bold text-slate-100">{formatCurrency(stats.totalInvested)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Current Value</p>
            <p className="text-2xl font-bold text-slate-100">{formatCurrency(stats.currentValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Total P&amp;L</p>
            <p className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(stats.totalPnL)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">P&amp;L %</p>
            <p className={`text-2xl font-bold ${stats.pnlPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatPercent(stats.pnlPercent)}
            </p>
            {stats.bestAsset && (
              <p className="text-xs text-slate-500 mt-1 truncate">
                Best: <span className="text-emerald-400">{stats.bestAsset.asset_name}</span>
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Concentration risk banner */}
      {concentrationRisk && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-700/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            <strong>{concentrationRisk.asset_name}</strong> represents{' '}
            {(((concentrationRisk.current_price * concentrationRisk.quantity) / totalValue) * 100).toFixed(1)}% of your portfolio.
            Consider rebalancing to manage concentration risk.
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {allTypes.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Filter by sector..."
          value={filterSector}
          onChange={(e) => setFilterSector(e.target.value)}
          className="w-48"
        />
        {(filterType !== 'all' || filterSector) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setFilterType('all'); setFilterSector(''); }}
          >
            Clear filters
          </Button>
        )}
        <span className="ml-auto text-xs text-slate-500">
          {filtered.length} of {activeInvestments.length} shown
        </span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset Name</TableHead>
                  <TableHead>Asset Type</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead className="text-right">Buy Price</TableHead>
                  <TableHead className="text-right">Current Price</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Total Invested</TableHead>
                  <TableHead className="text-right">Current Value</TableHead>
                  <TableHead className="text-right">P&L %</TableHead>
                  <TableHead>Purchase Date</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-slate-500 py-12">
                      {activeInvestments.length === 0
                        ? 'No investments yet. Click "Add Investment" to get started.'
                        : 'No investments match the current filters.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((inv) => {
                    const pnlPct = getPnlPercent(inv);
                    const invested = inv.buy_price * inv.quantity;
                    const value = inv.current_price * inv.quantity;
                    const isLoss = pnlPct < -20;
                    const isGain = pnlPct > 50;

                    return (
                      <TableRow
                        key={inv.id}
                        className={cn(
                          isLoss && 'bg-red-950/20 hover:bg-red-950/30',
                          isGain && 'bg-emerald-950/20 hover:bg-emerald-950/30'
                        )}
                      >
                        <TableCell className="font-medium text-slate-100 whitespace-nowrap">
                          <button
                            onClick={() => setResearchInv(inv)}
                            className="flex items-center gap-1.5 hover:text-indigo-300 transition-colors group text-left"
                            title="View research notes"
                          >
                            {inv.asset_name}
                            <Info className={`h-3.5 w-3.5 flex-shrink-0 ${inv.research ? 'text-indigo-500 group-hover:text-indigo-300' : 'text-slate-600 group-hover:text-slate-400'}`} />
                          </button>
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                              ASSET_TYPE_COLORS[inv.asset_type]
                            )}
                          >
                            {inv.asset_type}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-400 text-xs whitespace-nowrap">{inv.sector}</TableCell>
                        <TableCell className="text-right text-slate-300">{formatCurrency(inv.buy_price)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {liveIds.has(inv.id) && (
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" title="Live price from CoinGecko" />
                            )}
                            <span className="text-slate-300">{formatCurrency(inv.current_price)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-slate-400">{inv.quantity}</TableCell>
                        <TableCell className="text-right text-slate-300">{formatCurrency(invested)}</TableCell>
                        <TableCell className="text-right text-slate-300">{formatCurrency(value)}</TableCell>
                        <TableCell
                          className={cn(
                            'text-right font-semibold',
                            pnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'
                          )}
                        >
                          {formatPercent(pnlPct)}
                        </TableCell>
                        <TableCell className="text-slate-400 text-xs whitespace-nowrap">{inv.purchase_date}</TableCell>
                        <TableCell className="text-slate-400 text-xs max-w-[140px] truncate">
                          {inv.notes || '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            {(inv.asset_type === 'Gold' || ((inv.asset_type === 'Crypto' || inv.asset_type === 'Stock' || inv.asset_type === 'ETF' || inv.asset_type === 'Mutual Fund') && inv.ticker)) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => refreshOne(inv)}
                                disabled={refreshingIds.has(inv.id)}
                                className="h-7 w-7 text-slate-400 hover:text-orange-400"
                                title={`Refresh price for ${inv.ticker}`}
                              >
                                <RefreshCw className={`h-3.5 w-3.5 ${refreshingIds.has(inv.id) ? 'animate-spin' : ''}`} />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(inv)}
                              className="h-7 w-7 text-slate-400 hover:text-indigo-400"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(inv.id)}
                              className={cn(
                                'h-7 w-7',
                                deleteConfirm === inv.id
                                  ? 'text-red-400 bg-red-950/40'
                                  : 'text-slate-400 hover:text-red-400'
                              )}
                              title={deleteConfirm === inv.id ? 'Click again to confirm' : 'Delete'}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Watchlist — grouped by sector */}
      {watchlistItems.length > 0 && (
        <div className="space-y-4">
          {/* Watchlist header */}
          <div className="flex items-center gap-3 flex-wrap">
            <Eye className="h-4 w-4 text-violet-400" />
            <h2 className="text-base font-semibold text-slate-200">Watchlist</h2>
            <span className="text-xs text-slate-500 bg-[#1a1d2e] border border-[#2a2d3e] rounded-full px-2 py-0.5">
              {watchlistItems.length} stocks · {watchlistBySector.length} sector{watchlistBySector.length !== 1 ? 's' : ''}
            </span>
            {watchlistWithTicker.length > 0 && (
              <Button
                variant="outline" size="sm"
                onClick={refreshAllWatchlist}
                disabled={watchlistWithTicker.some((inv) => refreshingIds.has(inv.id))}
                className="gap-1.5 ml-auto"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${watchlistWithTicker.some((inv) => refreshingIds.has(inv.id)) ? 'animate-spin' : ''}`} />
                {watchlistWithTicker.some((inv) => refreshingIds.has(inv.id)) ? 'Refreshing…' : `Refresh Prices (${watchlistWithTicker.length})`}
              </Button>
            )}
          </div>

          {/* One card per sector */}
          {watchlistBySector.map(([sector, items]) => (
            <div key={sector} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{sector}</span>
                <span className="text-xs text-slate-600 bg-[#1a1d2e] border border-[#2a2d3e] rounded-full px-1.5 py-0.5">{items.length}</span>
                <div className="flex-1 h-px bg-[#2a2d3e]" />
              </div>
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Company</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Current ₹</TableHead>
                          <TableHead className="text-right">Buy Range ₹</TableHead>
                          <TableHead>Zone</TableHead>
                          <TableHead>Insight</TableHead>
                          <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((inv) => {
                          const { type, insight } = parseWatchlistType(inv.notes);
                          const zone = buyZoneStatus(inv.current_price, inv.buy_range);
                          const typeColor = WATCHLIST_TYPE_COLORS[type] ?? 'bg-slate-700/50 text-slate-300';
                          const isNew = inv.purchase_date >= '2026-03-21';
                          const range = parseBuyRange(inv.buy_range);
                          const gapPct = range
                            ? inv.current_price <= range.hi
                              ? null
                              : (((inv.current_price - range.hi) / range.hi) * 100).toFixed(1)
                            : null;

                          return (
                            <TableRow key={inv.id} className={cn(
                              zone === 'in-zone'    && 'bg-emerald-950/20 hover:bg-emerald-950/30',
                              zone === 'just-above' && 'bg-amber-950/10 hover:bg-amber-950/20',
                              isNew && zone === 'above' && 'bg-sky-950/10 hover:bg-sky-950/20',
                            )}>
                              <TableCell className="font-medium text-slate-100 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => setResearchInv(inv)}
                                    className="flex items-center gap-1.5 hover:text-indigo-300 transition-colors group"
                                    title="View research"
                                  >
                                    {inv.asset_name}
                                    <Info className={`h-3.5 w-3.5 flex-shrink-0 ${inv.research ? 'text-indigo-500 group-hover:text-indigo-300' : 'text-slate-600 group-hover:text-slate-400'}`} />
                                  </button>
                                  {isNew && (
                                    <span className="inline-flex items-center rounded-full bg-sky-900/50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300 border border-sky-800/40">
                                      Speculative
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {type && (
                                  <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', typeColor)}>
                                    {type}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {liveIds.has(inv.id) && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" title="Live price" />
                                  )}
                                  <span className="text-slate-300">{formatCurrency(inv.current_price)}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {inv.buy_range
                                  ? <span className="text-slate-300">₹{inv.buy_range.replace('-', ' – ')}</span>
                                  : <span className="text-slate-600">—</span>}
                              </TableCell>
                              <TableCell>
                                {zone === 'in-zone' && (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Buy Zone
                                  </span>
                                )}
                                {zone === 'just-above' && (
                                  <span className="text-xs text-amber-400">+{gapPct}% above</span>
                                )}
                                {zone === 'above' && (
                                  <span className="text-xs text-slate-500">+{gapPct}% above</span>
                                )}
                              </TableCell>
                              <TableCell className="text-slate-400 text-xs max-w-[200px]">{insight || '—'}</TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-1">
                                  {inv.ticker && (
                                    <Button
                                      variant="ghost" size="icon"
                                      onClick={() => refreshOne(inv)}
                                      disabled={refreshingIds.has(inv.id)}
                                      className="h-7 w-7 text-slate-400 hover:text-orange-400"
                                      title={`Refresh price for ${inv.ticker}`}
                                    >
                                      <RefreshCw className={`h-3.5 w-3.5 ${refreshingIds.has(inv.id) ? 'animate-spin' : ''}`} />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost" size="icon"
                                    onClick={() => openEdit(inv)}
                                    className="h-7 w-7 text-slate-400 hover:text-indigo-400"
                                    title="Edit"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost" size="icon"
                                    onClick={() => handleDelete(inv.id)}
                                    className={cn(
                                      'h-7 w-7',
                                      deleteConfirm === inv.id ? 'text-red-400 bg-red-950/40' : 'text-slate-400 hover:text-red-400'
                                    )}
                                    title={deleteConfirm === inv.id ? 'Click again to confirm' : 'Remove from watchlist'}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      <InvestmentModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null); }}
        onSubmit={handleSubmit}
        initialData={editTarget}
      />

      <ResearchModal
        investment={researchInv}
        onClose={() => setResearchInv(null)}
      />
    </div>
  );
}
