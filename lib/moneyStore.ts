'use client';

import { create } from 'zustand';
import type { MoneyRecord } from './types';

import { saveSection } from './saveHelper';

function saveToFile(records: MoneyRecord[]) {
  saveSection('money_records', records);
}

interface MoneyStore {
  records: MoneyRecord[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addRecord: (record: Omit<MoneyRecord, 'id'>) => void;
  updateRecord: (id: string, record: Partial<MoneyRecord>) => void;
  deleteRecord: (id: string) => void;
  markSettled: (id: string, amount: number) => void;
}

export const useMoneyStore = create<MoneyStore>()((set, get) => ({
  records: [],
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const res = await fetch('/api/data?section=money_records');
      const data = await res.json();
      set({ records: data.data ?? [], hydrated: true });
    } catch {
      set({ records: [], hydrated: true });
    }
  },

  addRecord: (record) => {
    const updated = [...get().records, { ...record, id: crypto.randomUUID() }];
    set({ records: updated });
    saveToFile(updated);
  },

  updateRecord: (id, record) => {
    const updated = get().records.map((r) => (r.id === id ? { ...r, ...record } : r));
    set({ records: updated });
    saveToFile(updated);
  },

  deleteRecord: (id) => {
    const updated = get().records.filter((r) => r.id !== id);
    set({ records: updated });
    saveToFile(updated);
  },

  markSettled: (id, amount) => {
    const updated = get().records.map((r) => {
      if (r.id !== id) return r;
      const newSettled = Math.min(r.settled_amount + amount, r.amount);
      return {
        ...r,
        settled_amount: newSettled,
        status: newSettled >= r.amount ? 'settled' : newSettled > 0 ? 'partial' : 'pending',
      } as MoneyRecord;
    });
    set({ records: updated });
    saveToFile(updated);
  },
}));

// Derived helpers
export function getOutstandingLent(records: MoneyRecord[]) {
  return records
    .filter((r) => r.type === 'lent' && r.status !== 'settled')
    .reduce((sum, r) => sum + (r.amount - r.settled_amount), 0);
}

export function getOutstandingBorrowed(records: MoneyRecord[]) {
  return records
    .filter((r) => r.type === 'borrowed' && r.status !== 'settled')
    .reduce((sum, r) => sum + (r.amount - r.settled_amount), 0);
}
