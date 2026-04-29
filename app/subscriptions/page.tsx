'use client';

import { useState, useMemo } from 'react';
import {
  Plus, Pencil, Trash2, RefreshCw, AlertCircle, CheckCircle2,
  X, ChevronDown, PauseCircle, PlayCircle, Zap, Bell,
} from 'lucide-react';
import {
  useRecurringStore, getNextDueDate, toMonthlyAmount, getTotalMonthly, isOverdue,
} from '@/lib/recurringStore';
import { useExpenseStore } from '@/lib/expenseStore';
import { useAssetStore } from '@/lib/assetStore';
import { formatCurrency } from '@/lib/utils';
import type { RecurringExpense, RecurringFrequency, ExpenseCategory } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// ── constants ─────────────────────────────────────────────────────────────────

const FREQUENCIES: RecurringFrequency[] = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'];

const CATEGORIES: ExpenseCategory[] = [
  'Subscriptions', 'Bills & Utilities', 'Health & Medical', 'Education',
  'Entertainment', 'Food & Dining', 'Transport & Travel', 'Sports & Fitness', 'Loan & EMI', 'Shopping', 'Other',
];

const FREQ_BADGE: Record<RecurringFrequency, string> = {
  Daily:     'bg-slate-700 text-slate-300',
  Weekly:    'bg-blue-900/40 text-blue-300',
  Monthly:   'bg-indigo-900/40 text-indigo-300',
  Quarterly: 'bg-purple-900/40 text-purple-300',
  Yearly:    'bg-amber-900/40 text-amber-300',
};

function today() { return new Date().toISOString().slice(0, 10); }

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr + 'T00:00:00').getTime() - new Date(today() + 'T00:00:00').getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDue(dateStr: string): string {
  const days = daysUntil(dateStr);
  if (days < 0)  return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days <= 7)  return `Due in ${days}d`;
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── modal ─────────────────────────────────────────────────────────────────────

const EMPTY: Omit<RecurringExpense, 'id'> = {
  name: '', amount: 0, frequency: 'Monthly', category: 'Subscriptions',
  payment_source_id: '', payment_source_name: '',
  next_due: today(), start_date: today(), active: true, notes: '',
};

