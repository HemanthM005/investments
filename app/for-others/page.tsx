'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Heart, ChevronDown, ExternalLink } from 'lucide-react';
import { useExpenseStore } from '@/lib/expenseStore';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ForOthersPage() {
  const expenses = useExpenseStore((s) => s.expenses);

  const spentForExpenses = useMemo(
    () => expenses.filter((e) => !!e.spent_for).sort((a, b) => b.date.localeCompare(a.date)),
    [expenses],
  );

  const [filterPerson, setFilterPerson] = useState('All');

  const people = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    spentForExpenses.forEach((e) => {
      const p = e.spent_for!;
      if (!map[p]) map[p] = { total: 0, count: 0 };
      map[p].total += e.amount;
      map[p].count += 1;
    });
    return Object.entries(map)
      .map(([person, { total, count }]) => ({ person, total, count }))
      .sort((a, b) => b.total - a.total);
  }, [spentForExpenses]);

  const totalAllTime = useMemo(() => spentForExpenses.reduce((s, e) => s + e.amount, 0), [spentForExpenses]);
  const thisYear = new Date().getFullYear().toString();
  const totalThisYear = useMemo(
    () => spentForExpenses.filter((e) => e.date.startsWith(thisYear)).reduce((s, e) => s + e.amount, 0),
    [spentForExpenses, thisYear],
  );

  const filtered = useMemo(() =>
    spentForExpenses.filter((e) => filterPerson === 'All' || e.spent_for === filterPerson),
    [spentForExpenses, filterPerson],
  );

  const groupedByPerson = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    filtered.forEach((e) => {
      const p = e.spent_for!;
      if (!map.has(p)) map.set(p, []);
      map.get(p)!.push(e);
    });
    return [...map.entries()].sort((a, b) => {
      const tA = a[1].reduce((s, e) => s + e.amount, 0);
      const tB = b[1].reduce((s, e) => s + e.amount, 0);
      return tB - tA;
    });
  }, [filtered]);

  function formatDay(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Heart className="h-6 w-6 text-rose-400" />
            Spent for Others
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Expenses tagged for family &amp; people close to you ·{' '}
            <Link href="/expenses" className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1">
              add from Daily Expenses <ExternalLink className="h-3 w-3" />
            </Link>
          </p>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">All Time</p>
            <p className="text-2xl font-bold text-rose-300">{formatCurrency(totalAllTime)}</p>
            <p className="text-xs text-slate-500 mt-1">
              {spentForExpenses.length} expense{spentForExpenses.length !== 1 ? 's' : ''} · {people.length} people
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">This Year</p>
            <p className="text-2xl font-bold text-slate-100">{formatCurrency(totalThisYear)}</p>
            <p className="text-xs text-slate-500 mt-1">{thisYear}</p>
          </CardContent>
        </Card>
        {people[0] && (
          <Card className="border-rose-800/30">
            <CardContent className="p-5">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Most Spent On</p>
              <p className="text-lg font-bold text-rose-300">{people[0].person}</p>
              <p className="text-xs text-slate-500 mt-1">
                {formatCurrency(people[0].total)} · {people[0].count} time{people[0].count !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Per-person breakdown table */}
      {people.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Per Person</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2d3e] text-xs text-slate-500">
                  <th className="text-left px-4 py-2 font-medium">Person</th>
                  <th className="text-right px-4 py-2 font-medium">Total Spent</th>
                  <th className="text-right px-4 py-2 font-medium">Times</th>
                  <th className="text-right px-4 py-2 font-medium">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2d3e]">
                {people.map(({ person, total, count }) => {
                  const pct = totalAllTime > 0 ? (total / totalAllTime) * 100 : 0;
                  return (
                    <tr key={person} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => setFilterPerson(filterPerson === person ? 'All' : person)}
                          className="flex items-center gap-2 text-slate-300 hover:text-rose-300 transition-colors"
                        >
                          <span>❤️</span>
                          <span className="font-medium">{person}</span>
                          {filterPerson === person && (
                            <span className="text-xs text-indigo-400">(filtered)</span>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-rose-300">{formatCurrency(total)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-500">{count}</td>
                      <td className="px-4 py-2.5 text-right text-slate-500">{pct.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Filter bar */}
      {people.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={filterPerson}
              onChange={(e) => setFilterPerson(e.target.value)}
              className="appearance-none bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg px-3 py-1.5 pr-7 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="All">All People</option>
              {people.map(({ person }) => <option key={person} value={person}>{person}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2 h-4 w-4 text-slate-500" />
          </div>
          <span className="text-xs text-slate-500 ml-auto">
            {filtered.length} entr{filtered.length !== 1 ? 'ies' : 'y'}
          </span>
        </div>
      )}

      {/* Expense list grouped by person */}
      {spentForExpenses.length === 0 ? (
        <Card className="border-dashed border-[#2a2d3e]">
          <CardContent className="p-12 text-center">
            <Heart className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500">Nothing here yet.</p>
            <p className="text-xs text-slate-600 mt-1">
              When adding a daily expense, fill in the &ldquo;For someone&rdquo; field — it will appear here.
            </p>
            <Link href="/expenses">
              <Button variant="outline" size="sm" className="mt-4">Go to Daily Expenses</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedByPerson.map(([person, personExpenses]) => {
            const personTotal = personExpenses.reduce((s, e) => s + e.amount, 0);
            return (
              <div key={person}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-rose-300 flex items-center gap-1.5">
                    ❤️ {person}
                  </span>
                  <span className="text-sm font-bold text-slate-100">{formatCurrency(personTotal)}</span>
                </div>
                <Card>
                  <CardContent className="p-0 divide-y divide-[#2a2d3e]">
                    {personExpenses.map((exp) => (
                      <div key={exp.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] group">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-200 truncate">{exp.description}</p>
                          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                            <span>{formatDay(exp.date)}</span>
                            <span className="text-slate-700">·</span>
                            <span className="text-slate-400">{exp.category}</span>
                            {exp.payment_source_name && (
                              <>
                                <span className="text-slate-700">·</span>
                                <span className="text-indigo-400">{exp.payment_source_name}</span>
                              </>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-rose-300">{formatCurrency(exp.amount)}</span>
                          <Link
                            href="/expenses"
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-indigo-900/40 text-slate-500 hover:text-indigo-400"
                            title="Edit in Daily Expenses"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
