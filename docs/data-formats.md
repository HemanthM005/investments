# Data Formats Reference

Every JSON shape the app reads or writes, with one example per variant. Use this as the source of truth when hand-editing fixtures, writing migrations, or seeding test data.

> ⚠️ **Never edit `data/portfolio.json`, `data/daily-tracker.json`, or `data/daily-planner.json` by hand.** They are private user data and the app owns writes. Edit only the `*.example.json` files when adding new shapes.

The schemas live in [`lib/types.ts`](../lib/types.ts) — this doc mirrors them.

---

## File map

| File | Top-level keys | Example file |
|------|----------------|--------------|
| `data/portfolio.json` | `investments`, `accounts`, `expenses`, `recurring`, `money_records`, `audit_log` | [`data/portfolio.example.json`](../data/portfolio.example.json) |
| `data/daily-tracker.json` | `habits`, `habit_logs` | [`data/daily-tracker.example.json`](../data/daily-tracker.example.json) |
| `data/daily-planner.json` | `items`, `planner_logs` | [`data/daily-planner.example.json`](../data/daily-planner.example.json) |

All dates are `YYYY-MM-DD` strings. All currency is plain numbers in INR (no formatting).

---

## 1. Investments (`portfolio.json` → `investments[]`)

One array, one shape (`Investment`), but the active fields differ by `asset_type` and `status`.

### 1a. Stock (active)
```json
{
  "id": "1",
  "asset_name": "HAL",
  "asset_type": "Stock",
  "sector": "Defence",
  "buy_price": 3200,
  "current_price": 4100,
  "quantity": 10,
  "purchase_date": "2024-06-15",
  "notes": "Strong order book",
  "ticker": "HAL.NS",
  "status": "active",
  "funded_by_account_id": "1",
  "funded_by_account_name": "SBI Savings"
}
```
- `ticker` for stocks = Yahoo Finance symbol (`.NS` for NSE, `.BO` for BSE).

### 1b. ETF
```json
{
  "id": "5",
  "asset_name": "Nifty 50 Index Fund",
  "asset_type": "ETF",
  "sector": "Diversified",
  "buy_price": 210,
  "current_price": 248,
  "quantity": 200,
  "purchase_date": "2024-03-01",
  "notes": "Core passive allocation",
  "ticker": "NIFTYBEES.NS",
  "status": "active"
}
```

### 1c. Mutual Fund
```json
{
  "id": "2",
  "asset_name": "Parag Parikh Flexi Cap",
  "asset_type": "Mutual Fund",
  "sector": "Diversified",
  "buy_price": 65,
  "current_price": 82,
  "quantity": 500,
  "purchase_date": "2023-11-20",
  "notes": "SIP",
  "ticker": "122639",
  "status": "active"
}
```
- `ticker` for MF = AMFI scheme code.

### 1d. Crypto
```json
{
  "id": "4",
  "asset_name": "Bitcoin",
  "asset_type": "Crypto",
  "sector": "Crypto",
  "buy_price": 2800000,
  "current_price": 7200000,
  "quantity": 0.005,
  "purchase_date": "2023-01-15",
  "notes": "Long-term hold",
  "ticker": "bitcoin",
  "status": "active"
}
```
- `ticker` for crypto = CoinGecko ID (lowercase, e.g. `bitcoin`, `ethereum`).

### 1e. Gold
```json
{
  "id": "3",
  "asset_name": "Nippon India Gold ETF",
  "asset_type": "Gold",
  "sector": "Commodities",
  "buy_price": 5800,
  "current_price": 7200,
  "quantity": 5,
  "purchase_date": "2024-01-10",
  "notes": "Inflation hedge",
  "ticker": "GOLDBEES.NS",
  "status": "active"
}
```

### 1f. Bond
```json
{
  "id": "8",
  "asset_name": "SGB Series 2024-25",
  "asset_type": "Bond",
  "sector": "Government",
  "buy_price": 7500,
  "current_price": 7950,
  "quantity": 1,
  "purchase_date": "2024-08-01",
  "notes": "Sovereign Gold Bond",
  "interest_rate": 2.5,
  "maturity_date": "2032-08-01",
  "status": "active"
}
```
- `buy_price` = principal per unit. `current_price` is auto-computed from interest accrual.
- `interest_rate` and `maturity_date` are Bond-only fields.

