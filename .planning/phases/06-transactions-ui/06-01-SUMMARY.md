# Summary: Plan 06-01 — Transaction Feed UI

## What Was Done

Built the `/transactions` page with a filterable, paginated transaction table and inline
category override. Implemented `transaction.list` and `transaction.updateCategory` tRPC
procedures.

### Files Created
| File | Purpose |
|------|---------|
| `src/server/api/routers/transaction.ts` | tRPC: list (paginated+filtered) + updateCategory |
| `src/app/transactions/_components/TransactionRow.tsx` | Row with category select dropdown |
| `src/app/transactions/_components/TransactionsClient.tsx` | Filter bar + table + pagination |

### Files Modified
| File | Change |
|------|--------|
| `src/server/api/root.ts` | Registered transactionRouter |
| `src/app/transactions/page.tsx` | Server component: auth guard + account prefetch |

## Implementation Details

### tRPC `transaction.list`
- Paginates by 50 items, `date DESC`
- Filters: accountId (via BankAccount.id), dateFrom/dateTo (via Transaction.date), category
  (category filter uses OR: userCategory OR basiqCategory when no user override)
- All results scoped to the authenticated user via `account.connection.userId`
- Returns `{ items, total, pageCount }` using Prisma `$transaction` for atomic count + fetch

### tRPC `transaction.updateCategory` (CoVe applied)
- Ownership check: fetches transaction + `account.connection.userId`, compares to session
- Returns `NOT_FOUND` for both "missing" and "wrong owner" (no information leak)
- Sets `userCategory` only after ownership confirmed

### UI Components
- **TransactionRow**: shows formatted date, truncated description, credit/debit amount
  (green for credits), category dropdown (base-ui Select), "edited" indicator
- **TransactionsClient**: 4 filter inputs (account, date from, date to, category),
  "Clear filters" button, empty states for both filtered and unfiltered
- **TransactionsPage**: server component, prefetches accounts from DB, passes to client

### Bug Discovered
- The project's `select.tsx` uses `@base-ui/react` (not Radix UI) — `onValueChange`
  signature is `(val: string | null, eventDetails) => void`, not `(val: string) => void`.
- Fixed by null-checking `val` before calling mutation.
- CATEGORIES exported from router for reuse in both the row dropdown and filter bar.

## Verification
- `npm run typecheck` → 0 errors
- CoVe applied to `updateCategory` ownership check
