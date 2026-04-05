'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Plus, Pencil, Trash2, Flame, Zap, ChevronLeft, ChevronRight,
  Trophy, Target, Check, Sparkles, Activity, ShieldAlert, Hash,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useHabitStore, getStreak, getLongestStreak, computeXP, isDoneOnDate } from '@/lib/habitStore';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Habit, HabitCategory } from '@/lib/types';

// ── Constants ────────────────────────────────────────────────────────────────

const PALETTE = [
  '#6366f1', '#10b981', '#f59e0b', '#f43f5e',
  '#3b82f6', '#a855f7', '#f97316', '#14b8a6',
];

const CATEGORY_EMOJI: Record<HabitCategory, string> = {
  Health: '💧', Fitness: '💪', Productivity: '⚡',
  Learning: '📚', Mindfulness: '🧘', Other: '✅',
};

const CATEGORIES: HabitCategory[] = ['Health', 'Fitness', 'Productivity', 'Learning', 'Mindfulness', 'Other'];

const EMOJIS = ['💧', '💪', '⚡', '📚', '🧘', '✅', '🏃', '🥗', '😴', '☀️', '🎯', '🔥', '💊', '🧠', '✍️', '🎵', '🚫', '⏰', '🥣', '🌅', '🍳', '📱'];

// ── Utilities ────────────────────────────────────────────────────────────────

function todayIST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-CA');
}

function relativeLabel(dateStr: string, todayStr: string): string {
  const diff = Math.round(
    (new Date(todayStr + 'T12:00:00').getTime() - new Date(dateStr + 'T12:00:00').getTime()) / 86400000
  );
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff <= 6) return `${diff} days ago`;
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function dayLabel(year: number, month: number, day: number): string {
  return ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][new Date(year, month, day).getDay()];
}

// ── Circle progress ring ─────────────────────────────────────────────────────

function CircleRing({ pct, color, size = 40 }: { pct: number; color: string; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2a2d3e" strokeWidth={4} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
    </svg>
  );
}

// ── Habit Modal ──────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: '', category: 'Health' as HabitCategory, emoji: '💧',
  color: PALETTE[0], active: true,
  created_at: todayIST(),
  type: 'good' as 'good' | 'bad' | 'count',
  target_count: 3,
};

