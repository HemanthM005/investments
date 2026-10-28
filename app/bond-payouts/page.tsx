'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Coins, CheckCircle2, Undo2, Ban, AlertCircle, CalendarClock } from 'lucide-react';
import { useInvestmentStore } from '@/lib/store';
import { useAppStore } from '@/lib/appStore';
import {
  addMonths, bondPrincipal, bondStatus, creditDuePayouts, isScheduledBond, netAmount, todayStr, undoPayout,
  type ScheduledPayout,
} from '@/lib/bonds';
import { formatCurrency, cn } from '@/lib/utils';
import type { BondPayout, Investment } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Indian financial year (Apr–Mar) containing `today`
function fyStart(today: string): string {
  const [y, m] = today.split('-').map(Number);
  return `${m >= 4 ? y : y - 1}-04-01`;
}

function Amounts({ p }: { p: { interest: number; tds: number; principal: number } }) {
  return (
    <div className="text-right">
      <p className="font-semibold text-emerald-400">{formatCurrency(netAmount(p))}</p>
      <p className="text-[10px] text-slate-500">
        {p.interest > 0 && <>int {formatCurrency(p.interest - p.tds)}</>}
        {p.tds > 0 && <> (TDS {formatCurrency(p.tds)})</>}
        {p.interest > 0 && p.principal > 0 && ' + '}
        {p.principal > 0 && <>principal {formatCurrency(p.principal)}</>}
      </p>
    </div>
  );
}