function RecurringModal({
  initial, onSave, onClose,
}: {
  initial: Omit<RecurringExpense, 'id'> & { id?: string };
  onSave: (data: Omit<RecurringExpense, 'id'> & { id?: string }) => void;
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

  const grouped = useMemo(() => {
    const map = new Map<string, typeof accounts>();
    accounts.forEach((a) => {
      if (!map.has(a.category)) map.set(a.category, []);
      map.get(a.category)!.push(a);
    });
    return [...map.entries()];
  }, [accounts]);

  const canSave = form.name.trim().length > 0 && form.amount > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-[#2a2d3e] sticky top-0 bg-[#1a1d2e] z-10">
          <h2 className="text-base font-semibold text-slate-100">
            {form.id ? 'Edit Subscription' : 'Add Subscription'}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Name *</label>
            <input value={form.name} onChange={(e) => setField('name', e.target.value)}
              className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              placeholder="e.g. Netflix, Spotify, Gym, Rent…" />
          </div>

          {/* Amount + Frequency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Amount (₹) *</label>
              <input type="number" min="0" step="0.01" value={form.amount || ''}
                onChange={(e) => setField('amount', parseFloat(e.target.value) || 0)}
                className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                placeholder="0.00" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Frequency</label>
              <div className="relative">
                <select value={form.frequency} onChange={(e) => setField('frequency', e.target.value as RecurringFrequency)}
                  className="w-full appearance-none bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500">
                  {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-500" />
              </div>
            </div>
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

          {/* Next due + Start date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Next Due Date</label>
              <input type="date" value={form.next_due} onChange={(e) => setField('next_due', e.target.value)}
                className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Start Date</label>
              <input type="date" value={form.start_date} onChange={(e) => setField('start_date', e.target.value)}
                className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500" />
            </div>
          </div>

          {/* Account picker */}
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Charged to</label>
            {accounts.length === 0 ? (
              <p className="text-xs text-slate-500 bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2">
                No accounts yet — add them in Cash &amp; Accounts first.
              </p>
            ) : (
              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                <button type="button"
                  onClick={() => setForm((f) => ({ ...f, payment_source_id: '', payment_source_name: 'Other' }))}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                    form.payment_source_id === ''
                      ? 'border-indigo-500 bg-indigo-950/30 text-slate-100'
                      : 'border-[#2a2d3e] text-slate-400 hover:bg-white/[0.03]'
                  }`}>
                  Other / Not tracked
                </button>
                {grouped.map(([cat, accs]) => (
                  <div key={cat}>
                    <p className="text-xs text-slate-600 px-1 pt-1 pb-0.5">{cat}</p>
                    {accs.map((acc) => (
                      <button type="button" key={acc.id} onClick={() => selectAccount(acc.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${
                          form.payment_source_id === acc.id
                            ? 'border-indigo-500 bg-indigo-950/30 text-slate-100'
                            : 'border-[#2a2d3e] text-slate-400 hover:bg-white/[0.03]'
                        }`}>
                        <span className="font-medium">{acc.name}</span>
                        <span className="text-xs text-slate-500">{formatCurrency(acc.balance)}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Notes (optional)</label>
            <input value={form.notes} onChange={(e) => setField('notes', e.target.value)}
              className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              placeholder="Plan name, account number, reminder…" />
          </div>
        </div>

        <div className="flex gap-2 p-5 pt-0 sticky bottom-0 bg-[#1a1d2e]">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" disabled={!canSave} onClick={() => onSave(form)}>
            {form.id ? 'Save Changes' : 'Add Subscription'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── subscription card ─────────────────────────────────────────────────────────

function SubscriptionCard({
  item, onEdit, onDelete, onPay, onToggle,
}: {
  item: RecurringExpense;
  onEdit: () => void;
  onDelete: () => void;
  onPay: () => void;
  onToggle: () => void;
}) {
  const days = daysUntil(item.next_due);
  const overdue = isOverdue(item.next_due);
  const dueSoon = days >= 0 && days <= 7;
  const monthly = toMonthlyAmount(item.amount, item.frequency);

  return (
    <div className={`bg-[#1a1d2e] border rounded-xl p-4 flex flex-col gap-3 transition-all
      ${!item.active ? 'border-[#2a2d3e] opacity-60'
        : overdue ? 'border-red-700/60'
        : dueSoon ? 'border-amber-700/50'
        : 'border-[#2a2d3e] hover:border-indigo-700/40'}`}>

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-100 text-sm">{item.name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FREQ_BADGE[item.frequency]}`}>
              {item.frequency}
            </span>
            {!item.active && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">Paused</span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{item.category}
            {item.payment_source_name && <> · <span className="text-indigo-400/80">{item.payment_source_name}</span></>}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-lg font-bold text-slate-100">{formatCurrency(item.amount)}</p>
          {item.frequency !== 'Monthly' && (
            <p className="text-xs text-slate-500">≈ {formatCurrency(monthly)}/mo</p>
          )}
        </div>
      </div>

      {/* Due status */}
      {item.active && (
        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs
          ${overdue ? 'bg-red-950/40 text-red-300'
            : dueSoon ? 'bg-amber-950/40 text-amber-300'
            : 'bg-[#0f1117] text-slate-400'}`}>
          {overdue ? <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            : dueSoon ? <Bell className="h-3.5 w-3.5 flex-shrink-0" />
            : <RefreshCw className="h-3.5 w-3.5 flex-shrink-0" />}
          <span className="font-medium">{formatDue(item.next_due)}</span>
          <span className="text-slate-600 ml-auto">{item.next_due}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-0.5">
        {item.active && (
          <Button size="sm" className="flex-1 h-7 text-xs gap-1" onClick={onPay}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Mark Paid
          </Button>
        )}
        <button onClick={onToggle}
          className="h-7 px-2 rounded-md border border-[#2a2d3e] text-slate-500 hover:text-slate-300 transition-colors text-xs flex items-center gap-1">
          {item.active
            ? <><PauseCircle className="h-3.5 w-3.5" /> Pause</>
            : <><PlayCircle className="h-3.5 w-3.5" /> Resume</>}
        </button>
        <button onClick={onEdit} className="h-7 w-7 flex items-center justify-center rounded-md border border-[#2a2d3e] text-slate-500 hover:text-indigo-400 transition-colors">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button onClick={onDelete} className="h-7 w-7 flex items-center justify-center rounded-md border border-[#2a2d3e] text-slate-500 hover:text-red-400 transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function SubscriptionsPage() {
  const { recurring, addRecurring, updateRecurring, deleteRecurring } = useRecurringStore();
  const addExpense = useExpenseStore((s) => s.addExpense);

  const [modal, setModal] = useState<null | (Omit<RecurringExpense, 'id'> & { id?: string })>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'overdue' | 'paused'>('all');

  const totalMonthly = useMemo(() => getTotalMonthly(recurring), [recurring]);
  const totalYearly  = useMemo(() => totalMonthly * 12, [totalMonthly]);
  const overdueCount = useMemo(() => recurring.filter((r) => r.active && isOverdue(r.next_due)).length, [recurring]);
  const dueSoonCount = useMemo(() => recurring.filter((r) => r.active && !isOverdue(r.next_due) && daysUntil(r.next_due) <= 7).length, [recurring]);

  const filtered = useMemo(() => {
    const todayStr = today();
    return recurring
      .filter((r) => {
        if (filter === 'active')  return r.active && !isOverdue(r.next_due);
        if (filter === 'overdue') return r.active && isOverdue(r.next_due);
        if (filter === 'paused')  return !r.active;
        return true;
      })
      .sort((a, b) => a.next_due.localeCompare(b.next_due));
  }, [recurring, filter]);

  function handlePay(item: RecurringExpense) {
    const todayStr = today();
    // Log as a regular expense
    addExpense({
      date: todayStr,
      amount: item.amount,
      category: item.category,
      payment_source_id: item.payment_source_id,
      payment_source_name: item.payment_source_name,
      description: item.name,
      notes: `Auto-logged from subscription · ${item.frequency}`,
    });
    // Advance next_due by one period
    updateRecurring(item.id, { next_due: getNextDueDate(todayStr, item.frequency) });
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <RefreshCw className="h-6 w-6 text-indigo-400" /> Subscriptions
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Track recurring payments · click "Mark Paid" to log and advance the due date
          </p>
        </div>
        <Button onClick={() => setModal({ ...EMPTY, next_due: today(), start_date: today() })} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Subscription
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Monthly Cost</p>
            <p className="text-2xl font-bold text-slate-100">{formatCurrency(totalMonthly)}</p>
            <p className="text-xs text-slate-500 mt-1">{recurring.filter((r) => r.active).length} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Yearly Cost</p>
            <p className="text-2xl font-bold text-slate-100">{formatCurrency(totalYearly)}</p>
            <p className="text-xs text-slate-500 mt-1">across all active</p>
          </CardContent>
        </Card>
        <Card className={overdueCount > 0 ? 'border-red-700/50' : ''}>
          <CardContent className="p-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Overdue</p>
            <p className={`text-2xl font-bold ${overdueCount > 0 ? 'text-red-400' : 'text-slate-100'}`}>{overdueCount}</p>
            <p className="text-xs text-slate-500 mt-1">need attention</p>
          </CardContent>
        </Card>
        <Card className={dueSoonCount > 0 ? 'border-amber-700/50' : ''}>
          <CardContent className="p-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Due This Week</p>
            <p className={`text-2xl font-bold ${dueSoonCount > 0 ? 'text-amber-400' : 'text-slate-100'}`}>{dueSoonCount}</p>
            <p className="text-xs text-slate-500 mt-1">upcoming</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'active', 'overdue', 'paused'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-lg text-sm border transition-colors capitalize
              ${filter === f ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-[#2a2d3e] text-slate-400 hover:bg-[#2a2d3e]'}`}>
            {f === 'overdue' && overdueCount > 0 ? `Overdue (${overdueCount})` : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500 self-center">{filtered.length} subscription{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Grid */}
      {recurring.length === 0 ? (
        <Card className="border-dashed border-[#2a2d3e]">
          <CardContent className="p-12 text-center">
            <RefreshCw className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 mb-1">No subscriptions yet.</p>
            <p className="text-xs text-slate-600 mb-4">Add Netflix, Spotify, gym memberships, SIPs, rent — anything that repeats.</p>
            <Button variant="outline" size="sm" onClick={() => setModal({ ...EMPTY, next_due: today(), start_date: today() })}>
              Add your first subscription
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-8">No subscriptions match this filter.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <SubscriptionCard
              key={item.id}
              item={item}
              onEdit={() => setModal({ ...item })}
              onDelete={() => { if (confirm(`Delete "${item.name}"?`)) deleteRecurring(item.id); }}
              onPay={() => handlePay(item)}
              onToggle={() => updateRecurring(item.id, { active: !item.active })}
            />
          ))}
        </div>
      )}

      {/* Category cost breakdown */}
      {recurring.filter((r) => r.active).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Monthly Cost by Category</CardTitle></CardHeader>
          <CardContent className="p-0">
            {(() => {
              const map: Record<string, number> = {};
              recurring.filter((r) => r.active).forEach((r) => {
                map[r.category] = (map[r.category] ?? 0) + toMonthlyAmount(r.amount, r.frequency);
              });
              const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
              return (
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-[#2a2d3e]">
                    {sorted.map(([cat, amt]) => (
                      <tr key={cat} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5 text-slate-300">{cat}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-100">{formatCurrency(amt)}/mo</td>
                        <td className="px-4 py-2.5 text-right text-slate-500">
                          {totalMonthly > 0 ? ((amt / totalMonthly) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-[#2a2d3e] font-semibold">
                      <td className="px-4 py-2.5 text-slate-300">Total</td>
                      <td className="px-4 py-2.5 text-right text-slate-100">{formatCurrency(totalMonthly)}/mo</td>
                      <td className="px-4 py-2.5 text-right text-slate-100">{formatCurrency(totalYearly)}/yr</td>
                    </tr>
                  </tbody>
                </table>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {modal && (
        <RecurringModal
          initial={modal}
          onClose={() => setModal(null)}
          onSave={(data) => {
            if (data.id) updateRecurring(data.id, data);
            else addRecurring(data);
            setModal(null);
          }}
        />
      )}
    </div>
  );
}
