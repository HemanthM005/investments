'use client';

import { useState, useMemo } from 'react';
import {
  Plus, Pencil, Trash2, Receipt, ShoppingCart, Utensils, Car,
  Tv, HeartPulse, Zap, GraduationCap, Plane, Home, RefreshCw,
  Sparkles, Gift, HelpCircle, X, ChevronDown, ChevronLeft, ChevronRight, Unlink, Users, Dumbbell, Banknote,
} from 'lucide-react';
import { useExpenseStore } from '@/lib/expenseStore';
import { useAssetStore } from '@/lib/assetStore';
import { useMoneyStore } from '@/lib/moneyStore';
import { formatCurrency } from '@/lib/utils';
import type { Expense, ExpenseCategory, ExpenseSplit, MoneyRecord, PaymentSource } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// ── category config ───────────────────────────────────────────────────────────

const CATEGORIES: ExpenseCategory[] = [
  'Food & Dining', 'Groceries', 'Transport & Travel', 'Shopping', 'Entertainment',
  'Health & Medical', 'Bills & Utilities', 'Education', 'Trips & Vacations', 'Rent',
  'Subscriptions', 'Personal Care', 'Sports & Fitness', 'Loan & EMI', 'Gifts & Donations', 'Other',
];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'Food & Dining':      Utensils,
  'Groceries':          ShoppingCart,
  'Transport & Travel': Car,
  'Transport':          Car,       // legacy
  'Shopping':           ShoppingCart,
  'Entertainment':      Tv,
  'Health & Medical':   HeartPulse,
  'Bills & Utilities':  Zap,
  'Education':          GraduationCap,
  'Trips & Vacations':  Plane,
  'Travel':             Plane,     // legacy
  'Rent':               Home,
  'Subscriptions':      RefreshCw,
  'Personal Care':      Sparkles,
  'Sports & Fitness':   Dumbbell,
  'Loan & EMI':         Banknote,
  'Gifts & Donations':  Gift,
  'Other':              HelpCircle,
};

const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining':      'bg-orange-900/40 text-orange-400',
  'Groceries':          'bg-green-900/40 text-green-400',
  'Transport & Travel': 'bg-blue-900/40 text-blue-400',
  'Transport':          'bg-blue-900/40 text-blue-400',   // legacy
  'Shopping':           'bg-pink-900/40 text-pink-400',
  'Entertainment':      'bg-purple-900/40 text-purple-400',
  'Health & Medical':   'bg-red-900/40 text-red-400',
  'Bills & Utilities':  'bg-yellow-900/40 text-yellow-400',
  'Education':          'bg-indigo-900/40 text-indigo-400',
  'Trips & Vacations':  'bg-cyan-900/40 text-cyan-400',
  'Travel':             'bg-cyan-900/40 text-cyan-400',   // legacy
  'Rent':               'bg-slate-700/60 text-slate-300',
  'Subscriptions':      'bg-violet-900/40 text-violet-400',
  'Personal Care':      'bg-rose-900/40 text-rose-400',
  'Sports & Fitness':   'bg-emerald-900/40 text-emerald-400',
  'Loan & EMI':         'bg-teal-900/40 text-teal-400',
  'Gifts & Donations':  'bg-amber-900/40 text-amber-400',
  'Other':              'bg-slate-800 text-slate-400',
};

// ── helpers ───────────────────────────────────────────────────────────────────

function today() { return new Date().toISOString().slice(0, 10); }

const EMPTY: Omit<Expense, 'id'> = {
  date: today(), amount: 0, category: 'Food & Dining',
  payment_source_id: '', payment_source_name: '', description: '', notes: '',
};

// ── split participant type (module scope to avoid HMR issues) ─────────────────

type SplitParticipant = { id: string; name: string; isYou: boolean; value: number };

// ── person name input with suggestions dropdown ───────────────────────────────

