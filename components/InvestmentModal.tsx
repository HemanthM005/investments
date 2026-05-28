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
import { useAssetStore } from '@/lib/assetStore';

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
  'Bond',
  'Other',
];

const GOLD_KARATS = ['24k', '22k', '18k'] as const;
const KARAT_LABEL: Record<string, string> = {
  '24k': '24K — Pure gold / SGB / coins',
  '22k': '22K — Hallmarked jewellery (91.67%)',
  '18k': '18K — Jewellery / mixed alloy (75%)',
};

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
  funded_by_account_id: '',
  funded_by_account_name: '',
  gold_karat: '24k',
  interest_rate: 0,
  maturity_date: '',
};

// Bond current value = principal + simple interest accrued from purchase to today (capped at maturity)
function computeBondCurrentValue(principal: number, ratePct: number, purchaseDate: string, maturityDate?: string): number {
  if (!principal || !ratePct || !purchaseDate) return principal || 0;
  const start = new Date(purchaseDate + 'T00:00:00').getTime();
  let end = Date.now();
  if (maturityDate) {
    const m = new Date(maturityDate + 'T00:00:00').getTime();
    if (m < end) end = m;
  }
  if (!isFinite(start) || end <= start) return principal;
  const years = (end - start) / (1000 * 60 * 60 * 24 * 365.25);
  return Math.round(principal * (1 + (ratePct / 100) * years) * 100) / 100;
}

