'use client';

import { create } from 'zustand';
import type { RecurringExpense, SubscriptionFrequency } from './types';
import { saveSection } from './saveHelper';

function saveToFile(items: RecurringExpense[]) {
  saveSection('recurring', items);
}

interface RecurringStore {
  recurring: RecurringExpense[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addRecurring: (item: Omit<RecurringExpense, 'id'>) => void;
  updateRecurring: (id: string, updates: Partial<RecurringExpense>) => void;
  deleteRecurring: (id: string) => void;
}

export const useRecurringStore = create<RecurringStore>()((set, get) => ({
  recurring: [],
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const res = await fetch('/api/data?section=recurring');
      const data = await res.json();
      set({ recurring: data.data ?? [], hydrated: true });
    } catch {
      set({ recurring: [], hydrated: true });
    }
  },

  addRecurring: (item) => {
    const updated = [...get().recurring, { ...item, id: crypto.randomUUID() }];
    set({ recurring: updated });
    saveToFile(updated);
  },

  updateRecurring: (id, updates) => {
    const updated = get().recurring.map((r) => (r.id === id ? { ...r, ...updates } : r));
    set({ recurring: updated });
    saveToFile(updated);
  },

  deleteRecurring: (id) => {
    const updated = get().recurring.filter((r) => r.id !== id);
    set({ recurring: updated });
    saveToFile(updated);
  },
}));

// ── helpers ───────────────────────────────────────────────────────────────────

// Advance a due date by one period. Calendar frequencies keep the same day of
// month (anchorDay, clamped to month end: 31 Jan → 28 Feb → 31 Mar); 'Custom Days'
// adds a fixed cycle (28/30/84-day prepaid plans). Pure YYYY-MM-DD math in UTC so
// the date never slips a day in timezones ahead of UTC (e.g. IST).
export function getNextDueDate(
  current: string,
  frequency: SubscriptionFrequency,
  opts: { cycleDays?: number; anchorDay?: number } = {},
): string {
  const [y, m, d] = current.split('-').map(Number);
  const addDays = (n: number) => new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
  const addMonths = (n: number) => {
    const total = m - 1 + n;
    const ny = y + Math.floor(total / 12);
    const nm = ((total % 12) + 12) % 12;
    const lastDay = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
    return new Date(Date.UTC(ny, nm, Math.min(opts.anchorDay ?? d, lastDay))).toISOString().slice(0, 10);
  };
  switch (frequency) {
    case 'Daily':       return addDays(1);
    case 'Weekly':      return addDays(7);
    case 'Custom Days': return addDays(Math.max(1, opts.cycleDays ?? 30));
    case 'Monthly':     return addMonths(1);
    case 'Quarterly':   return addMonths(3);
    case 'Half-Yearly': return addMonths(6);
    case 'Yearly':      return addMonths(12);
  }
}

// Next due date after paying a subscription on `paidOn`.
//   Calendar plans (Monthly, EMI, insurance) stay on their billing date: advance from next_due.
//   Day-cycle plans (prepaid recharges) restart from the payment date if it had lapsed;
//   paying early stacks onto the current cycle.
export function nextDueAfterPayment(item: RecurringExpense, paidOn: string): string {
  if (item.frequency === 'Custom Days' || item.frequency === 'Daily' || item.frequency === 'Weekly') {
    const from = paidOn > item.next_due ? paidOn : item.next_due;
    return getNextDueDate(from, item.frequency, { cycleDays: item.cycle_days });
  }
  return getNextDueDate(item.next_due, item.frequency, {
    anchorDay: item.anchor_day ?? Number(item.next_due.split('-')[2]),
  });
}

export function frequencyLabel(item: Pick<RecurringExpense, 'frequency' | 'cycle_days'>): string {
  return item.frequency === 'Custom Days' ? `Every ${item.cycle_days ?? 30} days` : item.frequency;
}

export function toMonthlyAmount(amount: number, frequency: SubscriptionFrequency, cycleDays?: number): number {
  switch (frequency) {
    case 'Daily':       return amount * 30;
    case 'Weekly':      return amount * 4.33;
    case 'Custom Days': return amount * (30.44 / Math.max(1, cycleDays ?? 30));
    case 'Monthly':     return amount;
    case 'Quarterly':   return amount / 3;
    case 'Half-Yearly': return amount / 6;
    case 'Yearly':      return amount / 12;
  }
}

export function getTotalMonthly(recurring: RecurringExpense[]): number {
  return recurring
    .filter((r) => r.active)
    .reduce((sum, r) => sum + toMonthlyAmount(r.amount, r.frequency, r.cycle_days), 0);
}

export function getDueSoon(recurring: RecurringExpense[], days = 7): RecurringExpense[] {
  const today = new Date();
  const cutoff = new Date(); cutoff.setDate(today.getDate() + days);
  const todayStr = today.toISOString().slice(0, 10);
  return recurring.filter((r) => r.active && r.next_due <= cutoff.toISOString().slice(0, 10));
}

export function isOverdue(next_due: string): boolean {
  return next_due < new Date().toISOString().slice(0, 10);
}
