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
  // persist=false updates in-memory state and returns the new array WITHOUT
  // saving, so the caller can persist money_records together with another
  // section (e.g. accounts) in a single atomic write via saveSections().
  markSettled: (id: string, amount: number, persist?: boolean) => MoneyRecord[];
  markManySettled: (settlements: { id: string; amount: number }[], persist?: boolean) => MoneyRecord[];
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

  markSettled: (id, amount, persist = true) => {
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
    if (persist) saveToFile(updated);
    return updated;
  },

  // Apply several settlements in ONE state update + (optionally) ONE save.
  // Settling many records via repeated markSettled() calls fires a save per
  // record; those un-awaited POSTs can arrive out of order and a stale payload
  // can clobber the final state (overwrite, not merge), silently reverting some
  // records to pending. Batching avoids that race entirely.
  markManySettled: (settlements, persist = true) => {
    const byId = new Map(settlements.map((s) => [s.id, s.amount]));
    const updated = get().records.map((r) => {
      const amount = byId.get(r.id);
      if (amount === undefined) return r;
      const newSettled = Math.min(r.settled_amount + amount, r.amount);
      return {
        ...r,
        settled_amount: newSettled,
        status: newSettled >= r.amount ? 'settled' : newSettled > 0 ? 'partial' : 'pending',
      } as MoneyRecord;
    });
    set({ records: updated });
    if (persist) saveToFile(updated);
    return updated;
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
