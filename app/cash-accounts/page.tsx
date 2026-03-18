'use client';

import { useState, useMemo } from 'react';
import {
  Plus, Pencil, Trash2, Banknote, PiggyBank, Building2, Wallet,
  Shield, TrendingUp, CreditCard, Receipt,
} from 'lucide-react';
import { useAssetStore, getTotalBalance } from '@/lib/assetStore';
import { useExpenseStore, getSpendForAccount } from '@/lib/expenseStore';
import { formatCurrency, cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { AssetAccount, AssetCategory } from '@/lib/types';

// ── config ──────────────────────────────────────────────────────────────────

const CATEGORIES: AssetCategory[] = [
  'Cash', 'Savings Account', 'Current Account', 'Credit Card',
  'Fixed Deposit', 'Recurring Deposit', 'PPF', 'EPF', 'NPS',
  'Digital Wallet', 'Other',
];

const CATEGORY_META: Record<AssetCategory, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  'Cash':               { icon: <Banknote className="h-4 w-4" />,    color: 'text-yellow-400',  bg: 'bg-yellow-900/30',  border: 'border-yellow-800/40' },
  'Savings Account':    { icon: <PiggyBank className="h-4 w-4" />,   color: 'text-emerald-400', bg: 'bg-emerald-900/30', border: 'border-emerald-800/40' },
  'Fixed Deposit':      { icon: <Shield className="h-4 w-4" />,      color: 'text-blue-400',    bg: 'bg-blue-900/30',    border: 'border-blue-800/40' },
  'Current Account':    { icon: <Building2 className="h-4 w-4" />,   color: 'text-purple-400',  bg: 'bg-purple-900/30',  border: 'border-purple-800/40' },
  'Credit Card':        { icon: <CreditCard className="h-4 w-4" />,  color: 'text-red-400',     bg: 'bg-red-900/30',     border: 'border-red-800/40' },
  'PPF':                { icon: <Shield className="h-4 w-4" />,      color: 'text-indigo-400',  bg: 'bg-indigo-900/30',  border: 'border-indigo-800/40' },
  'EPF':                { icon: <Shield className="h-4 w-4" />,      color: 'text-cyan-400',    bg: 'bg-cyan-900/30',    border: 'border-cyan-800/40' },
  'NPS':                { icon: <TrendingUp className="h-4 w-4" />,  color: 'text-orange-400',  bg: 'bg-orange-900/30',  border: 'border-orange-800/40' },
  'Digital Wallet':     { icon: <Wallet className="h-4 w-4" />,      color: 'text-pink-400',    bg: 'bg-pink-900/30',    border: 'border-pink-800/40' },
  'Recurring Deposit':  { icon: <TrendingUp className="h-4 w-4" />,  color: 'text-teal-400',    bg: 'bg-teal-900/30',    border: 'border-teal-800/40' },
  'Other':              { icon: <Banknote className="h-4 w-4" />,    color: 'text-slate-400',   bg: 'bg-slate-700/30',   border: 'border-slate-700/40' },
};

// ── Modal ───────────────────────────────────────────────────────────────────

const EMPTY: Omit<AssetAccount, 'id'> = {
  name: '', category: 'Savings Account', balance: 0,
  interest_rate: 0, maturity_date: '', notes: '',
  last_updated: new Date().toISOString().split('T')[0],
};

