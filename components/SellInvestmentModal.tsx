'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TrendingDown, TrendingUp, Info, Plus, AlertCircle } from 'lucide-react';
import type { Investment, AssetCategory } from '@/lib/types';
import { useAssetStore } from '@/lib/assetStore';
import { formatCurrency, computeCapitalGains, formatHoldingPeriod, type CapitalGainsResult } from '@/lib/utils';

type SaleResult = CapitalGainsResult;

const BROKER_PRESETS = ['Groww', 'Zerodha', 'Upstox', 'Angel One', 'Paytm Money', 'HDFC Sky'];

interface Props {
  investment: Investment | null;
  isEditMode?: boolean;
  onClose: () => void;
  onConfirm: (saleData: {
    sold_price: number;
    sold_date: string;
    sale_charges: number;
    credited_to_account_id: string;
    credited_to_account_name: string;
    notes?: string;
  }, isEdit: boolean) => void;
}

export default function SellInvestmentModal({ investment, isEditMode = false, onClose, onConfirm }: Props) {
  const open = !!investment;
  const today = new Date().toISOString().split('T')[0];

  const [soldPrice, setSoldPrice] = useState('');
  const [soldDate, setSoldDate] = useState(today);
  const [charges, setCharges] = useState('');
  const [creditAccountId, setCreditAccountId] = useState('__none__');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Quick-add broker account state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddCategory, setQuickAddCategory] = useState<AssetCategory>('Digital Wallet');
  const [quickAddBalance, setQuickAddBalance] = useState('');

  const { accounts, hydrate: hydrateAccounts, addAccount } = useAssetStore();

  useEffect(() => { hydrateAccounts(); }, [hydrateAccounts]);

  // Pre-fill form — either blank (new sale) or from investment's existing sale data (edit)
  useEffect(() => {
    if (!open) return;
    if (isEditMode && investment) {
      setSoldPrice(investment.sold_price?.toString() ?? '');
      setSoldDate(investment.sold_date ?? today);
      setCharges(investment.sale_charges?.toString() ?? '');
      setCreditAccountId(investment.credited_to_account_id || '__none__');
    } else {
      setSoldPrice('');
      setSoldDate(today);
      setCharges('');
      setCreditAccountId('__none__');
    }
    setNotes('');
    setErrors({});
    setShowQuickAdd(false);
    setQuickAddName('');
    setQuickAddBalance('');
  }, [open, isEditMode, investment, today]);

  const result = useMemo<SaleResult | null>(() => {
    if (!investment) return null;
    const price = parseFloat(soldPrice);
    if (!price || price <= 0 || !soldDate) return null;
    return computeCapitalGains(investment, price, soldDate, parseFloat(charges) || 0);
  }, [investment, soldPrice, soldDate, charges]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!soldPrice || parseFloat(soldPrice) <= 0) e.soldPrice = 'Enter a valid sale price';
    if (!soldDate) e.soldDate = 'Sale date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleConfirm = () => {
    if (!validate() || !investment) return;
    const acc = accounts.find((a) => a.id === creditAccountId);
    onConfirm({
      sold_price: parseFloat(soldPrice),
      sold_date: soldDate,
      sale_charges: parseFloat(charges) || 0,
      credited_to_account_id: creditAccountId === '__none__' ? '' : creditAccountId,
      credited_to_account_name: acc?.name ?? '',
      notes: notes.trim() || undefined,
    }, isEditMode);
  };

  const handleQuickAdd = () => {
    if (!quickAddName.trim()) return;
    const initialBalance = parseFloat(quickAddBalance) || 0;
    addAccount({
      name: quickAddName.trim(),
      category: quickAddCategory,
      balance: initialBalance,
      interest_rate: 0,
      maturity_date: '',
      notes: 'Added via sell flow',
      last_updated: today,
      transactions: [],
    });
    // After addAccount, the new account will appear in accounts[] on next render.
    // We find it by name match since we don't get back the id directly.
    // We'll handle selection after render via a flag approach.
    setShowQuickAdd(false);
    setQuickAddName('');
    setQuickAddBalance('');
    // Mark pending so we can auto-select after re-render
    setPendingSelectName(quickAddName.trim());
  };

  const [pendingSelectName, setPendingSelectName] = useState<string | null>(null);
  useEffect(() => {
    if (!pendingSelectName) return;
    const found = accounts.find((a) => a.name === pendingSelectName);
    if (found) {
      setCreditAccountId(found.id);
      setPendingSelectName(null);
    }
  }, [accounts, pendingSelectName]);

  if (!investment) return null;

  const costBasis = investment.buy_price * investment.quantity;
  const selectedAccount = accounts.find((a) => a.id === creditAccountId);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-amber-400" />
            {isEditMode ? 'Edit Sale' : 'Sell'} — {investment.asset_name}
          </DialogTitle>
          <p className="text-sm text-slate-400 mt-1">
            {investment.quantity} units · Bought {formatCurrency(investment.buy_price)}/unit · {investment.purchase_date}
          </p>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Sale Price + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sold_price">Sale Price / unit (₹) *</Label>
              <Input
                id="sold_price"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={soldPrice}
                onChange={(e) => { setSoldPrice(e.target.value); setErrors((p) => ({ ...p, soldPrice: '' })); }}
              />
              {errors.soldPrice && <p className="text-xs text-red-400">{errors.soldPrice}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sold_date">Sale Date *</Label>
              <Input
                id="sold_date"
                type="date"
                value={soldDate}
                onChange={(e) => { setSoldDate(e.target.value); setErrors((p) => ({ ...p, soldDate: '' })); }}
              />
              {errors.soldDate && <p className="text-xs text-red-400">{errors.soldDate}</p>}
            </div>
          </div>

          {/* Charges */}
          <div className="space-y-1.5">
            <Label htmlFor="charges">
              Total Sale Charges (₹)
              <span className="ml-1.5 text-xs text-slate-500 font-normal">brokerage + STT + stamp duty + GST</span>
            </Label>
            <Input
              id="charges"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={charges}
              onChange={(e) => setCharges(e.target.value)}
            />
          </div>

          {/* Credit account */}
          <div className="space-y-2">
            <Label>Sale Proceeds Credited To</Label>
            <Select value={creditAccountId} onValueChange={setCreditAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select account or wallet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  <span className="text-slate-400">Not tracked</span>
                </SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                    <span className="ml-1.5 text-xs text-slate-400">({a.category})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Net proceeds note */}
            {creditAccountId !== '__none__' && result && (
              <p className="text-xs text-slate-500">
                Will credit{' '}
                <span className="text-emerald-400 font-medium">{formatCurrency(result.netProceeds)}</span>
                {' '}to <span className="text-slate-300">{selectedAccount?.name}</span>.
                {isEditMode && <span className="ml-1 text-amber-500">If you had a previous account selected, reverse that transaction manually in Cash &amp; Accounts.</span>}
              </p>
            )}

            {/* Quick-add broker/wallet */}
            {!showQuickAdd ? (
              <button
                type="button"
                onClick={() => setShowQuickAdd(true)}
                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Add broker / wallet account (Groww, Zerodha…)
              </button>
            ) : (
              <div className="rounded-lg border border-indigo-800/40 bg-indigo-950/20 p-3 space-y-3">
                <p className="text-xs font-semibold text-indigo-300">Quick-add broker or wallet account</p>

                {/* Preset chips */}
                <div className="flex flex-wrap gap-1.5">
                  {BROKER_PRESETS.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setQuickAddName(name)}
                      className={`rounded-full px-2.5 py-0.5 text-xs border transition-colors ${
                        quickAddName === name
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'border-[#2a2d3e] text-slate-400 hover:border-indigo-600 hover:text-indigo-300'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Account Name *</Label>
                    <Input
                      placeholder="e.g. Groww Wallet"
                      value={quickAddName}
                      onChange={(e) => setQuickAddName(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select value={quickAddCategory} onValueChange={(v) => setQuickAddCategory(v as AssetCategory)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Digital Wallet">Digital Wallet</SelectItem>
                        <SelectItem value="Savings Account">Savings Account</SelectItem>
                        <SelectItem value="Current Account">Current Account</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">
                    Current balance (₹)
                    <span className="ml-1 text-slate-600 font-normal">before this sale — optional</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={quickAddBalance}
                    onChange={(e) => setQuickAddBalance(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleQuickAdd}
                    disabled={!quickAddName.trim()}
                    className="h-7 text-xs"
                  >
                    Add &amp; Select
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { setShowQuickAdd(false); setQuickAddName(''); }}
                    className="h-7 text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="sell_notes">Notes (optional)</Label>
            <Textarea
              id="sell_notes"
              placeholder="Why did you sell? Any relevant context..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>

          {/* Edit mode warning */}
          {isEditMode && (
            <div className="flex gap-2 rounded-md border border-amber-800/40 bg-amber-950/20 px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-amber-400" />
              <p className="text-xs text-amber-300 leading-relaxed">
                If you&apos;re changing the credited account, the new account will be credited automatically. The old account is <strong>not</strong> auto-reversed — fix it manually in Cash &amp; Accounts if needed.
              </p>
            </div>
          )}

          {/* Tax & P&L Preview */}
          {result ? (
            <div className="rounded-lg border border-[#2a2d3e] bg-[#0f1117] p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sale Summary</p>

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Gross Proceeds</span>
                  <span className="text-slate-200 font-medium">{formatCurrency(result.grossProceeds)}</span>
                </div>
                {result.grossProceeds !== result.netProceeds && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Less: Charges</span>
                    <span className="text-red-400">−{formatCurrency(result.grossProceeds - result.netProceeds)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Net Proceeds</span>
                  <span className="text-slate-200 font-medium">{formatCurrency(result.netProceeds)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cost Basis</span>
                  <span className="text-slate-400">−{formatCurrency(costBasis)}</span>
                </div>
                <div className="flex justify-between border-t border-[#2a2d3e] pt-1.5">
                  <span className="font-semibold text-slate-200">Realized P&amp;L</span>
                  <span className={`font-bold text-base ${result.realizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {result.realizedPnL >= 0 ? '+' : ''}{formatCurrency(result.realizedPnL)}
                  </span>
                </div>
              </div>

              <div className="border-t border-[#2a2d3e] pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Holding Period</span>
                  <span className={`font-medium ${result.isLTCG ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {formatHoldingPeriod(result.holdingDays)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tax Category</span>
                  <span className={`font-medium ${result.isLTCG ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {result.taxType}
                  </span>
                </div>
                {result.realizedPnL > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tax Rate</span>
                      <span className="text-slate-200">
                        {typeof result.taxRate === 'number' ? `${result.taxRate}%` : result.taxRate}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-[#2a2d3e] pt-1.5">
                      <span className="font-semibold text-slate-200">Est. Tax Liability</span>
                      <span className="font-bold text-amber-400">{formatCurrency(result.estimatedTax)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-2 rounded-md bg-slate-800/50 p-2.5">
                <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-slate-500" />
                <p className="text-xs text-slate-500 leading-relaxed">{result.taxNote}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[#2a2d3e] p-4 text-center text-sm text-slate-500">
              Enter a sale price to see the P&amp;L and tax estimate
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={handleConfirm}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
            >
              {result && result.realizedPnL >= 0
                ? <TrendingUp className="h-4 w-4" />
                : <TrendingDown className="h-4 w-4" />
              }
              {isEditMode ? 'Update Sale' : 'Confirm Sale'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