function HabitModal({ open, onClose, onSubmit, initial }: {
  open: boolean; onClose: () => void;
  onSubmit: (h: Omit<Habit, 'id'>) => void;
  initial?: Habit | null;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setForm(initial
        ? {
            name: initial.name, category: initial.category, emoji: initial.emoji,
            color: initial.color, active: initial.active, created_at: initial.created_at,
            type: initial.type ?? 'good', target_count: initial.target_count ?? 3,
          }
        : { ...EMPTY_FORM, created_at: todayIST() }
      );
      setErrors({});
    }
  }, [open, initial]);

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (k === 'name') setErrors((p) => ({ ...p, name: '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setErrors({ name: 'Name is required' }); return; }
    if (form.type === 'count' && (!form.target_count || form.target_count < 1)) {
      setErrors({ target_count: 'Daily limit must be at least 1' }); return;
    }
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Habit' : 'Add Habit'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Type toggle */}
          <div className="grid grid-cols-3 gap-2">
            {([
              { v: 'good',  label: '✅ Good',  sub: 'To Do',     active: 'bg-emerald-700 border-emerald-600', inactive: 'hover:border-emerald-700' },
              { v: 'bad',   label: '🚫 Bad',   sub: 'To Avoid',  active: 'bg-red-700 border-red-600',         inactive: 'hover:border-red-700' },
              { v: 'count', label: '📊 Count', sub: 'Track limit',active: 'bg-indigo-700 border-indigo-600',  inactive: 'hover:border-indigo-700' },
            ] as const).map(({ v, label, sub, active, inactive }) => (
              <button key={v} type="button" onClick={() => set('type', v)}
                className={cn(
                  'py-2 rounded-lg text-xs font-semibold border transition-colors',
                  form.type === v ? `${active} text-white` : `bg-transparent border-[#2a2d3e] text-slate-400 ${inactive}`
                )}>
                <div>{label}</div>
                <div className="font-normal opacity-70">{sub}</div>
              </button>
            ))}
          </div>

          {/* Type hint */}
          {form.type === 'bad' && (
            <p className="text-xs text-red-400/80 bg-red-950/20 border border-red-900/40 rounded-lg px-3 py-2">
              Checking this habit means you <strong>successfully avoided</strong> it that day.
            </p>
          )}
          {form.type === 'count' && (
            <p className="text-xs text-indigo-400/80 bg-indigo-950/20 border border-indigo-900/40 rounded-lg px-3 py-2">
              You&apos;ll tap <strong>+</strong> each time you do this. The day counts as ✓ only if your total stays within the limit.
            </p>
          )}

          <div className="space-y-1.5">
            <Label>Habit Name *</Label>
            <Input
              placeholder={form.type === 'count' ? 'e.g. How many times I opened Instagram' : form.type === 'bad' ? 'e.g. No Junk Food' : 'e.g. Drink 2L of water'}
              value={form.name} onChange={(e) => set('name', e.target.value)}
            />
            {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
          </div>

          {/* Daily limit — only for count habits */}
          {form.type === 'count' && (
            <div className="space-y-1.5">
              <Label>Daily Limit *</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number" min={1} max={99}
                  className="w-24"
                  value={form.target_count || ''}
                  onChange={(e) => set('target_count', parseInt(e.target.value) || 1)}
                />
                <p className="text-xs text-slate-400">
                  Day marked ✓ if you do this <strong className="text-slate-200">≤ {form.target_count}</strong> time{form.target_count !== 1 ? 's' : ''}
                </p>
              </div>
              {errors.target_count && <p className="text-xs text-red-400">{errors.target_count}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => {
                set('category', v as HabitCategory);
                set('emoji', CATEGORY_EMOJI[v as HabitCategory]);
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{CATEGORY_EMOJI[c]} {c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Emoji</Label>
              <div className="grid grid-cols-7 gap-1">
                {EMOJIS.map((e) => (
                  <button key={e} type="button" onClick={() => set('emoji', e)}
                    className={cn('text-base rounded-md py-1 transition-colors', form.emoji === e ? 'bg-indigo-600' : 'bg-[#2a2d3e] hover:bg-[#3a3d4e]')}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex gap-2">
              {PALETTE.map((c) => (
                <button key={c} type="button" onClick={() => set('color', c)}
                  className={cn('h-7 w-7 rounded-full border-2 transition-transform', form.color === c ? 'scale-125 border-white' : 'border-transparent hover:scale-110')}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" style={{ backgroundColor: form.color }}>{initial ? 'Save Changes' : 'Add Habit'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Today Panel ──────────────────────────────────────────────────────────────

function TodayPanel({ habits, logs, viewDate, today, onPrev, onNext, onToggle, onEdit, onSetCount }: {
  habits: Habit[];
  logs: { habit_id: string; date: string; count?: number }[];
  viewDate: string;
  today: string;
  onPrev: () => void;
  onNext: () => void;
  onToggle: (habit_id: string, date: string) => void;
  onEdit: (h: Habit) => void;
  onSetCount: (habit_id: string, date: string, count: number) => void;
}) {
  const active = habits.filter((h) => h.active);
  const done = active.filter((h) => isDoneOnDate(h, viewDate, logs));
  const pct = active.length ? Math.round((done.length / active.length) * 100) : 0;
  const allDone = active.length > 0 && done.length === active.length;
  const isToday = viewDate === today;
  const isFuture = viewDate > today;

  const dateLabel = new Date(viewDate + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const rel = relativeLabel(viewDate, today);

  return (
    <Card className={cn('border-[#2a2d3e] transition-colors', allDone && 'border-emerald-600/50 bg-emerald-950/10')}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onPrev} className="h-7 w-7 text-slate-400 hover:text-slate-200">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-base font-semibold text-slate-100">{dateLabel}</p>
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium',
                  isToday ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-700/50'
                  : isFuture ? 'bg-amber-900/30 text-amber-400 border border-amber-700/40'
                  : 'bg-slate-800 text-slate-400 border border-slate-700/40'
                )}>{rel}</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isFuture ? 'Future — cannot log yet' : `${done.length}/${active.length} habits done`}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onNext} disabled={isToday}
              className={cn('h-7 w-7', isToday ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-slate-200')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-3">
            {allDone && !isFuture && (
              <span className="text-xs bg-emerald-900/50 text-emerald-400 border border-emerald-700/50 px-3 py-1 rounded-full font-medium flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> All done!
              </span>
            )}
            {!isFuture && (
              <div className="relative flex items-center justify-center">
                <CircleRing pct={pct} color={allDone ? '#10b981' : '#6366f1'} size={52} />
                <span className="absolute text-xs font-bold text-slate-200">{pct}%</span>
              </div>
            )}
          </div>
        </div>

        {isFuture ? (
          <p className="text-sm text-slate-500 py-4 text-center">You can&apos;t log habits for future dates.</p>
        ) : active.length === 0 ? (
          <p className="text-sm text-slate-500">Add some habits to start tracking.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {active.map((h) => {
              const isBad = h.type === 'bad';
              const isCount = h.type === 'count';
              const completed = isDoneOnDate(h, viewDate, logs);
              const streak = getStreak(h, logs);

              // ── Count habit tile ──────────────────────────────────────────
              if (isCount) {
                const log = logs.find((l) => l.habit_id === h.id && l.date === viewDate);
                const count = log?.count ?? 0;
                const target = h.target_count ?? 3;
                const overLimit = count > target;
                const hasStarted = count > 0;

                return (
                  <div key={h.id} className={cn(
                    'group relative flex items-center gap-3 rounded-xl px-4 py-3 border transition-all',
                    overLimit ? 'border-red-700/50 bg-red-950/20'
                    : 'border-emerald-700/50 bg-emerald-950/20'
                  )}>
                    {/* Emoji icon */}
                    <div
                      className="h-9 w-9 rounded-lg flex items-center justify-center text-lg shrink-0"
                      style={{ backgroundColor: h.color + '33' }}
                    >
                      {h.emoji}
                    </div>

                    {/* Name + status */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold bg-indigo-900/50 text-indigo-400 border border-indigo-800/50 px-1.5 rounded uppercase tracking-wide">Count</span>
                        <p className="text-sm font-medium text-slate-200 truncate">{h.name}</p>
                      </div>
                      <p className="text-xs mt-0.5">
                        {overLimit
                          ? <span className="text-red-400">✗ Over limit by {count - target}</span>
                          : count === 0
                            ? <span className="text-emerald-400">✓ Under limit · tap + to count</span>
                            : <span className="text-emerald-400">✓ Under limit ({target - count} remaining)</span>
                        }
                      </p>
                    </div>

                    {/* Counter controls + edit */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Edit */}
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit(h); }}
                        title="Edit habit"
                        className="h-6 w-6 rounded-md bg-[#1a1d2e] border border-[#2a2d3e] flex items-center justify-center text-slate-500 hover:text-indigo-400 hover:border-indigo-700/50 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>

                      {/* − */}
                      <button
                        onClick={() => onSetCount(h.id, viewDate, count - 1)}
                        disabled={count === 0}
                        className={cn(
                          'h-7 w-7 rounded-lg border font-bold text-base flex items-center justify-center transition-all',
                          count === 0 ? 'border-[#2a2d3e] text-slate-700 cursor-not-allowed'
                          : 'border-[#2a2d3e] text-slate-300 hover:border-red-600/60 hover:text-red-400'
                        )}
                      >−</button>

                      {/* Count / limit */}
                      <div className="min-w-[44px] text-center">
                        <span className={cn(
                          'text-lg font-bold leading-none',
                          overLimit ? 'text-red-400' : 'text-emerald-400'
                        )}>{count}</span>
                        <span className="text-[10px] text-slate-600 block leading-none">/{target}</span>
                      </div>

                      {/* + */}
                      <button
                        onClick={() => onSetCount(h.id, viewDate, count + 1)}
                        className="h-7 w-7 rounded-lg border border-[#2a2d3e] text-slate-300 font-bold text-base flex items-center justify-center hover:border-indigo-600/60 hover:text-indigo-400 transition-all"
                      >+</button>
                    </div>
                  </div>
                );
              }

              // ── Good / Bad habit tile ─────────────────────────────────────
              return (
                <div key={h.id} className={cn(
                  'group relative flex items-center gap-3 rounded-xl px-4 py-3 border transition-all',
                  completed
                    ? 'border-emerald-700/50 bg-emerald-950/20'
                    : isBad
                      ? 'border-red-800/40 bg-red-950/10 hover:border-red-600/60'
                      : 'border-[#2a2d3e] bg-[#0f1117] hover:border-indigo-700/50 hover:bg-indigo-950/10'
                )}>
                  <button onClick={() => onToggle(h.id, viewDate)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    <div
                      className={cn('h-9 w-9 rounded-lg flex items-center justify-center text-lg shrink-0 transition-all', completed && 'scale-110')}
                      style={{ backgroundColor: completed ? h.color + '33' : '#1a1d2e' }}
                    >
                      {completed
                        ? isBad ? <ShieldAlert className="h-5 w-5 text-emerald-400" /> : <Check className="h-5 w-5 text-emerald-400" />
                        : h.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isBad && (
                          <span className="text-[9px] font-bold bg-red-900/50 text-red-400 border border-red-800/50 px-1.5 rounded uppercase tracking-wide">Avoid</span>
                        )}
                        <p className={cn('text-sm font-medium truncate', completed ? 'text-emerald-300' : isBad ? 'text-red-200' : 'text-slate-200')}>{h.name}</p>
                      </div>
                      <p className="text-xs mt-0.5">
                        {completed
                          ? isBad
                            ? <span className="text-emerald-400">💪 Stayed strong{streak >= 3 ? ` · 🔥 ${streak}d` : ''}</span>
                            : streak >= 3 ? <span className="text-orange-400">🔥 {streak} day streak</span> : <span className="text-slate-500">{h.category}</span>
                          : isBad
                            ? <span className="text-red-400/70">Tap to mark as avoided</span>
                            : <span className="text-slate-500">{h.category}</span>
                        }
                      </p>
                    </div>
                  </button>

                  {/* Edit + completion dot */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(h); }}
                      title="Edit habit"
                      className="h-6 w-6 rounded-md bg-[#1a1d2e] border border-[#2a2d3e] flex items-center justify-center text-slate-500 hover:text-indigo-400 hover:border-indigo-700/50 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <div
                      className={cn('h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer',
                        completed ? 'border-emerald-500 bg-emerald-500' : isBad ? 'border-red-600/50' : 'border-slate-600'
                      )}
                      style={completed ? {} : { borderColor: h.color + '80' }}
                      onClick={() => onToggle(h.id, viewDate)}
                    >
                      {completed && <Check className="h-3 w-3 text-white" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Monthly Grid ─────────────────────────────────────────────────────────────

function MonthlyGrid({ habits, logs, year, month, today, onToggle, onSetCount }: {
  habits: Habit[]; logs: { habit_id: string; date: string; count?: number }[];
  year: number; month: number; today: string;
  onToggle: (habit_id: string, date: string) => void;
  onSetCount: (habit_id: string, date: string, count: number) => void;
}) {
  const totalDays = daysInMonth(year, month);
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);
  const active = habits.filter((h) => h.active);

  const weeks: number[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const ds = (day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const isFuture = (day: number) => ds(day) > today;
  const isToday = (day: number) => ds(day) === today;

  const habitPct = (h: Habit) => {
    const past = days.filter((d) => !isFuture(d));
    return past.length ? Math.round((past.filter((d) => isDoneOnDate(h, ds(d), logs)).length / past.length) * 100) : 0;
  };

  if (active.length === 0) {
    return (
      <Card className="border-[#2a2d3e]">
        <CardContent className="py-12 text-center text-slate-500 text-sm">Add habits above to see the monthly grid.</CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[#2a2d3e]">
      <CardContent className="p-4 overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: `${totalDays * 29 + 300}px` }}>
          <thead>
            <tr>
              <th className="text-left text-xs text-slate-500 pb-2 pr-4 w-52 font-normal">Habit</th>
              {weeks.map((week, wi) => (
                <th key={wi} colSpan={week.length} className="text-center text-xs font-semibold pb-2 px-1"
                  style={{ color: ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#3b82f6'][wi % 5] }}>
                  Week {wi + 1}
                </th>
              ))}
              <th className="text-center text-xs text-slate-500 pb-2 px-2 font-normal">Done</th>
              <th className="text-center text-xs text-slate-500 pb-2 px-2 font-normal">%</th>
              <th className="text-center text-xs text-slate-500 pb-2 px-2 font-normal">Streak</th>
            </tr>
            <tr>
              <th />
              {days.map((d) => (
                <th key={d} className="text-center pb-2 px-0.5">
                  <div className={cn('text-[10px] leading-tight', isToday(d) ? 'text-indigo-300 font-bold' : 'text-slate-600')}>
                    <div>{dayLabel(year, month, d)}</div>
                    <div>{d}</div>
                  </div>
                </th>
              ))}
              <th /><th /><th />
            </tr>
          </thead>
          <tbody>
            {active.map((h, hi) => {
              const isCount = h.type === 'count';
              const isBad = h.type === 'bad';
              const streak = getStreak(h, logs);
              const pct = habitPct(h);
              const count = days.filter((d) => !isFuture(d) && isDoneOnDate(h, ds(d), logs)).length;

              return (
                <tr key={h.id} className={hi % 2 === 0 ? 'bg-[#0f1117]/40' : ''}>
                  <td className="py-1 pr-3 max-w-[200px]">
                    <div className="flex items-center gap-2">
                      <span className="text-base shrink-0">{h.emoji}</span>
                      <span className="text-xs text-slate-300 truncate font-medium">{h.name}</span>
                      {isBad && <span className="text-[8px] font-bold bg-red-900/50 text-red-400 border border-red-800/50 px-1 rounded uppercase shrink-0">avoid</span>}
                      {isCount && <Hash className="h-3 w-3 text-indigo-400 shrink-0" />}
                    </div>
                  </td>
                  {days.map((d) => {
                    const dateStr = ds(d);
                    const future = isFuture(d);
                    const todayCell = isToday(d);
                    const done = isDoneOnDate(h, dateStr, logs);

                    // Count habit cell — show the number
                    if (isCount) {
                      const log = logs.find((l) => l.habit_id === h.id && l.date === dateStr);
                      const cnt = log?.count ?? 0;
                      const target = h.target_count ?? 3;
                      const over = cnt > target;
                      return (
                        <td key={d} className="py-1 px-0.5">
                          <div className={cn(
                            'h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-bold transition-all',
                            future ? 'bg-[#1a1d2e]/40 text-slate-700'
                            : cnt === 0 ? (todayCell ? 'bg-indigo-900/30 border border-indigo-700/50 text-slate-600' : 'bg-[#1a1d2e] text-slate-700')
                            : over ? 'text-white' : 'text-white',
                          )} style={cnt > 0 ? { backgroundColor: over ? '#f43f5e' : h.color } : {}}>
                            {!future ? (cnt > 0 ? cnt : '0') : ''}
                          </div>
                        </td>
                      );
                    }

                    // Boolean habit cell
                    return (
                      <td key={d} className="py-1 px-0.5">
                        <button
                          onClick={() => { if (!future) onToggle(h.id, dateStr); }}
                          disabled={future}
                          title={future ? '' : `${h.name} — ${dateStr}`}
                          className={cn(
                            'h-6 w-6 rounded-md transition-all',
                            future ? 'bg-[#1a1d2e]/40 cursor-not-allowed'
                            : done ? 'hover:opacity-80 cursor-pointer'
                            : todayCell ? 'bg-indigo-900/30 border border-indigo-700/50 hover:border-indigo-500 cursor-pointer'
                            : 'bg-[#1a1d2e] hover:bg-[#2a2d3e] cursor-pointer',
                          )}
                          style={done ? { backgroundColor: h.color } : {}}
                        >
                          {done && <Check className="h-3 w-3 text-white mx-auto" />}
                        </button>
                      </td>
                    );
                  })}
                  <td className="py-1 px-2 text-center text-xs font-semibold text-slate-200">{count}</td>
                  <td className="py-1 px-2 text-center">
                    <span className={cn('text-xs font-semibold', pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400')}>{pct}%</span>
                  </td>
                  <td className="py-1 px-2 text-center text-xs">
                    {streak >= 3 ? <span className="text-orange-400 font-bold">🔥{streak}</span>
                    : streak > 0 ? <span className="text-slate-400">{streak}d</span>
                    : <span className="text-slate-600">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// ── Analytics ────────────────────────────────────────────────────────────────

function AnalyticsSection({ habits, logs, year, month }: {
  habits: Habit[]; logs: { habit_id: string; date: string; count?: number }[];
  year: number; month: number;
}) {
  const active = habits.filter((h) => h.active);
  const totalDays = daysInMonth(year, month);
  const today = todayIST();

  const lineData = useMemo(() => {
    return Array.from({ length: totalDays }, (_, i) => {
      const day = i + 1;
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (dateStr > today) return null;
      const done = active.filter((h) => isDoneOnDate(h, dateStr, logs)).length;
      return { day, pct: active.length ? Math.round((done / active.length) * 100) : 0 };
    }).filter(Boolean);
  }, [active, logs, year, month, today, totalDays]);

  const habitStats = useMemo(() => {
    return active.map((h) => {
      const past = Array.from({ length: totalDays }, (_, i) =>
        `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
      ).filter((d) => d <= today);
      const done = past.filter((d) => isDoneOnDate(h, d, logs)).length;
      const pct = past.length ? Math.round((done / past.length) * 100) : 0;
      return { ...h, pct, done, streak: getStreak(h, logs), longest: getLongestStreak(h, logs) };
    }).sort((a, b) => b.pct - a.pct);
  }, [active, logs, year, month, today, totalDays]);

  const perfect = useMemo(() => {
    const past = Array.from({ length: totalDays }, (_, i) =>
      `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
    ).filter((d) => d <= today);
    return past.filter((d) => active.every((h) => isDoneOnDate(h, d, logs))).length;
  }, [active, logs, year, month, today, totalDays]);

  const lazy = useMemo(() => {
    const past = Array.from({ length: totalDays }, (_, i) =>
      `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
    ).filter((d) => d <= today);
    return past.filter((d) => !active.some((h) => isDoneOnDate(h, d, logs))).length;
  }, [active, logs, year, month, today, totalDays]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="border-[#2a2d3e]">
        <CardContent className="p-5">
          <p className="text-sm font-semibold text-slate-200 mb-1 flex items-center gap-2">
            <Activity className="h-4 w-4 text-indigo-400" /> Daily Completion Trend
          </p>
          <p className="text-xs text-slate-500 mb-4">% of habits completed each day this month</p>
          {lineData.length < 2 ? (
            <p className="text-sm text-slate-500 py-8 text-center">Not enough data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={lineData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
                <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }}
                  formatter={(v: number) => [`${v}%`, 'Completion']}
                  labelFormatter={(l) => `Day ${l}`}
                />
                <Line type="monotone" dataKey="pct" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#6366f1' }} />
              </LineChart>
            </ResponsiveContainer>
          )}
          <div className="flex gap-3 mt-4 flex-wrap">
            <div className="flex items-center gap-2 bg-emerald-950/30 border border-emerald-800/40 rounded-lg px-3 py-2">
              <Trophy className="h-3.5 w-3.5 text-emerald-400" />
              <div>
                <p className="text-[10px] text-slate-500">100% Days</p>
                <p className="text-sm font-bold text-emerald-400">{perfect}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-red-950/30 border border-red-800/40 rounded-lg px-3 py-2">
              <Target className="h-3.5 w-3.5 text-red-400" />
              <div>
                <p className="text-[10px] text-slate-500">Lazy Days</p>
                <p className="text-sm font-bold text-red-400">{lazy}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#2a2d3e]">
        <CardContent className="p-5">
          <p className="text-sm font-semibold text-slate-200 mb-1 flex items-center gap-2">
            <Target className="h-4 w-4 text-indigo-400" /> Habit Consistency
          </p>
          <p className="text-xs text-slate-500 mb-4">Completion % for past days this month</p>
          {habitStats.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">No habits tracked yet.</p>
          ) : (
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
              {habitStats.map((h) => (
                <div key={h.id} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center text-base shrink-0" style={{ backgroundColor: h.color + '22' }}>
                    {h.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {h.type === 'bad' && <span className="text-[8px] font-bold bg-red-900/50 text-red-400 border border-red-800/50 px-1 rounded uppercase shrink-0">avoid</span>}
                        {h.type === 'count' && <Hash className="h-3 w-3 text-indigo-400 shrink-0" />}
                        <span className="text-xs text-slate-300 font-medium truncate">{h.name}</span>
                      </div>
                      <span className={cn('text-xs font-bold ml-2 shrink-0', h.pct >= 80 ? 'text-emerald-400' : h.pct >= 50 ? 'text-amber-400' : 'text-red-400')}>{h.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-[#2a2d3e] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${h.pct}%`, backgroundColor: h.color }} />
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-slate-500">{h.done} days</span>
                      {h.type === 'count' && <span className="text-[10px] text-indigo-400">limit: {h.target_count ?? 3}/day</span>}
                      {h.streak >= 3 && <span className="text-[10px] text-orange-400">🔥 {h.streak} streak</span>}
                      {h.longest > 0 && <span className="text-[10px] text-slate-600">Best: {h.longest}d</span>}
                    </div>
                  </div>
                  <CircleRing pct={h.pct} color={h.color} size={36} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Habit List ───────────────────────────────────────────────────────────────

function HabitList({ habits, onEdit, onDelete, onToggleActive }: {
  habits: Habit[];
  onEdit: (h: Habit) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
}) {
  if (habits.length === 0) return null;
  return (
    <Card className="border-[#2a2d3e]">
      <CardContent className="p-5">
        <p className="text-sm font-semibold text-slate-200 mb-4">Manage Habits</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {habits.map((h) => (
            <div key={h.id} className={cn(
              'flex items-center gap-3 rounded-xl border px-3 py-2.5',
              h.active
                ? h.type === 'bad' ? 'border-red-900/40 bg-[#0f1117]'
                : h.type === 'count' ? 'border-indigo-900/40 bg-[#0f1117]'
                : 'border-[#2a2d3e] bg-[#0f1117]'
                : 'border-[#1a1d2e] bg-[#1a1d2e]/50 opacity-60'
            )}>
              <div className="h-8 w-8 rounded-lg flex items-center justify-center text-base shrink-0" style={{ backgroundColor: h.color + '22' }}>
                {h.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {h.type === 'bad' && <span className="text-[8px] font-bold bg-red-900/50 text-red-400 border border-red-800/50 px-1 rounded uppercase shrink-0">avoid</span>}
                  {h.type === 'count' && <span className="text-[8px] font-bold bg-indigo-900/50 text-indigo-400 border border-indigo-800/50 px-1 rounded uppercase shrink-0">≤{h.target_count ?? 3}/day</span>}
                  <p className="text-xs font-medium text-slate-200 truncate">{h.name}</p>
                </div>
                <p className="text-[10px] text-slate-500">{h.category}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => onToggleActive(h.id, !h.active)}
                  className={cn('h-5 w-9 rounded-full transition-colors relative shrink-0', h.active ? 'bg-emerald-600' : 'bg-[#2a2d3e]')}>
                  <span
                    className="absolute top-[2px] h-4 w-4 rounded-full bg-white transition-all duration-200"
                    style={{ left: h.active ? '18px' : '2px' }}
                  />
                </button>
                <Button variant="ghost" size="icon" onClick={() => onEdit(h)} className="h-7 w-7 text-slate-500 hover:text-indigo-400">
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(h.id)} className="h-7 w-7 text-slate-500 hover:text-red-400">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Achievements ─────────────────────────────────────────────────────────────

const BADGES = [
  { id: '3d',    label: '3-Day Streak',  icon: '🔥', desc: 'Any habit 3 days in a row',  check: (s: number) => s >= 3 },
  { id: '7d',    label: 'One Week',       icon: '⚡', desc: '7-day streak on any habit',  check: (s: number) => s >= 7 },
  { id: '30d',   label: 'Monthly Master', icon: '🏆', desc: '30-day streak on any habit', check: (s: number) => s >= 30 },
  { id: '500xp', label: '500 XP',         icon: '💎', desc: 'Earn 500 XP total',          check: (_s: number, xp: number) => xp >= 500 },
  { id: '1kxp',  label: '1000 XP',        icon: '👑', desc: 'Earn 1000 XP total',         check: (_s: number, xp: number) => xp >= 1000 },
];

function Achievements({ habits, logs }: { habits: Habit[]; logs: { habit_id: string; date: string; count?: number }[] }) {
  const xp = computeXP(habits, logs);
  const maxStreak = Math.max(0, ...habits.map((h) => getStreak(h, logs)));
  return (
    <Card className="border-[#2a2d3e]">
      <CardContent className="p-5">
        <p className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-400" /> Achievements
        </p>
        <div className="flex gap-3 flex-wrap">
          {BADGES.map((b) => {
            const unlocked = b.check(maxStreak, xp);
            return (
              <div key={b.id} title={b.desc} className={cn(
                'flex flex-col items-center gap-1 rounded-xl border px-4 py-3 min-w-[80px] transition-all',
                unlocked ? 'border-amber-700/50 bg-amber-950/20' : 'border-[#2a2d3e] bg-[#0f1117] opacity-40 grayscale'
              )}>
                <span className="text-2xl">{b.icon}</span>
                <span className="text-[10px] text-slate-300 text-center leading-tight">{b.label}</span>
                {unlocked && <span className="text-[9px] text-amber-400">Unlocked</span>}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function HabitTrackerPage() {
  const { habits, logs, hydrated, hydrate, addHabit, updateHabit, deleteHabit, toggleLog, setCount } = useHabitStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Habit | null>(null);

  const today = useMemo(() => todayIST(), []);
  const [viewYear, setViewYear] = useState(() => parseInt(today.split('-')[0]));
  const [viewMonth, setViewMonth] = useState(() => parseInt(today.split('-')[1]) - 1);
  const [viewDate, setViewDate] = useState(today);

  useEffect(() => { hydrate(); }, [hydrate]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };
  const prevDay = () => setViewDate((d) => shiftDate(d, -1));
  const nextDay = () => setViewDate((d) => { const n = shiftDate(d, 1); return n <= today ? n : d; });

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const activeHabits = habits.filter((h) => h.active);
  const todayDone = activeHabits.filter((h) => isDoneOnDate(h, today, logs)).length;
  const todayPct = activeHabits.length ? Math.round((todayDone / activeHabits.length) * 100) : 0;
  const bestStreak = Math.max(0, ...habits.map((h) => getStreak(h, logs)));
  const bestHabit = habits.find((h) => getStreak(h, logs) === bestStreak && bestStreak > 0);
  const xp = computeXP(habits, logs);

  const handleSubmit = (data: Omit<Habit, 'id'>) => {
    if (editTarget) updateHabit(editTarget.id, data);
    else addHabit(data);
    setModalOpen(false);
    setEditTarget(null);
  };

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Flame className="h-6 w-6 text-orange-400" /> Habit Tracker
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Build consistency, one day at a time</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg px-1 py-1">
            <Button type="button" variant="ghost" size="icon" onClick={prevMonth} className="h-7 w-7 text-slate-400 hover:text-slate-200">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold text-slate-200 px-3 min-w-[140px] text-center">{monthLabel}</span>
            <Button type="button" variant="ghost" size="icon" onClick={nextMonth} className="h-7 w-7 text-slate-400 hover:text-slate-200">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => { setEditTarget(null); setModalOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Add Habit
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-[#2a2d3e]">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-900/40 flex items-center justify-center shrink-0">
              <Target className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide">Today</p>
              <p className={cn('text-xl font-bold', todayPct === 100 ? 'text-emerald-400' : todayPct >= 50 ? 'text-indigo-400' : 'text-slate-200')}>{todayPct}%</p>
              <p className="text-[10px] text-slate-500">{todayDone}/{activeHabits.length} done</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#2a2d3e]">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-900/40 flex items-center justify-center shrink-0">
              <Flame className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide">Best Streak</p>
              <p className="text-xl font-bold text-orange-400">🔥 {bestStreak}d</p>
              <p className="text-[10px] text-slate-500 truncate max-w-[100px]">{bestHabit?.name ?? '—'}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#2a2d3e]">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-900/40 flex items-center justify-center shrink-0">
              <Zap className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide">Total XP</p>
              <p className="text-xl font-bold text-purple-400">{xp.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500">⚡ experience</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#2a2d3e]">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-teal-900/40 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-teal-400" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide">Active</p>
              <p className="text-xl font-bold text-teal-400">{activeHabits.length}</p>
              <p className="text-[10px] text-slate-500">habits tracked</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today / date panel */}
      <TodayPanel
        habits={habits} logs={logs}
        viewDate={viewDate} today={today}
        onPrev={prevDay} onNext={nextDay}
        onToggle={toggleLog}
        onEdit={(h) => { setEditTarget(h); setModalOpen(true); }}
        onSetCount={setCount}
      />

      {/* Monthly grid */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Monthly View</h2>
          <div className="flex items-center gap-1 bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg px-1 py-0.5">
            <button type="button" onClick={prevMonth} className="p-0.5 rounded hover:bg-[#2a2d3e] text-slate-400 hover:text-slate-100 transition-colors">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs font-semibold text-slate-200 px-2 min-w-[110px] text-center">{monthLabel}</span>
            <button type="button" onClick={nextMonth} className="p-0.5 rounded hover:bg-[#2a2d3e] text-slate-400 hover:text-slate-100 transition-colors">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <MonthlyGrid
          habits={habits} logs={logs}
          year={viewYear} month={viewMonth}
          today={today}
          onToggle={toggleLog}
          onSetCount={setCount}
        />
      </div>

      <AnalyticsSection habits={habits} logs={logs} year={viewYear} month={viewMonth} />
      <Achievements habits={habits} logs={logs} />
      <HabitList
        habits={habits}
        onEdit={(h) => { setEditTarget(h); setModalOpen(true); }}
        onDelete={deleteHabit}
        onToggleActive={(id, active) => updateHabit(id, { active })}
      />

      <HabitModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null); }}
        onSubmit={handleSubmit}
        initial={editTarget}
      />
    </div>
  );
}
