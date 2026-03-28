# Phase 6 Discovery: Transaction Feed UI

## Goal
Build `/transactions` page: filterable, paginated transaction table with inline category
override. Implement `transaction.list` and `transaction.updateCategory` tRPC procedures.

---

## PRD Requirements (US-004, US-005)

### US-004 — Transaction feed
- Reverse chronological order
- Each row: date, merchant/description, amount, category, account name
- Paginated — 50 items per page
- Filterable by: account, date range, category

### US-005 — Category override
- Inline category dropdown on each row
- Override saved immediately via tRPC mutation
- `userCategory` persists — never overwritten by future syncs (enforced in Phase 5 upsert)

---

## Data Model
```
Transaction
  id, accountId, basiqTxId, date, description, amount (Decimal),
  currency, basiqCategory?, userCategory?, isCredit, createdAt
  → account: BankAccount → connection: BasiqConnection → userId
```

Effective category: `userCategory ?? basiqCategory ?? "Uncategorised"`

---

## Basiq Category Taxonomy (fixed set for dropdown)
```
Food & Dining | Shopping | Transport | Entertainment | Bills & Utilities
Health & Fitness | Travel | Income | Transfer | ATM & Cash
Business | Education | Uncategorised
```

---

## tRPC Procedures

### `transaction.list` (protected query)
Input (Zod):
```typescript
{
  page: z.number().int().min(1).default(1),
  accountId: z.string().optional(),
  dateFrom: z.string().optional(),   // ISO date string
  dateTo: z.string().optional(),
  category: z.string().optional(),
}
```
Returns: `{ items: Transaction[], total: number, pageCount: number }`
- Filters scoped to user via `account.connection.userId`
- Ordered `date DESC`
- Page size: 50

### `transaction.updateCategory` (protected mutation)
Input: `{ transactionId: z.string(), category: z.string() }`
- Verifies transaction belongs to authenticated user (via account → connection → userId)
- Sets `userCategory`
- CoVe required: ownership check prevents updating another user's transaction

---

## UI Architecture

```
/transactions/page.tsx                 ← Server component, renders shell
/transactions/_components/
  TransactionsClient.tsx               ← "use client", owns filter state + pagination
  TransactionRow.tsx                   ← Row with category dropdown
```

### Filter State (client-side)
- accountId: string | undefined
- dateFrom: string | undefined
- dateTo: string | undefined
- category: string | undefined
- page: number (resets to 1 on filter change)

### Category Display Logic
Each row shows: `userCategory ?? basiqCategory ?? "Uncategorised"`
If userCategory is set → badge gets a visual indicator (different colour)

---

## Available shadcn/ui Components
- `table.tsx` — Table, TableHeader, TableBody, TableRow, TableHead, TableCell
- `select.tsx` — Select, SelectTrigger, SelectValue, SelectContent, SelectItem
- `badge.tsx` — Badge (for category chip)
- `button.tsx` — Button (for pagination)

---

## No New Infrastructure Needed
- Prisma schema already has Transaction model with all required fields
- DB indexes on `accountId` and `date` already in place
- Decimal amount works with `.toNumber()` for display
