'use client';

import type { AccountTransaction, BondPayout, BondPayoutFrequency, Investment, PrincipalInstallment } from './types';
import { useInvestmentStore } from './store';
import { useAssetStore } from './assetStore';
import { saveSections } from './saveHelper';

// ── Bond payout schedule ────────────────────────────────────────────────────
// A bond with `interest_frequency` set pays interest (and optionally amortises
// principal) on a fixed schedule into `payout_account_id`. Interest accrues on
// the outstanding principal using an actual/365 day count, so it follows the
// principal down as it is repaid. Bonds without `interest_frequency` keep the
// legacy behaviour: simple interest accrues into current_price until maturity.

export const BOND_FREQUENCIES: BondPayoutFrequency[] = ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'At Maturity'];

// 'Custom' principal installments that fall inside the tenure (maturity takes whatever remains)
export function customInstallments(inv: Pick<Investment, 'purchase_date' | 'maturity_date' | 'principal_schedule'>): PrincipalInstallment[] {
  const byDate = new Map<string, number>();
  for (const i of inv.principal_schedule ?? []) {
    if (!i.date || !(i.amount > 0)) continue;
    if (i.date <= inv.purchase_date || (inv.maturity_date && i.date >= inv.maturity_date)) continue;
    byDate.set(i.date, (byDate.get(i.date) ?? 0) + i.amount);
  }
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, amount]) => ({ date, amount }));
}

const MONTHS: Record<Exclude<BondPayoutFrequency, 'At Maturity'>, number> = {
  Monthly: 1, Quarterly: 3, 'Half-Yearly': 6, Yearly: 12,
};

export interface ScheduledPayout {
  date: string;
  interest: number;          // gross
  tds: number;
  principal: number;
  outstanding_after: number; // principal still owed after this payout
}

// ── date helpers (UTC so YYYY-MM-DD never shifts with the local timezone) ──

