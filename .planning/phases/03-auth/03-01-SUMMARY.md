# Phase 3 Plan 01 Summary: Authentication (NextAuth + Google)

## What Was Done

Fixed two critical bugs in the Phase 1 auth scaffold and implemented the split auth config
pattern required for NextAuth v5 + Prisma + Next.js Edge Runtime middleware.

## Bugs Fixed

### Bug 1: Missing `pages.signIn`
**Before**: No custom sign-in page configured → unauthenticated redirects went to
`/api/auth/signin` (NextAuth's built-in UI), bypassing our custom `/login` page.
**After**: `pages: { signIn: '/login' }` added to `authConfig`. All unauth redirects now
go to the correct login screen.

### Bug 2: Middleware importing Prisma (edge runtime crash)
**Before**: `middleware.ts` did `export { auth as middleware } from "@/server/auth"`. The
`@/server/auth/index.ts` module imports `PrismaAdapter` and `@/server/db`. Prisma uses
Node.js native bindings which are UNAVAILABLE in Next.js Edge Runtime. Would crash Vercel.
**After**: Middleware creates its own NextAuth instance using only the edge-safe `authConfig`
(no Prisma imports). The full Prisma-backed config is kept in `index.ts` for server-side use only.

## Architecture: Split Auth Config

```
src/server/auth/
├── config.ts    ← EDGE-SAFE: Google provider, pages.signIn, authorized callback
│                   Imported by: middleware.ts (edge), index.ts (server)
└── index.ts     ← SERVER-ONLY: spreads config + PrismaAdapter + session callback
                    Imported by: server components, tRPC context, API routes
```

## Files Changed

| File | Change |
|------|--------|
| `src/server/auth/config.ts` | Removed Prisma imports; added `pages.signIn`; added `authorized` callback |
| `src/server/auth/index.ts` | Moved PrismaAdapter here; added `session` callback with `user.id` |
| `src/middleware.ts` | Now creates edge-safe auth from `authConfig` directly |

## CoVe Verification Results

| Check | Result |
|-------|--------|
| Unauthed user can access /dashboard | BLOCKED — `authorized` returns false |
| Unauthed redirect destination | /login (not /api/auth/signin) |
| Redirect loop risk (/login → middleware → /login) | NONE — /login excluded from matcher |
| user.id in session | YES — `session` callback injects `user.id` from DB User |
| Middleware imports Prisma | NO — imports only edge-safe `authConfig` |

## Verification Results

- [x] `src/server/auth/config.ts` has no Prisma imports
- [x] `pages: { signIn: '/login' }` present
- [x] `authorized` callback: `return !!auth?.user`
- [x] `src/server/auth/index.ts` has `PrismaAdapter(db)` + session callback
- [x] `src/middleware.ts` imports from `@/server/auth/config` only
- [x] `npm run typecheck` — 0 errors

## PRD US-001 Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| Google OAuth login via NextAuth.js | ✅ GoogleProvider configured |
| All routes protected — unauthed → /login | ✅ Middleware + authorized callback |
| Session persists across browser refreshes | ✅ PrismaAdapter database sessions |

## Issues Encountered

None beyond the two known scaffold bugs. TypeScript accepted the split config cleanly.

## Note
Actual OAuth flow requires real `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `AUTH_SECRET`
env vars. These need to be set before running the app. The Neon DB also needs to be connected
and migrated before `PrismaAdapter` can create sessions.
