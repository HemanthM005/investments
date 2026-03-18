'use client';

import { useState, useMemo } from 'react';
import {
  Plus, Pencil, Trash2, Receipt, ShoppingCart, Utensils, Car,
  Tv, HeartPulse, Zap, GraduationCap, Plane, Home, RefreshCw,
  Sparkles, Gift, HelpCircle, X, ChevronDown, Unlink,
} from 'lucide-react';
import { useExpenseStore } from '@/lib/expenseStore';
import { useAssetStore } from '@/lib/assetStore';
import { formatCurrency } from '@/lib/utils';
import type { Expense, ExpenseCategory } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// ── category config ───────────────────────────────────────────────────────────

const CATEGORIES: ExpenseCategory[] = [
  'Food & Dining', 'Groceries', 'Transport', 'Shopping', 'Entertainment',
  'Health & Medical', 'Bills & Utilities', 'Education', 'Travel', 'Rent',
  'Subscriptions', 'Personal Care', 'Gifts & Donations', 'Other',
];

const CATEGORY_ICONS: Record<ExpenseCategory, React.ElementType> = {
  'Food & Dining':     Utensils,
  'Groceries':         ShoppingCart,
  'Transport':         Car,
  'Shopping':          ShoppingCart,
  'Entertainment':     Tv,
  'Health & Medical':  HeartPulse,
  'Bills & Utilities': Zap,
  'Education':         GraduationCap,
  'Travel':            Plane,
  'Rent':              Home,
  'Subscriptions':     RefreshCw,
  'Personal Care':     Sparkles,
  'Gifts & Donations': Gift,
  'Other':             HelpCircle,
};

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  'Food & Dining':     'bg-orange-900/40 text-orange-400',
  'Groceries':         'bg-green-900/40 text-green-400',
  'Transport':         'bg-blue-900/40 text-blue-400',
  'Shopping':          'bg-pink-900/40 text-pink-400',
  'Entertainment':     'bg-purple-900/40 text-purple-400',
  'Health & Medical':  'bg-red-900/40 text-red-400',
  'Bills & Utilities': 'bg-yellow-900/40 text-yellow-400',
  'Education':         'bg-indigo-900/40 text-indigo-400',
  'Travel':            'bg-cyan-900/40 text-cyan-400',
  'Rent':              'bg-slate-700/60 text-slate-300',
  'Subscriptions':     'bg-violet-900/40 text-violet-400',
  'Personal Care':     'bg-rose-900/40 text-rose-400',
  'Gifts & Donations': 'bg-amber-900/40 text-amber-400',
  'Other':             'bg-slate-800 text-slate-400',
};

// ── helpers ───────────────────────────────────────────────────────────────────

function today() { return new Date().toISOString().slice(0, 10); }

const EMPTY: Omit<Expense, 'id'> = {
  date: today(), amount: 0, category: 'Food & Dining',
  payment_source_id: '', payment_source_name: '', description: '', notes: '',
};

// ── modal ─────────────────────────────────────────────────────────────────────