export function todayStr(): string {
  const d = new Date();
  return fmt(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

function fmt(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function toUTC(s: string): number {
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

// Add months keeping the day of month (clamped to month end: Jan 31 → Feb 28 → Mar 31)
export function addMonths(date: string, months: number, anchorDay?: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const total = m - 1 + months;
  const ny = y + Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return fmt(ny, nm + 1, Math.min(anchorDay ?? d, lastDay));
}

function daysBetween(a: string, b: string): number {
  return Math.round((toUTC(b) - toUTC(a)) / 86_400_000);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// ── schedule ────────────────────────────────────────────────────────────────

export function isScheduledBond(inv: Investment): boolean {
  return inv.asset_type === 'Bond'
    && !!inv.interest_frequency
    && !!inv.purchase_date
    && !!inv.maturity_date
    && inv.maturity_date > inv.purchase_date
    && inv.buy_price > 0;
}

export function bondPrincipal(inv: Investment): number {
  return round2(inv.buy_price * (inv.quantity || 1));
}

// Payout dates from `anchor` every `freq` until maturity; maturity is always the last one
function payoutDates(freq: BondPayoutFrequency, anchor: string, purchase: string, maturity: string): string[] {
  if (freq === 'At Maturity') return [maturity];
  const step = MONTHS[freq];
  const anchorDay = Number(anchor.split('-')[2]);
  const out: string[] = [];
  for (let k = 0; k < 1200; k++) {
    const d = addMonths(anchor, k * step, anchorDay);
    if (d >= maturity) break;
    if (d > purchase) out.push(d);
  }
  out.push(maturity);
  return out;
}

interface Simulation {
  schedule: ScheduledPayout[];
  outstandingAt: number; // principal outstanding on `stopAt`
  accruedAt: number;     // interest accrued but not yet scheduled for payment on `stopAt`
}

function simulate(inv: Investment, stopAt?: string): Simulation {
  if (!isScheduledBond(inv)) return { schedule: [], outstandingAt: 0, accruedAt: 0 };

  const purchase = inv.purchase_date;
  const maturity = inv.maturity_date!;
  const principal = bondPrincipal(inv);
  const rate = (inv.interest_rate ?? 0) / 100;
  const tdsPct = inv.tds_percent ?? 0;
  const iFreq = inv.interest_frequency!;
  const pFreq = inv.principal_frequency ?? 'At Maturity';
  const im = iFreq === 'At Maturity' ? 0 : MONTHS[iFreq];
  const pm = pFreq === 'At Maturity' || pFreq === 'Custom' ? 0 : MONTHS[pFreq];

  const interestAnchor = inv.first_payout_date || (im ? addMonths(purchase, im) : maturity);
  // Principal lines up with the interest calendar: with monthly interest and quarterly
  // principal, the first principal repayment lands on the 3rd interest date.
  const principalAnchor = inv.first_payout_date
    ? addMonths(inv.first_payout_date, im ? Math.max(pm - im, 0) : 0)
    : (pm ? addMonths(purchase, pm) : maturity);

  const interestDates = new Set(payoutDates(iFreq, interestAnchor, purchase, maturity));
  // Custom: the listed installments, then maturity repays the remainder
  const custom = pFreq === 'Custom' ? customInstallments(inv) : [];
  const customAmount = new Map(custom.map((i) => [i.date, i.amount]));
  const principalDates = pFreq === 'Custom'
    ? [...custom.map((i) => i.date), maturity]
    : payoutDates(pFreq, principalAnchor, purchase, maturity);
  const principalSet = new Set(principalDates);
  const events = [...new Set([...interestDates, ...principalDates])].sort();

  const installment = principal / principalDates.length;
  let outstanding = principal;
  let accrued = 0;
  let prev = purchase;
  let principalPaid = 0;
  let captured: { outstanding: number; accrued: number } | null = null;
  const schedule: ScheduledPayout[] = [];

  for (const d of events) {
    if (stopAt && !captured && d > stopAt) {
      const extra = stopAt > prev ? outstanding * rate * daysBetween(prev, stopAt) / 365 : 0;
      captured = { outstanding, accrued: accrued + extra };
    }
    accrued += outstanding * rate * daysBetween(prev, d) / 365;
    prev = d;

    let interest = 0;
    let principalOut = 0;
    if (interestDates.has(d)) {
      interest = round2(accrued);
      accrued = 0;
    }
    if (principalSet.has(d)) {
      principalPaid++;
      principalOut = principalPaid === principalDates.length
        ? round2(outstanding)
        : round2(Math.min(customAmount.get(d) ?? installment, outstanding));
      outstanding = round2(outstanding - principalOut);
    }
    schedule.push({
      date: d,
      interest,
      tds: round2(interest * tdsPct / 100),
      principal: principalOut,
      outstanding_after: outstanding,
    });
  }

  return {
    schedule,
    outstandingAt: captured?.outstanding ?? (stopAt && stopAt < purchase ? principal : 0),
    accruedAt: round2(captured?.accrued ?? 0),
  };
}

export function bondSchedule(inv: Investment): ScheduledPayout[] {
  return simulate(inv).schedule;
}

export function netAmount(p: { interest: number; tds: number; principal: number }): number {
  return round2(p.interest - p.tds + p.principal);
}

export interface BondStatus {
  schedule: ScheduledPayout[];
  received: BondPayout[];         // credited or skipped
  due: ScheduledPayout[];         // date ≤ today and not yet recorded
  upcoming: ScheduledPayout[];    // date > today
  next: ScheduledPayout | null;
  outstanding: number;            // principal outstanding per schedule
  accrued: number;                // interest earned since last payout date
  matured: boolean;               // past maturity and every payout recorded
}

export function bondStatus(inv: Investment, today = todayStr()): BondStatus {
  const { schedule, outstandingAt, accruedAt } = simulate(inv, today);
  const received = inv.bond_payouts ?? [];
  const recorded = new Set(received.map((p) => p.date));
  const due = schedule.filter((s) => s.date <= today && !recorded.has(s.date));
  const upcoming = schedule.filter((s) => s.date > today);
  return {
    schedule,
    received,
    due,
    upcoming,
    next: upcoming[0] ?? null,
    outstanding: outstandingAt,
    accrued: accruedAt,
    matured: !!inv.maturity_date && inv.maturity_date <= today && due.length === 0,
  };
}

// Legacy bonds: principal + simple interest accrued (capped at maturity)
function legacyAccruedValue(inv: Investment): number {
  if (!inv.interest_rate || !inv.purchase_date) return inv.current_price;
  const start = new Date(inv.purchase_date + 'T00:00:00').getTime();
  let end = Date.now();
  if (inv.maturity_date) {
    const m = new Date(inv.maturity_date + 'T00:00:00').getTime();
    if (m < end) end = m;
  }
  if (!isFinite(start) || end <= start) return inv.buy_price;
  const years = (end - start) / (1000 * 60 * 60 * 24 * 365.25);
  return round2(inv.buy_price * (1 + inv.interest_rate / 100 * years));
}

// Display-only projection of a bond to today's value. For scheduled bonds the
// invested amount is the principal still held (repaid principal is back in the
// bank), and value adds interest accrued since the last payout. Payouts that are
// due but not yet credited still count as part of the holding.
export function projectBond(inv: Investment, today = todayStr()): Investment {
  if (inv.asset_type !== 'Bond') return inv;
  if (!isScheduledBond(inv)) return { ...inv, current_price: legacyAccruedValue(inv) };
  const st = bondStatus(inv, today);
  const qty = inv.quantity || 1;
  const duePrincipal = st.due.reduce((s, p) => s + p.principal, 0);
  const dueInterest = st.due.reduce((s, p) => s + p.interest - p.tds, 0);
  const invested = st.outstanding + duePrincipal;
  const value = invested + dueInterest + st.accrued;
  return { ...inv, buy_price: round2(invested / qty), current_price: round2(value / qty) };
}

// ── crediting ───────────────────────────────────────────────────────────────

export interface CreditResult {
  count: number;
  total: number;
}

function payoutNote(inv: Investment, p: ScheduledPayout): string {
  if (p.principal > 0 && p.interest > 0) return `Bond payout: ${inv.asset_name} (interest + principal)`;
  if (p.principal > 0) return `Bond principal: ${inv.asset_name}`;
  return `Bond interest: ${inv.asset_name}`;
}

// Record due payouts and credit each to the bond's payout account, persisting
// investments + accounts in ONE atomic write.
//   only.investmentId / only.date — restrict to one bond / one payout
//   requireAccount                — skip bonds with no payout account (auto-credit)
//   skip                          — record as skipped (no money moves), e.g. a missed/defaulted payout
export function creditDuePayouts(opts: {
  investmentId?: string;
  date?: string;
  requireAccount?: boolean;
  skip?: boolean;
} = {}): CreditResult {
  const today = todayStr();
  let accounts = useAssetStore.getState().accounts;
  let count = 0;
  let total = 0;

  const investments = useInvestmentStore.getState().investments.map((inv) => {
    if (!isScheduledBond(inv) || inv.status === 'watchlist' || inv.status === 'sold') return inv;
    if (opts.investmentId && inv.id !== opts.investmentId) return inv;
    const account = accounts.find((a) => a.id === inv.payout_account_id);
    if (opts.requireAccount && !account) return inv;

    const due = bondStatus(inv, today).due.filter((p) => !opts.date || p.date === opts.date);
    if (due.length === 0) return inv;

    const newPayouts: BondPayout[] = due.map((p) => {
      const amount = netAmount(p);
      const record: BondPayout = {
        date: p.date, interest: p.interest, tds: p.tds, principal: p.principal, credited_on: today,
      };
      count++;
      if (opts.skip) return { ...record, skipped: true };
      total += amount;
      if (account && amount > 0) {
        const tx: AccountTransaction = {
          id: crypto.randomUUID(), date: p.date, type: 'credit', amount, note: payoutNote(inv, p),
        };
        accounts = accounts.map((a) => a.id !== account.id ? a : {
          ...a,
          balance: round2(a.balance + amount),
          last_updated: today,
          transactions: [tx, ...(a.transactions ?? [])],
        });
        return { ...record, account_id: account.id, account_name: account.name, tx_id: tx.id };
      }
      return record;
    });

    return { ...inv, bond_payouts: [...(inv.bond_payouts ?? []), ...newPayouts].sort((a, b) => a.date.localeCompare(b.date)) };
  });

  if (count > 0) {
    useInvestmentStore.setState({ investments });
    useAssetStore.setState({ accounts });
    saveSections({ investments, accounts }, opts.skip ? 'bond-payout-skip' : 'bond-payout');
  }
  return { count, total: round2(total) };
}

// Remove a recorded payout (and reverse its account credit). It becomes due again.
export function undoPayout(investmentId: string, date: string) {
  const inv = useInvestmentStore.getState().investments.find((i) => i.id === investmentId);
  const payout = inv?.bond_payouts?.find((p) => p.date === date);
  if (!inv || !payout) return;

  let accounts = useAssetStore.getState().accounts;
  if (payout.account_id && payout.tx_id) {
    accounts = accounts.map((a) => {
      if (a.id !== payout.account_id) return a;
      const tx = a.transactions?.find((t) => t.id === payout.tx_id);
      if (!tx) return a;
      return {
        ...a,
        balance: round2(a.balance - tx.amount),
        transactions: (a.transactions ?? []).filter((t) => t.id !== tx.id),
      };
    });
  }
  const investments = useInvestmentStore.getState().investments.map((i) =>
    i.id !== investmentId ? i : { ...i, bond_payouts: (i.bond_payouts ?? []).filter((p) => p.date !== date) }
  );
  useInvestmentStore.setState({ investments });
  useAssetStore.setState({ accounts });
  saveSections({ investments, accounts }, 'bond-payout-undo');
}
