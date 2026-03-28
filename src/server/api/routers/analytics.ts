import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const analyticsRouter = createTRPCRouter({
  /**
   * chartData — all analytics data for a given month.
   * Returns: monthlyTotals (6 months), categoryBreakdown, dailyCumulative.
   * All queries scoped to the authenticated user via connection.userId.
   */
  chartData: protectedProcedure
    .input(
      z.object({
        monthYear: z.string().regex(/^\d{4}-\d{2}$/),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const [yearStr, monthStr] = input.monthYear.split("-");
      const year = Number(yearStr);
      const month = Number(monthStr);

      // Target month bounds
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 1);

      // 6-month window: go back 5 months from the target month
      const sixMonthsAgoDate = new Date(year, month - 6, 1);

      // Single query covering all 6 months
      const allTransactions = await ctx.db.transaction.findMany({
        where: {
          account: { connection: { userId } },
          date: { gte: sixMonthsAgoDate, lt: monthEnd },
        },
        select: {
          date: true,
          amount: true,
          isCredit: true,
          basiqCategory: true,
          userCategory: true,
        },
        orderBy: { date: "asc" },
      });

      // ── 1. Monthly totals (6 months) ──────────────────────────────────────
      // Build ordered list of 6 month keys: e.g. ["2025-10", ..., "2026-03"]
      const monthKeys: string[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(year, month - 1 - i, 1);
        monthKeys.push(
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        );
      }
      const monthlyMap = new Map<string, { expenses: number; income: number }>(
        monthKeys.map((k) => [k, { expenses: 0, income: 0 }]),
      );
      for (const tx of allTransactions) {
        const key = tx.date.toISOString().slice(0, 7);
        const entry = monthlyMap.get(key);
        if (!entry) continue;
        const amt = Math.abs(Number(tx.amount));
        if (tx.isCredit) {
          entry.income += amt;
        } else {
          entry.expenses += amt;
        }
      }
      const monthlyTotals = monthKeys.map((k) => {
        const label = new Date(k + "-02").toLocaleDateString("en-AU", {
          month: "short",
          year: "2-digit",
        });
        const entry = monthlyMap.get(k)!;
        return { month: label, expenses: entry.expenses, income: entry.income };
      });

      // ── 2. Category breakdown (selected month, debits only) ───────────────
      const monthDebits = allTransactions.filter(
        (tx) =>
          !tx.isCredit && tx.date >= monthStart && tx.date < monthEnd,
      );
      const categoryMap = new Map<string, number>();
      for (const tx of monthDebits) {
        const cat = tx.userCategory ?? tx.basiqCategory ?? "Uncategorised";
        categoryMap.set(
          cat,
          (categoryMap.get(cat) ?? 0) + Math.abs(Number(tx.amount)),
        );
      }
      const categoryBreakdown = Array.from(categoryMap.entries())
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);

      // ── 3. Daily cumulative spend (selected month, debits only) ───────────
      // Build a complete array for every day in the month (gaps filled with
      // previous running total so the line is continuous).
      const daysInMonth = new Date(year, month, 0).getDate();
      const dailyMap = new Map<number, number>();
      for (const tx of monthDebits) {
        const dayNum = tx.date.getDate();
        dailyMap.set(
          dayNum,
          (dailyMap.get(dayNum) ?? 0) + Math.abs(Number(tx.amount)),
        );
      }
      const dailyCumulative: { day: string; cumulative: number }[] = [];
      let running = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        running += dailyMap.get(d) ?? 0;
        dailyCumulative.push({ day: String(d), cumulative: running });
      }

      return { monthlyTotals, categoryBreakdown, dailyCumulative };
    }),
});