### 1g. Watchlist (no buy yet)
```json
{
  "id": "6",
  "asset_name": "Dixon Technologies",
  "asset_type": "Stock",
  "sector": "Electronics Manufacturing",
  "buy_price": 0,
  "current_price": 14200,
  "quantity": 0,
  "purchase_date": "",
  "notes": "PLI beneficiary",
  "ticker": "DIXON.NS",
  "status": "watchlist",
  "buy_range": "12000-13500",
  "research": "Long-form thesis here. Multi-line markdown OK."
}
```
- `buy_price`, `quantity`, `purchase_date` stay zero/empty until you flip status to `active`.
- `buy_range` is watchlist-only.

### 1h. Sold
```json
{
  "id": "9",
  "asset_name": "TCS",
  "asset_type": "Stock",
  "sector": "IT",
  "buy_price": 3400,
  "current_price": 4200,
  "quantity": 5,
  "purchase_date": "2023-05-10",
  "notes": "",
  "ticker": "TCS.NS",
  "status": "sold",
  "sold_price": 4200,
  "sold_date": "2026-04-15",
  "sale_charges": 120,
  "credited_to_account_id": "1",
  "credited_to_account_name": "SBI Savings",
  "sale_credited": true
}
```
- Soft-deleted rows carry `"_deleted": true` and are filtered out of the UI but kept in the file.

---

## 2. Accounts (`portfolio.json` → `accounts[]`)

`category` ∈ `Cash | Savings Account | Fixed Deposit | Current Account | Credit Card | PPF | EPF | NPS | Digital Wallet | Recurring Deposit | Other`.

### 2a. Account
```json
{
  "id": "1",
  "name": "SBI Savings",
  "category": "Savings Account",
  "balance": 45000,
  "interest_rate": 2.7,
  "maturity_date": "",
  "notes": "Primary salary account",
  "last_updated": "2026-03-01",
  "transactions": []
}
```

### 2b. Account transaction (inside `transactions[]`)
```json
{
  "id": "t-101",
  "date": "2026-04-12",
  "type": "debit",
  "amount": 1450,
  "note": "Weekly grocery run"
}
```

### 2c. Transfer (paired transactions)
A transfer writes two entries — one `debit` on the source account, one `credit` on the destination — sharing a `pairId`.
```json
{
  "id": "t-200",
  "date": "2026-04-12",
  "type": "debit",
  "amount": 5000,
  "note": "Transfer to HDFC",
  "pairId": "pair-abc123",
  "linkedAccountName": "HDFC Credit Card"
}
```

---

## 3. Expenses (`portfolio.json` → `expenses[]`)

`category` is one of the `ExpenseCategory` literals in [`lib/types.ts`](../lib/types.ts) (e.g. `Food & Dining`, `Transport & Travel`).

### 3a. Simple expense
```json
{
  "id": "1",
  "date": "2026-04-01",
  "amount": 250,
  "category": "Food & Dining",
  "payment_source_id": "3",
  "payment_source_name": "Wallet Cash",
  "description": "Lunch at office canteen",
  "notes": ""
}
```

### 3b. You paid, split with friends → creates `lent` MoneyRecords
```json
{
  "id": "3",
  "date": "2026-03-31",
  "amount": 1800,
  "category": "Food & Dining",
  "payment_source_id": "2",
  "payment_source_name": "HDFC Credit Card",
  "description": "Team dinner",
  "notes": "Split 3 ways",
  "splits": [
    { "person_name": "Rahul", "amount": 600 },
    { "person_name": "Karan", "amount": 600 }
  ]
}
```
- Each split entry auto-creates a `lent` MoneyRecord with `source_expense_id` pointing back to the expense.

### 3c. Someone else paid → creates one `borrowed` MoneyRecord
```json
{
  "id": "11",
  "date": "2026-03-22",
  "amount": 2500,
  "category": "Food & Dining",
  "payment_source_id": "2",
  "payment_source_name": "HDFC Credit Card",
  "description": "Birthday dinner",
  "notes": "Priya paid — split equally",
  "paid_by_name": "Priya"
}
```
- When `paid_by_name` is set, no account is debited. Instead, a single `borrowed` record is created for *your* share.

### 3d. Multi-source payment
```json
{
  "id": "13",
  "date": "2026-04-02",
  "amount": 5000,
  "category": "Shopping",
  "payment_source_id": "1",
  "payment_source_name": "SBI Savings",
  "description": "Furniture",
  "notes": "",
  "payment_sources": [
    { "account_id": "1", "account_name": "SBI Savings", "amount": 3000 },
    { "account_id": "2", "account_name": "HDFC Credit Card", "amount": 2000 }
  ]
}
```
- When `payment_sources[]` is present, it takes precedence over the legacy `payment_source_id` (which is kept for backward compatibility).

