# Phase 7 Discovery: Dashboard

## Goal
Build `/dashboard` with: total monthly spend, top 5 categories, recent 10 transactions,
account balances, and a month selector.

---

## PRD Requirements (US-008)
- Total spent this month (across all accounts)
- Top 5 spending categories with amounts
- Recent transactions (last 10)
- Account balances for each connected account
- Month selector to view previous months

---

## Data Queries

### Month Boundary Calculation
Given `monthYear = "2026-03"`:
```typescript
const [year, month] = monthYear.split("-").map(Number);
const start = new Date(year, month - 1, 1);           // 2026-03-01 00:00:00
const end   = new Date(year, month, 1);               // 2026-04-01 00:00:00 (exclusive)
where: { date: { gte: start, lt: end } }
```

### totalSpent
Sum of ABS(amount) for debit transactions in the month, scoped to user.
Decimal from Prisma → convert with `Number()`.

### topCategories — Application-Level Aggregation
Prisma `groupBy` cannot group on computed columns (`userCategory ?? basiqCategory`).
Strategy: fetch all month debits with both category fields, aggregate in TypeScript.
For each transaction: `effectiveCategory = tx.userCategory ?? tx.basiqCategory ?? "Uncategorised"`.
Group by effectiveCategory, sum amounts, sort DESC, take 5.

Personal app transaction volume is low (< 1000/month), so in-memory aggregation is fine.

### recentTransactions
Last 10 transactions across all accounts, regardless of month.

### accountBalances
All BankAccounts for the user's connection — name, type, balance, currency.

---

## tRPC Router: `dashboard.summary`
```typescript
input: z.object({ monthYear: z.string().regex(/^\d{4}-\d{2}$/) })
returns: {
  totalSpent: number,
  topCategories: { category: string; amount: number }[],
  recentTransactions: Array<{ ... with account.name }>,
  accountBalances: Array<{ id, name, type, balance: number, currency }>,
}
```

---

## UI Architecture
```
/dashboard/page.tsx               ← Server component, no direct queries (all via tRPC)
/dashboard/_components/
  DashboardClient.tsx             ← "use client", owns monthYear state
  MonthSelector.tsx               ← <input type="month"> wrapper
  TotalSpendCard.tsx              ← Stat card
  TopCategoriesCard.tsx           ← Ordered list with amounts
  RecentTransactionsCard.tsx      ← Mini table (5 cols, 10 rows)
  AccountBalancesCard.tsx         ← List of accounts
```

Actually simpler: implement all within `DashboardClient.tsx` using inline card components.
Less file churn, all fits in one component for this scope.

---

## Available shadcn/ui Components
- `Card`, `CardHeader`, `CardTitle`, `CardContent` — stat and list cards
- `Badge` — category chips
- No date picker needed — `<input type="month">` is sufficient

---

## Layout
```
[Month Selector]

[Total Spend Card]  [Account Balances Card]
[Top Categories Card]
[Recent Transactions Card]
```

Mobile: single column stack.
