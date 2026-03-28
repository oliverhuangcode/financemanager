# Summary: Plan 07-01 — Dashboard

## What Was Done

Built the `/dashboard` page with monthly spend summary, top categories, recent
transactions, account balances, and a month selector.

### Files Created
| File | Purpose |
|------|---------|
| `src/server/api/routers/dashboard.ts` | tRPC: dashboard.summary query |
| `src/app/dashboard/_components/DashboardClient.tsx` | Client component: month selector + 4 sections |

### Files Modified
| File | Change |
|------|--------|
| `src/server/api/root.ts` | Registered dashboardRouter |
| `src/app/dashboard/page.tsx` | Server component with auth guard |

## Implementation Details

### `dashboard.summary` tRPC Query (CoVe Applied)
- All queries scoped to `connection.userId` (prevents cross-user data leakage)
- Month boundaries: JS Date with 0-indexed month — `new Date(year, month-1, 1)` for start,
  `new Date(year, month, 1)` (exclusive) for end
- `totalSpent`: reduces debit transaction amounts to a single number
- `topCategories`: in-memory aggregation using `userCategory ?? basiqCategory ?? "Uncategorised"` —
  correct because Prisma groupBy can't operate on computed columns
- `recentTransactions`: last 10 across all time (not month-filtered)
- Prisma `Decimal` fields converted to `Number()` before return (serialization-safe)

### DashboardClient
- Defaults to current month via `currentMonthYear()` helper
- Month selector capped at current month (`max` attribute)
- Category progress bars: `(amount / totalSpent) * 100`%
- All sections have appropriate empty states
- Grid layout: 2-col on sm+ for the top row, full-width cards below

## Verification
- `npm run typecheck` → 0 errors
- CoVe applied to data scoping and month boundary calculation