---

## 4. Money records (`portfolio.json` → `money_records[]`)

### 4a. Lent
```json
{
  "id": "1",
  "type": "lent",
  "person_name": "Rahul",
  "amount": 5000,
  "settled_amount": 2000,
  "date": "2024-12-01",
  "due_date": "2025-03-01",
  "description": "Medical emergency",
  "status": "partial",
  "account_id": "1"
}
```

### 4b. Borrowed (auto-created from a paid-by-other expense)
```json
{
  "id": "2",
  "type": "borrowed",
  "person_name": "Priya",
  "amount": 1200,
  "settled_amount": 0,
  "date": "2025-02-14",
  "due_date": "",
  "description": "Valentine's dinner",
  "status": "pending",
  "source_expense_id": "11"
}
```
- `status` ∈ `pending | partial | settled`. `settled_amount` ≥ `amount` ⇒ `settled`; in between ⇒ `partial`; zero ⇒ `pending`.
- `source_expense_id` links back to the originating Expense; editing or deleting that expense re-syncs the record.

---

## 5. Recurring expenses (`portfolio.json` → `recurring[]`)

```json
{
  "id": "1",
  "name": "Netflix",
  "amount": 649,
  "frequency": "Monthly",
  "category": "Subscriptions",
  "payment_source_id": "2",
  "payment_source_name": "HDFC Credit Card",
  "next_due": "2026-04-01",
  "start_date": "2023-06-01",
  "active": true,
  "notes": "4K plan"
}
```
- `frequency` ∈ `Daily | Weekly | Monthly | Quarterly | Yearly`.
- `active: false` pauses the subscription without deleting it.

---

## 6. Habits (`daily-tracker.json` → `habits[]`)

`category` ∈ `Health | Fitness | Productivity | Learning | Mindfulness | Other`.

### 6a. Good habit (boolean — done or not done that day)
```json
{
  "id": "h1",
  "name": "Morning Run",
  "category": "Fitness",
  "emoji": "🏃",
  "color": "#10b981",
  "created_at": "2025-01-01",
  "active": true,
  "type": "good"
}
```

### 6b. Counted habit (track number of occurrences per day)
```json
{
  "id": "h4",
  "name": "Drink Water",
  "category": "Health",
  "emoji": "💧",
  "color": "#3b82f6",
  "created_at": "2025-01-01",
  "active": true,
  "type": "count",
  "target_count": 8
}
```

### 6c. Bad habit (logging a day = a slip)
```json
{
  "id": "h5",
  "name": "No Junk Food",
  "category": "Health",
  "emoji": "🍔",
  "color": "#ef4444",
  "created_at": "2025-02-01",
  "active": true,
  "type": "bad"
}
```

---

## 7. Habit logs (`daily-tracker.json` → `habit_logs[]`)

### 7a. Boolean habit log
```json
{ "habit_id": "h1", "date": "2026-03-25" }
```

### 7b. Counted habit log
```json
{ "habit_id": "h4", "date": "2026-03-25", "count": 7 }
```
- One log entry per `(habit_id, date)`. The presence of the entry = "logged that day"; for `type: "count"`, `count` carries the value.

---

## 8. Planner items (`daily-planner.json` → `items[]`)

`category` ∈ `Morning Routine | Study | Work | Exercise | Meals | Leisure | Sleep | Other`.
`day_type` ∈ `weekday | weekend | all`.

```json
{
  "id": "wd-3",
  "name": "Office",
  "emoji": "💼",
  "start_time": "10:30",
  "end_time": "19:00",
  "day_type": "weekday",
  "category": "Work",
  "color": "#3b82f6",
  "active": true,
  "created_at": "2026-03-01"
}
```
- Times are 24-hour `HH:MM` strings. End times can roll past midnight (e.g. `"00:30"`).

---

## 9. Planner logs (`daily-planner.json` → `planner_logs[]`)

```json
{ "item_id": "wd-3", "date": "2026-04-12" }
```
- Marks an item as completed for that date. One entry per `(item_id, date)`.

---

## Conventions

- **IDs** are strings. Stores generate `Date.now().toString()` or `crypto.randomUUID()` — any unique string works.
- **Soft deletes**: investments use `_deleted: true` tombstones; other domains hard-delete.
- **Snapshots**: fields like `payment_source_name`, `funded_by_account_name`, `linkedAccountName` snapshot the related entity's name at write time so display stays stable if the source is renamed/deleted later.
- **Backward compat**: `payment_source_id` on Expense predates `payment_sources[]`. Both are kept; the array wins when present.
