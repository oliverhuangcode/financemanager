# Discovery: Phase 9 — Analytics & Charts

## Goal
Build `/analytics` page with Recharts visualisations: monthly bar chart (6 months), category pie/donut chart, daily cumulative line chart, income vs expenses grouped bar chart.

## Existing Patterns to Reuse

### tRPC router pattern
- `protectedProcedure` with `ctx.session.user.id` ownership scoping
- `z.object({ monthYear: z.string().regex(/^\d{4}-\d{2}$/) })` input shape
- Month boundary: `new Date(year, month-1, 1)` / `new Date(year, month, 1)` (exclusive)
- Decimal → `Number()` conversion before returning
- In-memory aggregation for category grouping (Prisma groupBy can't operate on derived fields)

### Dashboard router (most similar)
- `dashboard.summary({ monthYear })` — month transactions + category aggregation
- Same in-memory Map pattern for categories
- Account balance Decimal conversion

### Page structure
- Server component with auth guard → `redirect("/login")`
- Client component with `"use client"` + tRPC useQuery
- Month selector: `<input type="month">` controlled by useState

## Recharts v2 API (confirmed from context7)

```typescript
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";

// Responsive wrapper (required for all charts)
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={data}>...</BarChart>
</ResponsiveContainer>

// Bar chart
<BarChart data={[{month: "Jan", expenses: 1200, income: 3000}]}>
  <XAxis dataKey="month" />
  <YAxis />
  <Tooltip formatter={(value: number) => formatCurrency(value)} />
  <Bar dataKey="expenses" fill="#ef4444" />
  <Bar dataKey="income" fill="#22c55e" />
</BarChart>

// Pie chart (donut via innerRadius)
<PieChart>
  <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100}>
    {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
  </Pie>
  <Tooltip formatter={(value: number) => formatCurrency(value)} />
</PieChart>

// Line chart
<LineChart data={[{day: "1", cumulative: 150}]}>
  <XAxis dataKey="day" />
  <YAxis />
  <CartesianGrid strokeDasharray="3 3" />
  <Tooltip formatter={(value: number) => formatCurrency(value)} />
  <Line type="monotone" dataKey="cumulative" stroke="#3b82f6" dot={false} />
</LineChart>
```

Note: All Recharts components must be in `"use client"` components (they use DOM APIs).

## Data Requirements

### 1. Monthly bar chart (last 6 months expenses + income)
- Query: transactions with `date gte 6-month start, lt monthEnd`
- Group by month (`YYYY-MM`), split by `isCredit`
- Returns: `{ month: string, expenses: number, income: number }[]` (6 entries)

### 2. Category breakdown pie chart (selected month, expenses only)
- Same as dashboard topCategories but all categories (not just top 5)
- Already have pattern: in-memory Map aggregation

### 3. Daily cumulative line chart (selected month, expenses only)
- Query: debit transactions in selected month
- Group by day-of-month, running sum
- Returns: `{ day: string, cumulative: number }[]` (up to 31 entries)

### 4. Income vs expenses (already covered by monthly bar chart above)
- Same dataset, just render as grouped bar with two bars per month

## Single tRPC Query Design

One procedure `analytics.chartData({ monthYear })` returns all datasets:

```typescript
{
  monthlyTotals: { month: string, expenses: number, income: number }[],  // 6 entries
  categoryBreakdown: { category: string, amount: number }[],              // all categories with spend
  dailyCumulative: { day: string, cumulative: number }[],                 // up to 31 entries
}
```

### monthlyTotals computation
- 6-month window: derive from `monthYear` input (e.g., if "2026-03", range = "2025-10" to "2026-03")
- Single query: `date gte sixMonthsAgo, lt monthEnd` (all transactions, both credit/debit)
- In-memory: group by `tx.date.toISOString().slice(0,7)` (YYYY-MM), accumulate expenses and income separately

### categoryBreakdown computation
- Reuse same pattern as dashboard: debit transactions for target month, Map aggregation on `userCategory ?? basiqCategory ?? "Uncategorised"`
- Return all categories (no top-5 limit)

### dailyCumulative computation
- Debit transactions for target month
- Group by day number, sorted ascending
- Running sum with `reduce` + spread of accumulated daily amounts
- `day` label: just day number as string ("1", "2", ..., "31")

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/server/api/routers/analytics.ts` | New tRPC router with `chartData` procedure |
| `src/server/api/root.ts` | Register analyticsRouter |
| `src/app/analytics/page.tsx` | Replace placeholder with server component + auth guard |
| `src/app/analytics/_components/AnalyticsClient.tsx` | New: full analytics UI with 4 charts |

## Constraints / Gotchas
- Recharts must be `"use client"` — all chart components go in AnalyticsClient
- `ResponsiveContainer` requires a parent with a defined height (use `height={300}`)
- Tooltip `formatter` prop receives `value: number` — TypeScript needs explicit cast
- Decimal → `Number()` conversion required before returning from tRPC
- 6-month window: compute `sixMonthsAgo` from parsed `monthYear`, not `new Date()` (so month selector works historically)
- Daily cumulative: build all days 1..maxDay in order even if no transactions on that day (fill with previous cumulative)
