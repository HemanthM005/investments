'use client';

import { create } from 'zustand';
import type { Expense } from './types';
import { useAssetStore } from './assetStore';

import { saveSection } from './saveHelper';

function saveToFile(expenses: Expense[]) {
  saveSection('expenses', expenses);
}

// Adjust an account's balance when an expense is added/removed.
// delta < 0 means "spending" (normal accounts lose money, credit cards owe more).
// For credit cards the balance is amount-owed, so spending *increases* it → flip the sign.
function adjustAccountBalance(accountId: string, delta: number) {
  if (!accountId) return;
  const { accounts, updateAccount } = useAssetStore.getState();
  const account = accounts.find((a) => a.id === accountId);
  if (!account) return;
  const effectiveDelta = account.category === 'Credit Card' ? -delta : delta;
  updateAccount(accountId, { balance: account.balance + effectiveDelta });
}

// Apply balance changes for an expense (delta = -amount for spend, +amount for reversal).
// If payment_sources is set, distribute across each source; otherwise use legacy payment_source_id.
function adjustAllSources(expense: { payment_source_id: string; amount: number; payment_sources?: import('./types').PaymentSource[] }, delta: number) {
  if (expense.payment_sources && expense.payment_sources.length > 0) {
    for (const src of expense.payment_sources) {
      if (src.account_id) adjustAccountBalance(src.account_id, delta < 0 ? -src.amount : src.amount);
    }
  } else {
    adjustAccountBalance(expense.payment_source_id, delta);
  }
}

interface ExpenseStore {
  expenses: Expense[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id'>) => string;  // returns new expense id
  updateExpense: (id: string, updates: Partial<Omit<Expense, 'id'>>) => void;
  deleteExpense: (id: string) => void;
}

export const useExpenseStore = create<ExpenseStore>()((set, get) => ({
  expenses: [],
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const res = await fetch('/api/data?section=expenses');
      const data = await res.json();
      set({ expenses: data.data ?? [], hydrated: true });
    } catch {
      set({ expenses: [], hydrated: true });
    }
  },

  addExpense: (expense) => {
    const newExpense = { ...expense, id: crypto.randomUUID() };
    const updated = [newExpense, ...get().expenses];
    set({ expenses: updated });
    saveToFile(updated);
    adjustAllSources(expense, -expense.amount);
    return newExpense.id;
  },

  updateExpense: (id, updates) => {
    const old = get().expenses.find((e) => e.id === id);
    if (!old) return;

    // 1. Reverse old effect
    adjustAllSources(old, +old.amount);

    // 2. Compute merged
    const merged = { ...old, ...updates };

    // 3. Apply new effect
    adjustAllSources(merged, -merged.amount);

    const updated = get().expenses.map((e) => (e.id === id ? merged : e));
    set({ expenses: updated });
    saveToFile(updated);
  },

  deleteExpense: (id) => {
    const exp = get().expenses.find((e) => e.id === id);
    if (exp) adjustAllSources(exp, +exp.amount);
    const updated = get().expenses.filter((e) => e.id !== id);
    set({ expenses: updated });
    saveToFile(updated);
  },
}));

// ── helpers ──────────────────────────────────────────────────────────────────

export function getTodaySpend(expenses: Expense[]) {
  const today = new Date().toISOString().slice(0, 10);
  return expenses.filter((e) => e.date === today).reduce((s, e) => s + e.amount, 0);
}

export function getThisMonthSpend(expenses: Expense[]) {
  const month = new Date().toISOString().slice(0, 7);
  return expenses.filter((e) => e.date.startsWith(month)).reduce((s, e) => s + e.amount, 0);
}

export function getThisWeekSpend(expenses: Expense[]) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  return expenses
    .filter((e) => new Date(e.date) >= startOfWeek)
    .reduce((s, e) => s + e.amount, 0);
}

export function getSpendByCategory(expenses: Expense[]) {
  const map: Record<string, number> = {};
  expenses.forEach((e) => {
    map[e.category] = (map[e.category] ?? 0) + e.amount;
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

export function getSpendForAccount(expenses: Expense[], accountId: string, month?: string) {
  return expenses
    .filter((e) => e.payment_source_id === accountId && (month ? e.date.startsWith(month) : true))
    .reduce((s, e) => s + e.amount, 0);
}
