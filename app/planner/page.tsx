'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Plus, Pencil, Trash2, ChevronLeft, ChevronRight,
  CalendarCheck, Zap, Sparkles, Check, Activity,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell,
} from 'recharts';
import {
  usePlannerStore, isPlannerDoneOnDate, getPlannerStreak,
  getPlannerLongestStreak, computePlannerXP, isItemApplicable, isWeekend,
} from '@/lib/plannerStore';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PlannerItem, PlannerCategory, PlannerDayType } from '@/lib/types';

// ── Constants ─────────────────────────────────────────────────────────────────

const PALETTE = [
  '#6366f1', '#10b981', '#f59e0b', '#f43f5e',
  '#3b82f6', '#a855f7', '#f97316', '#14b8a6',
  '#64748b', '#8b5cf6',
];

const CATEGORIES: PlannerCategory[] = [
  'Morning Routine', 'Study', 'Work', 'Exercise', 'Meals', 'Leisure', 'Sleep', 'Other',
];

const CATEGORY_COLORS: Record<PlannerCategory, string> = {
  'Morning Routine': '#f59e0b',
  Study: '#6366f1',
  Work: '#3b82f6',
  Exercise: '#10b981',
  Meals: '#f97316',
  Leisure: '#8b5cf6',
  Sleep: '#64748b',
  Other: '#94a3b8',
};

const DAY_TYPES: { value: PlannerDayType; label: string }[] = [
  { value: 'weekday', label: 'Weekdays only (Mon–Fri)' },
  { value: 'weekend', label: 'Weekends only (Sat–Sun)' },
  { value: 'all', label: 'Every day' },
];

const EMOJIS = [
  '🌅', '📚', '💼', '🍽️', '😌', '🏸', '🌙', '☕', '🎮', '🚶',
  '💪', '🧘', '🎯', '🔥', '⚡', '🥗', '😴', '🎵', '✅', '🧠',
  '🏃', '📱', '🌿', '🛁', '🍳', '💊', '✍️', '📖', '🖥️', '🎨',
];

// ── Utilities ─────────────────────────────────────────────────────────────────

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

