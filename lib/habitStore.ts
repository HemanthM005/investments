'use client';

import { create } from 'zustand';
import type { Habit, HabitLog } from './types';

async function save(habits: Habit[], logs: HabitLog[]) {
  try {
    await fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections: { habits, habit_logs: logs } }),
    });
  } catch (e) {
    console.warn('habit save failed:', e);
  }
}

interface HabitStore {
  habits: Habit[];
  logs: HabitLog[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addHabit: (h: Omit<Habit, 'id'>) => void;
  updateHabit: (id: string, h: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  toggleLog: (habit_id: string, date: string) => void;
  setCount: (habit_id: string, date: string, count: number) => void;
}

export const useHabitStore = create<HabitStore>()((set, get) => ({
  habits: [],
  logs: [],
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const res = await fetch('/api/habits');
      const data = await res.json();
      set({ habits: data.habits ?? [], logs: data.habit_logs ?? [], hydrated: true });
    } catch {
      set({ habits: [], logs: [], hydrated: true });
    }
  },

  addHabit: (h) => {
    const habits = [...get().habits, { ...h, id: crypto.randomUUID() }];
    set({ habits });
    save(habits, get().logs);
  },

  updateHabit: (id, h) => {
    const habits = get().habits.map((x) => (x.id === id ? { ...x, ...h } : x));
    set({ habits });
    save(habits, get().logs);
  },

  deleteHabit: (id) => {
    const habits = get().habits.filter((x) => x.id !== id);
    const logs = get().logs.filter((l) => l.habit_id !== id);
    set({ habits, logs });
    save(habits, logs);
  },

  toggleLog: (habit_id, date) => {
    const existing = get().logs.findIndex((l) => l.habit_id === habit_id && l.date === date);
    const logs =
      existing >= 0
        ? get().logs.filter((_, i) => i !== existing)
        : [...get().logs, { habit_id, date }];
    set({ logs });
    save(get().habits, logs);
  },

  // For count-type habits: upsert the count. count=0 removes the log entry.
  setCount: (habit_id, date, count) => {
    const existing = get().logs.findIndex((l) => l.habit_id === habit_id && l.date === date);
    let logs: HabitLog[];
    if (count <= 0) {
      logs = existing >= 0 ? get().logs.filter((_, i) => i !== existing) : get().logs;
    } else if (existing >= 0) {
      logs = get().logs.map((l, i) => (i === existing ? { ...l, count } : l));
    } else {
      logs = [...get().logs, { habit_id, date, count }];
    }
    set({ logs });
    save(get().habits, logs);
  },
}));

// ── Shared completion helper ─────────────────────────────────────────────────
// Single source of truth: a habit is "done" on a date when:
//   • good/bad: a log entry exists
//   • count:    a log entry exists AND count <= target_count

export function isDoneOnDate(habit: Habit, date: string, logs: HabitLog[]): boolean {
  const log = logs.find((l) => l.habit_id === habit.id && l.date === date);
  if (!log) return false;
  if (habit.type === 'count') return (log.count ?? 0) <= (habit.target_count ?? 3);
  return true;
}

// ── Derived helpers ──────────────────────────────────────────────────────────

function todayISTStr(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export function getStreak(habit: Habit, logs: HabitLog[]): number {
  const today = todayISTStr();
  let streak = 0;
  const d = new Date(today + 'T12:00:00');
  // If today isn't done yet, start counting from yesterday
  if (!isDoneOnDate(habit, today, logs)) d.setDate(d.getDate() - 1);
  for (let i = 0; i < 400; i++) {
    const s = d.toLocaleDateString('en-CA');
    if (isDoneOnDate(habit, s, logs)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export function getLongestStreak(habit: Habit, logs: HabitLog[]): number {
  const doneDates = logs
    .filter((l) => {
      if (l.habit_id !== habit.id) return false;
      if (habit.type === 'count') return (l.count ?? 0) <= (habit.target_count ?? 3);
      return true;
    })
    .map((l) => l.date)
    .sort();
  if (!doneDates.length) return 0;
  let best = 1, cur = 1;
  for (let i = 1; i < doneDates.length; i++) {
    const diff =
      (new Date(doneDates[i] + 'T12:00:00').getTime() - new Date(doneDates[i - 1] + 'T12:00:00').getTime()) / 86400000;
    if (diff === 1) { cur++; best = Math.max(best, cur); }
    else if (diff > 1) { cur = 1; }
  }
  return best;
}

export function computeXP(habits: Habit[], logs: HabitLog[]): number {
  let xp = 0;
  for (const h of habits) {
    const doneLogs = logs.filter((l) => isDoneOnDate(h, l.date, logs));
    xp += doneLogs.length * 10;
    const streak = getStreak(h, logs);
    if (streak >= 7) xp += streak * 5;
    else if (streak >= 3) xp += streak * 2;
  }
  return xp;
}
