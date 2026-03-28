'use client';

import { create } from 'zustand';
import type { AssetAccount, AccountTransaction } from './types';
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
  addTransaction: (accountId: string, tx: Omit<AccountTransaction, 'id'>, linkedAccountId?: string) => void;
  deleteTransaction: (accountId: string, txId: string) => void;
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

  addTransaction: (accountId, tx, linkedAccountId) => {
    const pairId = linkedAccountId ? crypto.randomUUID() : undefined;
    const accounts = get().accounts;
    const mainAccount   = accounts.find((a) => a.id === accountId);
    const linkedAccount = linkedAccountId ? accounts.find((a) => a.id === linkedAccountId) : undefined;

    function applyTx(a: AssetAccount, type: 'credit' | 'debit', note: string, partnerName?: string): AssetAccount {
      const balanceDelta = type === 'credit' ? tx.amount : -tx.amount;
      const newTx: AccountTransaction = {
        id: crypto.randomUUID(), date: tx.date, type, amount: tx.amount,
        note, pairId, ...(partnerName ? { linkedAccountName: partnerName } : {}),
      };
      return {
        ...a,
        balance: Math.round((a.balance + balanceDelta) * 100) / 100,
        last_updated: tx.date,
        transactions: [newTx, ...(a.transactions ?? [])],
      };
    }

    const updated = accounts.map((a) => {
      if (a.id === accountId)       return applyTx(a, tx.type, tx.note, linkedAccount?.name);
      if (a.id === linkedAccountId) {
        // Linked account gets the opposite type:
        // main=credit (money in/CC payment) → linked=debit (money leaves source)
        // main=debit  (money out)           → linked=credit (money arrives at dest)
        const linkedType: 'credit' | 'debit' = tx.type === 'credit' ? 'debit' : 'credit';
        const linkedNote = tx.type === 'credit'
          ? `Transfer to ${mainAccount?.name ?? 'account'} — ${tx.note}`
          : `Transfer from ${mainAccount?.name ?? 'account'} — ${tx.note}`;
        return applyTx(a, linkedType, linkedNote, mainAccount?.name);
      }
      return a;
    });
    set({ accounts: updated });
    saveToFile(updated);
  },

  deleteTransaction: (accountId, txId) => {
    const accounts = get().accounts;
    const account = accounts.find((a) => a.id === accountId);
    const tx = account?.transactions?.find((t) => t.id === txId);
    const pairId = tx?.pairId;

    const updated = accounts.map((a) => {
      // Find transactions to remove: on this account by txId, on any account by pairId
      const toRemove = new Set<string>();
      toRemove.add(txId);
      if (pairId) {
        a.transactions?.forEach((t) => { if (t.pairId === pairId) toRemove.add(t.id); });
      }

      const removedTxs = a.transactions?.filter((t) => toRemove.has(t.id)) ?? [];
      if (removedTxs.length === 0) return a;

      // Reverse balance for each removed tx
      let balanceDelta = 0;
      for (const t of removedTxs) {
        balanceDelta += t.type === 'credit' ? -t.amount : t.amount;
      }

      return {
        ...a,
        balance: Math.round((a.balance + balanceDelta) * 100) / 100,
        transactions: a.transactions?.filter((t) => !toRemove.has(t.id)) ?? [],
      };
    });
    set({ accounts: updated });
    saveToFile(updated);
  },
}));

export function getTotalBalance(accounts: AssetAccount[]) {
  // Credit card balance = amount you OWE (positive number = liability)
  // so it subtracts from net worth; all other accounts add to it
  return accounts.reduce((sum, a) => sum + a.balance, 0);
}
