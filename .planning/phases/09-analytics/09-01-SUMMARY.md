# Summary: Plan 09-01 — Analytics & Charts

## What Was Done

Built the `/analytics` page with 4 Recharts visualisations: monthly expenses bar chart, income vs expenses grouped bar chart, spending by category donut chart, and daily cumulative line chart.

### Files Created
| File | Purpose |
|------|---------|
| `src/server/api/routers/analytics.ts` | tRPC: analytics.chartData (monthlyTotals, categoryBreakdown, dailyCumulative) |
| `src/app/analytics/_components/AnalyticsClient.tsx` | 4-chart analytics UI with month selector |

### Files Modified
| File | Change |
|------|--------|
| `src/server/api/root.ts` | Registered analyticsRouter |
| `src/app/analytics/page.tsx` | Replaced placeholder with server component + auth guard |

## Implementation Details

### `analytics.chartData` (CoVe Applied)
- Single DB query covers 6-month window: `date gte sixMonthsAgoDate, lt monthEnd`
- `sixMonthsAgoDate = new Date(year, month - 6, 1)` — anchored to selected month (not `new Date()`) so month selector works for historical months
- **monthlyTotals**: builds ordered 6-key list, uses `tx.date.toISOString().slice(0,7)` for consistent YYYY-MM grouping; label uses day 2 (`k + "-02"`) to avoid UTC timezone off-by-one in `toLocaleDateString`
- **categoryBreakdown**: same in-memory Map pattern as dashboard; `userCategory ?? basiqCategory ?? "Uncategorised"`, sorted by amount desc
- **dailyCumulative**: fills all days 1..daysInMonth with running total — gaps produce flat segments rather than holes in the line chart
- All Decimal fields converted with `Number()` before return

### AnalyticsClient UI
- `"use client"` — required for Recharts (DOM APIs)
- 2-column grid on `lg:`, single column below
- Empty state per-chart when all values are zero
- `formatCurrency` uses `maximumFractionDigits: 0` for chart labels (whole dollars)
- Y-axis tick formatter: `$Xk` shorthand for readability
- Pie chart: donut style (`innerRadius={60}`), 10-colour palette, `paddingAngle={2}` for gap between slices

## Verification
- `npm run typecheck` → 0 errors
- CoVe applied to 6-month window calculation, daily fill loop, and category aggregation
