'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Shield, ShieldCheck, Users, Database, HardDrive, Trash2, Loader2, Clock, RefreshCw,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/ConfirmDialog';

interface Counts {
  investments: number; expenses: number; money_records: number; accounts: number;
  recurring: number; recurring_investments: number;
  habits: number; habit_logs: number; planner_items: number;
}

interface Row {
  name: string;
  source: 'env' | 'registered';
  owner: boolean;
  created_at: string | null;
  counts: Counts;
  totalRecords: number;
  lastActivity: string | null;
  sizeBytes: number;
  paths: string[];
  hasData: boolean;
}

interface Totals { users: number; withData: number; records: number; sizeBytes: number }

function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function ago(iso: string | null): string {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const COUNT_LABELS: [keyof Counts, string][] = [
  ['investments', 'Investments'],
  ['expenses', 'Expenses'],
  ['money_records', 'Money records'],
  ['accounts', 'Accounts'],
  ['recurring', 'Subscriptions'],
  ['recurring_investments', 'SIPs'],
  ['habits', 'Habits'],
  ['habit_logs', 'Habit logs'],
  ['planner_items', 'Planner items'],
];

export default function AdminPage() {
  const [users, setUsers] = useState<Row[] | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);
  const [alsoDeleteData, setAlsoDeleteData] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/stats');
      const json = await res.json();
      if (!json.ok) {
        setError(res.status === 403 ? 'This page is only for the account owner.' : (json.error ?? 'Could not load'));
        setUsers([]);
        return;
      }
      setUsers(json.users);
      setTotals(json.totals);
      setError('');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function remove(row: Row) {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/users?name=${encodeURIComponent(row.name)}&withData=${alsoDeleteData}`,
        { method: 'DELETE' }
      );
      const json = await res.json();
      if (!json.ok) setError(json.error ?? 'Delete failed');
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
            <Shield className="h-6 w-6 text-slate-600" />
            <p className="text-sm text-slate-400">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-100 sm:text-2xl">
            <Shield className="h-5 w-5 text-indigo-400" /> Admin
          </h1>
          <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
            Every account, what they have stored, and how much space it takes.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={busy} className="gap-1.5 self-start">
          <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Users', value: totals?.users ?? '—', icon: Users },
          { label: 'With data', value: totals?.withData ?? '—', icon: Database },
          { label: 'Total records', value: totals?.records?.toLocaleString() ?? '—', icon: Database },
          { label: 'Storage used', value: totals ? bytes(totals.sizeBytes) : '—', icon: HardDrive },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
                <Icon className="h-3.5 w-3.5 text-slate-600" />
              </div>
              <p className="text-xl font-bold text-slate-100 sm:text-2xl">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {users === null ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <Card key={u.name}>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold capitalize text-slate-100">{u.name}</span>
                      {u.owner && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-950/50 px-2 py-0.5 text-[10px] font-medium text-indigo-300">
                          <ShieldCheck className="h-3 w-3" /> owner
                        </span>
                      )}
                      <span className="rounded-full bg-[#0f1117] px-2 py-0.5 text-[10px] text-slate-500">
                        {u.source === 'env' ? 'from APP_USERS' : 'registered'}
                      </span>
                    </div>
                    <p className="mt-1 truncate font-mono text-[11px] text-slate-500">{u.paths[0]}</p>
                  </div>

                  <div className="flex flex-shrink-0 items-center gap-4 text-right">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">Records</p>
                      <p className="text-sm font-semibold text-slate-200">{u.totalRecords.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">Size</p>
                      <p className="text-sm font-semibold text-slate-200">{bytes(u.sizeBytes)}</p>
                    </div>
                    {u.source === 'registered' && (
                      <Button variant="outline" size="sm" disabled={busy}
                        onClick={() => { setAlsoDeleteData(false); setPendingDelete(u); }}
                        className="gap-1.5 text-red-400 hover:text-red-300">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {u.hasData ? (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-[#2a2d3e] pt-3">
                    {COUNT_LABELS.filter(([k]) => u.counts[k] > 0).map(([k, label]) => (
                      <span key={k} className="text-[11px] text-slate-400">
                        {label} <span className="font-semibold text-slate-200">{u.counts[k]}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="border-t border-[#2a2d3e] pt-3 text-[11px] text-slate-600">
                    No data yet — nothing is written until they save something.
                  </p>
                )}

                <div className="flex flex-wrap gap-4 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> last activity {ago(u.lastActivity)}
                  </span>
                  {u.created_at && <span>joined {new Date(u.created_at).toLocaleDateString()}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title={`Remove ${pendingDelete?.name}?`}
        description="They will no longer be able to sign in. Their data is kept unless you tick the box."
        confirmLabel="Remove"
        onConfirm={() => pendingDelete && remove(pendingDelete)}
      >
        {pendingDelete?.hasData && (
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[#2a2d3e] bg-[#0f1117] p-3 text-sm text-slate-300">
            <input type="checkbox" checked={alsoDeleteData}
              onChange={(e) => setAlsoDeleteData(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-red-500" />
            <span>
              Also delete all {pendingDelete.totalRecords.toLocaleString()} of their records
              ({bytes(pendingDelete.sizeBytes)}) — this cannot be undone
            </span>
          </label>
        )}
      </ConfirmDialog>
    </div>
  );
}
