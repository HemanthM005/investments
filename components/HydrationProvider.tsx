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
    hydrateInvestments();
    hydrateMoney();
    hydrateAssets();
    hydrateExpenses();
    hydrateRecurring();
  }, [hydrateInvestments, hydrateMoney, hydrateAssets, hydrateExpenses, hydrateRecurring]);

  return <>{children}</>;
}
