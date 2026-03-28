import { TRPCError } from "@trpc/server";

import { env } from "@/env";
import {
  createAuthLink,
  createBasiqUser,
  getBasiqAccounts,
  getServerToken,
} from "@/lib/basiq";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const basiqRouter = createTRPCRouter({
  /**
   * createConsentUrl
   * Find or create a BasiqConnection for the current user, then create an
   * auth link and return the Basiq-hosted consent URL.
   */
  createConsentUrl: protectedProcedure.mutation(async ({ ctx }) => {
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

    const consentUrl = await createAuthLink(token, connection.basiqUserId);
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
});
