import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { env } from "@/env";
import {
  createAuthLink,
  createBasiqUser,
  createWebhook,
  deleteWebhook,
  getBasiqAccounts,
  getBasiqTransactions,
  getServerToken,
  listWebhooks,
  sendTestWebhook,
} from "@/lib/basiq";
import { upsertTransactions } from "@/lib/upsertTransactions";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const basiqRouter = createTRPCRouter({
  /**
   * createConsentUrl
   * Find or create a BasiqConnection for the current user, then create an
   * auth link and return the Basiq-hosted consent URL.
   */
  createConsentUrl: protectedProcedure
    .input(z.object({ mobile: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const token = await getServerToken(env.BASIQ_API_KEY);

      let connection = await ctx.db.basiqConnection.findFirst({
        where: { userId },
      });

      if (!connection) {
        const userEmail = ctx.session.user.email;
        if (!userEmail) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User email required to create Basiq connection.",
          });
        }
        const basiqUserId = await createBasiqUser(token, userEmail);
        connection = await ctx.db.basiqConnection.create({
          data: { userId, basiqUserId },
        });
      }

      const consentUrl = await createAuthLink(token, connection.basiqUserId, input.mobile);
      return { consentUrl };
    }),

  /**
   * syncAccounts
   * Fetch all accounts from Basiq for the user's connection and upsert them
   * into the BankAccount table.
   */
  syncAccounts: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const connection = await ctx.db.basiqConnection.findFirst({
      where: { userId },
    });

    if (!connection) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No bank connection found. Connect an account first.",
      });
    }

    const token = await getServerToken(env.BASIQ_API_KEY);
    const accounts = await getBasiqAccounts(token, connection.basiqUserId);

    const upserted = await Promise.all(
      accounts.map((acc) =>
        ctx.db.bankAccount.upsert({
          where: { basiqAccountId: acc.id },
          create: {
            connectionId: connection.id,
            basiqAccountId: acc.id,
            name: acc.name,
            type: acc.class.type,
            balance: acc.balance,
            currency: acc.currency,
          },
          update: {
            name: acc.name,
            type: acc.class.type,
            balance: acc.balance,
          },
        }),
      ),
    );

    return upserted;
  }),

  /**
   * syncTransactions
   * Manual trigger: fetch transactions from Basiq for all connected accounts
   * and upsert them idempotently. Useful when webhooks are unavailable.
   */
  syncTransactions: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const connection = await ctx.db.basiqConnection.findFirst({
      where: { userId },
      include: { bankAccounts: true },
    });

    if (!connection) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No bank connection found. Connect an account first.",
      });
    }

    const token = await getServerToken(env.BASIQ_API_KEY);
    let total = 0;

    for (const bankAccount of connection.bankAccounts) {
      const txs = await getBasiqTransactions(
        token,
        connection.basiqUserId,
        bankAccount.basiqAccountId,
      );
      const count = await upsertTransactions(ctx.db, bankAccount.id, txs);
      total += count;
    }

    return { synced: total };
  }),

  /**
   * webhookStatus
   * List all webhooks registered for this Basiq application.
   */
  webhookStatus: protectedProcedure.query(async () => {
    const token = await getServerToken(env.BASIQ_API_KEY);
    const webhooks = await listWebhooks(token);
    return webhooks;
  }),

  /**
   * registerWebhook
   * Register the app's /api/webhooks/basiq endpoint with Basiq.
   * Returns the webhook including the one-time signing secret — show it to
   * the user so they can add it to BASIQ_WEBHOOK_SECRET in their env.
   */
  registerWebhook: protectedProcedure
    .input(z.object({ appUrl: z.string().url() }))
    .mutation(async ({ input }) => {
      const token = await getServerToken(env.BASIQ_API_KEY);

      // Check for existing webhook at this URL to avoid duplicates (409)
      const existing = await listWebhooks(token);
      const webhookUrl = `${input.appUrl}/api/webhooks/basiq`;
      const duplicate = existing.find((w) => w.url === webhookUrl);
      if (duplicate) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `A webhook for this URL already exists (status: ${duplicate.status}). ID: ${duplicate.id}`,
        });
      }

      const webhook = await createWebhook(token, input.appUrl);
      return webhook;
    }),

  /**
   * deleteWebhook
   * Remove a registered webhook by ID.
   */
  deleteWebhook: protectedProcedure
    .input(z.object({ webhookId: z.string() }))
    .mutation(async ({ input }) => {
      const token = await getServerToken(env.BASIQ_API_KEY);
      await deleteWebhook(token, input.webhookId);
      return { deleted: true };
    }),

  /**
   * testWebhook
   * Send a test event to all registered webhooks to verify delivery.
   */
  testWebhook: protectedProcedure.mutation(async () => {
    const token = await getServerToken(env.BASIQ_API_KEY);
    await sendTestWebhook(token, "transactions.updated");
    return { sent: true };
  }),
});
