import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import { cache } from "react";

import { db } from "@/server/db";
import { authConfig } from "./config";

/**
 * Full server-side NextAuth config.
 * Extends the edge-safe authConfig with the Prisma adapter (database sessions)
 * and a session callback that injects the DB user's id into the session object.
 *
 * NOT imported by middleware — only used in Server Components, API routes, and tRPC context.
 */
const {
  auth: uncachedAuth,
  handlers,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  callbacks: {
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.sub!,
      },
    }),
  },
});

const auth = cache(uncachedAuth);

export { auth, handlers, signIn, signOut };
