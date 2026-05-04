'use client';

import { useState, useMemo } from 'react';
import {
  Plus, Pencil, Trash2, Banknote, PiggyBank, Building2, Wallet,
  Shield, TrendingUp, CreditCard, Receipt, ArrowDownLeft, ArrowUpRight,
  ChevronDown, ChevronUp, X, ArrowLeftRight, Users,
} from 'lucide-react';
import { useAssetStore, getTotalBalance } from '@/lib/assetStore';
import { useExpenseStore } from '@/lib/expenseStore';
import { useMoneyStore } from '@/lib/moneyStore';
import { formatCurrency, cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { AssetAccount, AssetCategory, AccountTransaction } from '@/lib/types';

// ── config ───────────────────────────────────────────────────────────────────

const CATEGORIES: AssetCategory[] = [
  'Cash', 'Savings Account', 'Current Account', 'Credit Card',
  'Fixed Deposit', 'Recurring Deposit', 'PPF', 'EPF', 'NPS',
  'Digital Wallet', 'Other',
];

const CATEGORY_META: Record<AssetCategory, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  'Cash':               { icon: <Banknote className="h-4 w-4" />,    color: 'text-yellow-400',  bg: 'bg-yellow-900/30',  border: 'border-yellow-800/40' },
  'Savings Account':    { icon: <PiggyBank className="h-4 w-4" />,   color: 'text-emerald-400', bg: 'bg-emerald-900/30', border: 'border-emerald-800/40' },
  'Fixed Deposit':      { icon: <Shield className="h-4 w-4" />,      color: 'text-blue-400',    bg: 'bg-blue-900/30',    border: 'border-blue-800/40' },
  'Current Account':    { icon: <Building2 className="h-4 w-4" />,   color: 'text-purple-400',  bg: 'bg-purple-900/30',  border: 'border-purple-800/40' },
  'Credit Card':        { icon: <CreditCard className="h-4 w-4" />,  color: 'text-red-400',     bg: 'bg-red-900/30',     border: 'border-red-800/40' },
  'PPF':                { icon: <Shield className="h-4 w-4" />,      color: 'text-indigo-400',  bg: 'bg-indigo-900/30',  border: 'border-indigo-800/40' },
  'EPF':                { icon: <Shield className="h-4 w-4" />,      color: 'text-cyan-400',    bg: 'bg-cyan-900/30',    border: 'border-cyan-800/40' },
  'NPS':                { icon: <TrendingUp className="h-4 w-4" />,  color: 'text-orange-400',  bg: 'bg-orange-900/30',  border: 'border-orange-800/40' },
  'Digital Wallet':     { icon: <Wallet className="h-4 w-4" />,      color: 'text-pink-400',    bg: 'bg-pink-900/30',    border: 'border-pink-800/40' },
  'Recurring Deposit':  { icon: <TrendingUp className="h-4 w-4" />,  color: 'text-teal-400',    bg: 'bg-teal-900/30',    border: 'border-teal-800/40' },
  'Other':              { icon: <Banknote className="h-4 w-4" />,    color: 'text-slate-400',   bg: 'bg-slate-700/30',   border: 'border-slate-700/40' },
};

// Credit card: debit = new charge (owes more), credit = payment (owes less)
// Normal account: credit = money in, debit = money out
function txLabel(type: 'credit' | 'debit', isCreditCard: boolean) {
  if (isCreditCard) return type === 'credit' ? 'Bill Payment' : 'New Charge';
  return type === 'credit' ? 'Money In' : 'Money Out';
}

// ── Account modal ─────────────────────────────────────────────────────────────

const EMPTY: Omit<AssetAccount, 'id'> = {
  name: '', category: 'Savings Account', balance: 0,
  interest_rate: 0, maturity_date: '', notes: '',
  last_updated: new Date().toISOString().split('T')[0],
};

