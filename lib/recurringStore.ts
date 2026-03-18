'use client';

import { create } from 'zustand';
import type { RecurringExpense, RecurringFrequency } from './types';

async function saveToFile(items: RecurringExpense[]) {
  try {
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: 'recurring', data: items }),
    });
  } catch { /* silent */ }
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
    const updated = [...get().recurring, { ...item, id: Date.now().toString() }];
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

export function getNextDueDate(current: string, frequency: RecurringFrequency): string {
  const d = new Date(current + 'T00:00:00');
  switch (frequency) {
    case 'Daily':     d.setDate(d.getDate() + 1); break;
    case 'Weekly':    d.setDate(d.getDate() + 7); break;
    case 'Monthly':   d.setMonth(d.getMonth() + 1); break;
    case 'Quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'Yearly':    d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString().slice(0, 10);
}

export function toMonthlyAmount(amount: number, frequency: RecurringFrequency): number {
  switch (frequency) {
    case 'Daily':     return amount * 30;
    case 'Weekly':    return amount * 4.33;
    case 'Monthly':   return amount;
    case 'Quarterly': return amount / 3;
    case 'Yearly':    return amount / 12;
  }
}

export function getTotalMonthly(recurring: RecurringExpense[]): number {
  return recurring
    .filter((r) => r.active)
    .reduce((sum, r) => sum + toMonthlyAmount(r.amount, r.frequency), 0);
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
