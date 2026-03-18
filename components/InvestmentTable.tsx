'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatPercent, getPnlPercent } from '@/lib/utils';
import type { Investment } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  investments: Investment[];
  compact?: boolean;
}

const ASSET_TYPE_COLORS: Record<string, string> = {
  Stock: 'bg-indigo-900/50 text-indigo-300',
  ETF: 'bg-purple-900/50 text-purple-300',
  Crypto: 'bg-orange-900/50 text-orange-300',
  'Mutual Fund': 'bg-blue-900/50 text-blue-300',
  Gold: 'bg-yellow-900/50 text-yellow-300',
  Other: 'bg-slate-700/50 text-slate-300',
};

export default function InvestmentTable({ investments, compact = false }: Props) {
  if (investments.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
        No investments found. Add your first investment to get started.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Asset</TableHead>
          {!compact && <TableHead>Type</TableHead>}
          {!compact && <TableHead>Sector</TableHead>}
          <TableHead className="text-right">Buy Price</TableHead>
          <TableHead className="text-right">Current Price</TableHead>
          <TableHead className="text-right">Qty</TableHead>
          <TableHead className="text-right">Invested</TableHead>
          <TableHead className="text-right">Value</TableHead>
          <TableHead className="text-right">P&L %</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {investments.map((inv) => {
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
              <TableCell className="font-medium text-slate-100">{inv.asset_name}</TableCell>
              {!compact && (
                <TableCell>
                  <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', ASSET_TYPE_COLORS[inv.asset_type])}>
                    {inv.asset_type}
                  </span>
                </TableCell>
              )}
              {!compact && <TableCell className="text-slate-400 text-xs">{inv.sector}</TableCell>}
              <TableCell className="text-right text-slate-300">{formatCurrency(inv.buy_price)}</TableCell>
              <TableCell className="text-right text-slate-300">{formatCurrency(inv.current_price)}</TableCell>
              <TableCell className="text-right text-slate-400">{inv.quantity}</TableCell>
              <TableCell className="text-right text-slate-300">{formatCurrency(invested)}</TableCell>
              <TableCell className="text-right text-slate-300">{formatCurrency(value)}</TableCell>
              <TableCell className={cn('text-right font-semibold', pnlPct >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {formatPercent(pnlPct)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
