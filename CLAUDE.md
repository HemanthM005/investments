# CLAUDE.md — Investment Portfolio Dashboard

## ⚠️ Data Privacy Rules (Read First)

**NEVER commit personal data files.** Before any `git add`, verify these are gitignored:
- `data/portfolio.json` — live personal data
- `data/*.json.bak*` — backup snapshots
- Any file containing real names, balances, or transaction history

If you find a sensitive file tracked by git: run `git rm --cached <file>` immediately, add it to `.gitignore`, then commit the fix before anything else.

**NEVER directly modify `data/portfolio.json` or any file whose name contains `portfolio.json`** — not via shell commands, not via Node scripts, not via migrations baked into app code (e.g. inside `hydrate()`). This applies every session without exception.

If the user explicitly asks to modify the file, stop and ask: **"Are you sure you want me to directly modify portfolio.json?"** before doing anything.

The only data file that should ever be committed is `data/portfolio.example.json`.

---

## Project Overview
A personal finance dashboard built with Next.js 15 (App Router), TypeScript, TailwindCSS, Recharts, and Zustand. All data persists to `data/portfolio.json` via server-side API routes — no external database.

## Commands
```bash
npm install     # Install dependencies
npm run dev     # Start dev server at http://localhost:3000
npm run build   # Build for production
npm run lint    # Lint check
```

## Architecture
- **Framework**: Next.js 15 with App Router (`app/` directory)
- **State**: Zustand stores with server-side persistence via `/api/data`
- **Styling**: TailwindCSS with dark theme (`#0f1117` background, `#1a1d2e` card)
- **Charts**: Recharts (all chart components must have `'use client'` at the top)
- **Icons**: lucide-react
- **UI Primitives**: Radix UI (`@radix-ui/react-dialog`, `@radix-ui/react-select`, `@radix-ui/react-label`)

## Routes
| Route | Description |
|-------|-------------|
| `/` | Portfolio dashboard — stats, risk alerts, charts, summary table |
| `/investments` | Investment CRUD tracker with filters, real-time prices, research popup |
| `/compare` | Side-by-side stock comparison with radar chart |
| `/expenses` | Daily expense tracker — split bills, auto-deducts from accounts |
| `/cash-accounts` | Cash & account manager — balances, transactions, transfers |
| `/money-tracker` | Lent/borrowed tracker — net balance per person |
| `/subscriptions` | Recurring expense tracker |
| `/india-sectors-report` | India emerging sectors research report |
| `/invest-3-lakhs-plan` | ₹3 Lakh investment plan guide |

## Key Files
| File | Purpose |
|------|---------|
| `lib/types.ts` | All TypeScript interfaces — Investment, Expense, MoneyRecord, AssetAccount, etc. |
| `lib/store.ts` | Zustand store — investments CRUD |
| `lib/assetStore.ts` | Zustand store — cash accounts CRUD + balance adjustments |
| `lib/expenseStore.ts` | Zustand store — expenses CRUD + auto-deducts account balances |
| `lib/moneyStore.ts` | Zustand store — lent/borrowed records CRUD |
| `lib/recurringStore.ts` | Zustand store — recurring/subscription expenses |
| `lib/saveHelper.ts` | Writes sections of portfolio.json via `/api/data` |
| `lib/utils.ts` | `cn()`, `formatCurrency()`, `formatPercent()`, `computeStats()` |
| `app/api/data/route.ts` | Read/write sections of `data/portfolio.json` |
| `app/api/prices/route.ts` | Fetch live prices (CoinGecko for crypto, Yahoo Finance for stocks) |
| `app/api/price-history/route.ts` | Fetch historical price data for charts |
| `app/api/stock-analysis/route.ts` | AI-powered stock analysis via Claude API |
| `components/Navbar.tsx` | Sticky top nav with active route highlighting |
| `components/InvestmentModal.tsx` | Add/Edit investment modal |
| `components/StockAnalysisDrawer.tsx` | AI research drawer for investments |
| `components/CompareRadarChart.tsx` | Radar chart for stock comparison |
| `components/PortfolioCharts.tsx` | Pie + Bar charts for dashboard |

## Data Model

```typescript
interface Investment {
  id: string;
  asset_name: string;
  asset_type: 'Stock' | 'ETF' | 'Crypto' | 'Mutual Fund' | 'Gold' | 'Other';
  sector: string;
  buy_price: number;
  current_price: number;
  quantity: number;
  purchase_date: string;       // YYYY-MM-DD
  notes: string;
  ticker?: string;             // CoinGecko ID / Yahoo Finance symbol / AMFI code
  status?: 'active' | 'watchlist';
  buy_range?: string;          // watchlist only — e.g. "3500-3750"
  research?: string;           // long-form research notes (shown in drawer)
  _deleted?: boolean;          // soft-delete tombstone
}

interface Expense {
  id: string;
  date: string;                // YYYY-MM-DD
  amount: number;
  category: ExpenseCategory;
  payment_source_id: string;
  payment_source_name: string;
  description: string;
  notes: string;
  splits?: ExpenseSplit[];     // who owes how much
  paid_by_name?: string;       // if set, this person paid (not "me") → creates borrowed record
  payment_sources?: PaymentSource[]; // multi-account payment
}

interface MoneyRecord {
  id: string;
  type: 'lent' | 'borrowed';
  person_name: string;
  amount: number;
  settled_amount: number;
  date: string;
  due_date: string;
  description: string;
  status: 'pending' | 'partial' | 'settled';
  source_expense_id?: string;  // links back to split expense
}

interface AssetAccount {
  id: string;
  name: string;
  category: AssetCategory;    // Cash | Savings Account | Credit Card | FD | etc.
  balance: number;
  interest_rate: number;
  maturity_date: string;
  notes: string;
  last_updated: string;
  transactions?: AccountTransaction[];
}
```

## Design Rules
- **Dark theme always**: never use white backgrounds
- **Card background**: `bg-[#1a1d2e]` with `border-[#2a2d3e]`
- **Page background**: `bg-[#0f1117]`
- **Gain color**: `text-emerald-400`
- **Loss color**: `text-red-400`
- **Primary accent**: `indigo-600` / `indigo-400`
- **Risk > 20% loss**: highlight row with `bg-red-950/20`
- **Gain > 50%**: highlight row with `bg-emerald-950/20`
- **Concentration > 40%**: show amber warning banner

## Expense Split Logic
- When **you pay**: creates `lent` MoneyRecords for each participant (they owe you)
- When **someone else pays** (`paid_by_name` set): creates one `borrowed` MoneyRecord (you owe payer your share); no account deduction
- Edit flow: deletes all linked MoneyRecords for the expense then recreates — prevents duplicates

## Money Tracker Display Logic
- **One card per person** regardless of how many lent/borrowed records they have
- **Net balance** determines which column: net positive → "I Lent", net negative → "I Borrowed"
- Each record row inside a card shows `💸 you lent` or `🤝 you borrowed` for clarity

## Adding a New Page
1. Create `app/<route>/page.tsx`
2. Add `'use client'` if using hooks or state
3. Add the route to `navLinks` in `components/Navbar.tsx`

## Data Persistence
All data lives in `data/portfolio.json` (gitignored). The file is split into sections:
- `investments`, `expenses`, `money_records`, `accounts`, `recurring_expenses`

On first load, if the file doesn't exist, the app falls back to `data/portfolio.example.json`.
To reset your data, delete `data/portfolio.json` — it will be recreated from the example.
