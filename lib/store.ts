'use client';

import { create } from 'zustand';
import type { Investment } from './types';

const SAMPLE_INVESTMENTS: Investment[] = [
  {
    id: '1',
    asset_name: 'HAL',
    asset_type: 'Stock',
    sector: 'Defence',
    buy_price: 3200,
    current_price: 4100,
    quantity: 10,
    purchase_date: '2024-06-15',
    notes: 'Strong order book, Atmanirbhar push',
  },
  {
    id: '2',
    asset_name: 'Tata Power',
    asset_type: 'Stock',
    sector: 'Solar & Renewables',
    buy_price: 380,
    current_price: 420,
    quantity: 50,
    purchase_date: '2024-09-01',
    notes: 'Renewable expansion + EV charging',
  },
  {
    id: '3',
    asset_name: 'Nippon India Gold ETF',
    asset_type: 'Gold',
    sector: 'Commodities',
    buy_price: 5800,
    current_price: 7200,
    quantity: 5,
    purchase_date: '2024-01-10',
    notes: 'Gold hedge against market volatility',
  },
  {
    id: '4',
    asset_name: 'Parag Parikh Flexi Cap',
    asset_type: 'Mutual Fund',
    sector: 'Diversified',
    buy_price: 65,
    current_price: 82,
    quantity: 500,
    purchase_date: '2023-11-20',
    notes: 'SIP — global + India mix',
  },
  {
    id: '5',
    asset_name: 'Nifty BeES',
    asset_type: 'ETF',
    sector: 'Index',
    buy_price: 220,
    current_price: 245,
    quantity: 100,
    purchase_date: '2024-03-05',
    notes: 'Core index position',
  },
  {
    id: '6',
    asset_name: 'Bajaj Auto',
    asset_type: 'Stock',
    sector: 'Electric Vehicles',
    buy_price: 7200,
    current_price: 5900,
    quantity: 4,
    purchase_date: '2024-11-01',
    notes: 'EV 2W play — averaging down',
  },
];

async function saveToFile(investments: Investment[]) {
  try {
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: 'investments', data: investments }),
    });
  } catch { /* silently fail */ }
}

// Read localStorage investments (migration helper)
function readLocalStorage(): Investment[] | null {
  try {
    const raw = localStorage.getItem('investment-portfolio-store');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.investments ?? null;
  } catch {
    return null;
  }
}

interface InvestmentStore {
  investments: Investment[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addInvestment: (investment: Omit<Investment, 'id'>) => void;
  updateInvestment: (id: string, investment: Partial<Investment>) => void;
  deleteInvestment: (id: string) => void;
}

export const useInvestmentStore = create<InvestmentStore>()((set, get) => ({
  investments: [],
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;

    try {
      // 1. Try to load from file first
      const res = await fetch('/api/data?section=investments');
      const data = await res.json();

      if (data.data && data.data.length > 0) {
        // File has data — use it
        set({ investments: data.data, hydrated: true });
        // Also sync to localStorage for offline resilience
        localStorage.setItem('investment-portfolio-store-backup', JSON.stringify(data.investments));
        return;
      }

      // 2. File is empty — check localStorage for existing data (migration)
      const fromLS = readLocalStorage();
      if (fromLS && fromLS.length > 0) {
        set({ investments: fromLS, hydrated: true });
        // Migrate localStorage data to file
        await saveToFile(fromLS);
        return;
      }

      // 3. Nothing anywhere — load sample data
      set({ investments: SAMPLE_INVESTMENTS, hydrated: true });
      await saveToFile(SAMPLE_INVESTMENTS);
    } catch {
      // API failed (e.g. server down) — fall back to localStorage
      const fromLS = readLocalStorage();
      set({
        investments: fromLS && fromLS.length > 0 ? fromLS : SAMPLE_INVESTMENTS,
        hydrated: true,
      });
    }
  },

  addInvestment: (investment) => {
    const updated = [
      ...get().investments,
      { ...investment, id: Date.now().toString() },
    ];
    set({ investments: updated });
    saveToFile(updated);
  },

  updateInvestment: (id, investment) => {
    const updated = get().investments.map((inv) =>
      inv.id === id ? { ...inv, ...investment } : inv
    );
    set({ investments: updated });
    saveToFile(updated);
  },

  deleteInvestment: (id) => {
    const updated = get().investments.filter((inv) => inv.id !== id);
    set({ investments: updated });
    saveToFile(updated);
  },
}));
