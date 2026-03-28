import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { accountRouter } from "@/server/api/routers/account";
import { basiqRouter } from "@/server/api/routers/basiq";
import { healthRouter } from "@/server/api/routers/health";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  health: healthRouter,
  basiq: basiqRouter,
  account: accountRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 */
export const createCaller = createCallerFactory(appRouter);
