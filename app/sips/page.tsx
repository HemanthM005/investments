'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Plus, Pencil, Trash2, RefreshCw, AlertCircle, CheckCircle2,
  X, ChevronDown, PauseCircle, PlayCircle, Repeat, Bell, TrendingUp,
} from 'lucide-react';
import {
  useRecurringInvestmentStore, executeDueInstallments, runDueForAll, type SipRunResult,
} from '@/lib/recurringInvestmentStore';
import { toMonthlyAmount, isOverdue } from '@/lib/recurringStore';
import { useInvestmentStore } from '@/lib/store';
import { useAssetStore } from '@/lib/assetStore';
import { formatCurrency } from '@/lib/utils';
import type { RecurringInvestment, RecurringFrequency, Investment } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// ── constants ─────────────────────────────────────────────────────────────────

const FREQUENCIES: RecurringFrequency[] = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'];
const ASSET_TYPES: Investment['asset_type'][] = ['Gold', 'Mutual Fund', 'ETF', 'Stock', 'Crypto', 'Bond', 'Other'];

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

type SipForm = Omit<RecurringInvestment, 'id'> & { id?: string };

const EMPTY: SipForm = {
  name: '', amount: 0, frequency: 'Monthly',
  funded_by_account_id: '', funded_by_account_name: '',
  target_investment_id: '', target_investment_name: '',
  next_due: today(), start_date: today(), active: true, notes: '',
};

// Fields used only while creating a brand-new holding from the modal.
interface NewHolding {
  asset_name: string;
  asset_type: Investment['asset_type'];
  sector: string;
  ticker: string;
  current_price: number;
}

const EMPTY_NEW: NewHolding = { asset_name: '', asset_type: 'Gold', sector: '', ticker: '', current_price: 0 };