function PersonInput({
  value, onChange, suggestions,
}: {
  value: string;
  onChange: (name: string) => void;
  suggestions: string[];
}) {
  const [open, setOpen] = useState(false);
  const filtered = suggestions.filter(
    (n) => !value || n.toLowerCase().includes(value.toLowerCase()),
  );

  return (
    <div className="relative flex-1">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Person name…"
        className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
      />
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-0.5 bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg shadow-xl z-50 max-h-36 overflow-y-auto">
          {filtered.map((name) => (
            <button
              key={name}
              type="button"
              onMouseDown={() => { onChange(name); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-indigo-950/40 hover:text-slate-100 transition-colors"
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── modal ─────────────────────────────────────────────────────────────────────

function ExpenseModal({
  initial, onSave, onClose, existingPersonNames,
}: {
  initial: Omit<Expense, 'id'> & { id?: string };
  onSave: (data: Omit<Expense, 'id'> & { id?: string }) => void;
  onClose: () => void;
  existingPersonNames: string[];
}) {
  const accounts = useAssetStore((s) => s.accounts);
  const [form, setForm] = useState(initial);
  const setField = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  // Split state — initialise from existing splits when editing
  const [splitEnabled, setSplitEnabled] = useState(
    !!(initial.id && initial.splits && initial.splits.length > 0),
  );
  const [paidBy, setPaidBy] = useState<string>(initial.paid_by_name || 'me');
  const [splitMethod, setSplitMethod] = useState<'equal' | 'shares' | 'percent' | 'custom'>(
    (initial.id && initial.splits && initial.splits.length > 0) ? 'custom' : 'equal',
  );
  // Whether "You" are part of the split. False = others owe the full amount; you only paid.
  const [includeMe, setIncludeMe] = useState<boolean>(() => {
    if (initial.id && initial.splits && initial.splits.length > 0) {
      const othersTotal = initial.splits.reduce((s, sp) => s + sp.amount, 0);
      const youAmt = Math.round(((initial.amount || 0) - othersTotal) * 100) / 100;
      return youAmt > 0.01;
    }
    return true;
  });
  const [participants, setParticipants] = useState<SplitParticipant[]>(() => {
    if (initial.id && initial.splits && initial.splits.length > 0) {
      const othersTotal = initial.splits.reduce((s, sp) => s + sp.amount, 0);
      const youAmt = Math.max(0, Math.round(((initial.amount || 0) - othersTotal) * 100) / 100);
      return [
        { id: 'you', name: 'You', isYou: true, value: youAmt },
        ...initial.splits.map((sp, i) => ({
          id: `edit-${i}`,
          name: sp.person_name,
          isYou: false,
          value: sp.amount,
        })),
      ];
    }
    return [{ id: 'you', name: 'You', isYou: true, value: 1 }];
  });

  // Active participants for math: skips "You" when includeMe is off
  const activeParticipants = participants.filter((p) => !p.isYou || includeMe);

  function getParticipantAmount(p: SplitParticipant): number {
    if (!form.amount) return 0;
    if (p.isYou && !includeMe) return 0;
    switch (splitMethod) {
      case 'equal':
        return activeParticipants.length === 0
          ? 0
          : Math.round((form.amount / activeParticipants.length) * 100) / 100;
      case 'shares': {
        const total = activeParticipants.reduce((s, x) => s + (x.value ?? 0), 0);
        if (total === 0) return 0;
        return Math.round(((p.value ?? 0) / total) * form.amount * 100) / 100;
      }
      case 'percent':
        return Math.round(((p.value || 0) / 100) * form.amount * 100) / 100;
      case 'custom':
        if (p.isYou) {
          const othersTotal = participants.filter(x => !x.isYou).reduce((s, x) => s + (x.value || 0), 0);
          return Math.max(0, Math.round(((form.amount || 0) - othersTotal) * 100) / 100);
        }
        return Math.round((p.value || 0) * 100) / 100;
    }
  }

  const percentTotal = activeParticipants.reduce((s, p) => s + (p.value || 0), 0);
  const percentValid = splitMethod !== 'percent' || Math.abs(percentTotal - 100) < 0.01;
  const hasOtherParticipants = participants.some((p) => !p.isYou && p.name.trim());

  function addParticipant() {
    setParticipants((prev) => [...prev, { id: crypto.randomUUID(), name: '', isYou: false, value: 1 }]);
  }

  function removeParticipant(id: string) {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  }

  function updateParticipant(id: string, patch: Partial<SplitParticipant>) {
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  // ── multi-source payment state ──
  const [multiSourceEnabled, setMultiSourceEnabled] = useState(
    !!(initial.payment_sources && initial.payment_sources.length > 1),
  );
  const [paymentSources, setPaymentSources] = useState<PaymentSource[]>(() => {
    if (initial.payment_sources && initial.payment_sources.length > 0) return initial.payment_sources;
    return [{ account_id: initial.payment_source_id ?? '', account_name: initial.payment_source_name ?? '', amount: initial.amount ?? 0 }];
  });

  const multiTotal = paymentSources.reduce((s, src) => s + (src.amount || 0), 0);
  const multiRemaining = Math.round((form.amount - multiTotal) * 100) / 100;
  const multiValid = !multiSourceEnabled || (paymentSources.length > 0 && Math.abs(multiRemaining) < 0.01);

  function addSourceRow() {
    setPaymentSources((prev) => [...prev, { account_id: '', account_name: '', amount: 0 }]);
  }

  function updateSource(idx: number, patch: Partial<PaymentSource>) {
    setPaymentSources((prev) => prev.map((s, i) => {
      if (i !== idx) return s;
      const next = { ...s, ...patch };
      if (patch.account_id !== undefined) {
        const acc = accounts.find((a) => a.id === patch.account_id);
        next.account_name = acc ? `${acc.name} (${acc.category})` : '';
      }
      return next;
    }));
  }

  function removeSource(idx: number) {
    setPaymentSources((prev) => prev.filter((_, i) => i !== idx));
  }

  function selectAccount(id: string) {
    const acc = accounts.find((a) => a.id === id);
    setForm((f) => ({
      ...f,
      payment_source_id: id,
      payment_source_name: acc ? `${acc.name} (${acc.category})` : '',
    }));
    // also sync first source row when not in multi mode
    if (!multiSourceEnabled) {
      setPaymentSources([{ account_id: id, account_name: acc ? `${acc.name} (${acc.category})` : '', amount: form.amount }]);
    }
  }

  // Keep single-source amount in sync with total amount
  useMemo(() => {
    if (!multiSourceEnabled && paymentSources.length === 1) {
      setPaymentSources([{ ...paymentSources[0], amount: form.amount }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.amount, multiSourceEnabled]);

  const paidByOther = splitEnabled && paidBy !== 'me'
    && participants.filter((p) => !p.isYou && p.name.trim()).some((p) => p.name === paidBy);
  const splitsOk = !splitEnabled || includeMe || hasOtherParticipants;
  const canSave = form.description.trim().length > 0 && form.amount > 0 && (!splitEnabled || percentValid) && (paidByOther || multiValid) && splitsOk;

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

          {/* Account picker — single or multi-source */}
          <div>
            {paidByOther ? (
              <p className="text-xs text-slate-500 bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2">
                {paidBy} paid — no deduction from your accounts.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-slate-400">Paid from account</label>
                  {accounts.length > 0 && (
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input type="checkbox" checked={multiSourceEnabled}
                        onChange={(e) => {
                          setMultiSourceEnabled(e.target.checked);
                          if (e.target.checked) {
                            setPaymentSources([{
                              account_id: form.payment_source_id,
                              account_name: form.payment_source_name,
                              amount: form.amount,
                            }]);
                          }
                        }}
                        className="rounded border-slate-600 accent-indigo-500" />
                      <span className="text-xs text-slate-400">Split across accounts</span>
                    </label>
                  )}
                </div>

                {accounts.length === 0 ? (
                  <p className="text-xs text-slate-500 bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2">
                    No accounts yet — add them in Cash &amp; Accounts first.
                  </p>
                ) : multiSourceEnabled ? (
                  /* ── Multi-source rows ── */
                  <div className="space-y-2">
                    {paymentSources.map((src, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="flex-1 relative">
                          <select
                            value={src.account_id}
                            onChange={(e) => updateSource(idx, { account_id: e.target.value })}
                            className="w-full appearance-none bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 pr-7"
                          >
                            <option value="">Other / Not tracked</option>
                            {grouped.map(([cat, accs]) => (
                              <optgroup key={cat} label={cat}>
                                {accs.map((acc) => (
                                  <option key={acc.id} value={acc.id}>
                                    {acc.name} ({formatCurrency(acc.balance)})
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-3.5 w-3.5 text-slate-500" />
                        </div>
                        <input
                          type="number" min="0" step="0.01" placeholder="₹"
                          value={src.amount || ''}
                          onChange={(e) => updateSource(idx, { amount: parseFloat(e.target.value) || 0 })}
                          className="w-24 bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-2 py-2 text-xs text-slate-100 text-right focus:outline-none focus:border-indigo-500"
                        />
                        {paymentSources.length > 1 && (
                          <button type="button" onClick={() => removeSource(idx)}
                            className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}

                    <button type="button" onClick={addSourceRow}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                      <Plus className="h-3 w-3" /> Add another account
                    </button>

                    <div className={`rounded-lg px-3 py-2 text-xs border ${
                      Math.abs(multiRemaining) < 0.01
                        ? 'border-emerald-800/40 bg-emerald-950/20 text-emerald-400'
                        : 'border-amber-800/40 bg-amber-950/20 text-amber-400'
                    }`}>
                      {Math.abs(multiRemaining) < 0.01
                        ? `✓ Covers the full ₹${form.amount.toLocaleString('en-IN')}`
                        : multiRemaining > 0
                          ? `₹${multiRemaining.toLocaleString('en-IN')} still unassigned`
                          : `Over by ₹${Math.abs(multiRemaining).toLocaleString('en-IN')}`}
                    </div>
                  </div>
                ) : (
                  /* ── Single source picker ── */
                  <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
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
                {!multiSourceEnabled && form.payment_source_id && (
                  <p className="text-xs text-indigo-400 mt-1.5">
                    ₹{form.amount > 0 ? form.amount.toLocaleString('en-IN') : '—'} will be deducted from this account on save.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Notes (optional)</label>
            <input value={form.notes} onChange={(e) => setField('notes', e.target.value)}
              className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              placeholder="Any extra details…" />
          </div>

          {/* Split section — full UI for both add and edit */}
          <div className="border-t border-[#2a2d3e] pt-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={splitEnabled}
                onChange={(e) => {
                  setSplitEnabled(e.target.checked);
                  if (!e.target.checked) setPaidBy('me');
                  if (e.target.checked && participants.length <= 1) {
                    setParticipants([{ id: 'you', name: 'You', isYou: true, value: 1 }]);
                    setSplitMethod('equal');
                  }
                }}
                className="rounded border-slate-600 accent-indigo-500"
              />
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-indigo-400" />
                Split with others
              </span>
            </label>

            {splitEnabled && (
              <div className="mt-3 space-y-3">
                {/* Method buttons */}
                <div className="flex gap-1.5 flex-wrap">
                  {(['equal', 'shares', 'percent', 'custom'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSplitMethod(m)}
                      className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                        splitMethod === m
                          ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300'
                          : 'border-[#2a2d3e] text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {m === 'equal' ? 'Equal' : m === 'shares' ? 'By Shares' : m === 'percent' ? 'By %' : 'Custom ₹'}
                    </button>
                  ))}
                </div>

                {/* Include-me toggle */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeMe}
                    onChange={(e) => setIncludeMe(e.target.checked)}
                    className="rounded border-slate-600 accent-indigo-500"
                  />
                  <span className="text-xs text-slate-400">
                    Include me in this split
                    {!includeMe && (
                      <span className="ml-1 text-amber-400">— you only paid; others owe the full amount</span>
                    )}
                  </span>
                </label>

                {/* Participant rows */}
                <div className="space-y-2">
                  {participants.filter((p) => !p.isYou || includeMe).map((p) => (
                    <div key={p.id} className="flex items-center gap-2">
                      {p.isYou ? (
                        <span className="flex-1 text-sm text-slate-500 px-3 py-1.5 bg-[#0f1117] border border-[#2a2d3e] rounded-lg">
                          You
                        </span>
                      ) : (
                        <PersonInput
                          value={p.name}
                          onChange={(name) => updateParticipant(p.id, { name })}
                          suggestions={existingPersonNames}
                        />
                      )}
                      {/* Value input: hidden for equal; auto-label for You+custom; input for everything else */}
                      {splitMethod !== 'equal' && (
                        p.isYou && splitMethod === 'custom' ? (
                          <span className="w-20 text-xs text-slate-500 text-center">auto</span>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            step={splitMethod === 'percent' ? '1' : splitMethod === 'custom' ? '1' : '0.5'}
                            value={p.value || ''}
                            onChange={(e) => updateParticipant(p.id, { value: parseFloat(e.target.value) || 0 })}
                            className="w-20 bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-2 py-1.5 text-xs text-slate-100 text-center focus:outline-none focus:border-indigo-500"
                            placeholder={splitMethod === 'percent' ? '%' : splitMethod === 'custom' ? '₹' : 'sh'}
                          />
                        )
                      )}
                      <span className="text-xs font-medium text-emerald-400 w-20 text-right shrink-0">
                        ₹{getParticipantAmount(p).toLocaleString('en-IN')}
                      </span>
                      {!p.isYou && (
                        <button
                          type="button"
                          onClick={() => removeParticipant(p.id)}
                          className="text-slate-600 hover:text-red-400 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addParticipant}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                >
                  <Plus className="h-3 w-3" /> Add person
                </button>

                {/* Who paid? — only show once there's at least one named participant */}
                {participants.filter((p) => !p.isYou && p.name.trim()).length > 0 && (
                  <div className="border-t border-[#2a2d3e] pt-3 mt-1">
                    <p className="text-xs text-slate-400 mb-2">Who paid the full amount?</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['me', ...participants.filter((p) => !p.isYou && p.name.trim()).map((p) => p.name)].map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setPaidBy(name)}
                          className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                            paidBy === name
                              ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300'
                              : 'border-[#2a2d3e] text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {name === 'me' ? 'Me' : name}
                        </button>
                      ))}
                    </div>
                    {paidBy !== 'me' && (
                      <p className="text-xs text-amber-400 mt-2">
                        Since {paidBy} paid, this won&apos;t affect your accounts. A &ldquo;you owe {paidBy}&rdquo; record will be added to Money Tracker.
                      </p>
                    )}
                  </div>
                )}

                {splitMethod === 'percent' && (
                  <p className={`text-xs ${percentValid ? 'text-slate-500' : 'text-amber-400'}`}>
                    Total: {percentTotal.toFixed(1)}%
                    {!percentValid && ' — must equal 100%'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 p-5 pt-0 sticky bottom-0 bg-[#1a1d2e]">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1"
            disabled={!canSave}
            onClick={() => {
              const computedSplits: ExpenseSplit[] | undefined = splitEnabled
                ? participants
                    .filter((p) => !p.isYou && p.name.trim())
                    .map((p) => ({ person_name: p.name.trim(), amount: getParticipantAmount(p) }))
                    .filter((s) => s.amount > 0)
                : undefined;
              const splits = computedSplits?.length ? computedSplits : undefined;

              // Build payment_sources for multi-source, or derive from single selection
              // When someone else paid, skip account deduction entirely
              const sources: PaymentSource[] | undefined = (!paidByOther && multiSourceEnabled)
                ? paymentSources.filter((s) => s.amount > 0)
                : undefined;

              const primaryId   = paidByOther ? '' : (multiSourceEnabled ? (paymentSources[0]?.account_id ?? '') : form.payment_source_id);
              const primaryName = paidByOther ? `Paid by ${paidBy}` : (multiSourceEnabled ? (paymentSources[0]?.account_name ?? '') : form.payment_source_name);

              const payload = {
                ...form,
                payment_source_id:   primaryId,
                payment_source_name: primaryName,
                splits,
                paid_by_name: paidByOther ? paidBy : undefined,
                payment_sources: sources,
              };

              if (form.id) {
                const { id, ...rest } = payload as typeof payload & { id: string };
                onSave({ ...rest, id });
              } else {
                onSave(payload);
              }
            }}
          >
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
  const addRecord     = useMoneyStore((s) => s.addRecord);
  const deleteRecord  = useMoneyStore((s) => s.deleteRecord);
  const moneyRecords  = useMoneyStore((s) => s.records);

  const existingPersonNames = useMemo(
    () => [...new Set(moneyRecords.map((r) => r.person_name))].sort(),
    [moneyRecords],
  );

  const [modal, setModal] = useState<null | (Omit<Expense, 'id'> & { id?: string })>(null);
  const [filterMonth, setFilterMonth] = useState(today().slice(0, 7));
  const shiftMonth = (delta: number) => {
    const [y, m] = filterMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setFilterMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
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
    const total: Record<string, number> = {};
    const mine: Record<string, number> = {};
    monthExpenses.forEach((e) => {
      const splitTotal = (e.splits ?? []).reduce((s, sp) => s + sp.amount, 0);
      const myShare = Math.max(0, e.amount - splitTotal);
      total[e.category] = (total[e.category] ?? 0) + e.amount;
      mine[e.category]  = (mine[e.category]  ?? 0) + myShare;
    });
    return Object.entries(total)
      .map(([cat, amt]) => ({ cat, amt, myShare: mine[cat] ?? 0 }))
      .sort((a, b) => b.amt - a.amt);
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
                {categoryBreakdown.slice(0, 3).map(({ cat, amt }) => {
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
        <div className="flex items-center gap-1 bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg px-1 py-1">
          <button onClick={() => shiftMonth(-1)} className="p-1 rounded hover:bg-[#2a2d3e] text-slate-400 hover:text-slate-100 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
            className="bg-transparent text-sm text-slate-100 focus:outline-none px-1 cursor-pointer" />
          <button onClick={() => shiftMonth(1)} className="p-1 rounded hover:bg-[#2a2d3e] text-slate-400 hover:text-slate-100 transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
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
                              {(exp.payment_sources && exp.payment_sources.length > 1) ? (
                                <>
                                  <span className="text-slate-700">·</span>
                                  <span className="text-indigo-400">{exp.payment_sources.length} accounts</span>
                                </>
                              ) : exp.payment_source_name ? (
                                <>
                                  <span className="text-slate-700">·</span>
                                  <span className="text-indigo-400">{exp.payment_source_name}</span>
                                </>
                              ) : null}
                              {exp.notes && (
                                <>
                                  <span className="text-slate-700">·</span>
                                  <span className="text-slate-600">{exp.notes}</span>
                                </>
                              )}
                              {exp.splits && exp.splits.length > 0 && (
                                <>
                                  <span className="text-slate-700">·</span>
                                  <span className="text-violet-400">
                                    {exp.paid_by_name
                                      ? `${exp.paid_by_name} paid · you owe ₹${Math.max(0, exp.amount - exp.splits.reduce((s, sp) => s + sp.amount, 0)).toLocaleString('en-IN')}`
                                      : `Split: ${exp.splits.map((s) => `${s.person_name} ₹${s.amount.toLocaleString('en-IN')}`).join(', ')}`
                                    }
                                  </span>
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
                              <button onClick={() => {
                                if (!confirm('Delete this expense?')) return;
                                // Delete all linked split records in Money Tracker
                                useMoneyStore.getState().records
                                  .filter((r) => r.source_expense_id === exp.id)
                                  .forEach((r) => deleteRecord(r.id));
                                deleteExpense(exp.id);
                              }}
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
                  <th className="text-right px-4 py-2 font-medium">Total</th>
                  <th className="text-right px-4 py-2 font-medium">% of Total</th>
                  <th className="text-right px-4 py-2 font-medium">My Share</th>
                  <th className="text-right px-4 py-2 font-medium">% of My Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2d3e]">
                {categoryBreakdown.map(({ cat, amt, myShare }) => {
                  const Icon = CATEGORY_ICONS[cat as ExpenseCategory];
                  const iconClass = CATEGORY_COLORS[cat as ExpenseCategory];
                  const totalMyShare = categoryBreakdown.reduce((s, r) => s + r.myShare, 0);
                  const pct = monthSpend > 0 ? (amt / monthSpend) * 100 : 0;
                  const myPct = totalMyShare > 0 ? (myShare / totalMyShare) * 100 : 0;
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
                      <td className="px-4 py-2.5 text-right font-semibold text-emerald-400">{formatCurrency(myShare)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-500">{myPct.toFixed(1)}%</td>
                    </tr>
                  );
                })}
                <tr className="border-t border-[#2a2d3e] font-semibold">
                  <td className="px-4 py-2.5 text-slate-300">Total</td>
                  <td className="px-4 py-2.5 text-right text-slate-100">{formatCurrency(monthSpend)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-500">100%</td>
                  <td className="px-4 py-2.5 text-right text-emerald-400">
                    {formatCurrency(categoryBreakdown.reduce((s, r) => s + r.myShare, 0))}
                  </td>
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
          existingPersonNames={existingPersonNames}
          onClose={() => setModal(null)}
          onSave={(data) => {
            if (data.id) {
              // ── EDIT ──────────────────────────────────────────────────────
              const { id, ...updates } = data as typeof data & { id: string };
              const oldExpense = expenses.find((e) => e.id === id);
              updateExpense(id, updates);

              // Delete all linked money records and recreate from scratch
              // (simpler than incremental sync since payer type may have changed)
              useMoneyStore.getState().records
                .filter((r) => r.source_expense_id === id)
                .forEach((r) => deleteRecord(r.id));

              const expDate = updates.date ?? oldExpense?.date ?? data.date;
              const expDesc = updates.description ?? oldExpense?.description ?? '';

              if (updates.paid_by_name) {
                // Someone else paid — create a single "borrowed" record for your share
                const splitsTotal = (updates.splits ?? []).reduce((s, sp) => s + sp.amount, 0);
                const yourShare = Math.max(0, Math.round(((updates.amount ?? 0) - splitsTotal) * 100) / 100);
                if (yourShare > 0) {
                  addRecord({
                    type: 'borrowed',
                    person_name: updates.paid_by_name,
                    amount: yourShare,
                    settled_amount: 0,
                    date: expDate,
                    due_date: '',
                    description: `Split: ${expDesc}`,
                    status: 'pending',
                    source_expense_id: id,
                  });
                }
              } else {
                // You paid — create "lent" records for each other participant
                (updates.splits ?? []).forEach((split) => {
                  if (!split.person_name || split.amount <= 0) return;
                  addRecord({
                    type: 'lent',
                    person_name: split.person_name,
                    amount: Math.round(split.amount * 100) / 100,
                    settled_amount: 0,
                    date: expDate,
                    due_date: '',
                    description: `Split: ${expDesc}`,
                    status: 'pending',
                    source_expense_id: id,
                  });
                });
              }
            } else {
              // ── ADD ───────────────────────────────────────────────────────
              const newExpenseId = addExpense(data);

              if (data.paid_by_name) {
                // Someone else paid — create a single "borrowed" record for your share
                const splitsTotal = (data.splits ?? []).reduce((s, sp) => s + sp.amount, 0);
                const yourShare = Math.max(0, Math.round((data.amount - splitsTotal) * 100) / 100);
                if (yourShare > 0) {
                  addRecord({
                    type: 'borrowed',
                    person_name: data.paid_by_name,
                    amount: yourShare,
                    settled_amount: 0,
                    date: data.date,
                    due_date: '',
                    description: `Split: ${data.description}`,
                    status: 'pending',
                    source_expense_id: newExpenseId,
                  });
                }
              } else {
                // You paid — create "lent" records for each other participant
                (data.splits ?? []).forEach((split) => {
                  if (!split.person_name || split.amount <= 0) return;
                  addRecord({
                    type: 'lent',
                    person_name: split.person_name,
                    amount: Math.round(split.amount * 100) / 100,
                    settled_amount: 0,
                    date: data.date,
                    due_date: '',
                    description: `Split: ${data.description}`,
                    status: 'pending',
                    source_expense_id: newExpenseId,
                  });
                });
              }
            }
            setModal(null);
          }}
        />
      )}
    </div>
  );
}