export default function BondPayoutsPage() {
  const investments = useInvestmentStore((s) => s.investments);
  const autoCredit = useAppStore((s) => s.settings.bondAutoCredit);
  const [banner, setBanner] = useState<string | null>(null);
  const today = todayStr();

  const bonds = useMemo(
    () => investments.filter((i) => i.asset_type === 'Bond' && (!i.status || i.status === 'active')),
    [investments],
  );
  const scheduled = useMemo(() => bonds.filter(isScheduledBond), [bonds]);
  const unscheduledCount = bonds.length - scheduled.length;

  const rows = useMemo(() => scheduled.map((inv) => ({ inv, st: bondStatus(inv, today) })), [scheduled, today]);

  const due = useMemo(
    () => rows.flatMap(({ inv, st }) => st.due.map((p) => ({ inv, p })))
      .sort((a, b) => a.p.date.localeCompare(b.p.date)),
    [rows],
  );

  const horizon = addMonths(today, 12);
  const upcoming = useMemo(
    () => rows.flatMap(({ inv, st }) => st.upcoming.filter((p) => p.date <= horizon).map((p) => ({ inv, p })))
      .sort((a, b) => a.p.date.localeCompare(b.p.date)),
    [rows, horizon],
  );

  const received = useMemo(
    () => rows.flatMap(({ inv, st }) => st.received.map((p) => ({ inv, p })))
      .sort((a, b) => b.p.date.localeCompare(a.p.date)),
    [rows],
  );

  const stats = useMemo(() => {
    const fy = fyStart(today);
    const credited = received.filter(({ p }) => !p.skipped);
    return {
      interestFY: credited.filter(({ p }) => p.date >= fy).reduce((s, { p }) => s + p.interest - p.tds, 0),
      interestAll: credited.reduce((s, { p }) => s + p.interest - p.tds, 0),
      expected12m: upcoming.reduce((s, { p }) => s + netAmount(p), 0),
      outstanding: rows.reduce((s, { st }) => s + st.outstanding, 0),
    };
  }, [received, upcoming, rows, today]);

  function credit(inv?: Investment, p?: ScheduledPayout) {
    const res = creditDuePayouts({ investmentId: inv?.id, date: p?.date });
    if (res.count > 0) setBanner(`Recorded ${res.count} payout${res.count > 1 ? 's' : ''} · ${formatCurrency(res.total)} credited`);
  }

  function skip(inv: Investment, p: ScheduledPayout) {
    if (!confirm(`Mark the ${fmtDate(p.date)} payout of ${inv.asset_name} as not received? No money will be credited.`)) return;
    creditDuePayouts({ investmentId: inv.id, date: p.date, skip: true });
  }

  function undo(inv: Investment, p: BondPayout) {
    const msg = p.tx_id
      ? `Undo this payout? The ${formatCurrency(netAmount(p))} credit to ${p.account_name} will be removed and it becomes due again.`
      : 'Undo this payout? It becomes due again.';
    if (confirm(msg)) undoPayout(inv.id, p.date);
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Coins className="h-6 w-6 text-indigo-400" /> Bond Payouts
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Interest and principal from your bonds, credited to the linked bank account on each payout date
            {autoCredit ? ' (auto-credit on)' : ' (auto-credit off — confirm below)'}
          </p>
        </div>
        {due.length > 0 && (
          <Button onClick={() => credit()} className="gap-1.5">
            <CheckCircle2 className="h-4 w-4" /> Credit all due ({due.length})
          </Button>
        )}
      </div>

      {banner && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-800/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-300">
          <CheckCircle2 className="h-4 w-4" /> {banner}
          <button onClick={() => setBanner(null)} className="ml-auto text-xs text-emerald-500 hover:text-emerald-300">Dismiss</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Interest this FY</p>
            <p className="text-2xl font-bold text-emerald-400">{formatCurrency(stats.interestFY)}</p>
            <p className="text-xs text-slate-500 mt-1">since {fmtDate(fyStart(today))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Interest received</p>
            <p className="text-2xl font-bold text-slate-100">{formatCurrency(stats.interestAll)}</p>
            <p className="text-xs text-slate-500 mt-1">all time, after TDS</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Next 12 months</p>
            <p className="text-2xl font-bold text-slate-100">{formatCurrency(stats.expected12m)}</p>
            <p className="text-xs text-slate-500 mt-1">{upcoming.length} payouts expected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Principal outstanding</p>
            <p className="text-2xl font-bold text-slate-100">{formatCurrency(stats.outstanding)}</p>
            <p className="text-xs text-slate-500 mt-1">{scheduled.length} bond{scheduled.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
      </div>

      {unscheduledCount > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-800/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-300">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>
            {unscheduledCount} bond{unscheduledCount > 1 ? 's don’t' : ' doesn’t'} have a payout schedule yet.
            Edit {unscheduledCount > 1 ? 'them' : 'it'} on <Link href="/investments" className="underline">My Investments</Link> and
            set &quot;Interest Paid&quot; and the payout account.
          </span>
        </div>
      )}

      {scheduled.length === 0 ? (
        <Card className="border-dashed border-[#2a2d3e]">
          <CardContent className="p-12 text-center">
            <Coins className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 mb-1">No bonds with a payout schedule.</p>
            <p className="text-xs text-slate-600 mb-4">Add a Bond on My Investments with its interest frequency and payout account.</p>
            <Link href="/investments"><Button variant="outline" size="sm">Go to My Investments</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Due */}
          {due.length > 0 && (
            <Card className="border-amber-700/50">
              <CardHeader><CardTitle className="text-sm text-amber-300">Due — not yet credited</CardTitle></CardHeader>
              <CardContent className="p-0 divide-y divide-[#2a2d3e]">
                {due.map(({ inv, p }) => (
                  <div key={inv.id + p.date} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-[160px]">
                      <p className="text-sm font-medium text-slate-100">{inv.asset_name}</p>
                      <p className="text-xs text-slate-500">
                        {fmtDate(p.date)} · {inv.payout_account_name
                          ? <span className="text-indigo-400/80">→ {inv.payout_account_name}</span>
                          : <span className="text-amber-500">no payout account</span>}
                      </p>
                    </div>
                    <Amounts p={p} />
                    <div className="flex gap-1.5">
                      <Button size="sm" className="h-7 text-xs gap-1" onClick={() => credit(inv, p)}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> {inv.payout_account_id ? 'Credit' : 'Mark received'}
                      </Button>
                      <button onClick={() => skip(inv, p)} title="Not received"
                        className="h-7 px-2 rounded-md border border-[#2a2d3e] text-slate-500 hover:text-red-400 transition-colors">
                        <Ban className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Upcoming */}
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><CalendarClock className="h-4 w-4 text-indigo-400" /> Upcoming (12 months)</CardTitle></CardHeader>
              <CardContent className="p-0">
                {upcoming.length === 0 ? (
                  <p className="px-4 pb-4 text-sm text-slate-500">Nothing scheduled in the next 12 months.</p>
                ) : (
                  <div className="divide-y divide-[#2a2d3e] max-h-[420px] overflow-y-auto">
                    {upcoming.map(({ inv, p }) => (
                      <div key={inv.id + p.date} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="w-16 flex-shrink-0 text-xs text-slate-400">{fmtDate(p.date).replace(/ \d{4}$/, '')}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-200 truncate">{inv.asset_name}</p>
                          <p className="text-[10px] text-slate-600 truncate">{inv.payout_account_name || 'no payout account'}</p>
                        </div>
                        <Amounts p={p} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Received */}
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Received</CardTitle></CardHeader>
              <CardContent className="p-0">
                {received.length === 0 ? (
                  <p className="px-4 pb-4 text-sm text-slate-500">No payouts recorded yet.</p>
                ) : (
                  <div className="divide-y divide-[#2a2d3e] max-h-[420px] overflow-y-auto">
                    {received.map(({ inv, p }) => (
                      <div key={inv.id + p.date} className={cn('group flex items-center gap-3 px-4 py-2.5', p.skipped && 'opacity-60')}>
                        <div className="w-16 flex-shrink-0 text-xs text-slate-400">{fmtDate(p.date).replace(/ \d{4}$/, '')}<br /><span className="text-slate-600">{p.date.slice(0, 4)}</span></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-200 truncate">{inv.asset_name}</p>
                          <p className="text-[10px] text-slate-600 truncate">
                            {p.skipped ? 'not received' : p.account_name ? `→ ${p.account_name}` : 'recorded, no account'}
                          </p>
                        </div>
                        {p.skipped ? <span className="text-xs text-red-400">skipped</span> : <Amounts p={p} />}
                        <button onClick={() => undo(inv, p)} title="Undo"
                          className="text-slate-600 hover:text-amber-400 transition-colors lg:opacity-0 lg:group-hover:opacity-100">
                          <Undo2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Per-bond overview */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Bonds</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="text-xs text-slate-500 border-b border-[#2a2d3e]">
                    <th className="px-4 py-2 text-left font-medium">Bond</th>
                    <th className="px-4 py-2 text-left font-medium">Interest / Principal</th>
                    <th className="px-4 py-2 text-right font-medium">Invested</th>
                    <th className="px-4 py-2 text-right font-medium">Outstanding</th>
                    <th className="px-4 py-2 text-right font-medium">Next payout</th>
                    <th className="px-4 py-2 text-right font-medium">Matures</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2d3e]">
                  {rows.map(({ inv, st }) => (
                    <tr key={inv.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5">
                        <p className="text-slate-100 font-medium">{inv.asset_name}</p>
                        <p className="text-[10px] text-teal-400/80">@{inv.interest_rate}% p.a.{(inv.tds_percent ?? 0) > 0 && ` · TDS ${inv.tds_percent}%`}</p>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-400">
                        {inv.interest_frequency} / {inv.principal_frequency ?? 'At Maturity'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-300">{formatCurrency(bondPrincipal(inv))}</td>
                      <td className="px-4 py-2.5 text-right text-slate-300">{formatCurrency(st.outstanding)}</td>
                      <td className="px-4 py-2.5 text-right">
                        {st.next
                          ? <><p className="text-slate-200">{formatCurrency(netAmount(st.next))}</p><p className="text-[10px] text-slate-500">{fmtDate(st.next.date)}</p></>
                          : <span className="text-xs text-slate-500">{st.matured ? 'matured' : '—'}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-slate-400">{inv.maturity_date && fmtDate(inv.maturity_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