function formatTime(t: string): string {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${m} ${ampm}`;
}

// ── Circle progress ring ──────────────────────────────────────────────────────

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

// ── Planner Item Modal ────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: '',
  emoji: '🌅',
  start_time: '08:00',
  end_time: '09:00',
  day_type: 'weekday' as PlannerDayType,
  category: 'Morning Routine' as PlannerCategory,
  color: PALETTE[0],
  active: true,
  created_at: todayIST(),
};

function PlannerModal({ open, onClose, onSubmit, initial }: {
  open: boolean;
  onClose: () => void;
  onSubmit: (item: Omit<PlannerItem, 'id'>) => void;
  initial?: PlannerItem | null;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setForm(initial
        ? {
            name: initial.name,
            emoji: initial.emoji,
            start_time: initial.start_time,
            end_time: initial.end_time,
            day_type: initial.day_type,
            category: initial.category,
            color: initial.color,
            active: initial.active,
            created_at: initial.created_at,
          }
        : { ...EMPTY_FORM, created_at: todayIST() }
      );
      setErrors({});
    }
  }, [open, initial]);

  const setField = <K extends keyof typeof form>(k: K, v: typeof form[K]) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (k === 'name') setErrors((p) => ({ ...p, name: '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setErrors({ name: 'Name is required' }); return; }
    if (!form.start_time) { setErrors({ start_time: 'Start time is required' }); return; }
    if (!form.end_time) { setErrors({ end_time: 'End time is required' }); return; }
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Activity' : 'Add Activity'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="space-y-1.5">
            <Label>Activity Name *</Label>
            <Input
              placeholder="e.g. Morning Run"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
            />
            {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Start Time *</Label>
              <Input
                type="time"
                value={form.start_time}
                onChange={(e) => setField('start_time', e.target.value)}
              />
              {errors.start_time && <p className="text-xs text-red-400">{errors.start_time}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>End Time *</Label>
              <Input
                type="time"
                value={form.end_time}
                onChange={(e) => setField('end_time', e.target.value)}
              />
              {errors.end_time && <p className="text-xs text-red-400">{errors.end_time}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Day Type</Label>
            <Select value={form.day_type} onValueChange={(v) => setField('day_type', v as PlannerDayType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAY_TYPES.map((dt) => (
                  <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => {
              setField('category', v as PlannerCategory);
              setField('color', CATEGORY_COLORS[v as PlannerCategory]);
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Emoji</Label>
            <div className="grid grid-cols-10 gap-1">
              {EMOJIS.map((e) => (
                <button key={e} type="button" onClick={() => setField('emoji', e)}
                  className={cn(
                    'text-base rounded-md py-1 transition-colors',
                    form.emoji === e ? 'bg-indigo-600' : 'bg-[#2a2d3e] hover:bg-[#3a3d4e]'
                  )}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {PALETTE.map((c) => (
                <button key={c} type="button" onClick={() => setField('color', c)}
                  className={cn(
                    'h-7 w-7 rounded-full border-2 transition-transform',
                    form.color === c ? 'scale-125 border-white' : 'border-transparent hover:scale-110'
                  )}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" style={{ backgroundColor: form.color }}>
              {initial ? 'Save Changes' : 'Add Activity'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Daily Panel ───────────────────────────────────────────────────────────────

function DailyPanel({ items, logs, viewDate, today, onPrev, onNext, onToggle, onEdit, onDelete }: {
  items: PlannerItem[];
  logs: { item_id: string; date: string }[];
  viewDate: string;
  today: string;
  onPrev: () => void;
  onNext: () => void;
  onToggle: (item_id: string, date: string) => void;
  onEdit: (item: PlannerItem) => void;
  onDelete: (id: string) => void;
}) {
  const isToday = viewDate === today;
  const isFuture = viewDate > today;
  const weekend = isWeekend(viewDate);
  const dayTypeLabel = weekend ? 'Weekend' : 'Weekday';

  const activeItems = items
    .filter((item) => item.active && isItemApplicable(item, viewDate))
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const doneItems = activeItems.filter((item) => isPlannerDoneOnDate(item, viewDate, logs));
  const pct = activeItems.length ? Math.round((doneItems.length / activeItems.length) * 100) : 0;
  const allDone = activeItems.length > 0 && doneItems.length === activeItems.length;

  const dateLabel = new Date(viewDate + 'T12:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const rel = relativeLabel(viewDate, today);

  return (
    <Card className={cn('border-[#2a2d3e] transition-colors', allDone && !isFuture && 'border-emerald-600/50 bg-emerald-950/10')}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onPrev} className="h-7 w-7 text-slate-400 hover:text-slate-200">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-base font-semibold text-slate-100">{dateLabel}</p>
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium',
                  isToday
                    ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-700/50'
                    : isFuture
                      ? 'bg-amber-900/30 text-amber-400 border border-amber-700/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700/40'
                )}>{rel}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/40">
                  {dayTypeLabel}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isFuture ? 'Future — cannot log yet' : `${doneItems.length}/${activeItems.length} activities done`}
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
                <Sparkles className="h-3 w-3" /> Perfect day!
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
          <p className="text-sm text-slate-500 py-4 text-center">You can&apos;t log activities for future dates.</p>
        ) : activeItems.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">No activities scheduled for this day type.</p>
        ) : (
          <div className="space-y-2">
            {activeItems.map((item) => {
              const done = isPlannerDoneOnDate(item, viewDate, logs);
              return (
                <div key={item.id}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl px-4 py-3 border transition-all',
                    done
                      ? 'border-emerald-700/40 bg-emerald-950/15'
                      : 'border-[#2a2d3e] bg-[#1a1d2e] hover:border-[#3a3d4e]'
                  )}>
                  {/* Time slot */}
                  <div className="shrink-0 text-center">
                    <span className="text-xs font-mono px-2 py-1 rounded bg-[#0f1117] text-slate-400 border border-[#2a2d3e] whitespace-nowrap">
                      {formatTime(item.start_time)}–{formatTime(item.end_time)}
                    </span>
                  </div>

                  {/* Color dot + emoji + icon */}
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center text-lg shrink-0"
                    style={{ backgroundColor: item.color + '33' }}
                  >
                    {item.emoji}
                  </div>

                  {/* Name + category */}
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium', done ? 'text-emerald-300 line-through' : 'text-slate-200')}>
                      {item.name}
                    </p>
                    <span className="text-xs px-1.5 py-0.5 rounded text-slate-400" style={{ backgroundColor: item.color + '22' }}>
                      {item.category}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-slate-300"
                      onClick={() => onEdit(item)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-red-400"
                      onClick={() => onDelete(item.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Toggle button */}
                  <button
                    onClick={() => onToggle(item.id, viewDate)}
                    className={cn(
                      'h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all shrink-0',
                      done
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-[#3a3d4e] bg-transparent hover:border-emerald-500/60 text-transparent hover:text-emerald-500/60'
                    )}
                    title={done ? 'Mark as not done' : 'Mark as done'}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Monthly Grid ──────────────────────────────────────────────────────────────

function MonthlyGrid({ items, logs, onToggle }: {
  items: PlannerItem[];
  logs: { item_id: string; date: string }[];
  onToggle: (item_id: string, date: string) => void;
}) {
  const today = todayIST();
  const [gridYear, setGridYear] = useState(() => parseInt(today.slice(0, 4)));
  const [gridMonth, setGridMonth] = useState(() => parseInt(today.slice(5, 7)) - 1);

  const numDays = daysInMonth(gridYear, gridMonth);
  const days = Array.from({ length: numDays }, (_, i) => i + 1);
  const activeItems = items.filter((h) => h.active);
  const monthStr = new Date(gridYear, gridMonth, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const ds = (d: number) => `${gridYear}-${String(gridMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const todayYear = parseInt(today.slice(0, 4));
  const todayMon = parseInt(today.slice(5, 7)) - 1;
  const isCurrentMonth = gridYear === todayYear && gridMonth === todayMon;

  const prevMonth = () => {
    if (gridMonth === 0) { setGridYear((y) => y - 1); setGridMonth(11); }
    else setGridMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (isCurrentMonth) return;
    if (gridMonth === 11) { setGridYear((y) => y + 1); setGridMonth(0); }
    else setGridMonth((m) => m + 1);
  };

  const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <Card className="border-[#2a2d3e]">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-slate-100">Monthly Grid</h2>
          <div className="flex items-center gap-1 bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-1 py-0.5">
            <button type="button" onClick={prevMonth} className="p-1 rounded hover:bg-[#2a2d3e] text-slate-400 hover:text-slate-100 transition-colors">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs font-semibold text-slate-200 px-2 min-w-[120px] text-center">{monthStr}</span>
            <button type="button" onClick={nextMonth} disabled={isCurrentMonth}
              className={cn('p-1 rounded transition-colors', isCurrentMonth ? 'text-slate-700 cursor-not-allowed' : 'hover:bg-[#2a2d3e] text-slate-400 hover:text-slate-100')}>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="border-collapse" style={{ minWidth: `${numDays * 26 + 260}px` }}>
            <thead>
              <tr>
                <th className="text-left pb-2 pr-4 font-normal text-slate-500 text-[11px] w-56">Activity</th>
                {days.map((d) => {
                  const dateStr = ds(d);
                  const dow = new Date(dateStr + 'T12:00:00').getDay();
                  const isWknd = dow === 0 || dow === 6;
                  const isToday = dateStr === today;
                  return (
                    <th key={d} className="pb-2 px-0.5 font-normal text-center w-6 min-w-[24px]">
                      <div className={cn('text-[9px] leading-none mb-0.5', isWknd ? 'text-indigo-400' : 'text-slate-600')}>{DAY_LABELS[dow]}</div>
                      <div className={cn(
                        'text-[10px] font-bold leading-none',
                        isToday ? 'text-indigo-300' : isWknd ? 'text-slate-500' : 'text-slate-600'
                      )}>{d}</div>
                    </th>
                  );
                })}
                <th className="pb-2 px-2 text-[11px] font-medium text-slate-500 text-center min-w-[40px]">Done</th>
                <th className="pb-2 px-2 text-[11px] font-medium text-slate-500 text-center min-w-[40px]">%</th>
                <th className="pb-2 px-2 text-[11px] font-medium text-slate-500 text-center min-w-[48px]">Streak</th>
              </tr>
            </thead>
            <tbody>
              {activeItems.map((item, ri) => {
                const streak = getPlannerStreak(item, logs);
                let doneCount = 0, applicableCount = 0;

                const cells = days.map((d) => {
                  const dateStr = ds(d);
                  const applicable = isItemApplicable(item, dateStr);
                  const isFuture = dateStr > today;
                  const done = isPlannerDoneOnDate(item, dateStr, logs);
                  const isToday = dateStr === today;
                  const dow = new Date(dateStr + 'T12:00:00').getDay();
                  const isWknd = dow === 0 || dow === 6;

                  if (applicable && !isFuture) { applicableCount++; if (done) doneCount++; }

                  if (!applicable) {
                    return (
                      <td key={d} className={cn('px-0.5 py-0.5', isWknd && 'bg-indigo-950/10')}>
                        <div className="w-5 h-5 mx-auto" />
                      </td>
                    );
                  }

                  return (
                    <td key={d} className={cn('px-0.5 py-0.5', isWknd && 'bg-indigo-950/10')}>
                      <button
                        type="button"
                        disabled={isFuture}
                        onClick={() => !isFuture && onToggle(item.id, dateStr)}
                        title={isFuture ? '' : `${item.name} — ${dateStr}`}
                        className={cn(
                          'w-5 h-5 rounded flex items-center justify-center mx-auto transition-all',
                          isFuture
                            ? 'bg-[#1a1d2e]/30 cursor-not-allowed'
                            : done
                              ? 'hover:opacity-75 cursor-pointer'
                              : isToday
                                ? 'bg-indigo-900/40 border border-indigo-700/50 hover:border-indigo-500 cursor-pointer'
                                : 'bg-[#2a2d3e] hover:bg-[#3a3d4e] cursor-pointer'
                        )}
                        style={done ? { backgroundColor: item.color } : {}}
                      >
                        {done && <Check className="h-2.5 w-2.5 text-white" />}
                      </button>
                    </td>
                  );
                });

                const pct = applicableCount > 0 ? Math.round((doneCount / applicableCount) * 100) : null;

                return (
                  <tr key={item.id} className={cn('group', ri % 2 === 0 ? 'bg-[#0f1117]/30' : '')}>
                    <td className="py-1 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded flex items-center justify-center shrink-0 text-sm"
                          style={{ backgroundColor: item.color + '22' }}>
                          {item.emoji}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] text-slate-300 truncate font-medium leading-tight">{item.name}</p>
                          <p className="text-[9px] text-slate-600 leading-tight">{formatTime(item.start_time)}–{formatTime(item.end_time)}</p>
                        </div>
                      </div>
                    </td>
                    {cells}
                    <td className="px-2 text-center text-[11px] font-bold text-slate-300">{doneCount}</td>
                    <td className="px-2 text-center">
                      <span className={cn(
                        'text-[11px] font-bold',
                        pct === null ? 'text-slate-600'
                        : pct >= 80 ? 'text-emerald-400'
                        : pct >= 50 ? 'text-amber-400'
                        : 'text-red-400'
                      )}>
                        {pct === null ? '–' : `${pct}%`}
                      </span>
                    </td>
                    <td className="px-2 text-center text-[11px]">
                      {streak >= 3
                        ? <span className="font-bold text-amber-400">🔥{streak}</span>
                        : streak > 0
                          ? <span className="text-slate-400">{streak}d</span>
                          : <span className="text-slate-600">–</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Analytics Section ─────────────────────────────────────────────────────────

function AnalyticsSection({ items, logs }: {
  items: PlannerItem[];
  logs: { item_id: string; date: string }[];
}) {
  const today = todayIST();
  const xp = computePlannerXP(items, logs);
  const activeItems = items.filter((i) => i.active);

  // Daily completion trend for current month
  const year = parseInt(today.slice(0, 4));
  const month = parseInt(today.slice(5, 7)) - 1;
  const numDays = daysInMonth(year, month);

  const trendData = useMemo(() => {
    return Array.from({ length: numDays }, (_, i) => {
      const day = i + 1;
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (dateStr > today) return null;
      const applicable = activeItems.filter((item) => isItemApplicable(item, dateStr));
      if (applicable.length === 0) return { day, pct: 0, date: dateStr };
      const done = applicable.filter((item) => isPlannerDoneOnDate(item, dateStr, logs));
      return { day, pct: Math.round((done.length / applicable.length) * 100), date: dateStr };
    }).filter(Boolean) as { day: number; pct: number; date: string }[];
  }, [activeItems, logs, numDays, today, year, month]);

  // Per-item consistency
  const consistencyData = useMemo(() => {
    return activeItems.map((item) => {
      let applicable = 0;
      let done = 0;
      // Count all past applicable days from created_at
      const start = new Date(item.created_at + 'T12:00:00');
      const end = new Date(today + 'T12:00:00');
      for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toLocaleDateString('en-CA');
        if (isItemApplicable(item, dateStr)) {
          applicable++;
          if (isPlannerDoneOnDate(item, dateStr, logs)) done++;
        }
      }
      const pct = applicable > 0 ? Math.round((done / applicable) * 100) : 0;
      return { name: `${item.emoji} ${item.name}`, pct, color: item.color };
    }).sort((a, b) => b.pct - a.pct);
  }, [activeItems, logs, today]);

  // Perfect days this month
  const perfectDays = trendData.filter((d) => d.pct === 100).length;

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="border-[#2a2d3e]">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-900/40 flex items-center justify-center shrink-0">
              <Zap className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total XP</p>
              <p className="text-xl font-bold text-amber-400">{xp.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#2a2d3e]">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-900/40 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Perfect Days</p>
              <p className="text-xl font-bold text-emerald-400">{perfectDays}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#2a2d3e]">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-900/40 flex items-center justify-center shrink-0">
              <Activity className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Activities</p>
              <p className="text-xl font-bold text-indigo-400">{activeItems.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily completion trend */}
      <Card className="border-[#2a2d3e]">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Daily Completion Trend (This Month)</h3>
          {trendData.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No data yet for this month.</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
                <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false}
                  tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 8, fontSize: 12 }}
                  labelFormatter={(v) => `Day ${v}`}
                  formatter={(v) => [`${v}%`, 'Completion']}
                />
                <Line type="monotone" dataKey="pct" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 3 }}
                  activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Per-item consistency */}
      <Card className="border-[#2a2d3e]">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Activity Consistency</h3>
          {logs.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No data yet. Start checking off activities to see your consistency.</p>
          ) : consistencyData.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No activities to show.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, consistencyData.length * 32)}>
              <BarChart data={consistencyData} layout="vertical" margin={{ top: 0, right: 40, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false}
                  axisLine={false} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false}
                  axisLine={false} width={130} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [`${v}%`, 'Consistency']}
                />
                <Bar dataKey="pct" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#94a3b8', fontSize: 11, formatter: (v: number) => `${v}%` }}>
                  {consistencyData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PlannerPage() {
  const { items, logs, hydrated, hydrate, addItem, updateItem, deleteItem, toggleLog } = usePlannerStore();
  const today = todayIST();

  const [viewDate, setViewDate] = useState(today);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<PlannerItem | null>(null);

  useEffect(() => { hydrate(); }, [hydrate]);

  const handlePrev = () => setViewDate((d) => shiftDate(d, -1));
  const handleNext = () => { if (viewDate < today) setViewDate((d) => shiftDate(d, 1)); };

  const handleSubmit = (form: Omit<PlannerItem, 'id'>) => {
    if (editItem) {
      updateItem(editItem.id, form);
    } else {
      addItem(form);
    }
    setModalOpen(false);
    setEditItem(null);
  };

  const handleEdit = (item: PlannerItem) => {
    setEditItem(item);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this activity and all its logs?')) deleteItem(id);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditItem(null);
  };

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-slate-400 text-sm">Loading planner…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-100">
      <div className="mx-auto max-w-[1200px] px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600/30 flex items-center justify-center">
              <CalendarCheck className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Daily Planner</h1>
              <p className="text-sm text-slate-400">Check off your scheduled activities as you complete them</p>
            </div>
          </div>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => { setEditItem(null); setModalOpen(true); }}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Activity
          </Button>
        </div>

        {/* Daily Panel */}
        <DailyPanel
          items={items}
          logs={logs}
          viewDate={viewDate}
          today={today}
          onPrev={handlePrev}
          onNext={handleNext}
          onToggle={toggleLog}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        {/* Monthly Grid */}
        <MonthlyGrid items={items} logs={logs} onToggle={toggleLog} />

        {/* Analytics */}
        <AnalyticsSection items={items} logs={logs} />

      </div>

      {/* Add/Edit Modal */}
      <PlannerModal
        open={modalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        initial={editItem}
      />
    </div>
  );
}
