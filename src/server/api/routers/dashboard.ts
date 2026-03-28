import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const dashboardRouter = createTRPCRouter({
  /**
   * summary — all dashboard data for a given month.
   * Returns: totalSpent, topCategories, recentTransactions, accountBalances.
   * All queries scoped to the authenticated user via connection.userId.
   */
  summary: protectedProcedure
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
      // JS Date: month is 0-indexed. monthEnd is exclusive upper bound.
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 1);

      // 1. Account balances
      const bankAccounts = await ctx.db.bankAccount.findMany({
        where: { connection: { userId } },
        select: {
          id: true,
          name: true,
          type: true,
          balance: true,
          currency: true,
        },
        orderBy: { name: "asc" },
      });

      const accountBalances = bankAccounts.map((a) => ({
        ...a,
        balance: Number(a.balance),
      }));

      // 2. Debit transactions for the month — used for spend totals + categories
      const monthTransactions = await ctx.db.transaction.findMany({
        where: {
          account: { connection: { userId } },
          date: { gte: monthStart, lt: monthEnd },
          isCredit: false,
        },
        select: {
          amount: true,
          basiqCategory: true,
          userCategory: true,
        },
      });

      // 3. Total spent (sum of absolute debit amounts)
      const totalSpent = monthTransactions.reduce(
        (sum, tx) => sum + Math.abs(Number(tx.amount)),
        0,
      );

      // 4. Top categories — in-memory aggregation using effective category
      //    (userCategory takes precedence over basiqCategory)
      const categoryMap = new Map<string, number>();
      for (const tx of monthTransactions) {
        const cat =
          tx.userCategory ?? tx.basiqCategory ?? "Uncategorised";
        categoryMap.set(
          cat,
          (categoryMap.get(cat) ?? 0) + Math.abs(Number(tx.amount)),
        );
      }
      const topCategories = Array.from(categoryMap.entries())
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      // 5. Recent transactions (last 10, all types, across all months)
      const recent = await ctx.db.transaction.findMany({
        where: { account: { connection: { userId } } },
        orderBy: { date: "desc" },
        take: 10,
        select: {
          id: true,
          date: true,
          description: true,
          amount: true,
          currency: true,
          isCredit: true,
          basiqCategory: true,
          userCategory: true,
          account: { select: { name: true } },
        },
      });

      const recentTransactions = recent.map((tx) => ({
        ...tx,
        amount: Number(tx.amount),
      }));

      return {
        totalSpent,
        topCategories,
        recentTransactions,
        accountBalances,
      };
    }),
});
