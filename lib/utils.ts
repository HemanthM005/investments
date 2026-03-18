import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Investment, PortfolioStats } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)}Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)}L`;
  }
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);
  return `₹${formatted}`;
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function computeStats(investments: Investment[]): PortfolioStats {
  if (!investments.length) {
    return {
      totalInvested: 0,
      currentValue: 0,
      totalPnL: 0,
      pnlPercent: 0,
      bestAsset: null,
      worstAsset: null,
    };
  }

  let totalInvested = 0;
  let currentValue = 0;

  investments.forEach((inv) => {
    totalInvested += inv.buy_price * inv.quantity;
    currentValue += inv.current_price * inv.quantity;
  });

  const totalPnL = currentValue - totalInvested;
  const pnlPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

  const withPnl = investments.map((inv) => ({
    inv,
    pnl:
      inv.buy_price > 0
        ? ((inv.current_price - inv.buy_price) / inv.buy_price) * 100
        : 0,
  }));

  const sorted = [...withPnl].sort((a, b) => b.pnl - a.pnl);
  const bestAsset = sorted[0]?.inv ?? null;
  const worstAsset = sorted[sorted.length - 1]?.inv ?? null;

  return { totalInvested, currentValue, totalPnL, pnlPercent, bestAsset, worstAsset };
}

export function getPnlPercent(inv: Investment): number {
  if (inv.buy_price === 0) return 0;
  return ((inv.current_price - inv.buy_price) / inv.buy_price) * 100;
}
