'use client';

import { create } from 'zustand';
import type { AssetAccount } from './types';
import { saveSection } from './saveHelper';

function saveToFile(accounts: AssetAccount[]) {
  saveSection('accounts', accounts);
}

interface AssetStore {
  accounts: AssetAccount[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addAccount: (account: Omit<AssetAccount, 'id'>) => void;
  updateAccount: (id: string, account: Partial<AssetAccount>) => void;
  deleteAccount: (id: string) => void;
}

export const useAssetStore = create<AssetStore>()((set, get) => ({
  accounts: [],
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const res = await fetch('/api/data?section=accounts');
      const data = await res.json();
      set({ accounts: data.data ?? [], hydrated: true });
    } catch {
      set({ accounts: [], hydrated: true });
    }
  },

  addAccount: (account) => {
    const updated = [...get().accounts, { ...account, id: crypto.randomUUID() }];
    set({ accounts: updated });
    saveToFile(updated);
  },

  updateAccount: (id, account) => {
    const updated = get().accounts.map((a) => (a.id === id ? { ...a, ...account } : a));
    set({ accounts: updated });
    saveToFile(updated);
  },

  deleteAccount: (id) => {
    const updated = get().accounts.filter((a) => a.id !== id);
    set({ accounts: updated });
    saveToFile(updated);
  },
}));

export function getTotalBalance(accounts: AssetAccount[]) {
  // Credit card balance = amount you OWE (positive number = liability)
  // so it subtracts from net worth; all other accounts add to it
  return accounts.reduce((sum, a) =>
    a.category === 'Credit Card' ? sum - a.balance : sum + a.balance, 0);
}
