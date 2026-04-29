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

export interface CapitalGainsResult {
  grossProceeds: number;
  netProceeds: number;
  costBasis: number;
  realizedPnL: number;
  holdingDays: number;
  holdingMonths: number;
  taxType: string;
  taxRate: number | string;
  estimatedTax: number;
  taxNote: string;
  isLTCG: boolean;
}

export function computeCapitalGains(inv: Investment, soldPrice: number, soldDate: string, charges: number): CapitalGainsResult {
  const grossProceeds = soldPrice * inv.quantity;
  const netProceeds = grossProceeds - charges;
  const costBasis = inv.buy_price * inv.quantity;
  const realizedPnL = netProceeds - costBasis;

  const buyDate = new Date(inv.purchase_date);
  const sellDate = new Date(soldDate);
  const holdingDays = Math.max(0, Math.floor((sellDate.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24)));
  const holdingMonths = holdingDays / 30.44;

  if (realizedPnL <= 0) {
    return {
      grossProceeds, netProceeds, costBasis, realizedPnL,
      holdingDays, holdingMonths,
      taxType: 'No tax (capital loss)',
      taxRate: 0,
      estimatedTax: 0,
      taxNote: 'Capital losses can be carried forward for 8 years to offset future gains.',
      isLTCG: holdingMonths >= 12,
    };
  }

  if (inv.asset_type === 'Crypto') {
    return {
      grossProceeds, netProceeds, costBasis, realizedPnL,
      holdingDays, holdingMonths,
      taxType: 'VDA Tax (Crypto)',
      taxRate: 30,
      estimatedTax: realizedPnL * 0.30,
      taxNote: 'Crypto gains are taxed at flat 30% regardless of holding period. Additionally, 1% TDS is deducted at source.',
      isLTCG: false,
    };
  }

  if (inv.asset_type === 'Stock' || inv.asset_type === 'ETF') {
    const isLTCG = holdingMonths >= 12;
    if (!isLTCG) {
      return {
        grossProceeds, netProceeds, costBasis, realizedPnL,
        holdingDays, holdingMonths,
        taxType: 'STCG — Equity',
        taxRate: 20,
        estimatedTax: realizedPnL * 0.20,
        taxNote: 'Short-term capital gains (< 12 months) on listed equity are taxed at 20% (post Budget 2024).',
        isLTCG: false,
      };
    }
    const taxableGain = Math.max(0, realizedPnL - 125000);
    return {
      grossProceeds, netProceeds, costBasis, realizedPnL,
      holdingDays, holdingMonths,
      taxType: 'LTCG — Equity',
      taxRate: 12.5,
      estimatedTax: taxableGain * 0.125,
      taxNote: 'Long-term gains (≥ 12 months) on listed equity are taxed at 12.5%. First ₹1.25L of LTCG per year is exempt.',
      isLTCG: true,
    };
  }

  if (inv.asset_type === 'Mutual Fund') {
    const isLTCG = holdingMonths >= 12;
    if (!isLTCG) {
      return {
        grossProceeds, netProceeds, costBasis, realizedPnL,
        holdingDays, holdingMonths,
        taxType: 'STCG — Equity MF',
        taxRate: 20,
        estimatedTax: realizedPnL * 0.20,
        taxNote: 'Applies to equity mutual funds (≥65% equity exposure). Debt MF gains are taxed at your income slab rate.',
        isLTCG: false,
      };
    }
    const taxableGain = Math.max(0, realizedPnL - 125000);
    return {
      grossProceeds, netProceeds, costBasis, realizedPnL,
      holdingDays, holdingMonths,
      taxType: 'LTCG — Equity MF',
      taxRate: 12.5,
      estimatedTax: taxableGain * 0.125,
      taxNote: 'Applies to equity mutual funds. ₹1.25L annual LTCG exemption applies. Debt MF gains are taxed at slab rate regardless of holding period.',
      isLTCG: true,
    };
  }

  if (inv.asset_type === 'Gold') {
    const isLTCG = holdingMonths >= 24;
    if (!isLTCG) {
      return {
        grossProceeds, netProceeds, costBasis, realizedPnL,
        holdingDays, holdingMonths,
        taxType: 'STCG — Gold',
        taxRate: 'slab rate',
        estimatedTax: realizedPnL * 0.30,
        taxNote: 'Short-term gold gains (< 24 months) are taxed at your income slab rate. Estimated at 30% — adjust based on your tax bracket.',
        isLTCG: false,
      };
    }
    return {
      grossProceeds, netProceeds, costBasis, realizedPnL,
      holdingDays, holdingMonths,
      taxType: 'LTCG — Gold',
      taxRate: 12.5,
      estimatedTax: realizedPnL * 0.125,
      taxNote: 'Long-term gold gains (≥ 24 months) are taxed at 12.5% without indexation (post Budget 2024).',
      isLTCG: true,
    };
  }

  return {
    grossProceeds, netProceeds, costBasis, realizedPnL,
    holdingDays, holdingMonths,
    taxType: 'Capital Gains — Other',
    taxRate: 'slab rate',
    estimatedTax: realizedPnL * 0.30,
    taxNote: 'Gains on this asset type are taxed at your income slab rate. Estimated at 30% — adjust based on your bracket.',
    isLTCG: false,
  };
}

export function formatHoldingPeriod(days: number): string {
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''}`;
  const months = Math.floor(days / 30.44);
  const remDays = days - Math.round(months * 30.44);
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''}${remDays > 0 ? ` ${remDays}d` : ''}`;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  return `${years}y ${remMonths}m`;
}
