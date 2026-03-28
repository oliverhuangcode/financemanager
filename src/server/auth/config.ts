import type { DefaultSession, NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

/**
 * Edge-safe auth config — NO Prisma/Node.js-only imports.
 * Used directly by middleware (edge runtime) and spread into the full server config.
 *
 * Contains:
 * - Google OAuth provider
 * - Custom sign-in page (so unauth redirects go to /login, not /api/auth/signin)
 * - `authorized` callback for middleware route protection
 */
export const authConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth }) {
      // Return true if a session user exists (i.e. authenticated).
      // Middleware uses this to gate all matched routes.
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
