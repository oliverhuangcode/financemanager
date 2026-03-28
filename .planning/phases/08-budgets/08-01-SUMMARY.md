# Summary: Plan 08-01 — Budgets

## What Was Done

Built the `/budgets` page with per-category budget vs actual progress bars, carry-forward
from prior months, over-budget red highlighting, and an inline edit dialog.

### Files Created
| File | Purpose |
|------|---------|
| `src/server/api/routers/budget.ts` | tRPC: budget.list (with carry-forward) + budget.upsert |
| `src/app/budgets/_components/BudgetEditDialog.tsx` | Edit dialog with dollar input |
| `src/app/budgets/_components/BudgetsClient.tsx` | Full budgets UI with 3 sections |

### Files Modified
| File | Change |
|------|--------|
| `src/server/api/root.ts` | Registered budgetRouter |
| `src/app/budgets/page.tsx` | Server component with auth guard |

## Implementation Details

### `budget.list` (CoVe Applied)
- Fetches all budgets `where: { userId, monthYear: { lte: targetMonth } }` for carry-forward
- Orders `monthYear DESC` then groups by category — first entry = most recent
- `carriedFromMonth` is non-null when budget comes from a prior month
- Actual spend computed same way as dashboard: in-memory aggregation on effective category
- Month boundaries: `new Date(year, month-1, 1)` (inclusive) / `new Date(year, month, 1)` (exclusive)
- Returns all 13 CATEGORIES (from transaction.ts constant) — consistent taxonomy

### `budget.upsert` (CoVe Applied)
- `amountCents: z.number().int().min(0)` — rejects negative values at Zod validation
- `userId` from session (server-controlled)
- Prisma upsert on compound unique `userId_category_monthYear` — no cross-user writes possible
- UI converts dollars → `Math.round(dollars * 100)` to avoid float precision issues

### BudgetsClient UI
- Three sections: "Budgets" (has budget), "Unbudgeted Spending", collapsed "Other categories"
- Progress bars capped at 100% display; over-budget shows `bg-red-500`
- Category label + amount text turn red when over budget
- Carry-forward indicator `"(from YYYY-MM)"` when budget from prior month
- Edit dialog: Enter key submits, error message on failure

## Verification
- `npm run typecheck` → 0 errors
- CoVe applied to carry-forward grouping, month boundary calculation, and upsert ownership
