# 📈 Personal Investment Portfolio Dashboard

A modern, dark-themed investment portfolio tracker built for the Indian stock market. Track your investments, view analytics, and access curated research reports — all locally in your browser.

## Features

- **Portfolio Dashboard** — Total invested, current value, P&L, best/worst performers, risk alerts
- **Investment Tracker** — Full CRUD table with filters, add/edit/delete via modal
- **Interactive Charts** — Portfolio allocation (pie), sector distribution (bar), P&L by asset (bar)
- **Risk Indicators** — Alerts for >20% loss, >50% gain, and >40% concentration risk
- **India Sectors Report** — Research report covering Defence, Solar, EVs, Green Hydrogen, Space & Deep Tech
- **₹3 Lakh Investment Plan** — Step-by-step guide to investing ₹3 lakhs in India (March 2026 context)
- **LocalStorage persistence** — All data saved locally, no backend needed

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | TailwindCSS |
| Charts | Recharts |
| State | Zustand + localStorage |
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
| `/` | Main portfolio dashboard with charts and analytics |
| `/investments` | Interactive investment tracker (Add / Edit / Delete) |
| `/india-sectors-report` | India emerging sectors investment research report |
| `/invest-3-lakhs-plan` | How to invest ₹3 lakhs guide |

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
  purchase_date: string;
  notes: string;
}
```

Data is stored in `localStorage` under the key `investment-portfolio-store`. To reset to sample data, clear that key in your browser's DevTools.

## Screenshots

The app uses a dark dashboard theme:
- Background: `#0f1117`
- Cards: `#1a1d2e`
- Gains highlighted in emerald green
- Losses highlighted in red
- Primary accent: indigo/purple

## Risk Indicators

| Condition | Indicator |
|-----------|-----------|
| P&L < -20% | Row highlighted red + alert banner |
| P&L > +50% | Row highlighted green + alert banner |
| Single asset > 40% of portfolio | Amber concentration risk warning |

## Sample Data

Six sample investments are pre-loaded on first launch:
- HAL (Defence stock)
- Tata Power (Solar/Renewables)
- Nippon India Gold ETF (Gold)
- Parag Parikh Flexi Cap (Mutual Fund)
- Nifty BeES (ETF)
- Bajaj Auto (EV stock — showing a loss for risk indicator demo)

## Disclaimer

This application is for personal tracking and educational purposes only. It is **not** financial advice. Always consult a SEBI-registered financial advisor before making investment decisions.
