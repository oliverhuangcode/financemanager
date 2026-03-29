import crypto from "crypto";

import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const importRouter = createTRPCRouter({
  /**
   * listManualAccounts
   * Returns all accounts created via CSV import for the current user.
   * These are stored under a shadow BasiqConnection with basiqUserId = "manual-{userId}".
   */
  listManualAccounts: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const connection = await ctx.db.basiqConnection.findFirst({
      where: { basiqUserId: `manual-${userId}` },
      include: { bankAccounts: { orderBy: { name: "asc" } } },
    });
    return connection?.bankAccounts ?? [];
  }),

  /**
   * createManualAccount
   * Creates a named account for CSV imports, under a shadow BasiqConnection.
   */
  createManualAccount: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const manualBasiqUserId = `manual-${userId}`;

      // Find or create the shadow connection for this user's manual accounts
      let connection = await ctx.db.basiqConnection.findFirst({
        where: { basiqUserId: manualBasiqUserId },
      });

      if (!connection) {
        connection = await ctx.db.basiqConnection.create({
          data: { userId, basiqUserId: manualBasiqUserId },
        });
      }

      return ctx.db.bankAccount.create({
        data: {
          connectionId: connection.id,
          basiqAccountId: `manual-acct-${crypto.randomUUID()}`,
          name: input.name,
          type: "manual",
          balance: 0,
          currency: "AUD",
        },
      });
    }),

  /**
   * importCsv
   * Upsert transactions from parsed ANZ CSV rows into a given account.
   * Idempotent: re-importing the same statement won't create duplicates.
   * Synthetic basiqTxId = "csv-{sha256(accountId|date|amount|balance|description).slice(24)}"
   */
  importCsv: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        rows: z
          .array(
            z.object({
              date: z.string(),        // ISO date string
              description: z.string().min(1),
              amount: z.string(),      // positive decimal string
              isCredit: z.boolean(),
              balance: z.string(),     // used only for hash uniqueness
            }),
          )
          .min(1)
          .max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Ownership check: account must belong to the authenticated user
      const account = await ctx.db.bankAccount.findFirst({
        where: { id: input.accountId, connection: { userId } },
      });

      if (!account) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Account not found." });
      }

      let imported = 0;

      for (const row of input.rows) {
        const hash = crypto
          .createHash("sha256")
          .update(
            `${input.accountId}|${row.date}|${row.amount}|${row.balance}|${row.description}`,
          )
          .digest("hex")
          .slice(0, 24);
        const basiqTxId = `csv-${hash}`;

        await ctx.db.transaction.upsert({
          where: { basiqTxId },
          create: {
            accountId: input.accountId,
            basiqTxId,
            date: new Date(row.date),
            description: row.description,
            amount: row.amount,
            currency: "AUD",
            isCredit: row.isCredit,
            basiqCategory: "Uncategorised",
          },
          update: {
            description: row.description,
            amount: row.amount,
            // userCategory intentionally absent — never overwrite user's override
          },
        });
        imported++;
      }

      return { imported };
    }),
});
