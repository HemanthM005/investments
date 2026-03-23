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

### Subscriptions
- **Recurring Expenses** — Track monthly/yearly subscriptions with next due date

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
| `/expenses` | Daily expense tracker with bill splitting |
| `/cash-accounts` | Cash & account manager with transaction history |
| `/money-tracker` | Track money lent and borrowed, net per person |
| `/subscriptions` | Recurring subscription tracker |
| `/india-sectors-report` | India emerging sectors investment research report |
| `/invest-3-lakhs-plan` | How to invest ₹3 lakhs guide |

## Data Storage

All data is stored in `data/portfolio.json` (gitignored — never committed). Sections:

| Section | Contents |
|---------|----------|
| `investments` | Your investment holdings |
| `expenses` | Daily expense entries |
| `money_records` | Lent/borrowed records |
| `accounts` | Cash & account balances |
| `recurring_expenses` | Subscription entries |

To reset data, delete `data/portfolio.json` — it will be recreated from `data/portfolio.example.json` on next load.

## Risk Indicators

| Condition | Indicator |
|-----------|-----------|
| P&L < -20% | Row highlighted red |
| P&L > +50% | Row highlighted green |
| Single asset > 40% of portfolio | Amber concentration warning |

## Disclaimer

This application is for personal tracking and educational purposes only. It is **not** financial advice. Always consult a SEBI-registered financial advisor before making investment decisions.
