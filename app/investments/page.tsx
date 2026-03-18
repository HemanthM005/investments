'use client';

import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { useInvestmentStore } from '@/lib/store';
import {
  formatCurrency,
  formatPercent,
  getPnlPercent,
  computeStats,
  cn,
} from '@/lib/utils';
import InvestmentModal from '@/components/InvestmentModal';
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

  const allSectors = useMemo(
    () => Array.from(new Set(investments.map((inv) => inv.sector))).sort(),
    [investments]
  );
  const allTypes = useMemo(
    () => Array.from(new Set(investments.map((inv) => inv.asset_type))).sort(),
    [investments]
  );

  const filtered = useMemo(() => {
    return investments.filter((inv) => {
      const typeMatch = filterType === 'all' || inv.asset_type === filterType;
      const sectorMatch = !filterSector || inv.sector.toLowerCase().includes(filterSector.toLowerCase());
      return typeMatch && sectorMatch;
    });
  }, [investments, filterType, filterSector]);

  const stats = useMemo(() => computeStats(investments), [investments]);

  // Concentration risk
  const totalValue = investments.reduce((s, inv) => s + inv.current_price * inv.quantity, 0);
  const concentrationRisk = investments.find(
    (inv) => totalValue > 0 && ((inv.current_price * inv.quantity) / totalValue) * 100 > 40
  );

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
            {investments.length} position{investments.length !== 1 ? 's' : ''} &mdash; Total value {formatCurrency(stats.currentValue)}
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Investment
        </Button>
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
          {filtered.length} of {investments.length} shown
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
                      {investments.length === 0
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
                          {inv.asset_name}
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
                        <TableCell className="text-right text-slate-300">{formatCurrency(inv.current_price)}</TableCell>
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

      <InvestmentModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null); }}
        onSubmit={handleSubmit}
        initialData={editTarget}
      />
    </div>
  );
}
