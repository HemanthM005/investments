'use client';

import { TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatPercent } from '@/lib/utils';
import type { PortfolioStats as Stats } from '@/lib/types';

interface Props {
  stats: Stats;
}

export default function PortfolioStats({ stats }: Props) {
  const isGain = stats.totalPnL >= 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Invested</span>
            <div className="h-8 w-8 rounded-lg bg-indigo-900/40 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-indigo-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-100">{formatCurrency(stats.totalInvested)}</div>
          <p className="text-xs text-slate-500 mt-1">Capital deployed</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Current Value</span>
            <div className="h-8 w-8 rounded-lg bg-purple-900/40 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-100">{formatCurrency(stats.currentValue)}</div>
          <p className="text-xs text-slate-500 mt-1">Live portfolio value</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total P&L</span>
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isGain ? 'bg-emerald-900/40' : 'bg-red-900/40'}`}>
              {isGain ? (
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-400" />
              )}
            </div>
          </div>
          <div className={`text-2xl font-bold ${isGain ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(Math.abs(stats.totalPnL))}
          </div>
          <p className="text-xs text-slate-500 mt-1">{isGain ? 'Unrealised gain' : 'Unrealised loss'}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">P&L %</span>
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isGain ? 'bg-emerald-900/40' : 'bg-red-900/40'}`}>
              <Percent className={`h-4 w-4 ${isGain ? 'text-emerald-400' : 'text-red-400'}`} />
            </div>
          </div>
          <div className={`text-2xl font-bold ${isGain ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatPercent(stats.pnlPercent)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Overall return</p>
        </CardContent>
      </Card>
    </div>
  );
}
