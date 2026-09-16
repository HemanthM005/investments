import { NextResponse } from 'next/server';
import { USER_HEADER, appUsers, primaryUser } from '@/lib/auth';
import { loadUsers } from '@/lib/userStore';
import { readStore, sizeStore, docPath, USER_DOCS } from '@/lib/storage';

function isOwner(req: Request): boolean {
  const me = req.headers.get(USER_HEADER);
  const owner = primaryUser();
  return Boolean(me && owner && me === owner);
}

interface Counts {
  investments: number; expenses: number; money_records: number; accounts: number;
  recurring: number; recurring_investments: number;
  habits: number; habit_logs: number; planner_items: number;
}

const ZERO: Counts = {
  investments: 0, expenses: 0, money_records: 0, accounts: 0,
  recurring: 0, recurring_investments: 0, habits: 0, habit_logs: 0, planner_items: 0,
};

const len = (v: unknown) => (Array.isArray(v) ? v.length : 0);

async function statsFor(user: string) {
  const [portfolio, tracker, planner] = await Promise.all([
    readStore<Record<string, unknown>>('portfolio.json', {}, user),
    readStore<Record<string, unknown>>('daily-tracker.json', {}, user),
    readStore<Record<string, unknown>>('daily-planner.json', {}, user),
  ]);

  const counts: Counts = {
    ...ZERO,
    investments: len(portfolio.investments),
    expenses: len(portfolio.expenses),
    money_records: len(portfolio.money_records),
    accounts: len(portfolio.accounts),
    recurring: len(portfolio.recurring),
    recurring_investments: len(portfolio.recurring_investments),
    habits: len(tracker.habits),
    habit_logs: len(tracker.habit_logs),
    planner_items: len(planner.items),
  };

  const audit = portfolio.audit_log;
  const lastActivity =
    Array.isArray(audit) && audit.length
      ? ((audit[audit.length - 1] as { ts?: string }).ts ?? null)
      : null;

  const sizes = await Promise.all(USER_DOCS.map((d) => sizeStore(d, user)));
  const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);

  return {
    counts,
    totalRecords,
    lastActivity,
    sizeBytes: sizes.reduce((a, b) => a + b, 0),
    paths: USER_DOCS.map((d) => docPath(d, user)),
    hasData: totalRecords > 0 || sizes.some((s) => s > 0),
  };
}

export async function GET(req: Request) {
  if (!isOwner(req)) {
    return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 403 });
  }

  const env = appUsers();
  const envNames = new Set(env.map((u) => u.name));
  const registered = (await loadUsers()).filter((u) => !envNames.has(u.name));

  const users = await Promise.all([
    ...env.map(async (u) => ({
      name: u.name,
      source: 'env' as const,
      owner: u.name === primaryUser(),
      created_at: null as string | null,
      ...(await statsFor(u.name)),
    })),
    ...registered.map(async (u) => ({
      name: u.name,
      source: 'registered' as const,
      owner: false,
      created_at: u.created_at,
      ...(await statsFor(u.name)),
    })),
  ]);

  const totals = {
    users: users.length,
    withData: users.filter((u) => u.hasData).length,
    records: users.reduce((a, u) => a + u.totalRecords, 0),
    sizeBytes: users.reduce((a, u) => a + u.sizeBytes, 0),
  };

  return NextResponse.json({ ok: true, users, totals, me: req.headers.get(USER_HEADER) });
}
