import { z } from "zod";

import { CATEGORIES } from "@/server/api/routers/transaction";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const budgetRouter = createTRPCRouter({
  /**
   * list — returns budget vs actual for all 13 CATEGORIES for a given month.
   * Implements carry-forward: if no budget set for target month, uses the
   * most recent prior budget for that category.
   */
  list: protectedProcedure
    .input(z.object({ monthYear: z.string().regex(/^\d{4}-\d{2}$/) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { monthYear } = input;

      // 1. All budgets up to and including target month (carry-forward source).
      //    Ordered DESC so first occurrence per category = most recent.
      const allBudgets = await ctx.db.budget.findMany({
        where: { userId, monthYear: { lte: monthYear } },
        orderBy: { monthYear: "desc" },
      });

      // 2. Group by category — take first = most recent
      const latestByCategory = new Map<
        string,
        { amountCents: number; monthYear: string }
      >();
      for (const b of allBudgets) {
        if (!latestByCategory.has(b.category)) {
          latestByCategory.set(b.category, {
            amountCents: b.amountCents,
            monthYear: b.monthYear,
          });
        }
      }

      // 3. Actual debit spend for the target month, scoped to user
      const [yearStr, monthStr] = monthYear.split("-");
      const year = Number(yearStr);
      const month = Number(monthStr);
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 1); // exclusive

      const monthTxs = await ctx.db.transaction.findMany({
        where: {
          account: { connection: { userId } },
          date: { gte: monthStart, lt: monthEnd },
          isCredit: false,
        },
        select: { amount: true, basiqCategory: true, userCategory: true },
      });

      // 4. Aggregate actual spend per effective category
      const actualByCategory = new Map<string, number>();
      for (const tx of monthTxs) {
        const cat =
          tx.userCategory ?? tx.basiqCategory ?? "Uncategorised";
        actualByCategory.set(
          cat,
          (actualByCategory.get(cat) ?? 0) + Math.abs(Number(tx.amount)),
        );
      }

      // 5. One row per CATEGORY
      return CATEGORIES.map((category) => {
        const budget = latestByCategory.get(category) ?? null;
        const budgetAmount = budget ? budget.amountCents / 100 : null;
        const actualAmount = actualByCategory.get(category) ?? 0;
        const isOverBudget =
          budgetAmount !== null && actualAmount > budgetAmount;
        const carriedFromMonth =
          budget && budget.monthYear !== monthYear ? budget.monthYear : null;

        return {
          category,
          budgetCents: budget?.amountCents ?? null,
          budgetAmount,
          actualAmount,
          isOverBudget,
          carriedFromMonth,
        };
      });
    }),

  /**
   * upsert — create or update a monthly budget for a category.
   * Ownership enforced via session userId in the compound unique key.
   * Amount validated as non-negative integer cents.
   */
  upsert: protectedProcedure
    .input(
      z.object({
        category: z.string().min(1),
        monthYear: z.string().regex(/^\d{4}-\d{2}$/),
        amountCents: z.number().int().min(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { category, monthYear, amountCents } = input;

      return ctx.db.budget.upsert({
        where: {
          userId_category_monthYear: { userId, category, monthYear },
        },
        create: { userId, category, monthYear, amountCents },
        update: { amountCents },
      });
    }),
});
