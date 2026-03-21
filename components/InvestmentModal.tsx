'use client';

import { useEffect, useState } from 'react';
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
import type { Investment } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Investment, 'id'>) => void;
  initialData?: Investment | null;
}

const ASSET_TYPES: Investment['asset_type'][] = [
  'Stock',
  'ETF',
  'Crypto',
  'Mutual Fund',
  'Gold',
  'Other',
];

const EMPTY_FORM: Omit<Investment, 'id'> = {
  asset_name: '',
  asset_type: 'Stock',
  sector: '',
  buy_price: 0,
  current_price: 0,
  quantity: 0,
  purchase_date: new Date().toISOString().split('T')[0],
  notes: '',
  ticker: '',
  status: 'active',
  buy_range: '',
};

export default function InvestmentModal({ open, onClose, onSubmit, initialData }: Props) {
  const [form, setForm] = useState<Omit<Investment, 'id'>>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      const { id: _id, ...rest } = initialData;
      setForm(rest);
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [initialData, open]);

  const isWatchlist = form.status === 'watchlist';

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.asset_name.trim()) e.asset_name = 'Asset name is required';
    if (!form.sector.trim()) e.sector = 'Sector is required';
    if (form.current_price <= 0) e.current_price = 'Current price must be greater than 0';
    if (!isWatchlist) {
      if (form.buy_price <= 0) e.buy_price = 'Buy price must be greater than 0';
      if (form.quantity <= 0) e.quantity = 'Quantity must be greater than 0';
      if (!form.purchase_date) e.purchase_date = 'Purchase date is required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(form);
  };

  const setField = <K extends keyof typeof form>(key: K, value: typeof form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Investment' : 'Add Investment'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Portfolio vs Watchlist toggle */}
          <div className="flex rounded-lg border border-[#2a2d3e] overflow-hidden text-sm">
            {(['active', 'watchlist'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setField('status', s)}
                className={`flex-1 py-2 font-medium transition-colors ${
                  form.status === s
                    ? s === 'watchlist' ? 'bg-violet-900/40 text-violet-300' : 'bg-indigo-900/40 text-indigo-300'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {s === 'active' ? 'Portfolio (Owned)' : 'Watchlist (Research)'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="asset_name">Asset Name *</Label>
              <Input
                id="asset_name"
                placeholder="e.g. HAL, Nifty BeES"
                value={form.asset_name}
                onChange={(e) => setField('asset_name', e.target.value)}
              />
              {errors.asset_name && <p className="text-xs text-red-400">{errors.asset_name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Asset Type *</Label>
              <Select
                value={form.asset_type}
                onValueChange={(v) => setField('asset_type', v as Investment['asset_type'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sector">Sector *</Label>
              <Input
                id="sector"
                placeholder="e.g. Defence, IT"
                value={form.sector}
                onChange={(e) => setField('sector', e.target.value)}
              />
              {errors.sector && <p className="text-xs text-red-400">{errors.sector}</p>}
            </div>

            {isWatchlist ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="current_price">Current Price (₹) *</Label>
                  <Input id="current_price" type="number" step="0.01" placeholder="0.00"
                    value={form.current_price || ''}
                    onChange={(e) => setField('current_price', parseFloat(e.target.value) || 0)} />
                  {errors.current_price && <p className="text-xs text-red-400">{errors.current_price}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="buy_range">Buy Range (₹) <span className="text-slate-500 font-normal">e.g. 3500-3750</span></Label>
                  <Input id="buy_range" placeholder="low-high" value={form.buy_range ?? ''}
                    onChange={(e) => setField('buy_range', e.target.value)} />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="buy_price">Buy Price (₹) *</Label>
                  <Input id="buy_price" type="number" step="0.01" placeholder="0.00"
                    value={form.buy_price || ''}
                    onChange={(e) => setField('buy_price', parseFloat(e.target.value) || 0)} />
                  {errors.buy_price && <p className="text-xs text-red-400">{errors.buy_price}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="current_price">Current Price (₹) *</Label>
                  <Input id="current_price" type="number" step="0.01" placeholder="0.00"
                    value={form.current_price || ''}
                    onChange={(e) => setField('current_price', parseFloat(e.target.value) || 0)} />
                  {errors.current_price && <p className="text-xs text-red-400">{errors.current_price}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input id="quantity" type="number" step="0.001" placeholder="0"
                    value={form.quantity || ''}
                    onChange={(e) => setField('quantity', parseFloat(e.target.value) || 0)} />
                  {errors.quantity && <p className="text-xs text-red-400">{errors.quantity}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="purchase_date">Purchase Date *</Label>
                  <Input id="purchase_date" type="date" value={form.purchase_date}
                    onChange={(e) => setField('purchase_date', e.target.value)} />
                  {errors.purchase_date && <p className="text-xs text-red-400">{errors.purchase_date}</p>}
                </div>
              </>
            )}

            {(form.asset_type === 'Stock' || form.asset_type === 'ETF') && (
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="ticker">
                  NSE Ticker
                  <span className="ml-1.5 text-xs text-slate-500 font-normal">— for live price sync (optional)</span>
                </Label>
                <Input
                  id="ticker"
                  placeholder="e.g. HAL.NS, TATAPOW.NS, NIFTYBEES.NS"
                  value={form.ticker ?? ''}
                  onChange={(e) => setField('ticker', e.target.value.toUpperCase().trim())}
                />
                <p className="text-xs text-slate-500">
                  Use NSE symbol + <span className="text-indigo-400 font-medium">.NS</span> suffix.
                  Find it on <span className="text-indigo-400">NSE India</span> or search Yahoo Finance.
                </p>
              </div>
            )}

            {form.asset_type === 'Crypto' && (
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="ticker">
                  CoinGecko ID
                  <span className="ml-1.5 text-xs text-slate-500 font-normal">— for live price sync</span>
                </Label>
                <Input
                  id="ticker"
                  placeholder="e.g. bitcoin, ethereum, ripple, internet-computer"
                  value={form.ticker ?? ''}
                  onChange={(e) => setField('ticker', e.target.value.toLowerCase().trim())}
                />
                <p className="text-xs text-slate-500">
                  Find the exact ID at{' '}
                  <span className="text-indigo-400">coingecko.com</span>
                  {' '}→ search your coin → copy the ID from the URL.
                </p>
              </div>
            )}

            {form.asset_type === 'Mutual Fund' && (
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="ticker">
                  AMFI Scheme Code
                  <span className="ml-1.5 text-xs text-slate-500 font-normal">— for live NAV sync (optional)</span>
                </Label>
                <Input
                  id="ticker"
                  placeholder="e.g. 122639"
                  value={form.ticker ?? ''}
                  onChange={(e) => setField('ticker', e.target.value.trim())}
                />
                <p className="text-xs text-slate-500">
                  Find your fund&apos;s scheme code at{' '}
                  <span className="text-indigo-400 font-medium">mfapi.in</span>
                  {' '}→ search fund name → copy the number from the URL.
                </p>
              </div>
            )}

            {form.asset_type === 'Gold' && (
              <div className="col-span-2 rounded-md border border-yellow-800/40 bg-yellow-950/20 px-3 py-2 text-xs text-yellow-300">
                Live 24K gold spot price (₹/gram) will be fetched automatically.
                Set <strong>Quantity</strong> to the number of grams you hold (1 SGB unit = 1 gram).
              </div>
            )}

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Optional notes about this investment..."
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{initialData ? 'Save Changes' : 'Add Investment'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
