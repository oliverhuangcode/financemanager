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
    // Keep signIn/authorized from authConfig — replacing the object would drop the allowlist.
    ...authConfig.callbacks,
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        // Empty string (not a non-null assertion) if sub is ever missing;
        // protectedProcedure rejects sessions without an id, so a missing id
        // can never turn into an unfiltered `where: { userId: undefined }`.
        id: token.sub ?? "",
      },
    }),
  },
});

const auth = cache(uncachedAuth);

export { auth, handlers, signIn, signOut };
