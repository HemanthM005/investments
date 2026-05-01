'use client';

import { create } from 'zustand';
import type { PlannerItem, PlannerLog } from './types';

async function save(items: PlannerItem[], logs: PlannerLog[]) {
  try {
    await fetch('/api/planner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections: { items, planner_logs: logs } }),
    });
  } catch (e) {
    console.warn('planner save failed:', e);
  }
}

interface PlannerStore {
  items: PlannerItem[];
  logs: PlannerLog[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addItem: (item: Omit<PlannerItem, 'id'>) => void;
  updateItem: (id: string, item: Partial<PlannerItem>) => void;
  deleteItem: (id: string) => void;
  toggleLog: (item_id: string, date: string) => void;
}

export const usePlannerStore = create<PlannerStore>()((set, get) => ({
  items: [],
  logs: [],
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const res = await fetch('/api/planner');
      const data = await res.json();
      set({ items: data.items ?? [], logs: data.planner_logs ?? [], hydrated: true });
    } catch {
      set({ items: [], logs: [], hydrated: true });
    }
  },

  addItem: (item) => {
    const items = [...get().items, { ...item, id: crypto.randomUUID() }];
    set({ items });
    save(items, get().logs);
  },

  updateItem: (id, item) => {
    const items = get().items.map((x) => (x.id === id ? { ...x, ...item } : x));
    set({ items });
    save(items, get().logs);
  },

  deleteItem: (id) => {
    const items = get().items.filter((x) => x.id !== id);
    const logs = get().logs.filter((l) => l.item_id !== id);
    set({ items, logs });
    save(items, logs);
  },

  toggleLog: (item_id, date) => {
    const existing = get().logs.findIndex((l) => l.item_id === item_id && l.date === date);
    const logs =
      existing >= 0
        ? get().logs.filter((_, i) => i !== existing)
        : [...get().logs, { item_id, date }];
    set({ logs });
    save(get().items, logs);
  },
}));

// ── Shared helpers ────────────────────────────────────────────────────────────

function todayISTStr(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export function isWeekend(dateStr: string): boolean {
  const day = new Date(dateStr + 'T12:00:00').getDay();
  return day === 0 || day === 6;
}

export function isItemApplicable(item: PlannerItem, dateStr: string): boolean {
  if (item.day_type === 'all') return true;
  const weekend = isWeekend(dateStr);
  if (item.day_type === 'weekend') return weekend;
  if (item.day_type === 'weekday') return !weekend;
  return true;
}

export function isPlannerDoneOnDate(item: PlannerItem, date: string, logs: PlannerLog[]): boolean {
  if (date < item.created_at) return false;
  return logs.some((l) => l.item_id === item.id && l.date === date);
}

export function getPlannerStreak(item: PlannerItem, logs: PlannerLog[]): number {
  const today = todayISTStr();
  let streak = 0;
  const d = new Date(today + 'T12:00:00');
  // If today isn't applicable, start from yesterday
  if (!isItemApplicable(item, today) || !isPlannerDoneOnDate(item, today, logs)) {
    d.setDate(d.getDate() - 1);
  }
  for (let i = 0; i < 400; i++) {
    const s = d.toLocaleDateString('en-CA');
    if (s < item.created_at) break;
    if (!isItemApplicable(item, s)) {
      // skip non-applicable days without breaking streak
      d.setDate(d.getDate() - 1);
      continue;
    }
    if (isPlannerDoneOnDate(item, s, logs)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export function getPlannerLongestStreak(item: PlannerItem, logs: PlannerLog[]): number {
  const doneDates = logs
    .filter((l) => l.item_id === item.id)
    .map((l) => l.date)
    .sort();
  if (!doneDates.length) return 0;
  let best = 1, cur = 1;
  for (let i = 1; i < doneDates.length; i++) {
    const prev = new Date(doneDates[i - 1] + 'T12:00:00');
    const curr = new Date(doneDates[i] + 'T12:00:00');
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) { cur++; best = Math.max(best, cur); }
    else if (diff > 1) { cur = 1; }
  }
  return best;
}

export function computePlannerXP(items: PlannerItem[], logs: PlannerLog[]): number {
  let xp = 0;
  for (const item of items) {
    const doneLogs = logs.filter((l) => l.item_id === item.id);
    xp += doneLogs.length * 10;
    const streak = getPlannerStreak(item, logs);
    if (streak >= 7) xp += streak * 5;
    else if (streak >= 3) xp += streak * 2;
  }
  return xp;
}
