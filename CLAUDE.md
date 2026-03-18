# CLAUDE.md — Investment Portfolio Dashboard

## Project Overview
A personal investment portfolio dashboard built with Next.js 15 (App Router), TypeScript, TailwindCSS, Recharts, and Zustand. All data is stored in browser localStorage — no backend, no database.

## Commands
```bash
npm install     # Install dependencies
npm run dev     # Start dev server at http://localhost:3000
npm run build   # Build for production
npm run lint    # Lint check
```

## Architecture
- **Framework**: Next.js 15 with App Router (`app/` directory)
- **State**: Zustand store with localStorage persistence (`lib/store.ts`)
- **Styling**: TailwindCSS with dark theme (`#0f1117` background, `#1a1d2e` card)
- **Charts**: Recharts (all chart components must have `'use client'` at the top)
- **Icons**: lucide-react
- **UI Primitives**: Radix UI (`@radix-ui/react-dialog`, `@radix-ui/react-select`, `@radix-ui/react-label`)

## Key Files
| File | Purpose |
|------|---------|
| `lib/types.ts` | `Investment` and `PortfolioStats` TypeScript interfaces |
| `lib/store.ts` | Zustand store — investments CRUD + localStorage persistence |
| `lib/utils.ts` | `cn()`, `formatCurrency()`, `formatPercent()`, `computeStats()`, `getPnlPercent()` |
| `app/page.tsx` | Dashboard — stats, risk alerts, charts, summary table |
| `app/investments/page.tsx` | Full investment tracker with filters, CRUD table, and modal |
| `app/india-sectors-report/page.tsx` | India Emerging Sectors Report (converted from HTML) |
| `app/invest-3-lakhs-plan/page.tsx` | ₹3 Lakh Investment Plan (converted from HTML) |
| `components/Navbar.tsx` | Sticky top nav with active route highlighting |
| `components/InvestmentModal.tsx` | Radix Dialog modal for Add/Edit investment |
| `components/PortfolioCharts.tsx` | Recharts: Pie (allocation), Bar (sector), Bar (P&L) |
| `components/PortfolioStats.tsx` | 4-card stats row: invested, value, P&L, P&L% |
| `components/InvestmentTable.tsx` | Read-only investment table (used on dashboard) |

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
  purchase_date: string;  // ISO date string YYYY-MM-DD
  notes: string;
}
```

## Routes
| Route | Description |
|-------|-------------|
| `/` | Portfolio dashboard |
| `/investments` | Investment CRUD tracker |
| `/india-sectors-report` | India emerging sectors research report |
| `/invest-3-lakhs-plan` | How to invest ₹3 lakhs guide |

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

## Adding a New Page
1. Create `app/<route>/page.tsx`
2. Add `'use client'` if using hooks or state
3. Add the route to `navLinks` in `components/Navbar.tsx`

## Editing Investment Data
Sample data lives in `lib/store.ts` (`SAMPLE_INVESTMENTS` array). It only loads on first visit — after that, localStorage takes over. To reset, clear `investment-portfolio-store` from localStorage.
