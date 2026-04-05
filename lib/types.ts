export interface Investment {
  id: string;
  asset_name: string;
  asset_type: 'Stock' | 'ETF' | 'Crypto' | 'Mutual Fund' | 'Gold' | 'Other';
  sector: string;
  buy_price: number;
  current_price: number;
  quantity: number;
  purchase_date: string;
  notes: string;
  ticker?: string;          // CoinGecko ID for Crypto, Yahoo Finance for stocks, AMFI code for MF
  status?: 'active' | 'watchlist';  // omitted = active
  buy_range?: string;       // watchlist only — target entry range e.g. "3500-3750"
  research?: string;        // long-form research notes (shown in popup)
  funded_by_account_id?: string;   // AssetAccount.id — account debited when purchased
  funded_by_account_name?: string; // snapshot of account name at purchase time
  _deleted?: boolean;       // soft-delete tombstone — filtered from UI, kept in file
}

export interface MoneyRecord {
  id: string;
  type: 'lent' | 'borrowed';   // lent = I gave money (asset), borrowed = I took money (liability)
  person_name: string;
  amount: number;               // original amount
  settled_amount: number;       // how much has been returned so far
  date: string;                 // when transaction happened
  due_date: string;             // expected return date (optional, empty = no deadline)
  description: string;
  status: 'pending' | 'partial' | 'settled';
  source_expense_id?: string;   // links back to the Expense that created this record via a split
  account_id?: string;          // AssetAccount.id — account debited (lent) or credited (borrowed) when record was created
}

export type AssetCategory =
  | 'Cash'
  | 'Savings Account'
  | 'Fixed Deposit'
  | 'Current Account'
  | 'Credit Card'
  | 'PPF'
  | 'EPF'
  | 'NPS'
  | 'Digital Wallet'
  | 'Recurring Deposit'
  | 'Other';

export interface AccountTransaction {
  id: string;
  date: string;             // YYYY-MM-DD
  type: 'credit' | 'debit';
  amount: number;           // always positive
  note: string;             // e.g. "June Salary", "HDFC CC Bill"
  pairId?: string;          // shared ID linking two sides of a transfer
  linkedAccountName?: string; // display name of the other account in a transfer
}

export interface AssetAccount {
  id: string;
  name: string;           // e.g. "SBI Savings", "HDFC FD — 7%"
  category: AssetCategory;
  balance: number;
  interest_rate: number;  // % p.a., 0 if not applicable
  maturity_date: string;  // for FD/RD etc., empty otherwise
  notes: string;
  last_updated: string;   // ISO date
  transactions?: AccountTransaction[];  // running log; balance auto-updated on each entry
}

export type ExpenseCategory =
  | 'Food & Dining'
  | 'Groceries'
  | 'Transport'
  | 'Shopping'
  | 'Entertainment'
  | 'Health & Medical'
  | 'Bills & Utilities'
  | 'Education'
  | 'Travel'
  | 'Rent'
  | 'Subscriptions'
  | 'Personal Care'
  | 'Gifts & Donations'
  | 'Other';

export interface ExpenseSplit {
  person_name: string;
  amount: number; // amount they owe you
}

export interface PaymentSource {
  account_id: string;          // AssetAccount.id — empty means "other/untracked"
  account_name: string;        // snapshot at time of entry
  amount: number;              // how much was paid from this source
}

export interface Expense {
  id: string;
  date: string;              // ISO date YYYY-MM-DD
  amount: number;
  category: ExpenseCategory;
  payment_source_id: string;   // legacy / primary source (kept for backward compat)
  payment_source_name: string; // legacy / primary source name snapshot
  description: string;
  notes: string;
  splits?: ExpenseSplit[];
  paid_by_name?: string;             // if set, this person paid (not "me") — triggers borrowed record in Money Tracker
  payment_sources?: PaymentSource[]; // multi-source payment; when set, takes precedence over payment_source_id
}

export type RecurringFrequency = 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';

export interface RecurringExpense {
  id: string;
  name: string;                  // e.g. "Netflix", "Gym"
  amount: number;
  frequency: RecurringFrequency;
  category: ExpenseCategory;
  payment_source_id: string;     // AssetAccount.id
  payment_source_name: string;
  next_due: string;              // ISO date — when next payment is due
  start_date: string;
  active: boolean;               // false = paused
  notes: string;
}

export interface PortfolioStats {
  totalInvested: number;
  currentValue: number;
  totalPnL: number;
  pnlPercent: number;
  bestAsset: Investment | null;
  worstAsset: Investment | null;
}

export type HabitCategory = 'Health' | 'Fitness' | 'Productivity' | 'Learning' | 'Mindfulness' | 'Other';

export interface Habit {
  id: string;
  name: string;
  category: HabitCategory;
  emoji: string;      // e.g. "💧", "📚"
  color: string;      // hex color e.g. "#6366f1"
  created_at: string; // YYYY-MM-DD
  active: boolean;
  type?: 'good' | 'bad' | 'count'; // good = to-do, bad = to-avoid, count = track daily occurrences
  target_count?: number;            // for type='count': max allowed per day (e.g. 3)
}

export interface HabitLog {
  habit_id: string;
  date: string;    // YYYY-MM-DD
  count?: number;  // for type='count' habits; undefined for boolean habits
}
