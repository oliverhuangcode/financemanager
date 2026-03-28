# Phase 8 Discovery: Budgets

## Goal
Build `/budgets` page: per-category monthly budgets with actual-vs-budget progress bars,
over-budget red highlighting, carry-forward from previous months, and an edit dialog.

---

## PRD Requirements (US-007)
- Budget amount settable per category per month
- Budget vs actual comparison shown as a progress bar
- Budgets carry forward to next month if not updated
- Over-budget categories highlighted in red

---

## Data Model
```prisma
model Budget {
  id          String   @id @default(cuid())
  userId      String
  category    String
  monthYear   String   // "2026-03"
  amountCents Int      // budget amount in cents
  @@unique([userId, category, monthYear])
}
```

---

## Carry-Forward Logic
"Budgets carry forward to next month if not updated" means:
- If no budget row for category X in March, use the most recent prior budget row for X.
- Implementation: fetch all budgets `where: { userId, monthYear: { lte: targetMonth } }`,
  order by `monthYear DESC`. Group by category, take first occurrence = most recent.
- Track `carriedFrom` to show a "(from YYYY-MM)" indicator in the UI.

---

## tRPC Procedures

### `budget.list({ monthYear })`
Returns for each of the 13 CATEGORIES:
```typescript
{
  category: string
  budgetCents: number | null     // null = never set
  budgetAmount: number           // dollars
  actualAmount: number           // dollars spent this month
  isOverBudget: boolean
  carriedFromMonth: string | null // non-null if carried forward
}
```

Steps:
1. Fetch all budgets for user up to and including target month (carry-forward source)
2. Group by category, take most-recent per category (monthYear DESC order)
3. Fetch debit transactions for the month, aggregate actual spend per effective category
4. Join the two: for each CATEGORY, report budget (or null) + actual

### `budget.upsert({ category, monthYear, amountCents })`
- Creates a new budget row for the exact month OR updates existing
- Must be for the authenticated user
- `amountCents` must be >= 0
- Uses Prisma `upsert` with compound unique key `userId_category_monthYear`
- CoVe required: ownership via session userId, non-negative cents validation

---

## UI Architecture
```
/budgets/page.tsx                    ← Server component (auth guard)
/budgets/_components/
  BudgetsClient.tsx                  ← "use client", owns monthYear + edit state
  BudgetEditDialog.tsx               ← Dialog with dollar amount input
```

## Budget Row Display
| Category | Progress bar | Amount |
|----------|-------------|--------|
| Food & Dining | [████████░░] | $240 / $300 |
| Over-budget: | [██████████] | $340 / $300 ← red |
| No budget: | (no bar) | $180 / — (set budget) |

---

## Available Components
- `Card`, `CardContent`, `CardHeader`, `CardTitle`
- `Progress`, `ProgressTrack`, `ProgressIndicator` — `@base-ui/react/progress`
- `Dialog`, `DialogContent`, `DialogTitle`, `DialogFooter`, `DialogTrigger`
- Note: `Progress.Root.Props.value` = 0–100 number for fill percentage

---

## CATEGORIES Constant
Reuse from `src/server/api/routers/transaction.ts` — the 13 fixed categories.
