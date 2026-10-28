# 📈 Personal Finance Dashboard

A modern, dark-themed personal finance dashboard for the Indian market. Track investments, daily expenses, cash accounts, money lent/borrowed, and subscriptions — all in one place, all stored locally.

## Features

### Investments
- **Portfolio Dashboard** — Total invested, current value, P&L, best/worst performers, risk alerts
- **Investment Tracker** — Full CRUD table with filters, add/edit/delete via modal
- **Real-time Prices** — Live price updates for stocks (Yahoo Finance), crypto (CoinGecko), and mutual funds (AMFI)
- **Stock Comparison** — Side-by-side radar chart comparison across key metrics
- **AI Stock Analysis** — Research drawer with AI-powered analysis per stock
- **Interactive Charts** — Portfolio allocation (pie), sector distribution (bar), P&L by asset (bar)
- **Risk Indicators** — Alerts for >20% loss, >50% gain, and >40% concentration
- **Bond Payouts** — Bonds pay interest monthly / quarterly / half-yearly / yearly / at maturity, with principal at maturity, in equal parts, or on custom dates you choose, plus TDS; each payout is credited to the linked bank account (automatically or on confirm) and tracked on its own page — due, upcoming 12 months, received history with undo

### Expenses
- **Daily Expense Tracker** — Log expenses with category, account, and notes
- **Split Bills** — Split any expense across multiple people (equal, by %, by shares, or custom ₹)
- **Who Paid** — Track when someone else paid; auto-creates "you owe them" record in Money Tracker
- **Multi-account Payment** — Split a single expense across multiple accounts
- **Category Breakdown** — Monthly spend by category with "my share" vs total

### Cash & Accounts
- **Account Manager** — Track balances across savings, FD, credit cards, wallets, PPF, EPF, NPS, etc.
- **Auto Balance Updates** — Expenses auto-deduct from linked accounts
- **Transaction History** — Full ledger per account
- **Transfers** — Move money between accounts with paired transaction entries

### Money Tracker
- **Lent / Borrowed** — Track money given to or taken from people
- **Net Balance per Person** — One card per person combining all lent + borrowed records; net determines which column they appear in
- **Split Linkage** — Expense splits automatically create money records; editing/deleting syncs both
- **Quick Add** — Red **+** on a person's card adds a lent/borrowed record with their name pre-filled
- **Compact Cards** — Shows 5 records per person (open ones first) with a "Show all" toggle

### Subscriptions
- **Recurring Expenses** — Track subscriptions, EMIs and insurance with next due date
- **Billing Cycles** — Fixed-day cycles (28 / 30 / 84-day prepaid plans) or same-date calendar billing (monthly, quarterly, half-yearly, yearly) that stays on the bill date
- **Payment History** — "Mark Paid" logs an expense and keeps a scrollable history per subscription; the latest payment can be undone

### App
- **Collapsible Sidebar** — Icon-only rail by default; expand by click, on hover, or keep it always expanded
- **Settings** — Choose sidebar behaviour, theme, and bond auto-credit (saved per device)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | TailwindCSS |
| Charts | Recharts |
| State | Zustand |
| Persistence | Server-side JSON file via API routes |
| UI Primitives | Radix UI |
| Icons | lucide-react |

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Portfolio dashboard with charts and analytics |
| `/investments` | Investment CRUD tracker with real-time prices and AI research |
| `/compare` | Side-by-side stock comparison with radar chart |
| `/bond-payouts` | Bond interest/principal payouts — due, upcoming, received |
| `/expenses` | Daily expense tracker with bill splitting |
| `/cash-accounts` | Cash & account manager with transaction history |
| `/money-tracker` | Track money lent and borrowed, net per person |
| `/subscriptions` | Recurring subscription tracker |
| `/settings` | Sidebar, theme, and bond auto-credit preferences |
| `/india-sectors-report` | India emerging sectors investment research report |
| `/invest-3-lakhs-plan` | How to invest ₹3 lakhs guide |

## Data Storage

All data is stored locally under `data/` (gitignored — never committed), split across three files:

| File | Contents |
|------|----------|
| `data/portfolio.json` | `investments`, `accounts`, `expenses`, `recurring`, `money_records`, `audit_log` |
| `data/daily-tracker.json` | `habits`, `habit_logs` |
| `data/daily-planner.json` | `items`, `planner_logs` |

On first run each file falls back to its `*.example.json` sibling. To reset a domain, delete its private file and reload — the example seed will be recreated.

📘 **For the exact JSON structure of every entity** (Stock / ETF / Bond / Crypto / watchlist / sold investments, accounts, transfers, expenses with splits, money records, habits, planner items, and more), see **[`docs/data-formats.md`](docs/data-formats.md)** — one worked example per shape.

## Risk Indicators

| Condition | Indicator |
|-----------|-----------|
| P&L < -20% | Row highlighted red |
| P&L > +50% | Row highlighted green |
| Single asset > 40% of portfolio | Amber concentration warning |

## Disclaimer

This application is for personal tracking and educational purposes only. It is **not** financial advice. Always consult a SEBI-registered financial advisor before making investment decisions.