function SipModal({
  initial, onSave, onClose,
}: {
  initial: SipForm;
  onSave: (data: SipForm, newHolding: NewHolding | null) => void;
  onClose: () => void;
}) {
  const accounts = useAssetStore((s) => s.accounts);
  const investments = useInvestmentStore((s) => s.investments);
  const activeHoldings = useMemo(
    () => investments.filter((i) => i.status !== 'sold' && i.status !== 'watchlist' && !i._deleted),
    [investments],
  );

  const [form, setForm] = useState<SipForm>(initial);
  // editing an existing SIP, or there are holdings to pick → default to 'existing'
  const [mode, setMode] = useState<'existing' | 'new'>(
    initial.id || activeHoldings.length > 0 ? 'existing' : 'new',
  );
  const [newHolding, setNewHolding] = useState<NewHolding>(EMPTY_NEW);

  const setField = (k: keyof SipForm, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const setNew = (k: keyof NewHolding, v: unknown) => setNewHolding((n) => ({ ...n, [k]: v }));

  function selectAccount(id: string) {
    const acc = accounts.find((a) => a.id === id);
    setForm((f) => ({
      ...f,
      funded_by_account_id: id,
      funded_by_account_name: acc ? `${acc.name} (${acc.category})` : '',
    }));
  }

  function selectHolding(id: string) {
    const inv = activeHoldings.find((i) => i.id === id);
    setForm((f) => ({
      ...f,
      target_investment_id: id,
      target_investment_name: inv ? inv.asset_name : '',
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

  const targetOk = mode === 'existing'
    ? form.target_investment_id !== ''
    : newHolding.asset_name.trim().length > 0 && newHolding.current_price > 0;
  const canSave = form.name.trim().length > 0 && form.amount > 0 && targetOk;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-[#2a2d3e] sticky top-0 bg-[#1a1d2e] z-10">
          <h2 className="text-base font-semibold text-slate-100">{form.id ? 'Edit SIP' : 'Add SIP'}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">SIP Name *</label>
            <input value={form.name} onChange={(e) => setField('name', e.target.value)}
              className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              placeholder="e.g. Daily Gold SIP, Monthly Flexi Cap SIP" />
          </div>

          {/* Amount + Frequency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Amount per installment (₹) *</label>
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

          {/* Target holding */}
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Invest into</label>
            <div className="flex gap-2 mb-2">
              <button type="button" onClick={() => setMode('existing')}
                className={`flex-1 px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                  mode === 'existing' ? 'border-indigo-500 bg-indigo-950/30 text-slate-100' : 'border-[#2a2d3e] text-slate-400 hover:bg-white/[0.03]'
                }`}>
                Existing holding
              </button>
              <button type="button" onClick={() => setMode('new')}
                className={`flex-1 px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                  mode === 'new' ? 'border-indigo-500 bg-indigo-950/30 text-slate-100' : 'border-[#2a2d3e] text-slate-400 hover:bg-white/[0.03]'
                }`}>
                New holding
              </button>
            </div>

            {mode === 'existing' ? (
              activeHoldings.length === 0 ? (
                <p className="text-xs text-slate-500 bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2">
                  No active holdings yet — switch to "New holding" to create one.
                </p>
              ) : (
                <div className="relative">
                  <select value={form.target_investment_id} onChange={(e) => selectHolding(e.target.value)}
                    className="w-full appearance-none bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500">
                    <option value="">Select a holding…</option>
                    {activeHoldings.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.asset_name} ({i.asset_type}) · {formatCurrency(i.current_price)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-500" />
                </div>
              )
            ) : (
              <div className="space-y-2 bg-[#0f1117] border border-[#2a2d3e] rounded-lg p-3">
                <input value={newHolding.asset_name} onChange={(e) => setNew('asset_name', e.target.value)}
                  className="w-full bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  placeholder="Holding name * — e.g. Sovereign Gold" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <select value={newHolding.asset_type} onChange={(e) => setNew('asset_type', e.target.value as Investment['asset_type'])}
                      className="w-full appearance-none bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500">
                      {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-500" />
                  </div>
                  <input type="number" min="0" step="0.01" value={newHolding.current_price || ''}
                    onChange={(e) => setNew('current_price', parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                    placeholder="Current price * (₹/unit)" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input value={newHolding.sector} onChange={(e) => setNew('sector', e.target.value)}
                    className="w-full bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                    placeholder="Sector (optional)" />
                  <input value={newHolding.ticker} onChange={(e) => setNew('ticker', e.target.value)}
                    className="w-full bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                    placeholder="Ticker (optional)" />
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Installments buy at this holding's current price. Keep it fresh from My Investments.
                </p>
              </div>
            )}
          </div>

          {/* Next due + Start date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Next Installment</label>
              <input type="date" value={form.next_due} onChange={(e) => setField('next_due', e.target.value)}
                className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Start Date</label>
              <input type="date" value={form.start_date} onChange={(e) => setField('start_date', e.target.value)}
                className="w-full bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500" />
            </div>
          </div>

          {/* Funding account picker */}
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Funded from</label>
            {accounts.length === 0 ? (
              <p className="text-xs text-slate-500 bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2">
                No accounts yet — add them in Cash &amp; Accounts first.
              </p>
            ) : (
              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                <button type="button"
                  onClick={() => setForm((f) => ({ ...f, funded_by_account_id: '', funded_by_account_name: 'Other' }))}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                    form.funded_by_account_id === ''
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
                          form.funded_by_account_id === acc.id
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
              placeholder="Folio number, mandate, reminder…" />
          </div>
        </div>

        <div className="flex gap-2 p-5 pt-0 sticky bottom-0 bg-[#1a1d2e]">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" disabled={!canSave} onClick={() => onSave(form, mode === 'new' ? newHolding : null)}>
            {form.id ? 'Save Changes' : 'Add SIP'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── SIP card ──────────────────────────────────────────────────────────────────

function SipCard({
  item, onEdit, onDelete, onRun, onToggle,
}: {
  item: RecurringInvestment;
  onEdit: () => void;
  onDelete: () => void;
  onRun: () => void;
  onToggle: () => void;
}) {
  const investments = useInvestmentStore((s) => s.investments);
  const target = investments.find((i) => i.id === item.target_investment_id);
  const noPrice = !target || !target.current_price || target.current_price <= 0;

  const days = daysUntil(item.next_due);
  const overdue = isOverdue(item.next_due);
  const dueSoon = days >= 0 && days <= 7;
  const dueNow = item.next_due <= today();  // at least one installment can run
  const monthly = toMonthlyAmount(item.amount, item.frequency);

  return (
    <div className={`bg-[#1a1d2e] border rounded-xl p-4 flex flex-col gap-3 transition-all
      ${!item.active ? 'border-[#2a2d3e] opacity-60'
        : noPrice ? 'border-amber-700/50'
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
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-indigo-400/80" />
            <span className="text-indigo-400/80">{item.target_investment_name || 'Unlinked'}</span>
            {item.funded_by_account_name && <> · {item.funded_by_account_name}</>}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-lg font-bold text-slate-100">{formatCurrency(item.amount)}</p>
          {item.frequency !== 'Monthly' && (
            <p className="text-xs text-slate-500">≈ {formatCurrency(monthly)}/mo</p>
          )}
        </div>
      </div>

      {/* Invested-to-date */}
      {(item.installments_done ?? 0) > 0 && (
        <div className="flex items-center justify-between text-xs bg-[#0f1117] rounded-lg px-3 py-2">
          <span className="text-slate-500">Invested so far</span>
          <span className="text-slate-300 font-medium">
            {formatCurrency(item.total_invested ?? 0)} · {item.installments_done} installment{item.installments_done !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Price warning */}
      {item.active && noPrice && (
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs bg-amber-950/40 text-amber-300">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="font-medium">Set a current price on the holding to resume buying</span>
        </div>
      )}

      {/* Due status */}
      {item.active && !noPrice && (
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
          <Button size="sm" className="flex-1 h-7 text-xs gap-1" disabled={noPrice || !dueNow} onClick={onRun}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Invest now
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

export default function SipsPage() {
  const { recurring_investments, addRecurringInvestment, updateRecurringInvestment, deleteRecurringInvestment, hydrated } =
    useRecurringInvestmentStore();
  const investmentsHydrated = useInvestmentStore((s) => s.hydrated);
  const accountsHydrated = useAssetStore((s) => s.hydrated);
  const addInvestment = useInvestmentStore((s) => s.addInvestment);

  const [modal, setModal] = useState<SipForm | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'due' | 'paused'>('all');
  const [banner, setBanner] = useState<{ runs: number; invested: number; skipped: SipRunResult[] } | null>(null);

  // Auto-apply due installments once, after every store is hydrated.
  const didAutoRun = useRef(false);
  useEffect(() => {
    if (didAutoRun.current) return;
    if (!hydrated || !investmentsHydrated || !accountsHydrated) return;
    didAutoRun.current = true;
    const results = runDueForAll();
    const runs = results.reduce((s, r) => s + r.runs, 0);
    const invested = results.reduce((s, r) => s + r.totalInvested, 0);
    const skipped = results.filter((r) => r.skippedReason);
    if (runs > 0 || skipped.length > 0) {
      setBanner({ runs, invested, skipped });
    }
  }, [hydrated, investmentsHydrated, accountsHydrated]);

  const totalMonthly = useMemo(
    () => recurring_investments.filter((r) => r.active).reduce((s, r) => s + toMonthlyAmount(r.amount, r.frequency), 0),
    [recurring_investments],
  );
  const totalInvested = useMemo(
    () => recurring_investments.reduce((s, r) => s + (r.total_invested ?? 0), 0),
    [recurring_investments],
  );
  const activeCount = useMemo(() => recurring_investments.filter((r) => r.active).length, [recurring_investments]);
  const dueCount = useMemo(
    () => recurring_investments.filter((r) => r.active && isOverdue(r.next_due)).length,
    [recurring_investments],
  );

  const filtered = useMemo(() => {
    return recurring_investments
      .filter((r) => {
        if (filter === 'active') return r.active && !isOverdue(r.next_due);
        if (filter === 'due')    return r.active && isOverdue(r.next_due);
        if (filter === 'paused') return !r.active;
        return true;
      })
      .sort((a, b) => a.next_due.localeCompare(b.next_due));
  }, [recurring_investments, filter]);

  function handleSave(data: SipForm, newHolding: { asset_name: string; asset_type: Investment['asset_type']; sector: string; ticker: string; current_price: number } | null) {
    let payload = { ...data };
    // Create the linked holding first if the user chose "New holding".
    if (newHolding) {
      const id = addInvestment({
        asset_name: newHolding.asset_name.trim(),
        asset_type: newHolding.asset_type,
        sector: newHolding.sector.trim(),
        buy_price: 0,
        current_price: newHolding.current_price,
        quantity: 0,
        purchase_date: today(),
        notes: `Created by SIP "${data.name}"`,
        ...(newHolding.ticker.trim() ? { ticker: newHolding.ticker.trim() } : {}),
        status: 'active' as const,
      });
      payload = { ...payload, target_investment_id: id, target_investment_name: newHolding.asset_name.trim() };
    }

    const savedId = payload.id ?? addRecurringInvestment(payload);
    if (payload.id) updateRecurringInvestment(payload.id, payload);
    setModal(null);

    // Apply any already-due installments immediately (executeDueInstallments
    // self-guards on active / next_due / price, so this is safe to call always).
    const sip = useRecurringInvestmentStore.getState().recurring_investments.find((r) => r.id === savedId);
    if (sip) {
      const res = executeDueInstallments(sip);
      if (res.runs > 0) setBanner({ runs: res.runs, invested: res.totalInvested, skipped: [] });
      else if (res.skippedReason) setBanner({ runs: 0, invested: 0, skipped: [res] });
    }
  }

  function handleRun(item: RecurringInvestment) {
    const res = executeDueInstallments(item);
    if (res.skippedReason) {
      setBanner({ runs: 0, invested: 0, skipped: [res] });
    } else if (res.runs > 0) {
      setBanner({ runs: res.runs, invested: res.totalInvested, skipped: [] });
    }
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Repeat className="h-6 w-6 text-indigo-400" /> Recurring Investments (SIPs)
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Auto-invest a fixed amount on a schedule · installments apply when you open this page
          </p>
        </div>
        <Button onClick={() => setModal({ ...EMPTY, next_due: today(), start_date: today() })} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add SIP
        </Button>
      </div>

      {/* Auto-apply banner */}
      {banner && (
        <div className="rounded-xl border border-indigo-700/40 bg-indigo-950/20 px-4 py-3 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            {banner.runs > 0 && (
              <p className="text-slate-200">
                Applied <span className="font-semibold">{banner.runs}</span> installment{banner.runs !== 1 ? 's' : ''} ·{' '}
                <span className="font-semibold text-emerald-400">{formatCurrency(banner.invested)}</span> invested.
              </p>
            )}
            {banner.skipped.length > 0 && (
              <p className="text-amber-300 mt-0.5">
                {banner.skipped.map((s) => `${s.name}: ${s.skippedReason}`).join(' · ')}
              </p>
            )}
          </div>
          <button onClick={() => setBanner(null)} className="text-slate-500 hover:text-slate-300"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Monthly Outflow</p>
            <p className="text-2xl font-bold text-slate-100">{formatCurrency(totalMonthly)}</p>
            <p className="text-xs text-slate-500 mt-1">{activeCount} active SIP{activeCount !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Invested To Date</p>
            <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalInvested)}</p>
            <p className="text-xs text-slate-500 mt-1">across all SIPs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Yearly Outflow</p>
            <p className="text-2xl font-bold text-slate-100">{formatCurrency(totalMonthly * 12)}</p>
            <p className="text-xs text-slate-500 mt-1">at current cadence</p>
          </CardContent>
        </Card>
        <Card className={dueCount > 0 ? 'border-amber-700/50' : ''}>
          <CardContent className="p-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Due Now</p>
            <p className={`text-2xl font-bold ${dueCount > 0 ? 'text-amber-400' : 'text-slate-100'}`}>{dueCount}</p>
            <p className="text-xs text-slate-500 mt-1">pending installments</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'active', 'due', 'paused'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-lg text-sm border transition-colors capitalize
              ${filter === f ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-[#2a2d3e] text-slate-400 hover:bg-[#2a2d3e]'}`}>
            {f === 'due' && dueCount > 0 ? `Due (${dueCount})` : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500 self-center">{filtered.length} SIP{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Grid */}
      {recurring_investments.length === 0 ? (
        <Card className="border-dashed border-[#2a2d3e]">
          <CardContent className="p-12 text-center">
            <Repeat className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 mb-1">No SIPs yet.</p>
            <p className="text-xs text-slate-600 mb-4">Set up a daily gold SIP, a monthly mutual-fund SIP — anything that buys on a schedule.</p>
            <Button variant="outline" size="sm" onClick={() => setModal({ ...EMPTY, next_due: today(), start_date: today() })}>
              Add your first SIP
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-8">No SIPs match this filter.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <SipCard
              key={item.id}
              item={item}
              onEdit={() => setModal({ ...item })}
              onDelete={() => { if (confirm(`Delete "${item.name}"? The holding and past buys are kept.`)) deleteRecurringInvestment(item.id); }}
              onRun={() => handleRun(item)}
              onToggle={() => updateRecurringInvestment(item.id, { active: !item.active })}
            />
          ))}
        </div>
      )}

      {modal && (
        <SipModal
          initial={modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
