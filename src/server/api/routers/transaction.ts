import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { CATEGORIES } from "@/lib/categories";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export { CATEGORIES };
export const PAGE_SIZE = 50;

export const transactionRouter = createTRPCRouter({
  /**
   * list — paginated, filterable transaction feed scoped to the authenticated user.
   */
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        accountId: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        category: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { page, accountId, dateFrom, dateTo, category } = input;
      const skip = (page - 1) * PAGE_SIZE;

      const where = {
        account: {
          connection: { userId },
          ...(accountId ? { id: accountId } : {}),
        },
        ...(dateFrom ?? dateTo
          ? {
              date: {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(dateTo) } : {}),
              },
            }
          : {}),
        ...(category
          ? {
              OR: [
                { userCategory: category },
                { basiqCategory: category, userCategory: null },
              ],
            }
          : {}),
      };

      const [items, total] = await ctx.db.$transaction([
        ctx.db.transaction.findMany({
          where,
          orderBy: { date: "desc" },
          skip,
          take: PAGE_SIZE,
          include: {
            account: {
              select: { name: true, currency: true },
            },
          },
        }),
        ctx.db.transaction.count({ where }),
      ]);

      return {
        items,
        total,
        pageCount: Math.ceil(total / PAGE_SIZE),
      };
    }),

  /**
   * updateCategory — set a user category override on a transaction.
   * Verifies the transaction belongs to the authenticated user before updating.
   */
  updateCategory: protectedProcedure
    .input(
      z.object({
        transactionId: z.string(),
        category: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Ownership check: transaction → account → connection → user
      const tx = await ctx.db.transaction.findUnique({
        where: { id: input.transactionId },
        select: {
          id: true,
          account: {
            select: {
              connection: { select: { userId: true } },
            },
          },
        },
      });

      if (!tx || tx.account.connection.userId !== userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transaction not found.",
        });
      }

      return ctx.db.transaction.update({
        where: { id: input.transactionId },
        data: { userCategory: input.category },
      });
    }),
});
