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

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.asset_name.trim()) e.asset_name = 'Asset name is required';
    if (!form.sector.trim()) e.sector = 'Sector is required';
    if (form.buy_price <= 0) e.buy_price = 'Buy price must be greater than 0';
    if (form.current_price <= 0) e.current_price = 'Current price must be greater than 0';
    if (form.quantity <= 0) e.quantity = 'Quantity must be greater than 0';
    if (!form.purchase_date) e.purchase_date = 'Purchase date is required';
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

            <div className="space-y-1.5">
              <Label htmlFor="buy_price">Buy Price (₹) *</Label>
              <Input
                id="buy_price"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.buy_price || ''}
                onChange={(e) => setField('buy_price', parseFloat(e.target.value) || 0)}
              />
              {errors.buy_price && <p className="text-xs text-red-400">{errors.buy_price}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="current_price">Current Price (₹) *</Label>
              <Input
                id="current_price"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.current_price || ''}
                onChange={(e) => setField('current_price', parseFloat(e.target.value) || 0)}
              />
              {errors.current_price && <p className="text-xs text-red-400">{errors.current_price}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.001"
                placeholder="0"
                value={form.quantity || ''}
                onChange={(e) => setField('quantity', parseFloat(e.target.value) || 0)}
              />
              {errors.quantity && <p className="text-xs text-red-400">{errors.quantity}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="purchase_date">Purchase Date *</Label>
              <Input
                id="purchase_date"
                type="date"
                value={form.purchase_date}
                onChange={(e) => setField('purchase_date', e.target.value)}
              />
              {errors.purchase_date && <p className="text-xs text-red-400">{errors.purchase_date}</p>}
            </div>

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
