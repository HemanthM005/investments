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

export interface AssetAccount {
  id: string;
  name: string;           // e.g. "SBI Savings", "HDFC FD — 7%"
  category: AssetCategory;
  balance: number;
  interest_rate: number;  // % p.a., 0 if not applicable
  maturity_date: string;  // for FD/RD etc., empty otherwise
  notes: string;
  last_updated: string;   // ISO date
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

export interface Expense {
  id: string;
  date: string;              // ISO date YYYY-MM-DD
  amount: number;
  category: ExpenseCategory;
  payment_source_id: string;   // AssetAccount.id — empty means "other/untracked"
  payment_source_name: string; // snapshot of account name at time of entry
  description: string;
  notes: string;
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