function ExpenseModal({
  initial, onSave, onClose,
}: {
  initial: Omit<Expense, 'id'> & { id?: string };
  onSave: (data: Omit<Expense, 'id'> & { id?: string }) => void;
  onClose: () => void;
}) {
  const accounts = useAssetStore((s) => s.accounts);
  const [form, setForm] = useState(initial);
  const setField = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  function selectAccount(id: string) {
    const acc = accounts.find((a) => a.id === id);
    setForm((f) => ({
      ...f,
      payment_source_id: id,
      payment_source_name: acc ? `${acc.name} (${acc.category})` : '',
    }));
  }

  const canSave = form.description.trim().length > 0 && form.amount > 0;

  // Group accounts by category for a cleaner picker
  const grouped = useMemo(() => {
    const map = new Map<string, typeof accounts>();
    accounts.forEach((a) => {
      if (!map.has(a.category)) map.set(a.category, []);
      map.get(a.category)!.push(a);
    });
    return [...map.entries()];
  }, [accounts]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-[#2a2d3e] sticky top-0 bg-[#1a1d2e] z-10">
          <h2 className="text-base font-semibold text-slate-100">
            {form.id ? 'Edit Expense' : 'Add Expense'}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">

          {/* Date + Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Date</label>
              <input type="date" value={form.date} onChange={(e) => setField('date', e.target.value)}
                className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Amount (₹)</label>
              <input type="number" min="0" step="0.01" value={form.amount || ''}
                onChange={(e) => setField('amount', parseFloat(e.target.value) || 0)}
                className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                placeholder="0.00" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Description</label>
            <input value={form.description} onChange={(e) => setField('description', e.target.value)}
              className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              placeholder="e.g. Lunch at office, Uber to airport…" />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Category</label>
            <div className="relative">
              <select value={form.category} onChange={(e) => setField('category', e.target.value as ExpenseCategory)}
                className="w-full appearance-none bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-500" />
            </div>
          </div>

          {/* Account picker */}
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Paid from account</label>
            {accounts.length === 0 ? (
              <p className="text-xs text-slate-500 bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2">
                No accounts yet — add them in Cash &amp; Accounts first.
              </p>
            ) : (
              <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                {/* "Other / untracked" option */}
                <button type="button"
                  onClick={() => setForm((f) => ({ ...f, payment_source_id: '', payment_source_name: 'Other' }))}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm transition-colors text-left ${
                    form.payment_source_id === ''
                      ? 'border-indigo-500 bg-indigo-950/30 text-slate-100'
                      : 'border-[#2a2d3e] text-slate-400 hover:bg-white/[0.03]'
                  }`}>
                  <Unlink className="h-4 w-4 flex-shrink-0 text-slate-500" />
                  <span>Other / Not tracked</span>
                </button>

                {grouped.map(([cat, accs]) => (
                  <div key={cat}>
                    <p className="text-xs text-slate-600 px-1 pt-1 pb-0.5">{cat}</p>
                    {accs.map((acc) => (
                      <button type="button" key={acc.id}
                        onClick={() => selectAccount(acc.id)}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm transition-colors text-left ${
                          form.payment_source_id === acc.id
                            ? 'border-indigo-500 bg-indigo-950/30 text-slate-100'
                            : 'border-[#2a2d3e] text-slate-400 hover:bg-white/[0.03]'
                        }`}>
                        <span className="font-medium">{acc.name}</span>
                        <span className={`text-xs ${acc.balance < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                          {formatCurrency(acc.balance)}
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {form.payment_source_id && (
              <p className="text-xs text-indigo-400 mt-1.5">
                ₹{form.amount > 0 ? form.amount.toLocaleString('en-IN') : '—'} will be deducted from this account on save.
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Notes (optional)</label>
            <input value={form.notes} onChange={(e) => setField('notes', e.target.value)}
              className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              placeholder="Any extra details…" />
          </div>
        </div>

        <div className="flex gap-2 p-5 pt-0 sticky bottom-0 bg-[#1a1d2e]">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" disabled={!canSave} onClick={() => onSave(form)}>
            {form.id ? 'Save Changes' : 'Add Expense'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const expenses      = useExpenseStore((s) => s.expenses);
  const addExpense    = useExpenseStore((s) => s.addExpense);
  const updateExpense = useExpenseStore((s) => s.updateExpense);
  const deleteExpense = useExpenseStore((s) => s.deleteExpense);

  const [modal, setModal] = useState<null | (Omit<Expense, 'id'> & { id?: string })>(null);
  const [filterMonth, setFilterMonth] = useState(today().slice(0, 7));
  const [filterCat, setFilterCat]     = useState<string>('All');
  const [filterSrc, setFilterSrc]     = useState<string>('All');

  const todayStr = today();

  const todaySpend = useMemo(
    () => expenses.filter((e) => e.date === todayStr).reduce((s, e) => s + e.amount, 0),
    [expenses, todayStr],
  );
  const monthExpenses = useMemo(
    () => expenses.filter((e) => e.date.startsWith(filterMonth)),
    [expenses, filterMonth],
  );
  const monthSpend = useMemo(
    () => monthExpenses.reduce((s, e) => s + e.amount, 0),
    [monthExpenses],
  );
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    monthExpenses.forEach((e) => { map[e.category] = (map[e.category] ?? 0) + e.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthExpenses]);

  // All unique account names for filter
  const accountOptions = useMemo(() => {
    const names = new Set(expenses.map((e) => e.payment_source_name).filter(Boolean));
    return [...names];
  }, [expenses]);

  const filtered = useMemo(() => {
    return expenses
      .filter((e) =>
        e.date.startsWith(filterMonth) &&
        (filterCat === 'All' || e.category === filterCat) &&
        (filterSrc === 'All' || e.payment_source_name === filterSrc),
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, filterMonth, filterCat, filterSrc]);

  const grouped = useMemo(() => {
    const map = new Map<string, Expense[]>();
    filtered.forEach((e) => {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  function formatDay(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00');
    if (dateStr === todayStr) return 'Today';
    const yest = new Date(); yest.setDate(yest.getDate() - 1);
    if (dateStr === yest.toISOString().slice(0, 10)) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
  }

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Daily Expenses</h1>
          <p className="text-sm text-slate-400 mt-0.5">Track spending · auto-deducts from linked accounts</p>
        </div>
        <Button onClick={() => setModal({ ...EMPTY, date: todayStr })} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Expense
        </Button>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Today</p>
            <p className="text-2xl font-bold text-slate-100">{formatCurrency(todaySpend)}</p>
            <p className="text-xs text-slate-500 mt-1">
              {expenses.filter((e) => e.date === todayStr).length} transactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">This Month</p>
            <p className="text-2xl font-bold text-slate-100">{formatCurrency(monthSpend)}</p>
            <p className="text-xs text-slate-500 mt-1">{monthExpenses.length} transactions</p>
          </CardContent>
        </Card>
        <Card className="col-span-2">
          <CardContent className="p-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Top Categories ({filterMonth})</p>
            {categoryBreakdown.length === 0 ? (
              <p className="text-xs text-slate-600">No data for this month.</p>
            ) : (
              <div className="space-y-1.5">
                {categoryBreakdown.slice(0, 3).map(([cat, amt]) => {
                  const pct = monthSpend > 0 ? (amt / monthSpend) * 100 : 0;
                  return (
                    <div key={cat} className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-32 truncate">{cat}</span>
                      <div className="flex-1 bg-[#0f1117] rounded-full h-1.5">
                        <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
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

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
          className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500" />
        <div className="relative">
          <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
            className="appearance-none bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg px-3 py-1.5 pr-7 text-sm text-slate-300 focus:outline-none focus:border-indigo-500">
            <option value="All">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-2 h-4 w-4 text-slate-500" />
        </div>
        {accountOptions.length > 0 && (
          <div className="relative">
            <select value={filterSrc} onChange={(e) => setFilterSrc(e.target.value)}
              className="appearance-none bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg px-3 py-1.5 pr-7 text-sm text-slate-300 focus:outline-none focus:border-indigo-500">
              <option value="All">All Accounts</option>
              {accountOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2 h-4 w-4 text-slate-500" />
          </div>
        )}
        <span className="text-xs text-slate-500 ml-auto">{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Expense list grouped by date */}
      {grouped.length === 0 ? (
        <Card className="border-dashed border-[#2a2d3e]">
          <CardContent className="p-10 text-center">
            <Receipt className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500">No expenses found for this period.</p>
            <Button variant="outline" size="sm" className="mt-3"
              onClick={() => setModal({ ...EMPTY, date: todayStr })}>
              Add your first expense
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {grouped.map(([date, dayExpenses]) => {
            const dayTotal = dayExpenses.reduce((s, e) => s + e.amount, 0);
            return (
              <div key={date}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-300">{formatDay(date)}</span>
                  <span className="text-sm font-bold text-slate-100">{formatCurrency(dayTotal)}</span>
                </div>
                <Card>
                  <CardContent className="p-0 divide-y divide-[#2a2d3e]">
                    {dayExpenses.map((exp) => {
                      const Icon = CATEGORY_ICONS[exp.category];
                      const iconClass = CATEGORY_COLORS[exp.category];
                      return (
                        <div key={exp.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] group">
                          <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconClass}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-200 truncate">{exp.description}</p>
                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                              <span>{exp.category}</span>
                              {exp.payment_source_name && (
                                <>
                                  <span className="text-slate-700">·</span>
                                  <span className="text-indigo-400">{exp.payment_source_name}</span>
                                </>
                              )}
                              {exp.notes && (
                                <>
                                  <span className="text-slate-700">·</span>
                                  <span className="text-slate-600">{exp.notes}</span>
                                </>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-slate-100">{formatCurrency(exp.amount)}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setModal({ ...exp })}
                                className="p-1 rounded hover:bg-indigo-900/40 text-slate-500 hover:text-indigo-400 transition-colors">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => { if (confirm('Delete this expense?')) deleteExpense(exp.id); }}
                                className="p-1 rounded hover:bg-red-900/40 text-slate-500 hover:text-red-400 transition-colors">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* Category breakdown table */}
      {categoryBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Category Breakdown — {filterMonth}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2d3e] text-xs text-slate-500">
                  <th className="text-left px-4 py-2 font-medium">Category</th>
                  <th className="text-right px-4 py-2 font-medium">Amount</th>
                  <th className="text-right px-4 py-2 font-medium">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2d3e]">
                {categoryBreakdown.map(([cat, amt]) => {
                  const Icon = CATEGORY_ICONS[cat as ExpenseCategory];
                  const iconClass = CATEGORY_COLORS[cat as ExpenseCategory];
                  const pct = monthSpend > 0 ? (amt / monthSpend) * 100 : 0;
                  return (
                    <tr key={cat} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className={`h-6 w-6 rounded flex items-center justify-center ${iconClass}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-slate-300">{cat}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-100">{formatCurrency(amt)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-500">{pct.toFixed(1)}%</td>
                    </tr>
                  );
                })}
                <tr className="border-t border-[#2a2d3e] font-semibold">
                  <td className="px-4 py-2.5 text-slate-300">Total</td>
                  <td className="px-4 py-2.5 text-right text-slate-100">{formatCurrency(monthSpend)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-500">100%</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      {modal && (
        <ExpenseModal
          initial={modal}
          onClose={() => setModal(null)}
          onSave={(data) => {
            if (data.id) updateExpense(data.id, data);
            else addExpense(data);
            setModal(null);
          }}
        />
      )}
    </div>
  );
}
