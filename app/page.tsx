'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, TrendingUp, TrendingDown, Star, AlertCircle,
  HandCoins, DollarSign, Percent, Wallet, PiggyBank, Landmark, Receipt, RefreshCw, Bell,
} from 'lucide-react';
import { useInvestmentStore } from '@/lib/store';
import { useMoneyStore, getOutstandingLent, getOutstandingBorrowed } from '@/lib/moneyStore';
import { useAssetStore, getTotalBalance } from '@/lib/assetStore';
import { useExpenseStore, getTodaySpend, getThisMonthSpend, getSpendByCategory } from '@/lib/expenseStore';
import { useRecurringStore, getTotalMonthly, getDueSoon, isOverdue } from '@/lib/recurringStore';
import { computeStats, formatCurrency, formatPercent, getPnlPercent } from '@/lib/utils';
import PortfolioCharts from '@/components/PortfolioCharts';
import InvestmentTable from '@/components/InvestmentTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const investments = useInvestmentStore((s) => s.investments);
  const activeInvestments = useMemo(
    () => investments.filter((inv) => inv.status !== 'watchlist'),
    [investments]
  );
  const moneyRecords = useMoneyStore((s) => s.records);
  const accounts     = useAssetStore((s) => s.accounts);
  const expenses     = useExpenseStore((s) => s.expenses);
  const recurring    = useRecurringStore((s) => s.recurring);
  const stats = useMemo(() => computeStats(activeInvestments), [activeInvestments]);

  const totalLent          = useMemo(() => getOutstandingLent(moneyRecords), [moneyRecords]);
  const totalBorrowed      = useMemo(() => getOutstandingBorrowed(moneyRecords), [moneyRecords]);
  const totalCashAccounts  = useMemo(() => getTotalBalance(accounts), [accounts]);
  const todayExpenses      = useMemo(() => getTodaySpend(expenses), [expenses]);
  const monthExpenses      = useMemo(() => getThisMonthSpend(expenses), [expenses]);
  const topCategories      = useMemo(() => getSpendByCategory(
    expenses.filter((e) => e.date.startsWith(new Date().toISOString().slice(0, 7)))
  ).slice(0, 3), [expenses]);
  const monthlySubCost     = useMemo(() => getTotalMonthly(recurring), [recurring]);
  const dueSoonSubs        = useMemo(() => getDueSoon(recurring, 7), [recurring]);
  const netWorth           = stats.currentValue + totalLent - totalBorrowed + totalCashAccounts;
  const isGain        = stats.totalPnL >= 0;
  const isNetPositive = netWorth >= 0;

  // Risk alerts
  const riskAlerts = useMemo(() => {
    const alerts: { type: 'danger' | 'success' | 'warning'; message: string }[] = [];
    const totalValue = activeInvestments.reduce((s, inv) => s + inv.current_price * inv.quantity, 0);
    activeInvestments.forEach((inv) => {
      const pnl = getPnlPercent(inv);
      if (pnl < -20)
        alerts.push({ type: 'danger', message: `${inv.asset_name} is down ${Math.abs(pnl).toFixed(1)}% — consider reviewing this position` });
      if (pnl > 50)
        alerts.push({ type: 'success', message: `${inv.asset_name} is up ${pnl.toFixed(1)}% — excellent performer` });
      if (totalValue > 0) {
        const pct = ((inv.current_price * inv.quantity) / totalValue) * 100;
        if (pct > 40)
          alerts.push({ type: 'warning', message: `${inv.asset_name} represents ${pct.toFixed(1)}% of your portfolio — concentration risk above 40%` });
      }
    });
    return alerts;
  }, [activeInvestments]);

  if (activeInvestments.length === 0) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 py-12 text-center">
        <TrendingUp className="h-16 w-16 text-indigo-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-100 mb-2">Your portfolio is empty</h2>
        <p className="text-slate-400 mb-6">Add your first investment to see analytics and insights.</p>
        <Link href="/investments"><Button>Go to Investment Tracker</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Portfolio Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {activeInvestments.length} investment{activeInvestments.length !== 1 ? 's' : ''} · {moneyRecords.length} money record{moneyRecords.length !== 1 ? 's' : ''} · {accounts.length} account{accounts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/expenses"><Button variant="outline" size="sm" className="gap-1.5"><Receipt className="h-3.5 w-3.5" />Expenses</Button></Link>
          <Link href="/cash-accounts"><Button variant="outline" size="sm" className="gap-1.5"><PiggyBank className="h-3.5 w-3.5" />Cash & Accounts</Button></Link>
          <Link href="/money-tracker"><Button variant="outline" size="sm" className="gap-1.5"><HandCoins className="h-3.5 w-3.5" />Money Tracker</Button></Link>
          <Link href="/investments"><Button variant="outline" size="sm">Investments</Button></Link>
        </div>
      </div>

      {/* ── NET WORTH BANNER ─────────────────────────────────────────── */}
      <Card className={`border-2 ${isNetPositive ? 'border-indigo-700/50 bg-indigo-950/20' : 'border-red-700/50 bg-red-950/10'}`}>
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${isNetPositive ? 'bg-indigo-900/50' : 'bg-red-900/50'}`}>
                <Wallet className={`h-6 w-6 ${isNetPositive ? 'text-indigo-400' : 'text-red-400'}`} />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Total Net Worth</p>
                <p className={`text-3xl font-bold mt-0.5 ${isNetPositive ? 'text-indigo-300' : 'text-red-400'}`}>
                  {formatCurrency(netWorth)}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Portfolio + Cash + Lent − Borrowed
                </p>
              </div>
            </div>
            {/* Breakdown pills */}
            <div className="flex flex-wrap gap-2 text-xs">
              <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg px-3 py-2">
                <span className="text-slate-500 block">Portfolio</span>
                <span className="font-bold text-slate-100">{formatCurrency(stats.currentValue)}</span>
              </div>
              <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-lg px-3 py-2">
                <span className="text-slate-500 block">Lent (owed to you)</span>
                <span className="font-bold text-emerald-400">+{formatCurrency(totalLent)}</span>
              </div>
              <div className="bg-blue-950/30 border border-blue-800/40 rounded-lg px-3 py-2">
                <span className="text-slate-500 block">Cash & Accounts</span>
                <span className="font-bold text-blue-300">+{formatCurrency(totalCashAccounts)}</span>
              </div>
              <div className="bg-red-950/30 border border-red-800/40 rounded-lg px-3 py-2">
                <span className="text-slate-500 block">Borrowed (you owe)</span>
                <span className="font-bold text-red-400">−{formatCurrency(totalBorrowed)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── INVESTMENT STATS ─────────────────────────────────────────── */}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-3">Investments</p>
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
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total P&amp;L</span>
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isGain ? 'bg-emerald-900/40' : 'bg-red-900/40'}`}>
                  {isGain ? <TrendingUp className="h-4 w-4 text-emerald-400" /> : <TrendingDown className="h-4 w-4 text-red-400" />}
                </div>
              </div>
              <div className={`text-2xl font-bold ${isGain ? 'text-emerald-400' : 'text-red-400'}`}>
                {isGain ? '+' : '-'}{formatCurrency(Math.abs(stats.totalPnL))}
              </div>
              <p className="text-xs text-slate-500 mt-1">{isGain ? 'Unrealised gain' : 'Unrealised loss'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">P&amp;L %</span>
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
      </div>

      {/* ── MONEY TRACKER STATS ──────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Money Tracker</p>
          <Link href="/money-tracker" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
            Manage →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-emerald-800/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Money Lent</span>
                <div className="h-8 w-8 rounded-lg bg-emerald-900/40 flex items-center justify-center">
                  <HandCoins className="h-4 w-4 text-emerald-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-emerald-400">{formatCurrency(totalLent)}</div>
              <p className="text-xs text-slate-500 mt-1">
                {moneyRecords.filter(r => r.type === 'lent' && r.status !== 'settled').length} pending · owed to you
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-800/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Money Borrowed</span>
                <div className="h-8 w-8 rounded-lg bg-red-900/40 flex items-center justify-center">
                  <HandCoins className="h-4 w-4 text-red-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-red-400">{formatCurrency(totalBorrowed)}</div>
              <p className="text-xs text-slate-500 mt-1">
                {moneyRecords.filter(r => r.type === 'borrowed' && r.status !== 'settled').length} pending · you owe
              </p>
            </CardContent>
          </Card>

          <Card className={totalLent - totalBorrowed >= 0 ? 'border-emerald-800/30' : 'border-red-800/30'}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Net Position</span>
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${totalLent - totalBorrowed >= 0 ? 'bg-emerald-900/40' : 'bg-red-900/40'}`}>
                  {totalLent - totalBorrowed >= 0
                    ? <TrendingUp className="h-4 w-4 text-emerald-400" />
                    : <TrendingDown className="h-4 w-4 text-red-400" />}
                </div>
              </div>
              <div className={`text-2xl font-bold ${totalLent - totalBorrowed >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {totalLent - totalBorrowed >= 0 ? '+' : ''}{formatCurrency(totalLent - totalBorrowed)}
              </div>
              <p className="text-xs text-slate-500 mt-1">Lent minus borrowed</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── CASH & ACCOUNTS STATS ────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Cash &amp; Accounts</p>
          <Link href="/cash-accounts" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
            Manage →
          </Link>
        </div>
        {accounts.length === 0 ? (
          <Card className="border-dashed border-[#2a2d3e]">
            <CardContent className="p-5 text-center">
              <PiggyBank className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No accounts added yet.</p>
              <Link href="/cash-accounts" className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 inline-block">
                Add your cash &amp; accounts →
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-blue-800/30">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Balance</span>
                  <div className="h-8 w-8 rounded-lg bg-blue-900/40 flex items-center justify-center">
                    <PiggyBank className="h-4 w-4 text-blue-400" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-blue-300">{formatCurrency(totalCashAccounts)}</div>
                <p className="text-xs text-slate-500 mt-1">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
              </CardContent>
            </Card>

            {/* Per-category breakdown — show top 3 categories */}
            {(() => {
              const byCategory: Record<string, number> = {};
              accounts.forEach((a) => {
                byCategory[a.category] = (byCategory[a.category] ?? 0) + a.balance;
              });
              return Object.entries(byCategory)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([cat, bal]) => (
                  <Card key={cat}>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider truncate pr-1">{cat}</span>
                        <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                          <Landmark className="h-4 w-4 text-slate-400" />
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-slate-100">{formatCurrency(bal)}</div>
                      <p className="text-xs text-slate-500 mt-1">
                        {totalCashAccounts > 0 ? ((bal / totalCashAccounts) * 100).toFixed(1) : '0'}% of cash
                      </p>
                    </CardContent>
                  </Card>
                ));
            })()}
          </div>
        )}
      </div>

      {/* ── DAILY EXPENSES ───────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Daily Expenses</p>
          <Link href="/expenses" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
            Track →
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-orange-800/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Today</span>
                <div className="h-8 w-8 rounded-lg bg-orange-900/40 flex items-center justify-center">
                  <Receipt className="h-4 w-4 text-orange-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-orange-300">{formatCurrency(todayExpenses)}</div>
              <p className="text-xs text-slate-500 mt-1">
                {expenses.filter((e) => e.date === new Date().toISOString().slice(0, 10)).length} transaction{expenses.filter((e) => e.date === new Date().toISOString().slice(0, 10)).length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">This Month</span>
                <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center">
                  <Receipt className="h-4 w-4 text-slate-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-100">{formatCurrency(monthExpenses)}</div>
              <p className="text-xs text-slate-500 mt-1">
                {expenses.filter((e) => e.date.startsWith(new Date().toISOString().slice(0, 7))).length} transactions
              </p>
            </CardContent>
          </Card>

          <Card className="col-span-2">
            <CardContent className="p-5">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Top Categories</p>
              {topCategories.length === 0 ? (
                <p className="text-xs text-slate-600">No expenses logged this month.</p>
              ) : (
                <div className="space-y-2">
                  {topCategories.map(([cat, amt]) => {
                    const pct = monthExpenses > 0 ? (amt / monthExpenses) * 100 : 0;
                    return (
                      <div key={cat} className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 w-32 truncate">{cat}</span>
                        <div className="flex-1 bg-[#0f1117] rounded-full h-1.5">
                          <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-slate-300 font-medium w-20 text-right">{formatCurrency(amt)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── SUBSCRIPTIONS ────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Subscriptions</p>
          <Link href="/subscriptions" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
            Manage →
          </Link>
        </div>
        {recurring.length === 0 ? (
          <Card className="border-dashed border-[#2a2d3e]">
            <CardContent className="p-5 text-center">
              <RefreshCw className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No subscriptions tracked yet.</p>
              <Link href="/subscriptions" className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 inline-block">
                Add Netflix, Spotify, rent… →
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Monthly Cost</span>
                  <div className="h-8 w-8 rounded-lg bg-indigo-900/40 flex items-center justify-center">
                    <RefreshCw className="h-4 w-4 text-indigo-400" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-100">{formatCurrency(monthlySubCost)}</div>
                <p className="text-xs text-slate-500 mt-1">{formatCurrency(monthlySubCost * 12)}/yr · {recurring.filter(r => r.active).length} active</p>
              </CardContent>
            </Card>
            <Card className={dueSoonSubs.some(r => isOverdue(r.next_due)) ? 'border-red-700/40' : dueSoonSubs.length > 0 ? 'border-amber-700/40' : ''}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Due This Week</span>
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${dueSoonSubs.some(r => isOverdue(r.next_due)) ? 'bg-red-900/40' : dueSoonSubs.length > 0 ? 'bg-amber-900/40' : 'bg-slate-800'}`}>
                    <Bell className={`h-4 w-4 ${dueSoonSubs.some(r => isOverdue(r.next_due)) ? 'text-red-400' : dueSoonSubs.length > 0 ? 'text-amber-400' : 'text-slate-400'}`} />
                  </div>
                </div>
                <div className={`text-2xl font-bold ${dueSoonSubs.some(r => isOverdue(r.next_due)) ? 'text-red-400' : dueSoonSubs.length > 0 ? 'text-amber-400' : 'text-slate-100'}`}>
                  {dueSoonSubs.length}
                </div>
                <p className="text-xs text-slate-500 mt-1">{dueSoonSubs.filter(r => isOverdue(r.next_due)).length} overdue</p>
              </CardContent>
            </Card>
            {/* Up to 2 upcoming subs */}
            {dueSoonSubs.slice(0, 2).map((sub) => (
              <Card key={sub.id} className={isOverdue(sub.next_due) ? 'border-red-700/40' : 'border-amber-700/30'}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider truncate pr-1">{sub.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${isOverdue(sub.next_due) ? 'bg-red-900/40 text-red-400' : 'bg-amber-900/40 text-amber-400'}`}>
                      {isOverdue(sub.next_due) ? 'Overdue' : 'Soon'}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-slate-100">{formatCurrency(sub.amount)}</div>
                  <p className="text-xs text-slate-500 mt-1">{sub.next_due}</p>
                </CardContent>
              </Card>
            ))}
            {/* Fill empty slots if fewer than 2 upcoming */}
            {dueSoonSubs.length === 0 && (
              <Card className="col-span-2">
                <CardContent className="p-5 flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 text-emerald-400" />
                  <p className="text-sm text-slate-400">All subscriptions are up to date.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* ── BEST / WORST ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {stats.bestAsset && (
          <Card className="border-emerald-800/40 bg-emerald-950/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                <Star className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Best Performer</p>
                <p className="font-semibold text-slate-100">{stats.bestAsset.asset_name}</p>
                <p className="text-sm text-emerald-400 font-medium">{formatPercent(getPnlPercent(stats.bestAsset))}</p>
              </div>
            </CardContent>
          </Card>
        )}
        {stats.worstAsset && stats.worstAsset.id !== stats.bestAsset?.id && (
          <Card className="border-red-800/40 bg-red-950/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-900/40 flex items-center justify-center flex-shrink-0">
                <TrendingDown className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Worst Performer</p>
                <p className="font-semibold text-slate-100">{stats.worstAsset.asset_name}</p>
                <p className="text-sm text-red-400 font-medium">{formatPercent(getPnlPercent(stats.worstAsset))}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── RISK ALERTS ──────────────────────────────────────────────── */}
      {riskAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Risk Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {riskAlerts.map((alert, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 rounded-lg px-4 py-2.5 text-sm ${
                  alert.type === 'danger'   ? 'bg-red-950/40 border border-red-800/40 text-red-300'
                  : alert.type === 'success' ? 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-300'
                  : 'bg-amber-950/40 border border-amber-800/40 text-amber-300'
                }`}
              >
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                {alert.message}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── CHARTS ───────────────────────────────────────────────────── */}
      <PortfolioCharts investments={activeInvestments} />

      {/* ── SUMMARY TABLE ────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">All Investments</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <InvestmentTable investments={activeInvestments} compact />
        </CardContent>
      </Card>

    </div>
  );
}