function AccountModal({ open, onClose, onSubmit, initial }: {
  open: boolean; onClose: () => void;
  onSubmit: (data: Omit<AssetAccount, 'id'>) => void;
  initial?: AssetAccount | null;
}) {
  const [form, setForm] = useState<Omit<AssetAccount, 'id'>>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useMemo(() => {
    if (initial) { const { id: _id, transactions: _tx, ...rest } = initial as AssetAccount & { id: string }; setForm(rest); }
    else setForm({ ...EMPTY, last_updated: new Date().toISOString().split('T')[0] });
    setErrors({});
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setErrors({ name: 'Name is required' }); return; }
    onSubmit(form);
  };

  const isCreditCard   = form.category === 'Credit Card';
  const showRate       = ['Fixed Deposit', 'Savings Account', 'PPF', 'EPF', 'NPS', 'Recurring Deposit', 'Credit Card'].includes(form.category);
  const showMaturity   = ['Fixed Deposit', 'Recurring Deposit', 'PPF'].includes(form.category);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Account' : 'Add Account / Balance'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={(v) => set('category', v as AssetCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Account / Label Name *</Label>
              <Input placeholder={isCreditCard ? 'e.g. HDFC Credit Card' : 'e.g. SBI Savings'} value={form.name} onChange={(e) => set('name', e.target.value)} />
              {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{isCreditCard ? 'Current Balance Owed (₹)' : 'Balance (₹) *'}</Label>
              <Input type="number" step="1" placeholder={isCreditCard ? 'Amount you owe' : '0'}
                value={form.balance === 0 ? '' : form.balance}
                onChange={(e) => set('balance', parseFloat(e.target.value) || 0)} />
              {isCreditCard && <p className="text-xs text-slate-500">Positive = you owe · 0 = fully paid</p>}
            </div>
            {showRate && (
              <div className="space-y-1.5">
                <Label>Interest Rate (% p.a.)</Label>
                <Input type="number" step="0.01" placeholder={isCreditCard ? 'e.g. 42' : 'e.g. 7.1'}
                  value={form.interest_rate || ''} onChange={(e) => set('interest_rate', parseFloat(e.target.value) || 0)} />
              </div>
            )}
            {showMaturity && (
              <div className="space-y-1.5">
                <Label>Maturity Date</Label>
                <Input type="date" value={form.maturity_date} onChange={(e) => set('maturity_date', e.target.value)} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Last Updated</Label>
              <Input type="date" value={form.last_updated} onChange={(e) => set('last_updated', e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Notes</Label>
              <Textarea placeholder={isCreditCard ? 'Card limit, billing date, last 4 digits…' : 'Bank name, branch, etc.'}
                value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{initial ? 'Save Changes' : 'Add Account'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Transaction modal ─────────────────────────────────────────────────────────

type TxMode = 'credit' | 'debit' | 'lent';

function TransactionModal({ account, defaultType, allAccounts, existingPeople, onClose, onSubmit }: {
  account: AssetAccount;
  defaultType: 'credit' | 'debit';
  allAccounts: AssetAccount[];
  existingPeople: string[];       // names from Money Tracker for autocomplete
  onClose: () => void;
  onSubmit: (tx: Omit<AccountTransaction, 'id'>, linkedAccountId?: string, lentTo?: string) => void;
}) {
  const isCreditCard = account.category === 'Credit Card';
  const today = new Date().toISOString().split('T')[0];

  const [mode, setMode]             = useState<TxMode>(defaultType);
  const [amount, setAmount]         = useState('');
  const [note, setNote]             = useState('');
  const [date, setDate]             = useState(today);
  const [linkedId, setLinkedId]     = useState<string>('none');
  const [personName, setPersonName] = useState('');
  const [showSuggest, setShowSuggest] = useState(false);
  const [error, setError]           = useState('');

  const otherAccounts = allAccounts.filter((a) => a.id !== account.id);
  const amt    = parseFloat(amount);
  const linked = allAccounts.find((a) => a.id === linkedId);

  const personSuggestions = existingPeople.filter((p) =>
    p.toLowerCase().includes(personName.toLowerCase()) && p.toLowerCase() !== personName.toLowerCase()
  );

  const notePresets: string[] =
    mode === 'lent'    ? ['Paid for dinner', 'Paid for trip', 'Sent money', 'Paid bill', 'Lent cash'] :
    isCreditCard       ? (mode === 'credit' ? ['Bill Payment', 'Minimum Due', 'Full Payment'] : ['Online Shopping', 'Dining', 'Fuel', 'EMI'])
                       : (mode === 'credit' ? ['Salary', 'Freelance', 'Interest Credit', 'Refund'] : ['Rent', 'Credit Card Bill', 'Withdrawal', 'Investment']);

  const creditLabel = isCreditCard ? 'Bill Payment' : 'Money In (+)';
  const debitLabel  = isCreditCard ? 'New Charge'   : 'Money Out (−)';

  const newBalance = (a: AssetAccount, t: 'credit' | 'debit') =>
    a.balance + (t === 'credit' ? amt : -amt);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    if (!note.trim())     { setError('Add a note'); return; }
    if (mode === 'lent' && !personName.trim()) { setError('Enter the person\'s name'); return; }
    if (isCreditCard && mode === 'credit' && linkedId === 'none' && otherAccounts.length > 0) {
      setError('Select the account you\'re paying from'); return;
    }

    if (mode === 'lent') {
      // Debit the account + flag lentTo for Money Tracker creation
      onSubmit(
        { type: 'debit', amount: amt, note: `Lent/Paid for ${personName.trim()} — ${note.trim()}`, date },
        undefined,
        personName.trim(),
      );
    } else {
      onSubmit(
        { type: mode as 'credit' | 'debit', amount: amt, note: note.trim(), date },
        linkedId !== 'none' ? linkedId : undefined,
      );
    }
  };

  const switchMode = (m: TxMode) => { setMode(m); setLinkedId('none'); setPersonName(''); setError(''); };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'credit' ? <ArrowDownLeft className="h-4 w-4 text-emerald-400" /> :
             mode === 'debit'  ? <ArrowUpRight  className="h-4 w-4 text-red-400" /> :
                                 <Users         className="h-4 w-4 text-amber-400" />}
            Record Transaction — {account.name}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Mode toggle — 3 options */}
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => switchMode('credit')}
              className={cn('flex flex-col items-center gap-1 rounded-lg border py-2.5 text-xs font-medium transition-colors',
                mode === 'credit' ? 'border-emerald-600 bg-emerald-900/30 text-emerald-300' : 'border-[#2a2d3e] text-slate-500 hover:bg-[#1a1d2e]')}>
              <ArrowDownLeft className="h-4 w-4" /> {creditLabel}
            </button>
            <button type="button" onClick={() => switchMode('debit')}
              className={cn('flex flex-col items-center gap-1 rounded-lg border py-2.5 text-xs font-medium transition-colors',
                mode === 'debit' ? 'border-red-600 bg-red-900/30 text-red-300' : 'border-[#2a2d3e] text-slate-500 hover:bg-[#1a1d2e]')}>
              <ArrowUpRight className="h-4 w-4" /> {debitLabel}
            </button>
            {!isCreditCard && (
              <button type="button" onClick={() => switchMode('lent')}
                className={cn('flex flex-col items-center gap-1 rounded-lg border py-2.5 text-xs font-medium transition-colors',
                  mode === 'lent' ? 'border-amber-600 bg-amber-900/30 text-amber-300' : 'border-[#2a2d3e] text-slate-500 hover:bg-[#1a1d2e]')}>
                <Users className="h-4 w-4" /> Lent / Paid For
              </button>
            )}
          </div>

          {/* Person name — lent mode only */}
          {mode === 'lent' && (
            <div className="space-y-1.5 relative">
              <Label>Person Name *</Label>
              <Input
                placeholder="e.g. Rahul, Mom…"
                value={personName}
                autoComplete="off"
                onChange={(e) => { setPersonName(e.target.value); setShowSuggest(true); setError(''); }}
                onFocus={() => setShowSuggest(true)}
                onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
              />
              {showSuggest && personSuggestions.length > 0 && (
                <div className="absolute z-10 w-full top-full mt-1 rounded-lg border border-[#2a2d3e] bg-[#1a1d2e] shadow-xl overflow-hidden">
                  {personSuggestions.map((p) => (
                    <button key={p} type="button"
                      className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-[#2a2d3e] transition-colors flex items-center gap-2"
                      onMouseDown={() => { setPersonName(p); setShowSuggest(false); }}>
                      <Users className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                      {p}
                      <span className="ml-auto text-xs text-amber-400">existing</span>
                    </button>
                  ))}
                </div>
              )}
              {existingPeople.includes(personName.trim()) && (
                <p className="text-xs text-amber-400">Amount will be added to {personName.trim()}&apos;s existing record in Money Tracker.</p>
              )}
              {personName.trim() && !existingPeople.includes(personName.trim()) && (
                <p className="text-xs text-slate-500">New person — a new card will be created in Money Tracker.</p>
              )}
            </div>
          )}

          {/* Amount */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Amount (₹) *</Label>
              {isCreditCard && mode === 'credit' && account.balance !== 0 && (
                <button
                  type="button"
                  onClick={() => { setAmount(Math.abs(account.balance).toString()); setError(''); }}
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
                >
                  Pay Full Bill (₹{Math.abs(account.balance).toLocaleString('en-IN')})
                </button>
              )}
            </div>
            <Input type="number" step="0.01" placeholder="0.00" autoFocus={mode !== 'lent'}
              value={amount} onChange={(e) => { setAmount(e.target.value); setError(''); }} />
            {isCreditCard && mode === 'credit' && account.balance !== 0 && (
              <p className="text-xs text-slate-500">
                Outstanding bill: <span className="text-red-400 font-medium">₹{Math.abs(account.balance).toLocaleString('en-IN')}</span>
                {amt > 0 && amt < Math.abs(account.balance) && (
                  <span className="ml-2 text-amber-400">· ₹{(Math.abs(account.balance) - amt).toLocaleString('en-IN')} remaining after this payment</span>
                )}
                {amt > Math.abs(account.balance) && (
                  <span className="ml-2 text-amber-400">· over by ₹{(amt - Math.abs(account.balance)).toLocaleString('en-IN')}</span>
                )}
              </p>
            )}
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label>Note *</Label>
            <Input placeholder={mode === 'lent' ? 'e.g. Paid for dinner, Trip money…' : 'e.g. June Salary…'}
              value={note} onChange={(e) => { setNote(e.target.value); setError(''); }} />
            <div className="flex flex-wrap gap-1.5 mt-1">
              {notePresets.map((p) => (
                <button key={p} type="button" onClick={() => setNote(p)}
                  className="rounded-full border border-[#2a2d3e] px-2.5 py-0.5 text-xs text-slate-400 hover:border-indigo-600 hover:text-indigo-300 transition-colors">
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Linked account — credit/debit modes only */}
          {mode !== 'lent' && otherAccounts.length > 0 && (
            <div className="space-y-1.5">
              <Label>
                {mode === 'credit' ? (isCreditCard ? 'Pay From Account' : 'Received From (optional)') : 'Paid To Account (optional)'}
                {isCreditCard && mode === 'credit' && <span className="ml-1 text-red-400 text-xs">*</span>}
              </Label>
              <Select value={linkedId} onValueChange={(v) => { setLinkedId(v); setError(''); }}>
                <SelectTrigger><SelectValue placeholder="Select account…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None / External —</SelectItem>
                  {otherAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <div className="flex items-center justify-between gap-3 w-full">
                        <span>{a.name}</span>
                        <span className="text-xs text-slate-500">{formatCurrency(a.balance)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {linkedId !== 'none' && linked && amt > 0 && (
                <p className="text-xs text-slate-500">
                  {linked.name}: {formatCurrency(linked.balance)} → <span className="text-slate-300">{formatCurrency(newBalance(linked, mode === 'credit' ? 'debit' : 'credit'))}</span>
                </p>
              )}
            </div>
          )}

          {/* Date */}
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {/* Balance preview */}
          {amt > 0 && (
            <div className={cn('rounded-lg px-4 py-2.5 text-sm border space-y-1',
              mode === 'credit' ? 'border-emerald-800/40 bg-emerald-950/20'
              : mode === 'lent' ? 'border-amber-800/40 bg-amber-950/20'
              :                   'border-red-800/40 bg-red-950/20')}>
              <div>
                <span className="text-slate-400">{account.name} after: </span>
                <span className={`font-bold ${mode === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(newBalance(account, mode === 'credit' ? 'credit' : 'debit'))}
                </span>
              </div>
              {mode === 'lent' && personName.trim() && (
                <div className="text-amber-300 text-xs">
                  + Money Tracker: ₹{amt.toLocaleString('en-IN')} lent to {personName.trim()}
                </div>
              )}
              {mode !== 'lent' && linkedId !== 'none' && linked && (
                <div>
                  <span className="text-slate-400">{linked.name} after: </span>
                  <span className="font-bold text-slate-300">{formatCurrency(newBalance(linked, mode === 'credit' ? 'debit' : 'credit'))}</span>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit"
              className={mode === 'credit' ? 'bg-emerald-600 hover:bg-emerald-700' : mode === 'lent' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'}>
              Record
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Transfer modal (between own accounts) ─────────────────────────────────────

function TransferModal({ allAccounts, onClose, onTransfer }: {
  allAccounts: AssetAccount[];
  onClose: () => void;
  onTransfer: (fromId: string, toId: string, amount: number, note: string, date: string) => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const [fromId, setFromId] = useState<string>('none');
  const [toId, setToId]     = useState<string>('none');
  const [amount, setAmount] = useState('');
  const [note, setNote]     = useState('');
  const [date, setDate]     = useState(today);
  const [error, setError]   = useState('');

  const from = allAccounts.find((a) => a.id === fromId);
  const to   = allAccounts.find((a) => a.id === toId);
  const amt  = parseFloat(amount);

  const notePresets = ['Moving funds', 'FD deposit', 'Emergency fund top-up', 'Salary sweep', 'Investment funding'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fromId === 'none')        { setError('Select source account'); return; }
    if (toId === 'none')          { setError('Select destination account'); return; }
    if (fromId === toId)          { setError('From and To accounts must be different'); return; }
    if (!amt || amt <= 0)         { setError('Enter a valid amount'); return; }
    if (!note.trim())             { setError('Add a note'); return; }
    if (from && from.category !== 'Credit Card' && from.balance < amt) {
      setError(`Insufficient balance in ${from.name} (${formatCurrency(from.balance)})`); return;
    }
    onTransfer(fromId, toId, amt, note.trim(), date);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-indigo-400" />
            Transfer Between Accounts
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* From → To */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <div className="space-y-1.5">
              <Label>From Account *</Label>
              <Select value={fromId} onValueChange={(v) => { setFromId(v); setError(''); }}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {allAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id} disabled={a.id === toId}>
                      <div className="flex items-center justify-between gap-2 w-full">
                        <span className="truncate">{a.name}</span>
                        <span className={`text-xs flex-shrink-0 ${a.category === 'Credit Card' && a.balance < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                          {a.category === 'Credit Card' && a.balance < 0
                            ? `−${formatCurrency(Math.abs(a.balance))} owed`
                            : formatCurrency(a.balance)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ArrowLeftRight className="h-4 w-4 text-slate-500 mb-2.5" />
            <div className="space-y-1.5">
              <Label>To Account *</Label>
              <Select value={toId} onValueChange={(v) => { setToId(v); setError(''); }}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {allAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id} disabled={a.id === fromId}>
                      <div className="flex items-center justify-between gap-2 w-full">
                        <span className="truncate">{a.name}</span>
                        <span className={`text-xs flex-shrink-0 ${a.category === 'Credit Card' && a.balance < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                          {a.category === 'Credit Card' && a.balance < 0
                            ? `−${formatCurrency(Math.abs(a.balance))} owed`
                            : formatCurrency(a.balance)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label>Amount (₹) *</Label>
            <Input type="number" step="0.01" placeholder="0.00"
              value={amount} onChange={(e) => { setAmount(e.target.value); setError(''); }} />
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label>Note *</Label>
            <Input placeholder="e.g. Moving funds, FD deposit…"
              value={note} onChange={(e) => { setNote(e.target.value); setError(''); }} />
            <div className="flex flex-wrap gap-1.5 mt-1">
              {notePresets.map((p) => (
                <button key={p} type="button" onClick={() => setNote(p)}
                  className="rounded-full border border-[#2a2d3e] px-2.5 py-0.5 text-xs text-slate-400 hover:border-indigo-600 hover:text-indigo-300 transition-colors">
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {/* Preview */}
          {from && to && amt > 0 && (
            <div className="rounded-lg border border-indigo-800/40 bg-indigo-950/20 px-4 py-3 text-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{from.name}</span>
                <span className="font-bold text-red-400">{formatCurrency(from.balance - amt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{to.name}</span>
                <span className="font-bold text-emerald-400">{formatCurrency(to.balance + amt)}</span>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Transfer</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Account card ──────────────────────────────────────────────────────────────

function AccountCard({ account, monthlySpend, txCount, onEdit, onDelete, onAddTx, onDeleteTx }: {
  account: AssetAccount;
  monthlySpend: number;
  txCount: number;
  onEdit: () => void;
  onDelete: () => void;
  onAddTx: (type: 'credit' | 'debit') => void;
  onDeleteTx: (txId: string) => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const meta         = CATEGORY_META[account.category];
  const isCreditCard = account.category === 'Credit Card';
  const isOwed       = isCreditCard && account.balance < 0;
  const isCredit     = isCreditCard && account.balance > 0;
  const txList       = account.transactions ?? [];

  return (
    <div className={`bg-[#1a1d2e] border ${meta.border} rounded-xl flex flex-col gap-0 overflow-hidden hover:brightness-110 transition-all`}>

      {/* ── Main card body ────────────────────────────────────────────── */}
      <div className="p-4 flex flex-col gap-3">
        {/* Name + balance */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className={`h-9 w-9 rounded-lg ${meta.bg} flex items-center justify-center flex-shrink-0 ${meta.color}`}>
              {meta.icon}
            </div>
            <div>
              <p className="font-semibold text-slate-100 text-sm leading-tight">{account.name}</p>
              <p className={`text-xs font-medium ${meta.color}`}>{account.category}</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-lg font-bold ${isOwed ? 'text-red-400' : isCredit ? 'text-emerald-400' : 'text-slate-100'}`}>
              {isOwed   ? `−${formatCurrency(Math.abs(account.balance))}`
               : isCredit ? `+${formatCurrency(account.balance)}`
               : formatCurrency(account.balance)}
            </p>
            {isOwed   && <p className="text-xs text-red-400/70">amount owed</p>}
            {isCredit && <p className="text-xs text-emerald-400/70">credit balance</p>}
            {isCreditCard && account.balance === 0 && <p className="text-xs text-emerald-400/70">all paid off</p>}
            {account.interest_rate > 0 && (
              <p className={`text-xs ${isOwed ? 'text-red-400' : 'text-emerald-400'}`}>{account.interest_rate}% p.a.</p>
            )}
          </div>
        </div>

        {/* Monthly spend from expenses */}
        {txCount > 0 && (
          <div className="flex items-center gap-1.5 bg-[#0f1117] rounded-lg px-3 py-2">
            <Receipt className="h-3.5 w-3.5 text-orange-400 flex-shrink-0" />
            <span className="text-xs text-slate-400">
              <span className="text-orange-300 font-medium">{formatCurrency(monthlySpend)}</span>
              {' '}spent this month · {txCount} tx
            </span>
          </div>
        )}

        {(account.maturity_date || account.notes) && (
          <div className="space-y-0.5">
            {account.maturity_date && <p className="text-xs text-slate-500">Matures: {account.maturity_date}</p>}
            {account.notes && <p className="text-xs text-slate-500 leading-relaxed">{account.notes}</p>}
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center gap-1 pt-1">
          {/* Credit / Debit quick buttons */}
          <button onClick={() => onAddTx('credit')}
            className={cn('flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors flex-1 justify-center',
              isCreditCard
                ? 'border-emerald-800/50 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-900/40'
                : 'border-emerald-800/50 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-900/40')}>
            <ArrowDownLeft className="h-3.5 w-3.5" />
            {isCreditCard ? 'Pay Bill' : 'Credit'}
          </button>
          <button onClick={() => onAddTx('debit')}
            className={cn('flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors flex-1 justify-center',
              isCreditCard
                ? 'border-red-800/50 bg-red-950/30 text-red-400 hover:bg-red-900/40'
                : 'border-red-800/50 bg-red-950/30 text-red-400 hover:bg-red-900/40')}>
            <ArrowUpRight className="h-3.5 w-3.5" />
            {isCreditCard ? 'Add Charge' : 'Debit'}
          </button>

          {/* History toggle */}
          {txList.length > 0 && (
            <button onClick={() => setShowHistory((p) => !p)}
              className="flex items-center gap-1 rounded-lg border border-[#2a2d3e] px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
              {showHistory ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {txList.length}
            </button>
          )}

          <div className="ml-auto flex gap-1">
            <Button variant="ghost" size="icon" onClick={onEdit} className="h-7 w-7 text-slate-500 hover:text-indigo-400"><Pencil className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" onClick={onDelete} className="h-7 w-7 text-slate-500 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>

        <p className="text-xs text-slate-600">Updated {account.last_updated}</p>
      </div>

      {/* ── Transaction history ───────────────────────────────────────── */}
      {showHistory && txList.length > 0 && (
        <div className="border-t border-[#2a2d3e] bg-[#0f1117]">
          <p className="px-4 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-600">Transaction History</p>
          <div className="divide-y divide-[#1a1d2e] max-h-48 overflow-y-auto">
            {txList.map((tx) => {
              const isIn = isCreditCard ? tx.type === 'credit' : tx.type === 'credit';
              return (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-2.5 group">
                  <div className={cn('h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0',
                    tx.type === 'credit' ? 'bg-emerald-900/40' : 'bg-red-900/40')}>
                    {tx.type === 'credit'
                      ? <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-400" />
                      : <ArrowUpRight  className="h-3.5 w-3.5 text-red-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{tx.note}</p>
                    <p className="text-[10px] text-slate-600">
                    {tx.date} · {txLabel(tx.type, isCreditCard)}
                    {tx.linkedAccountName && <span className="text-slate-700"> · ↔ {tx.linkedAccountName}</span>}
                  </p>
                  </div>
                  <p className={`text-sm font-semibold flex-shrink-0 ${isIn ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.type === 'credit' ? '+' : '−'}{formatCurrency(tx.amount)}
                  </p>
                  <button onClick={() => onDeleteTx(tx.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all ml-1">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CashAccountsPage() {
  const { accounts, addAccount, updateAccount, deleteAccount, addTransaction, deleteTransaction } = useAssetStore();
  const expenses = useExpenseStore((s) => s.expenses);
  const { records, addRecord } = useMoneyStore();

  const [modalOpen, setModalOpen]     = useState(false);
  const [editTarget, setEditTarget]   = useState<AssetAccount | null>(null);
  const [filterCat, setFilterCat]     = useState<AssetCategory | 'All'>('All');
  const [transferOpen, setTransferOpen] = useState(false);

  // Transaction modal state
  const [txTarget, setTxTarget]       = useState<AssetAccount | null>(null);
  const [txDefaultType, setTxDefault] = useState<'credit' | 'debit'>('credit');

  const existingPeople = useMemo(() =>
    [...new Set(records.map((r) => r.person_name))].sort(),
    [records]);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const total        = useMemo(() => getTotalBalance(accounts), [accounts]);
  const liquidAssets = useMemo(() => accounts.filter((a) => a.category !== 'Credit Card').reduce((s, a) => s + a.balance, 0), [accounts]);
  const ccDebt       = useMemo(() => accounts.filter((a) => a.category === 'Credit Card' && a.balance < 0).reduce((s, a) => s + Math.abs(a.balance), 0), [accounts]);

  const byCategory = useMemo(() => {
    const map: Partial<Record<AssetCategory, number>> = {};
    accounts.forEach((a) => { map[a.category] = (map[a.category] ?? 0) + a.balance; });
    return Object.entries(map).sort((a, b) => (b[1] as number) - (a[1] as number)) as [AssetCategory, number][];
  }, [accounts]);

  const filtered = useMemo(() =>
    filterCat === 'All' ? accounts : accounts.filter((a) => a.category === filterCat),
    [accounts, filterCat]);

  const expenseStats = useMemo(() => {
    const map: Record<string, { spend: number; count: number }> = {};
    accounts.forEach((a) => {
      const monthExp = expenses.filter((e) => e.payment_source_id === a.id && e.date.startsWith(currentMonth));
      map[a.id] = { spend: monthExp.reduce((s, e) => s + e.amount, 0), count: monthExp.length };
    });
    return map;
  }, [accounts, expenses, currentMonth]);

  const handleAccountSubmit = (data: Omit<AssetAccount, 'id'>) => {
    if (editTarget) updateAccount(editTarget.id, data);
    else addAccount(data);
    setModalOpen(false);
    setEditTarget(null);
  };

  const openTx = (acc: AssetAccount, type: 'credit' | 'debit') => {
    setTxTarget(acc);
    setTxDefault(type);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <PiggyBank className="h-6 w-6 text-indigo-400" /> Cash &amp; Accounts
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Savings, FDs, cash, credit cards — all in one place</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTransferOpen(true)} className="gap-2">
            <ArrowLeftRight className="h-4 w-4" /> Transfer
          </Button>
          <Button onClick={() => { setEditTarget(null); setModalOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Add Account
          </Button>
        </div>
      </div>

      {/* Summary banner */}
      <Card className="border-indigo-800/40 bg-indigo-950/10">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-shrink-0">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Balance</p>
              <p className="text-3xl font-bold text-indigo-300">{formatCurrency(total)}</p>
              <p className="text-xs text-slate-500 mt-0.5">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
            </div>
            {ccDebt > 0 && (
              <div className="flex flex-wrap gap-2 text-xs sm:mt-1">
                <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg px-3 py-2">
                  <span className="text-slate-500 block">Liquid Assets</span>
                  <span className="font-bold text-slate-100">{formatCurrency(liquidAssets)}</span>
                </div>
                <div className="bg-red-950/30 border border-red-800/40 rounded-lg px-3 py-2">
                  <span className="text-slate-500 block">Credit Card Debt</span>
                  <span className="font-bold text-red-400">−{formatCurrency(ccDebt)}</span>
                </div>
              </div>
            )}
            {byCategory.length > 0 && (
              <div className="flex-1 space-y-1.5">
                {byCategory.map(([cat, bal]) => {
                  const pct = total !== 0 ? Math.abs(bal / Math.abs(total)) * 100 : 0;
                  const meta = CATEGORY_META[cat];
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className={meta.color}>{cat}</span>
                        <span className={bal < 0 ? 'text-red-400' : 'text-slate-400'}>
                          {formatCurrency(bal)} · {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-[#2a2d3e] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${bal < 0 ? 'bg-red-500' : ''}`}
                          style={{ width: `${Math.min(pct, 100)}%`, ...(bal >= 0 ? { backgroundColor: meta.color.includes('yellow') ? '#facc15' : meta.color.includes('emerald') ? '#34d399' : meta.color.includes('blue') ? '#60a5fa' : meta.color.includes('indigo') ? '#818cf8' : meta.color.includes('purple') ? '#c084fc' : meta.color.includes('cyan') ? '#22d3ee' : meta.color.includes('orange') ? '#fb923c' : meta.color.includes('pink') ? '#f472b6' : meta.color.includes('teal') ? '#2dd4bf' : '#94a3b8' } : {}) }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Category filter tabs */}
      {byCategory.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilterCat('All')}
            className={cn('px-3.5 py-1.5 rounded-lg text-sm border transition-colors',
              filterCat === 'All' ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-[#2a2d3e] text-slate-400 hover:bg-[#2a2d3e]')}>
            All ({accounts.length})
          </button>
          {byCategory.map(([cat]) => {
            const meta = CATEGORY_META[cat];
            return (
              <button key={cat} onClick={() => setFilterCat(filterCat === cat ? 'All' : cat)}
                className={cn('px-3.5 py-1.5 rounded-lg text-sm border transition-colors flex items-center gap-1.5',
                  filterCat === cat ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-[#2a2d3e] text-slate-400 hover:bg-[#2a2d3e]')}>
                <span className={filterCat === cat ? 'text-white' : meta.color}>{meta.icon}</span>
                {cat} ({accounts.filter((a) => a.category === cat).length})
              </button>
            );
          })}
        </div>
      )}

      {/* Account cards */}
      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-slate-500 text-sm">
            No accounts yet. Click &quot;Add Account&quot; to start tracking your cash and balances.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((acc) => (
            <AccountCard
              key={acc.id}
              account={acc}
              monthlySpend={expenseStats[acc.id]?.spend ?? 0}
              txCount={expenseStats[acc.id]?.count ?? 0}
              onEdit={() => { setEditTarget(acc); setModalOpen(true); }}
              onDelete={() => deleteAccount(acc.id)}
              onAddTx={(type) => openTx(acc, type)}
              onDeleteTx={(txId) => deleteTransaction(acc.id, txId)}
            />
          ))}
        </div>
      )}

      {/* Account add/edit modal */}
      <AccountModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null); }}
        onSubmit={handleAccountSubmit}
        initial={editTarget}
      />

      {/* Transaction modal */}
      {txTarget && (
        <TransactionModal
          account={txTarget}
          defaultType={txDefaultType}
          allAccounts={accounts}
          existingPeople={existingPeople}
          onClose={() => setTxTarget(null)}
          onSubmit={(tx, linkedAccountId, lentTo) => {
            addTransaction(txTarget.id, tx, linkedAccountId);
            if (lentTo) {
              const today = new Date().toISOString().split('T')[0];
              const existing = records.find(
                (r) => r.person_name.toLowerCase() === lentTo.toLowerCase() && r.type === 'lent' && r.status !== 'settled'
              );
              if (existing) {
                // Add to existing record
                addRecord({
                  type: 'lent',
                  person_name: lentTo,
                  amount: tx.amount,
                  settled_amount: 0,
                  date: tx.date ?? today,
                  due_date: '',
                  description: tx.note,
                  status: 'pending',
                });
              } else {
                addRecord({
                  type: 'lent',
                  person_name: lentTo,
                  amount: tx.amount,
                  settled_amount: 0,
                  date: tx.date ?? today,
                  due_date: '',
                  description: tx.note,
                  status: 'pending',
                });
              }
            }
            setTxTarget(null);
          }}
        />
      )}

      {/* Transfer modal */}
      {transferOpen && (
        <TransferModal
          allAccounts={accounts}
          onClose={() => setTransferOpen(false)}
          onTransfer={(fromId, toId, amt, note, date) => {
            // Debit from source account; addTransaction handles the credit on toId via linkedAccountId
            addTransaction(
              fromId,
              { type: 'debit', amount: amt, note: `Transfer to ${accounts.find((a) => a.id === toId)?.name ?? 'account'} — ${note}`, date },
              toId,
            );
            setTransferOpen(false);
          }}
        />
      )}
    </div>
  );
}