export default function InvestmentModal({ open, onClose, onSubmit, initialData }: Props) {
  const [form, setForm] = useState<Omit<Investment, 'id'>>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { accounts, hydrate: hydrateAccounts } = useAssetStore();

  useEffect(() => { hydrateAccounts(); }, [hydrateAccounts]);

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
  const isBond = form.asset_type === 'Bond';
  const isGold = form.asset_type === 'Gold';

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.asset_name.trim()) e.asset_name = 'Asset name is required';
    if (!form.sector.trim()) e.sector = 'Sector is required';
    if (isBond && !isWatchlist) {
      if (form.buy_price <= 0) e.buy_price = 'Principal must be greater than 0';
      if ((form.interest_rate ?? 0) <= 0) e.interest_rate = 'Interest rate must be greater than 0';
      if (!form.maturity_date) e.maturity_date = 'Maturity date is required';
      if (!form.purchase_date) e.purchase_date = 'Purchase date is required';
    } else {
      if (form.current_price <= 0) e.current_price = 'Current price must be greater than 0';
      if (!isWatchlist) {
        if (form.buy_price <= 0) e.buy_price = 'Buy price must be greater than 0';
        if (form.quantity <= 0) e.quantity = 'Quantity must be greater than 0';
        if (!form.purchase_date) e.purchase_date = 'Purchase date is required';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (isBond && !isWatchlist) {
      const principal = form.buy_price;
      const current = computeBondCurrentValue(principal, form.interest_rate ?? 0, form.purchase_date, form.maturity_date);
      onSubmit({
        ...form,
        quantity: form.quantity > 0 ? form.quantity : 1,
        current_price: current,
      });
    } else {
      onSubmit(form);
    }
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
            ) : isBond ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="buy_price">Principal Invested (₹) *</Label>
                  <Input id="buy_price" type="number" step="1" placeholder="e.g. 100000"
                    value={form.buy_price || ''}
                    onChange={(e) => setField('buy_price', parseFloat(e.target.value) || 0)} />
                  {errors.buy_price && <p className="text-xs text-red-400">{errors.buy_price}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="interest_rate">Interest Rate (% p.a.) *</Label>
                  <Input id="interest_rate" type="number" step="0.01" placeholder="e.g. 7.5"
                    value={form.interest_rate || ''}
                    onChange={(e) => setField('interest_rate', parseFloat(e.target.value) || 0)} />
                  {errors.interest_rate && <p className="text-xs text-red-400">{errors.interest_rate}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="purchase_date">Purchase Date *</Label>
                  <Input id="purchase_date" type="date" value={form.purchase_date}
                    onChange={(e) => setField('purchase_date', e.target.value)} />
                  {errors.purchase_date && <p className="text-xs text-red-400">{errors.purchase_date}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maturity_date">Maturity Date *</Label>
                  <Input id="maturity_date" type="date" value={form.maturity_date ?? ''}
                    onChange={(e) => setField('maturity_date', e.target.value)} />
                  {errors.maturity_date && <p className="text-xs text-red-400">{errors.maturity_date}</p>}
                </div>

                {form.buy_price > 0 && (form.interest_rate ?? 0) > 0 && form.purchase_date && (() => {
                  const todayVal = computeBondCurrentValue(form.buy_price, form.interest_rate ?? 0, form.purchase_date, form.maturity_date);
                  let maturityVal: number | null = null;
                  if (form.maturity_date) {
                    const start = new Date(form.purchase_date + 'T00:00:00').getTime();
                    const end = new Date(form.maturity_date + 'T00:00:00').getTime();
                    if (end > start) {
                      const years = (end - start) / (1000 * 60 * 60 * 24 * 365.25);
                      maturityVal = Math.round(form.buy_price * (1 + (form.interest_rate ?? 0) / 100 * years) * 100) / 100;
                    }
                  }
                  return (
                    <div className="col-span-2 rounded-md border border-emerald-800/40 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-300">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Current value (today, simple interest):</span>
                        <span className="font-semibold">₹{todayVal.toLocaleString('en-IN')}</span>
                      </div>
                      {maturityVal !== null && (
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-slate-400">Value at maturity:</span>
                          <span className="font-semibold">₹{maturityVal.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {!initialData && (
                  <div className="col-span-2 space-y-1.5">
                    <Label>Funded From Account</Label>
                    <Select
                      value={form.funded_by_account_id || '__none__'}
                      onValueChange={(v) => {
                        if (v === '__none__') {
                          setField('funded_by_account_id', '');
                          setField('funded_by_account_name', '');
                        } else {
                          const acc = accounts.find((a) => a.id === v);
                          setField('funded_by_account_id', v);
                          setField('funded_by_account_name', acc?.name ?? '');
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select account (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None / Don&apos;t track</SelectItem>
                        {accounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                            <span className="ml-1.5 text-xs text-slate-400">({a.category})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">
                      Selecting an account will log a debit of{' '}
                      <span className="text-indigo-400 font-medium">
                        ₹{(form.buy_price || 0).toLocaleString('en-IN')}
                      </span>
                      {' '}against it.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="buy_price">
                    {isGold ? 'Metal Rate at Purchase (₹/g) *' : 'Buy Price (₹) *'}
                  </Label>
                  <Input id="buy_price" type="number" step="0.01" placeholder="0.00"
                    value={form.buy_price || ''}
                    onChange={(e) => setField('buy_price', parseFloat(e.target.value) || 0)} />
                  {errors.buy_price && <p className="text-xs text-red-400">{errors.buy_price}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="current_price">
                    {isGold ? 'Current Rate (₹/g) *' : 'Current Price (₹) *'}
                  </Label>
                  <Input id="current_price" type="number" step="0.01" placeholder="0.00"
                    value={form.current_price || ''}
                    onChange={(e) => setField('current_price', parseFloat(e.target.value) || 0)} />
                  {errors.current_price && <p className="text-xs text-red-400">{errors.current_price}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="quantity">
                    {isGold ? 'Weight (grams) *' : 'Quantity *'}
                  </Label>
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

                {!initialData && (
                  <div className="col-span-2 space-y-1.5">
                    <Label>Funded From Account</Label>
                    <Select
                      value={form.funded_by_account_id || '__none__'}
                      onValueChange={(v) => {
                        if (v === '__none__') {
                          setField('funded_by_account_id', '');
                          setField('funded_by_account_name', '');
                        } else {
                          const acc = accounts.find((a) => a.id === v);
                          setField('funded_by_account_id', v);
                          setField('funded_by_account_name', acc?.name ?? '');
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select account (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None / Don&apos;t track</SelectItem>
                        {accounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                            <span className="ml-1.5 text-xs text-slate-400">({a.category})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">
                      Selecting an account will log a debit of{' '}
                      <span className="text-indigo-400 font-medium">
                        ₹{(
                          (form.buy_price || 0) * (form.quantity || 0)
                          + (isGold ? (form.making_charges ?? 0) + (form.gold_gst ?? 0) : 0)
                        ).toLocaleString('en-IN')}
                      </span>
                      {' '}against it.
                    </p>
                  </div>
                )}
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
              <>
                {/* Karat selector */}
                <div className="col-span-2 space-y-1.5">
                  <Label>Gold Purity (Karat)</Label>
                  <Select
                    value={form.gold_karat ?? '24k'}
                    onValueChange={(v) => setField('gold_karat', v as '24k' | '22k' | '18k')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GOLD_KARATS.map((k) => (
                        <SelectItem key={k} value={k}>{KARAT_LABEL[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Making charges */}
                <div className="space-y-1.5">
                  <Label htmlFor="making_charges">Making Charges (₹)</Label>
                  <Input
                    id="making_charges"
                    type="number"
                    step="1"
                    placeholder="0"
                    value={form.making_charges || ''}
                    onChange={(e) => setField('making_charges', parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-slate-500">Labour / wastage charged by jeweller</p>
                </div>

                {/* GST */}
                <div className="space-y-1.5">
                  <Label htmlFor="gold_gst">GST Paid (₹)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="gold_gst"
                      type="number"
                      step="1"
                      placeholder="0"
                      value={form.gold_gst || ''}
                      onChange={(e) => setField('gold_gst', parseFloat(e.target.value) || 0)}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const metalCost = (form.buy_price || 0) * (form.quantity || 0);
                        const gst = Math.round((metalCost + (form.making_charges ?? 0)) * 0.03);
                        setField('gold_gst', gst);
                      }}
                      className="shrink-0 rounded-md border border-[#2a2d3e] px-2.5 text-xs text-slate-400 hover:text-yellow-300 hover:border-yellow-800/60 transition-colors"
                      title="Auto-calculate: 3% of (metal + making)"
                    >
                      3%
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">3% of (metal + making) per India GST rules</p>
                </div>

                {/* Cost breakdown */}
                {(form.buy_price > 0 && form.quantity > 0) && (() => {
                  const metalCost  = Math.round(form.buy_price * form.quantity * 100) / 100;
                  const making     = form.making_charges ?? 0;
                  const gst        = form.gold_gst ?? 0;
                  const totalCost  = metalCost + making + gst;
                  return (
                    <div className="col-span-2 rounded-md border border-yellow-800/30 bg-yellow-950/15 px-3 py-2.5 text-xs space-y-1">
                      <div className="flex justify-between text-slate-400">
                        <span>Metal cost ({form.quantity}g × ₹{form.buy_price.toLocaleString('en-IN')}/g)</span>
                        <span>₹{metalCost.toLocaleString('en-IN')}</span>
                      </div>
                      {making > 0 && (
                        <div className="flex justify-between text-slate-400">
                          <span>Making charges</span>
                          <span>₹{making.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      {gst > 0 && (
                        <div className="flex justify-between text-slate-400">
                          <span>GST</span>
                          <span>₹{gst.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold text-yellow-300 border-t border-yellow-800/30 pt-1 mt-1">
                        <span>Total paid</span>
                        <span>₹{totalCost.toLocaleString('en-IN')}</span>
                      </div>
                      {(making > 0 || gst > 0) && (
                        <p className="text-slate-500 mt-0.5">
                          Making + GST (₹{(making + gst).toLocaleString('en-IN')}) are sunk costs — not recoverable on resale.
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Live price note */}
                <div className="col-span-2 rounded-md border border-yellow-800/40 bg-yellow-950/20 px-3 py-2 text-xs text-yellow-300">
                  {form.gold_karat === '24k' || !form.gold_karat
                    ? 'Live 24K spot price (₹/g) fetched via COMEX + India duty. Enter metal rate above (not total cost).'
                    : form.gold_karat === '22k'
                    ? 'Current rate auto-set to 24K spot × 91.67%. Enter the metal rate you paid per gram above.'
                    : 'Current rate auto-set to 24K spot × 75%. Enter the metal rate you paid per gram above.'}
                </div>
              </>
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