function AccountModal({
  open, onClose, onSubmit, initial,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<AssetAccount, 'id'>) => void;
  initial?: AssetAccount | null;
}) {
  const [form, setForm] = useState<Omit<AssetAccount, 'id'>>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useMemo(() => {
    if (initial) {
      const { id: _id, ...rest } = initial;
      setForm(rest);
    } else {
      setForm({ ...EMPTY, last_updated: new Date().toISOString().split('T')[0] });
    }
    setErrors({});
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(form);
  };

  const isCreditCard = form.category === 'Credit Card';
  const showInterestRate = ['Fixed Deposit', 'Savings Account', 'PPF', 'EPF', 'NPS', 'Recurring Deposit', 'Credit Card'].includes(form.category);
  const showMaturity     = ['Fixed Deposit', 'Recurring Deposit', 'PPF'].includes(form.category);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Account' : 'Add Account / Balance'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={(v) => set('category', v as AssetCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="acc-name">Account / Label Name *</Label>
              <Input
                id="acc-name"
                placeholder={
                  isCreditCard ? 'e.g. HDFC Credit Card, Axis Flipkart Card'
                  : form.category === 'Cash' ? 'e.g. Wallet Cash'
                  : form.category === 'Savings Account' ? 'e.g. SBI Savings, Axis Bank'
                  : form.category === 'Digital Wallet' ? 'e.g. PhonePe, Paytm'
                  : form.name || 'Name'
                }
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
              />
              {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="acc-balance">
                {isCreditCard ? 'Current Balance (₹)' : 'Balance (₹) *'}
              </Label>
              <Input
                id="acc-balance"
                type="number"
                step="1"
                placeholder={isCreditCard ? 'e.g. 5000 (owe) or -500 (credit back)' : '0'}
                value={form.balance === 0 ? '' : form.balance}
                onChange={(e) => set('balance', parseFloat(e.target.value) || 0)}
              />
              {isCreditCard && (
                <p className="text-xs text-slate-500">
                  Positive = amount you owe · Negative = credit balance (bank owes you) · 0 = fully paid off
                </p>
              )}
              {errors.balance && <p className="text-xs text-red-400">{errors.balance}</p>}
            </div>

            {showInterestRate && (
              <div className="space-y-1.5">
                <Label htmlFor="acc-rate">
                  {isCreditCard ? 'Interest Rate (% p.a.)' : 'Interest Rate (% p.a.)'}
                </Label>
                <Input
                  id="acc-rate"
                  type="number"
                  step="0.01"
                  placeholder={isCreditCard ? 'e.g. 42' : 'e.g. 7.1'}
                  value={form.interest_rate || ''}
                  onChange={(e) => set('interest_rate', parseFloat(e.target.value) || 0)}
                />
              </div>
            )}

            {showMaturity && (
              <div className="space-y-1.5">
                <Label htmlFor="acc-maturity">Maturity Date</Label>
                <Input
                  id="acc-maturity"
                  type="date"
                  value={form.maturity_date}
                  onChange={(e) => set('maturity_date', e.target.value)}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="acc-updated">Last Updated</Label>
              <Input
                id="acc-updated"
                type="date"
                value={form.last_updated}
                onChange={(e) => set('last_updated', e.target.value)}
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="acc-notes">Notes</Label>
              <Textarea
                id="acc-notes"
                placeholder={
                  isCreditCard
                    ? 'Card limit, billing date, bank name, last 4 digits…'
                    : 'Bank name, account number hint, branch, etc.'
                }
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{initial ? 'Save Changes' : 'Add Account'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Account Card ────────────────────────────────────────────────────────────

function AccountCard({
  account, monthlySpend, txCount, onEdit, onDelete,
}: {
  account: AssetAccount;
  monthlySpend: number;
  txCount: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = CATEGORY_META[account.category];
  const isCreditCard = account.category === 'Credit Card';
  const isOwed   = isCreditCard && account.balance > 0;   // you owe the bank
  const isCredit = isCreditCard && account.balance < 0;   // bank owes you (overpaid)

  return (
    <div className={`bg-[#1a1d2e] border ${meta.border} rounded-xl p-4 flex flex-col gap-3 hover:brightness-110 transition-all`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`h-9 w-9 rounded-lg ${meta.bg} flex items-center justify-center flex-shrink-0 ${meta.color}`}>
            {meta.icon}
          </div>
          <div>
            <p className="font-semibold text-slate-100 text-sm leading-tight">{account.name}</p>
            <p className={`text-xs font-medium ${meta.color}`}>{account.category}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold ${isOwed ? 'text-red-400' : isCredit ? 'text-emerald-400' : 'text-slate-100'}`}>
            {isOwed   ? `−${formatCurrency(account.balance)}`
             : isCredit ? `+${formatCurrency(Math.abs(account.balance))}`
             : formatCurrency(account.balance)}
          </p>
          {isOwed   && <p className="text-xs text-red-400/70">amount owed</p>}
          {isCredit && <p className="text-xs text-emerald-400/70">credit balance</p>}
          {!isCreditCard || account.balance === 0 ? (
            account.balance === 0 && isCreditCard && <p className="text-xs text-emerald-400/70">all paid off</p>
          ) : null}
          {account.interest_rate > 0 && (
            <p className={`text-xs ${isOwed ? 'text-red-400' : 'text-emerald-400'}`}>
              {account.interest_rate}% p.a.
            </p>
          )}
        </div>
      </div>

      {/* Expense info */}
      {txCount > 0 && (
        <div className="flex items-center gap-1.5 bg-[#0f1117] rounded-lg px-3 py-2">
          <Receipt className="h-3.5 w-3.5 text-orange-400 flex-shrink-0" />
          <span className="text-xs text-slate-400">
            <span className="text-orange-300 font-medium">{formatCurrency(monthlySpend)}</span>
            {' '}spent this month · {txCount} transaction{txCount !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {(account.maturity_date || account.notes) && (
        <div className="space-y-1">
          {account.maturity_date && (
            <p className="text-xs text-slate-500">Matures: {account.maturity_date}</p>
          )}
          {account.notes && (
            <p className="text-xs text-slate-500 leading-relaxed">{account.notes}</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-slate-600">Updated {account.last_updated}</p>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit} className="h-7 w-7 text-slate-500 hover:text-indigo-400">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} className="h-7 w-7 text-slate-500 hover:text-red-400">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function CashAccountsPage() {
  const { accounts, addAccount, updateAccount, deleteAccount } = useAssetStore();
  const expenses = useExpenseStore((s) => s.expenses);

  const [modalOpen, setModalOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState<AssetAccount | null>(null);
  const [filterCat, setFilterCat]   = useState<AssetCategory | 'All'>('All');

  const currentMonth = new Date().toISOString().slice(0, 7);

  const total = useMemo(() => getTotalBalance(accounts), [accounts]);

  // For net worth: credit card negative balances are liabilities
  const liquidAssets   = useMemo(() => accounts.filter((a) => a.category !== 'Credit Card').reduce((s, a) => s + a.balance, 0), [accounts]);
  const creditCardDebt = useMemo(() => accounts.filter((a) => a.category === 'Credit Card' && a.balance > 0).reduce((s, a) => s + a.balance, 0), [accounts]);

  const byCategory = useMemo(() => {
    const map: Partial<Record<AssetCategory, number>> = {};
    accounts.forEach((a) => { map[a.category] = (map[a.category] ?? 0) + a.balance; });
    return Object.entries(map).sort((a, b) => (b[1] as number) - (a[1] as number)) as [AssetCategory, number][];
  }, [accounts]);

  const filtered = useMemo(() =>
    filterCat === 'All' ? accounts : accounts.filter((a) => a.category === filterCat),
    [accounts, filterCat],
  );

  // Per-account expense stats
  const expenseStats = useMemo(() => {
    const map: Record<string, { spend: number; count: number }> = {};
    accounts.forEach((a) => {
      const monthExpenses = expenses.filter((e) => e.payment_source_id === a.id && e.date.startsWith(currentMonth));
      map[a.id] = { spend: monthExpenses.reduce((s, e) => s + e.amount, 0), count: monthExpenses.length };
    });
    return map;
  }, [accounts, expenses, currentMonth]);

  const handleSubmit = (data: Omit<AssetAccount, 'id'>) => {
    if (editTarget) updateAccount(editTarget.id, data);
    else addAccount(data);
    setModalOpen(false);
    setEditTarget(null);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <PiggyBank className="h-6 w-6 text-indigo-400" /> Cash &amp; Accounts
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Savings, FDs, cash, credit cards — all in one place</p>
        </div>
        <Button onClick={() => { setEditTarget(null); setModalOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Add Account
        </Button>
      </div>

      {/* Summary banner */}
      <Card className="border-indigo-800/40 bg-indigo-950/10">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-shrink-0">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Balance</p>
              <p className="text-3xl font-bold text-indigo-300">{formatCurrency(total)}</p>
              <p className="text-xs text-slate-500 mt-0.5">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
            </div>
            {/* Liquid vs credit card debt callout */}
            {creditCardDebt > 0 && (
              <div className="flex flex-wrap gap-2 text-xs sm:mt-1">
                <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg px-3 py-2">
                  <span className="text-slate-500 block">Liquid Assets</span>
                  <span className="font-bold text-slate-100">{formatCurrency(liquidAssets)}</span>
                </div>
                <div className="bg-red-950/30 border border-red-800/40 rounded-lg px-3 py-2">
                  <span className="text-slate-500 block">Credit Card Debt</span>
                  <span className="font-bold text-red-400">−{formatCurrency(creditCardDebt)}</span>
                </div>
              </div>
            )}
            {/* Category breakdown bars */}
            {byCategory.length > 0 && (
              <div className="flex-1 space-y-1.5">
                {byCategory.map(([cat, bal]) => {
                  const pct = total !== 0 ? Math.abs(bal / Math.abs(total)) * 100 : 0;
                  const meta = CATEGORY_META[cat];
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className={meta.color}>{cat}</span>
                        <span className={`${bal < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                          {formatCurrency(bal)} · {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-[#2a2d3e] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${bal < 0 ? 'bg-red-500' : ''}`}
                          style={{
                            width: `${Math.min(pct, 100)}%`,
                            ...(bal >= 0 ? {
                              backgroundColor:
                                meta.color.includes('yellow') ? '#facc15'
                                : meta.color.includes('emerald') ? '#34d399'
                                : meta.color.includes('blue') ? '#60a5fa'
                                : meta.color.includes('indigo') ? '#818cf8'
                                : meta.color.includes('purple') ? '#c084fc'
                                : meta.color.includes('cyan') ? '#22d3ee'
                                : meta.color.includes('orange') ? '#fb923c'
                                : meta.color.includes('pink') ? '#f472b6'
                                : meta.color.includes('teal') ? '#2dd4bf'
                                : '#94a3b8',
                            } : {}),
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Category filter tabs */}
      {byCategory.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilterCat('All')}
            className={cn('px-3.5 py-1.5 rounded-lg text-sm border transition-colors',
              filterCat === 'All' ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-[#2a2d3e] text-slate-400 hover:bg-[#2a2d3e]'
            )}>
            All ({accounts.length})
          </button>
          {byCategory.map(([cat]) => {
            const meta = CATEGORY_META[cat];
            return (
              <button key={cat} onClick={() => setFilterCat(filterCat === cat ? 'All' : cat)}
                className={cn('px-3.5 py-1.5 rounded-lg text-sm border transition-colors flex items-center gap-1.5',
                  filterCat === cat ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-[#2a2d3e] text-slate-400 hover:bg-[#2a2d3e]'
                )}>
                <span className={filterCat === cat ? 'text-white' : meta.color}>{meta.icon}</span>
                {cat} ({accounts.filter((a) => a.category === cat).length})
              </button>
            );
          })}
        </div>
      )}

      {/* Account cards */}
      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-slate-500 text-sm">
            No accounts yet. Click &quot;Add Account&quot; to start tracking your cash and balances.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((acc) => (
            <AccountCard
              key={acc.id}
              account={acc}
              monthlySpend={expenseStats[acc.id]?.spend ?? 0}
              txCount={expenseStats[acc.id]?.count ?? 0}
              onEdit={() => { setEditTarget(acc); setModalOpen(true); }}
              onDelete={() => deleteAccount(acc.id)}
            />
          ))}
        </div>
      )}

      <AccountModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null); }}
        onSubmit={handleSubmit}
        initial={editTarget}
      />
    </div>
  );
}
