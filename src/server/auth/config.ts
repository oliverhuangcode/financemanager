import type { DefaultSession, NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { isEmailAllowed } from "./allowlist";

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
 * - `signIn` callback enforcing the ALLOWED_EMAILS allowlist
 * - `authorized` callback for middleware route protection
 */
export const authConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    signIn({ user, profile }) {
      // Google tells us whether the address is verified; never trust an unverified one.
      if (profile && profile.email_verified === false) return false;
      return isEmailAllowed(profile?.email ?? user.email);
    },
    authorized({ auth }) {
      // Signed in AND still on the allowlist (removing an email locks out
      // existing sessions too). Middleware uses this to gate all matched routes.
      return !!auth?.user && isEmailAllowed(auth.user.email);
    },
  },
} satisfies NextAuthConfig;
