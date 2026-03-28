import NextAuth from "next-auth";

import { authConfig } from "@/server/auth/config";

/**
 * Edge-safe middleware auth instance.
 * Uses authConfig directly (NO Prisma / Node.js-only imports).
 * The `authorized` callback in authConfig gates all matched routes.
 */
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Protect all routes except the ones listed below.
  matcher: [
    "/((?!api/auth|api/webhooks|_next/static|_next/image|favicon.ico|login).*)",
  ],
};
