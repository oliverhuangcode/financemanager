import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const accountRouter = createTRPCRouter({
  /**
   * list — returns all BankAccounts for the authenticated user,
   * joined through their BasiqConnection.
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    return ctx.db.bankAccount.findMany({
      where: {
        connection: { userId },
      },
      orderBy: { name: "asc" },
    });
  }),
});
