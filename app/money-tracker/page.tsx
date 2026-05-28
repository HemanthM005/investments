'use client';

import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, CheckCircle, Clock, AlertCircle, HandCoins, ChevronDown } from 'lucide-react';
import { useMoneyStore, getOutstandingLent, getOutstandingBorrowed } from '@/lib/moneyStore';
import { useExpenseStore } from '@/lib/expenseStore';
import { useAssetStore } from '@/lib/assetStore';
import { formatCurrency, cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { MoneyRecord, AssetAccount } from '@/lib/types';

// ── helpers ────────────────────────────────────────────────────────────────

const STATUS_ICON = {
  pending: <Clock className="h-3.5 w-3.5 text-amber-400" />,
  partial: <AlertCircle className="h-3.5 w-3.5 text-blue-400" />,
  settled: <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />,
};

const STATUS_COLOR = {
  pending: 'bg-amber-950/40 text-amber-400 border-amber-800/40',
  partial: 'bg-blue-950/40 text-blue-400 border-blue-800/40',
  settled: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40',
};

function isOverdue(record: MoneyRecord) {
  if (!record.due_date || record.status === 'settled') return false;
  return new Date(record.due_date) < new Date();
}

// ── Modal ──────────────────────────────────────────────────────────────────

const EMPTY_FORM: Omit<MoneyRecord, 'id'> = {
  type: 'lent',
  person_name: '',
  amount: 0,
  settled_amount: 0,
  date: new Date().toISOString().split('T')[0],
  due_date: '',
  description: '',
  status: 'pending',
  account_id: '',
};

function MoneyModal({
  open,
  onClose,
  onSubmit,
  initial,
  accounts,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<MoneyRecord, 'id'>) => void;
  initial?: MoneyRecord | null;
  accounts: AssetAccount[];
}) {
  const [form, setForm] = useState<Omit<MoneyRecord, 'id'>>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes
  useState(() => {
    if (initial) {
      const { id: _id, ...rest } = initial;
      setForm(rest);
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const resetForm = () => {
    if (initial) {
      const { id: _id, ...rest } = initial;
      setForm(rest);
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  };

  // run on open change
  useMemo(resetForm, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.person_name.trim()) e.person_name = 'Name is required';
    if (form.amount <= 0) e.amount = 'Amount must be greater than 0';
    if (!form.date) e.date = 'Date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    // Compute status
    const status: MoneyRecord['status'] =
      form.settled_amount >= form.amount
        ? 'settled'
        : form.settled_amount > 0
        ? 'partial'
        : 'pending';
    onSubmit({ ...form, status });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Record' : 'Add Money Record'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => set('type', 'lent')}
              className={cn(
                'py-2.5 rounded-lg text-sm font-semibold border transition-colors',
                form.type === 'lent'
                  ? 'bg-emerald-700 border-emerald-600 text-white'
                  : 'bg-transparent border-[#2a2d3e] text-slate-400 hover:border-emerald-700'
              )}
            >
              💸 I Lent Money
            </button>
            <button
              type="button"
              onClick={() => set('type', 'borrowed')}
              className={cn(
                'py-2.5 rounded-lg text-sm font-semibold border transition-colors',
                form.type === 'borrowed'
                  ? 'bg-red-700 border-red-600 text-white'
                  : 'bg-transparent border-[#2a2d3e] text-slate-400 hover:border-red-700'
              )}
            >
              🤝 I Borrowed
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="person_name">
                {form.type === 'lent' ? 'Lent To' : 'Borrowed From'} *
              </Label>
              <Input
                id="person_name"
                placeholder="Person's name"
                value={form.person_name}
                onChange={(e) => set('person_name', e.target.value)}
              />
              {errors.person_name && <p className="text-xs text-red-400">{errors.person_name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount (₹) *</Label>
              <Input
                id="amount"
                type="number"
                step="1"
                placeholder="0"
                value={form.amount || ''}
                onChange={(e) => set('amount', parseFloat(e.target.value) || 0)}
              />
              {errors.amount && <p className="text-xs text-red-400">{errors.amount}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="settled_amount">Returned So Far (₹)</Label>
              <Input
                id="settled_amount"
                type="number"
                step="1"
                placeholder="0"
                value={form.settled_amount || ''}
                onChange={(e) => set('settled_amount', Math.min(parseFloat(e.target.value) || 0, form.amount))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
              />
              {errors.date && <p className="text-xs text-red-400">{errors.date}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="due_date">Due Date (optional)</Label>
              <Input
                id="due_date"
                type="date"
                value={form.due_date}
                onChange={(e) => set('due_date', e.target.value)}
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>
                {form.type === 'lent' ? 'Paid From Account' : 'Received Into Account'}
                <span className="text-slate-500 text-xs ml-1">(optional)</span>
              </Label>
              <Select
                value={form.account_id || '__none__'}
                onValueChange={(v) => set('account_id', v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No account / cash" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No account / cash</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                      <span className="text-slate-500 text-xs ml-2">{formatCurrency(a.balance)}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="description">Notes</Label>
              <Textarea
                id="description"
                placeholder="What was this for?"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{initial ? 'Save Changes' : 'Add Record'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Quick settle modal (single record) ────────────────────────────────────

function SettleModal({
  record,
  accounts,
  onClose,
  onSettle,
}: {
  record: MoneyRecord;
  accounts: AssetAccount[];
  onClose: () => void;
  onSettle: (amount: number, accountId: string) => void;
}) {
  const outstanding = record.amount - record.settled_amount;
  const [amount, setAmount] = useState(outstanding);
  const [accountId, setAccountId] = useState('__none__');

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment — {record.person_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Outstanding: <span className="text-slate-100 font-semibold">{formatCurrency(outstanding)}</span>
          </p>
          <div className="space-y-1.5">
            <Label>Amount Settled (₹)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Math.min(parseFloat(e.target.value) || 0, outstanding))}
            />
          </div>
          <Button variant="ghost" className="w-full" onClick={() => setAmount(outstanding)}>
            Full Amount
          </Button>
          <div className="space-y-1.5">
            <Label>
              {record.type === 'lent' ? 'Received Into Account' : 'Paid From Account'}
              <span className="text-slate-500 text-xs ml-1">(optional)</span>
            </Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="No account / cash" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No account / cash</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                    <span className="text-slate-500 text-xs ml-2">{formatCurrency(a.balance)}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => { onSettle(amount, accountId === '__none__' ? '' : accountId); onClose(); }}>
              Confirm
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Settle All modal (all records for one person) ──────────────────────────

function PersonSettleModal({
  personName,
  records,
  accounts,
  onClose,
  onSettle,
}: {
  personName: string;
  records: MoneyRecord[];
  accounts: AssetAccount[];
  onClose: () => void;
  onSettle: (accountId: string, amount: number) => void;
}) {
  const unsettled = records.filter((r) => r.status !== 'settled');
  const lentOut   = unsettled.filter((r) => r.type === 'lent')
    .reduce((s, r) => s + (r.amount - r.settled_amount), 0);
  const borrowedOut = unsettled.filter((r) => r.type === 'borrowed')
    .reduce((s, r) => s + (r.amount - r.settled_amount), 0);
  const net = lentOut - borrowedOut;
  const fullNet = Math.abs(net);

  const [accountId, setAccountId] = useState('__none__');
  const [settleAmount, setSettleAmount] = useState(fullNet);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settle All — {personName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Breakdown */}
          <div className="rounded-lg bg-[#0f1117] border border-[#2a2d3e] divide-y divide-[#2a2d3e] text-sm">
            {lentOut > 0 && (
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-slate-400">They owe you</span>
                <span className="text-emerald-400 font-semibold">{formatCurrency(lentOut)}</span>
              </div>
            )}
            {borrowedOut > 0 && (
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-slate-400">You owe them</span>
                <span className="text-red-400 font-semibold">{formatCurrency(borrowedOut)}</span>
              </div>
            )}
            <div className="flex justify-between px-4 py-2.5 font-semibold">
              <span className="text-slate-300">Net to {net >= 0 ? 'receive' : 'pay'}</span>
              <span className={net >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {formatCurrency(fullNet)}
              </span>
            </div>
          </div>

          {/* Partial amount */}
          <div className="space-y-1.5">
            <Label>Amount {net >= 0 ? 'Received' : 'Paid'} (₹)</Label>
            <Input
              type="number"
              value={settleAmount}
              onChange={(e) => setSettleAmount(Math.min(parseFloat(e.target.value) || 0, fullNet))}
            />
            {settleAmount < fullNet && settleAmount > 0 && (
              <p className="text-xs text-amber-400">Partial settlement — records will be updated proportionally.</p>
            )}
          </div>
          <Button variant="ghost" className="w-full -mt-1" onClick={() => setSettleAmount(fullNet)}>
            Full Amount ({formatCurrency(fullNet)})
          </Button>

          {/* Account picker */}
          <div className="space-y-1.5">
            <Label>{net >= 0 ? 'Received Into Account' : 'Paid From Account'}
              <span className="text-slate-500 text-xs ml-1">(optional)</span>
            </Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="No account / cash" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No account / cash</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                    <span className="text-slate-500 text-xs ml-2">{formatCurrency(a.balance)}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              className="bg-emerald-700 hover:bg-emerald-600 text-white"
              onClick={() => { onSettle(accountId === '__none__' ? '' : accountId, settleAmount); onClose(); }}
            >
              <CheckCircle className="h-4 w-4 mr-1.5" /> {settleAmount >= fullNet ? 'Settle All' : 'Settle Partial'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Record Card ────────────────────────────────────────────────────────────

function RecordCard({
  record,
  onEdit,
  onDelete,
  onSettle,
}: {
  record: MoneyRecord;
  onEdit: () => void;
  onDelete: () => void;
  onSettle: () => void;
}) {
  const outstanding = record.amount - record.settled_amount;
  const overdue = isOverdue(record);
  const pct = record.amount > 0 ? (record.settled_amount / record.amount) * 100 : 0;

  return (
    <div
      className={cn(
        'bg-[#1a1d2e] border rounded-xl p-4 flex flex-col gap-3',
        overdue ? 'border-red-700/50' : 'border-[#2a2d3e]',
        record.status === 'settled' && 'opacity-60'
      )}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-100 text-sm">{record.person_name}</span>
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded-full border font-medium flex items-center gap-1',
                STATUS_COLOR[record.status]
              )}
            >
              {STATUS_ICON[record.status]}
              {record.status}
            </span>
            {overdue && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-950/50 text-red-400 border border-red-800/40">
                overdue
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {record.type === 'lent' ? '💸 You lent' : '🤝 You borrowed'} · {record.date}
            {record.due_date && ` · due ${record.due_date}`}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className={cn('text-base font-bold', record.type === 'lent' ? 'text-emerald-400' : 'text-red-400')}>
            {formatCurrency(record.amount)}
          </div>
          {record.status !== 'settled' && (
            <div className="text-xs text-slate-500">
              {formatCurrency(outstanding)} left
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {record.amount > 0 && (
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Returned: {formatCurrency(record.settled_amount)}</span>
            <span>{pct.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-[#2a2d3e] rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', record.type === 'lent' ? 'bg-emerald-500' : 'bg-red-500')}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Notes */}
      {record.description && (
        <p className="text-xs text-slate-500 leading-relaxed">{record.description}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto pt-1">
        {record.status !== 'settled' && (
          <Button size="sm" variant="secondary" onClick={onSettle} className="gap-1.5 text-xs h-7">
            <CheckCircle className="h-3 w-3" /> Mark Returned
          </Button>
        )}
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit} className="h-7 w-7 text-slate-400 hover:text-indigo-400">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} className="h-7 w-7 text-slate-400 hover:text-red-400">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Person Group Card ──────────────────────────────────────────────────────
// Groups all records for one person into a single card with a breakdown list.

function PersonGroup({
  name, records, expanded, onToggle, onEdit, onDelete, onSettle, onSettleAll,
}: {
  name: string;
  records: MoneyRecord[];
  expanded: boolean;
  onToggle: () => void;
  onEdit: (r: MoneyRecord) => void;
  onDelete: (r: MoneyRecord) => void;
  onSettle: (r: MoneyRecord) => void;
  onSettleAll: () => void;
}) {
  const lentOut = records.filter((r) => r.type === 'lent' && r.status !== 'settled')
    .reduce((s, r) => s + (r.amount - r.settled_amount), 0);
  const borrowedOut = records.filter((r) => r.type === 'borrowed' && r.status !== 'settled')
    .reduce((s, r) => s + (r.amount - r.settled_amount), 0);
  const net = lentOut - borrowedOut;
  const allSettled = records.every((r) => r.status === 'settled');
  const netType = net >= 0 ? 'lent' : 'borrowed';

  return (
    <div className={cn(
      'bg-[#1a1d2e] border rounded-xl overflow-hidden',
      allSettled ? 'border-[#2a2d3e]' : netType === 'lent' ? 'border-emerald-800/40' : 'border-red-800/40',
    )}>
      {/* Clickable header — toggles collapse */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <ChevronDown className={cn(
            'h-4 w-4 text-slate-500 flex-shrink-0 transition-transform duration-200',
            expanded && 'rotate-180',
          )} />
          <span className="font-semibold text-slate-100 truncate">{name}</span>
          <span className="text-xs text-slate-600 flex-shrink-0">
            {records.length} record{records.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {!allSettled && net !== 0 && (
            <Button
              size="sm"
              onClick={(e) => { e.stopPropagation(); onSettleAll(); }}
              className="h-7 px-2.5 text-xs bg-emerald-800/50 hover:bg-emerald-700/60 text-emerald-300 border border-emerald-700/50 gap-1"
              variant="ghost"
            >
              <CheckCircle className="h-3 w-3" /> Settle All
            </Button>
          )}
          <div className="text-right">
            {allSettled || net === 0 ? (
              <span className="text-sm text-slate-400">all settled</span>
            ) : (
              <>
                <div className={cn('text-base font-bold', net > 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {formatCurrency(Math.abs(net))}
                </div>
                <div className="text-xs text-slate-500">
                  {net > 0 ? `${name} owes you` : `you owe ${name}`}
                </div>
              </>
            )}
          </div>
        </div>
      </button>

      {/* Collapsible records list */}
      {expanded && (
        <div className="border-t border-[#2a2d3e] divide-y divide-[#1e2133]">
          {records.map((r) => {
            const outstanding = r.amount - r.settled_amount;
            const overdue = !r.due_date || r.status === 'settled' ? false : new Date(r.due_date) < new Date();
            const pct = r.amount > 0 ? (r.settled_amount / r.amount) * 100 : 0;
            return (
              <div key={r.id} className={cn('px-4 py-3 space-y-2', overdue && 'bg-red-950/10')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-slate-500">{r.type === 'lent' ? '💸 you lent' : '🤝 you borrowed'}</span>
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full border font-medium flex items-center gap-1',
                        STATUS_COLOR[r.status],
                      )}>
                        {STATUS_ICON[r.status]}{r.status}
                      </span>
                      {overdue && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-950/50 text-red-400 border border-red-800/40">overdue</span>
                      )}
                      {r.source_expense_id && (
                        <span className="text-xs text-indigo-400/70">split</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {r.description || '—'} · {r.date}{r.due_date ? ` · due ${r.due_date}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={cn('text-sm font-semibold', r.type === 'lent' ? 'text-emerald-400' : 'text-red-400')}>
                      {r.type === 'lent' ? '+' : '-'}{formatCurrency(r.amount)}
                    </div>
                    {r.status !== 'settled' && (
                      <div className="text-xs text-slate-500">{formatCurrency(outstanding)} left</div>
                    )}
                  </div>
                </div>

                {r.amount > 0 && pct > 0 && (
                  <div className="h-1 bg-[#2a2d3e] rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', r.type === 'lent' ? 'bg-emerald-500' : 'bg-red-500')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {r.status !== 'settled' && (
                    <Button size="sm" variant="secondary" onClick={() => onSettle(r)} className="gap-1 text-xs h-6 px-2">
                      <CheckCircle className="h-3 w-3" /> Settle
                    </Button>
                  )}
                  <div className="ml-auto flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(r)} className="h-6 w-6 text-slate-500 hover:text-indigo-400">
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(r)} className="h-6 w-6 text-slate-500 hover:text-red-400">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

// Adjust the linked account balance when a money record is created or deleted.
// Uses addTransaction so the entry appears in Cash & Accounts history.
// lent = debit (money leaves), borrowed = credit (money arrives).
function adjustAccountForRecord(
  record: Omit<MoneyRecord, 'id'> | MoneyRecord,
  reverse = false,
) {
  if (!record.account_id) return;
  const { addTransaction } = useAssetStore.getState();
  const baseType: 'credit' | 'debit' = record.type === 'lent' ? 'debit' : 'credit';
  const txType: 'credit' | 'debit' = reverse
    ? (baseType === 'debit' ? 'credit' : 'debit')
    : baseType;
  const action = record.type === 'lent' ? 'Lent to' : 'Borrowed from';
  const note = `${reverse ? 'Reversal — ' : ''}${action} ${record.person_name}${record.description ? ` — ${record.description}` : ''}`;
  addTransaction(record.account_id, {
    date: record.date,
    type: txType,
    amount: record.amount,
    note,
  });
}

export default function MoneyTrackerPage() {
  const { records, addRecord, updateRecord, deleteRecord, markSettled } = useMoneyStore();
  const updateExpense = useExpenseStore((s) => s.updateExpense);
  const expenses = useExpenseStore((s) => s.expenses);
  const { accounts, addTransaction } = useAssetStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MoneyRecord | null>(null);
  const [settleTarget, setSettleTarget] = useState<MoneyRecord | null>(null);
  const [personSettleTarget, setPersonSettleTarget] = useState<{ name: string; records: MoneyRecord[] } | null>(null);
  const [tab, setTab] = useState<'all' | 'lent' | 'borrowed'>('all');
  const [showSettled, setShowSettled] = useState(false);
  const [expandedPeople, setExpandedPeople] = useState<Set<string>>(new Set());

  const togglePerson = (name: string) =>
    setExpandedPeople((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const totalLent = useMemo(() => getOutstandingLent(records), [records]);
  const totalBorrowed = useMemo(() => getOutstandingBorrowed(records), [records]);
  const net = totalLent - totalBorrowed;

  // Group ALL records by person name (one card per person regardless of type)
  const allPersonGroups = useMemo(() => {
    const map = new Map<string, MoneyRecord[]>();
    records.forEach((r) => {
      if (!map.has(r.person_name)) map.set(r.person_name, []);
      map.get(r.person_name)!.push(r);
    });
    return [...map.entries()];
  }, [records]);

  // Split into lent/borrowed columns by net direction
  const { lentGroups, borrowedGroups } = useMemo(() => {
    const lent: [string, MoneyRecord[]][] = [];
    const borrowed: [string, MoneyRecord[]][] = [];
    allPersonGroups.forEach(([name, recs]) => {
      const lentOut = recs.filter((r) => r.type === 'lent' && r.status !== 'settled')
        .reduce((s, r) => s + (r.amount - r.settled_amount), 0);
      const borrowedOut = recs.filter((r) => r.type === 'borrowed' && r.status !== 'settled')
        .reduce((s, r) => s + (r.amount - r.settled_amount), 0);
      if (lentOut >= borrowedOut) lent.push([name, recs]);
      else borrowed.push([name, recs]);
    });
    return { lentGroups: lent, borrowedGroups: borrowed };
  }, [allPersonGroups]);

  const settledLentCount     = lentGroups.filter(([, recs]) => recs.every((r) => r.status === 'settled')).length;
  const settledBorrowedCount = borrowedGroups.filter(([, recs]) => recs.every((r) => r.status === 'settled')).length;

  const visibleLentGroups     = showSettled ? lentGroups     : lentGroups.filter(([, recs]) => !recs.every((r) => r.status === 'settled'));
  const visibleBorrowedGroups = showSettled ? borrowedGroups : borrowedGroups.filter(([, recs]) => !recs.every((r) => r.status === 'settled'));

  const allVisibleNames = [...visibleLentGroups, ...visibleBorrowedGroups].map(([n]) => n);
  const allExpanded = allVisibleNames.length > 0 && allVisibleNames.every((n) => expandedPeople.has(n));
  const expandAll  = () => setExpandedPeople(new Set(allVisibleNames));
  const collapseAll = () => setExpandedPeople(new Set());

  const handleSubmit = (data: Omit<MoneyRecord, 'id'>) => {
    if (editTarget) {
      updateRecord(editTarget.id, data);
      // Re-sync linked account transactions if anything that affects the ledger changed.
      const ledgerChanged =
        editTarget.account_id !== data.account_id ||
        editTarget.type !== data.type ||
        editTarget.amount !== data.amount ||
        editTarget.date !== data.date;
      if (ledgerChanged) {
        adjustAccountForRecord(editTarget, /* reverse */ true);
        adjustAccountForRecord(data);
      }
      // If person name changed and this record is linked to a split expense, sync back
      if (
        editTarget.source_expense_id &&
        editTarget.person_name !== data.person_name
      ) {
        const expense = expenses.find((e) => e.id === editTarget.source_expense_id);
        if (expense?.splits) {
          const updatedSplits = expense.splits.map((s) =>
            s.person_name === editTarget.person_name
              ? { ...s, person_name: data.person_name }
              : s,
          );
          updateExpense(expense.id, { splits: updatedSplits });
        }
      }
    } else {
      addRecord(data);
      adjustAccountForRecord(data);
    }
    setModalOpen(false);
    setEditTarget(null);
  };

  const handleDelete = (r: MoneyRecord) => {
    adjustAccountForRecord(r, /* reverse */ true);
    deleteRecord(r.id);
  };

  const handlePersonSettle = (accountId: string, settleAmount: number) => {
    if (!personSettleTarget) return;
    const unsettled = personSettleTarget.records.filter((r) => r.status !== 'settled');
    const lentOut = unsettled.filter((r) => r.type === 'lent')
      .reduce((s, r) => s + (r.amount - r.settled_amount), 0);
    const borrowedOut = unsettled.filter((r) => r.type === 'borrowed')
      .reduce((s, r) => s + (r.amount - r.settled_amount), 0);
    const net = lentOut - borrowedOut;

    // Distribute settleAmount sequentially across unsettled records
    let remaining = settleAmount;
    unsettled.forEach((r) => {
      if (remaining <= 0) return;
      const outstanding = r.amount - r.settled_amount;
      const toSettle = Math.min(outstanding, remaining);
      markSettled(r.id, toSettle);
      remaining -= toSettle;
    });

    // Log a single transaction on the chosen account
    if (accountId && settleAmount > 0) {
      addTransaction(accountId, {
        date: new Date().toISOString().split('T')[0],
        type: net > 0 ? 'credit' : 'debit',
        amount: settleAmount,
        note: `Settlement — ${personSettleTarget.name}`,
      });
    }
    setPersonSettleTarget(null);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <HandCoins className="h-6 w-6 text-indigo-400" /> Money Tracker
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Track money you lent and borrowed</p>
        </div>
        <Button onClick={() => { setEditTarget(null); setModalOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Add Record
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-emerald-800/40">
          <CardContent className="p-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Outstanding Lent</p>
            <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalLent)}</p>
            <p className="text-xs text-slate-500 mt-1">Money others owe you</p>
          </CardContent>
        </Card>
        <Card className="border-red-800/40">
          <CardContent className="p-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Outstanding Borrowed</p>
            <p className="text-2xl font-bold text-red-400">{formatCurrency(totalBorrowed)}</p>
            <p className="text-xs text-slate-500 mt-1">Money you owe others</p>
          </CardContent>
        </Card>
        <Card className={net >= 0 ? 'border-emerald-800/40' : 'border-red-800/40'}>
          <CardContent className="p-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Net Position</p>
            <p className={`text-2xl font-bold ${net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {net >= 0 ? '+' : ''}{formatCurrency(Math.abs(net))}
            </p>
            <p className="text-xs text-slate-500 mt-1">{net >= 0 ? 'Net asset' : 'Net liability'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs + settled toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'lent', 'borrowed'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors border',
              tab === t
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'border-[#2a2d3e] text-slate-400 hover:bg-[#2a2d3e]'
            )}
          >
            {t === 'all' ? 'All' : t === 'lent' ? '💸 I Lent' : '🤝 I Borrowed'}
            <span className="ml-1.5 text-xs opacity-60">
              ({t === 'all' ? allPersonGroups.length : t === 'lent' ? lentGroups.length : borrowedGroups.length})
            </span>
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {/* Expand / Collapse all */}
          {allVisibleNames.length > 0 && (
            <button
              onClick={allExpanded ? collapseAll : expandAll}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-[#2a2d3e] text-slate-400 hover:bg-[#2a2d3e]"
            >
              {allExpanded ? 'Collapse All' : 'Expand All'}
            </button>
          )}

          {/* Show/hide settled */}
          {(settledLentCount + settledBorrowedCount) > 0 && (
            <button
              onClick={() => setShowSettled((v) => !v)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                showSettled
                  ? 'bg-slate-700 border-slate-600 text-slate-300'
                  : 'border-[#2a2d3e] text-slate-500 hover:bg-[#2a2d3e] hover:text-slate-400'
              )}
            >
              {showSettled
                ? 'Hide settled'
                : `Show ${settledLentCount + settledBorrowedCount} settled`}
            </button>
          )}
        </div>
      </div>

      {records.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-slate-500 text-sm">
            No records yet. Click &quot;Add Record&quot; to track money you lent or borrowed.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Lent column */}
          {(tab === 'all' || tab === 'lent') && (
            <div className="space-y-3">
              {tab === 'all' && (
                <h2 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                  💸 Money I Lent
                  <span className="text-xs text-slate-500 font-normal">
                    ({visibleLentGroups.length}{settledLentCount > 0 && !showSettled ? ` of ${lentGroups.length}` : ''} {lentGroups.length !== 1 ? 'people' : 'person'})
                  </span>
                </h2>
              )}
              {visibleLentGroups.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">
                  {lentGroups.length > 0 ? 'All settled — click "Show settled" to view.' : 'No lending records.'}
                </p>
              ) : (
                visibleLentGroups.map(([name, recs]) => (
                  <PersonGroup
                    key={name}
                    name={name}
                    records={recs}
                    expanded={expandedPeople.has(name)}
                    onToggle={() => togglePerson(name)}
                    onEdit={(r) => { setEditTarget(r); setModalOpen(true); }}
                    onDelete={(r) => handleDelete(r)}
                    onSettle={(r) => setSettleTarget(r)}
                    onSettleAll={() => setPersonSettleTarget({ name, records: recs })}
                  />
                ))
              )}
            </div>
          )}

          {/* Borrowed column */}
          {(tab === 'all' || tab === 'borrowed') && (
            <div className="space-y-3">
              {tab === 'all' && (
                <h2 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                  🤝 Money I Borrowed
                  <span className="text-xs text-slate-500 font-normal">
                    ({visibleBorrowedGroups.length}{settledBorrowedCount > 0 && !showSettled ? ` of ${borrowedGroups.length}` : ''} {borrowedGroups.length !== 1 ? 'people' : 'person'})
                  </span>
                </h2>
              )}
              {visibleBorrowedGroups.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">
                  {borrowedGroups.length > 0 ? 'All settled — click "Show settled" to view.' : 'No borrowing records.'}
                </p>
              ) : (
                visibleBorrowedGroups.map(([name, recs]) => (
                  <PersonGroup
                    key={name}
                    name={name}
                    records={recs}
                    expanded={expandedPeople.has(name)}
                    onToggle={() => togglePerson(name)}
                    onEdit={(r) => { setEditTarget(r); setModalOpen(true); }}
                    onDelete={(r) => handleDelete(r)}
                    onSettle={(r) => setSettleTarget(r)}
                    onSettleAll={() => setPersonSettleTarget({ name, records: recs })}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}

      <MoneyModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null); }}
        onSubmit={handleSubmit}
        initial={editTarget}
        accounts={accounts}
      />

      {settleTarget && (
        <SettleModal
          record={settleTarget}
          accounts={accounts}
          onClose={() => setSettleTarget(null)}
          onSettle={(amount, accountId) => {
            markSettled(settleTarget.id, amount);
            if (accountId) {
              addTransaction(accountId, {
                date: new Date().toISOString().split('T')[0],
                type: settleTarget.type === 'lent' ? 'credit' : 'debit',
                amount,
                note: `Settlement — ${settleTarget.person_name}${settleTarget.description ? ` — ${settleTarget.description}` : ''}`,
              });
            }
          }}
        />
      )}

      {personSettleTarget && (
        <PersonSettleModal
          personName={personSettleTarget.name}
          records={personSettleTarget.records}
          accounts={accounts}
          onClose={() => setPersonSettleTarget(null)}
          onSettle={(accountId, amount) => handlePersonSettle(accountId, amount)}
        />
      )}
    </div>
  );
}
