'use client';

import { create } from 'zustand';
import type { RecurringInvestment } from './types';
import { saveSection } from './saveHelper';
import { getNextDueDate } from './recurringStore';
import { useInvestmentStore } from './store';
import { useAssetStore } from './assetStore';

function saveToFile(items: RecurringInvestment[]) {
  saveSection('recurring_investments', items);
}

interface RecurringInvestmentStore {
  recurring_investments: RecurringInvestment[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addRecurringInvestment: (item: Omit<RecurringInvestment, 'id'>) => string;  // returns new id
  updateRecurringInvestment: (id: string, updates: Partial<RecurringInvestment>) => void;
  deleteRecurringInvestment: (id: string) => void;
}

export const useRecurringInvestmentStore = create<RecurringInvestmentStore>()((set, get) => ({
  recurring_investments: [],
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const res = await fetch('/api/data?section=recurring_investments');
      const data = await res.json();
      set({ recurring_investments: data.data ?? [], hydrated: true });
    } catch {
      set({ recurring_investments: [], hydrated: true });
    }
  },

  addRecurringInvestment: (item) => {
    const id = crypto.randomUUID();
    const updated = [...get().recurring_investments, { ...item, id }];
    set({ recurring_investments: updated });
    saveToFile(updated);
    return id;
  },

  updateRecurringInvestment: (id, updates) => {
    const updated = get().recurring_investments.map((r) => (r.id === id ? { ...r, ...updates } : r));
    set({ recurring_investments: updated });
    saveToFile(updated);
  },

  deleteRecurringInvestment: (id) => {
    const updated = get().recurring_investments.filter((r) => r.id !== id);
    set({ recurring_investments: updated });
    saveToFile(updated);
  },
}));

// ── execution ───────────────────────────────────────────────────────────────
// A SIP installment buys into ONE linked holding at the holding's current price,
// accumulating quantity and recomputing its weighted-average buy price, and debits
// the funding account. Catch-up applies every missed installment since `next_due`,
// all priced at the current price (a deliberate simplification — the app has no cheap
// per-day historical price). Skips (without advancing) when the price is unknown.

export interface SipRunResult {
  id: string;
  name: string;
  runs: number;            // installments applied this call
  totalInvested: number;   // ₹ deployed this call
  totalUnits: number;      // units bought this call
  skippedReason?: string;  // set when nothing ran due to a guard
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// Count installments due from `next_due` up to and including today.
// The loop always terminates (getNextDueDate strictly advances `due` past `today`),
// so CAP is purely an infinite-loop backstop — set far above any real catch-up window
// (~273 years of daily) so genuine missed installments are never silently truncated.
const CAP = 100_000;
function countDue(nextDue: string, frequency: RecurringInvestment['frequency'], today: string): { runs: number; due: string } {
  let due = nextDue;
  let runs = 0;
  while (due <= today && runs < CAP) {
    runs++;
    due = getNextDueDate(due, frequency);
  }
  return { runs, due };
}

export function executeDueInstallments(sip: RecurringInvestment): SipRunResult {
  const today = todayStr();
  const base: SipRunResult = { id: sip.id, name: sip.name, runs: 0, totalInvested: 0, totalUnits: 0 };

  if (!sip.active || sip.next_due > today) return base;

  const target = useInvestmentStore.getState().investments.find((i) => i.id === sip.target_investment_id);
  if (!target) return { ...base, skippedReason: 'Linked holding not found' };
  const price = target.current_price;
  if (!price || price <= 0) return { ...base, skippedReason: 'Set a current price to resume' };

  const { runs, due } = countDue(sip.next_due, sip.frequency, today);
  if (runs === 0) return base;

  const totalInvested = runs * sip.amount;
  const totalUnits = totalInvested / price;
  const rawQty = target.quantity + totalUnits;
  const rawAvg = rawQty > 0 ? (target.buy_price * target.quantity + totalInvested) / rawQty : 0;
  // Round to clean precision (6 dp for fractional units like gold grams / MF units, 2 dp for price)
  const newQty = Math.round(rawQty * 1e6) / 1e6;
  const newAvg = Math.round(rawAvg * 100) / 100;

  // 1. Accumulate into the holding
  useInvestmentStore.getState().updateInvestment(target.id, { quantity: newQty, buy_price: newAvg });

  // 2. Debit funding account (single combined ledger entry; note carries the count)
  if (sip.funded_by_account_id) {
    const suffix = runs > 1 ? ` ×${runs}` : '';
    useAssetStore.getState().addTransaction(sip.funded_by_account_id, {
      date: today,
      type: 'debit',
      amount: totalInvested,
      note: `SIP: ${sip.name}${suffix}`,
    });
  }

  // 3. Advance the SIP
  useRecurringInvestmentStore.getState().updateRecurringInvestment(sip.id, {
    next_due: due,
    total_invested: (sip.total_invested ?? 0) + totalInvested,
    installments_done: (sip.installments_done ?? 0) + runs,
    last_executed: today,
  });

  return { id: sip.id, name: sip.name, runs, totalInvested, totalUnits };
}

// Apply all due installments across every active SIP. Synchronous map => each call
// reads fresh store state, so SIPs sharing a holding/account accumulate correctly.
export function runDueForAll(): SipRunResult[] {
  return useRecurringInvestmentStore
    .getState()
    .recurring_investments
    .filter((s) => s.active)
    .map((s) => executeDueInstallments(s));
}
