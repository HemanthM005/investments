'use client';

import { useEffect } from 'react';
import { useInvestmentStore } from '@/lib/store';
import { useMoneyStore } from '@/lib/moneyStore';
import { useAssetStore } from '@/lib/assetStore';
import { useExpenseStore } from '@/lib/expenseStore';
import { useRecurringStore } from '@/lib/recurringStore';

export default function HydrationProvider({ children }: { children: React.ReactNode }) {
  const hydrateInvestments = useInvestmentStore((s) => s.hydrate);
  const hydrateMoney       = useMoneyStore((s) => s.hydrate);
  const hydrateAssets      = useAssetStore((s) => s.hydrate);
  const hydrateExpenses    = useExpenseStore((s) => s.hydrate);
  const hydrateRecurring   = useRecurringStore((s) => s.hydrate);

  useEffect(() => {
    async function init() {
      await Promise.all([
        hydrateInvestments(),
        hydrateMoney(),
        hydrateAssets(),
        hydrateExpenses(),
        hydrateRecurring(),
      ]);

      // Remove money records linked to expenses that no longer exist (orphan cleanup).
      // This handles cases where an expense was deleted directly from the file without
      // going through the UI delete button (which normally cleans up linked records).
      const expenses = useExpenseStore.getState().expenses;
      const expenseIds = new Set(expenses.map((e) => e.id));
      const { records, deleteRecord } = useMoneyStore.getState();
      records
        .filter((r) => r.source_expense_id && !expenseIds.has(r.source_expense_id))
        .forEach((r) => deleteRecord(r.id));
    }
    init();
  }, [hydrateInvestments, hydrateMoney, hydrateAssets, hydrateExpenses, hydrateRecurring]);

  return <>{children}</>;
}
