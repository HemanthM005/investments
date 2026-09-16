'use client';

import { useEffect, useState } from 'react';
import { Users, ShieldCheck, Trash2, Database, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/ConfirmDialog';

interface Row {
  name: string;
  source: 'env' | 'registered';
  created_at: string | null;
  owner: boolean;
  paths: string[];
  hasData: boolean;
}

export default function UsersPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);
  const [alsoDeleteData, setAlsoDeleteData] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch('/api/admin/users');
    const json = await res.json();
    if (!json.ok) { setError(json.error ?? 'Could not load users'); setRows([]); return; }
    setRows(json.users);
  }
  useEffect(() => { load(); }, []);

  async function remove(row: Row) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users?name=${encodeURIComponent(row.name)}&withData=${alsoDeleteData}`, { method: 'DELETE' });
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
        <Card><CardContent className="p-6 text-center text-sm text-slate-400">{error}</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-100 sm:text-2xl">
          <Users className="h-5 w-5 text-indigo-400" /> Users
        </h1>
        <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
          Everyone with an account. Each person&apos;s data is stored separately.
        </p>
      </div>

      {rows === null ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.name}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold capitalize text-slate-100">{r.name}</span>
                    {r.owner && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-950/50 px-2 py-0.5 text-[10px] font-medium text-indigo-300">
                        <ShieldCheck className="h-3 w-3" /> owner
                      </span>
                    )}
                    <span className="rounded-full bg-[#0f1117] px-2 py-0.5 text-[10px] text-slate-500">
                      {r.source === 'env' ? 'from APP_USERS' : 'registered'}
                    </span>
                    {r.hasData ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/40 px-2 py-0.5 text-[10px] text-emerald-300">
                        <Database className="h-3 w-3" /> has data
                      </span>
                    ) : (
                      <span className="rounded-full bg-[#0f1117] px-2 py-0.5 text-[10px] text-slate-600">empty</span>
                    )}
                  </div>
                  <p className="mt-1 truncate font-mono text-[11px] text-slate-500">{r.paths[0]}</p>
                  {r.created_at && (
                    <p className="text-[11px] text-slate-600">joined {new Date(r.created_at).toLocaleDateString()}</p>
                  )}
                </div>

                {r.source === 'registered' && (
                  <Button variant="outline" size="sm" disabled={busy}
                    onClick={() => { setAlsoDeleteData(false); setPendingDelete(r); }}
                    className="flex-shrink-0 gap-1.5 text-red-400 hover:text-red-300">
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </Button>
                )}
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
            <span>Also delete their data permanently — this cannot be undone</span>
          </label>
        )}
      </ConfirmDialog>
    </div>
  );
}
