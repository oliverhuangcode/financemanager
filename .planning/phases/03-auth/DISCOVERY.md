# Phase 3 Discovery: Authentication (NextAuth + Google)

## Goal
Wire up a working NextAuth v5 Google OAuth flow. Protect all routes except /login, /api/auth, /api/webhooks. Session persists across refreshes. Store session user in DB via PrismaAdapter.

## What Phase 1 Already Built
| File | Status | Notes |
|------|--------|-------|
| `src/server/auth/config.ts` | Needs fix | Has Prisma imports — not edge-safe; missing `pages.signIn` |
| `src/server/auth/index.ts` | Needs fix | Needs to own Prisma adapter setup |
| `src/app/api/auth/[...nextauth]/route.ts` | ✅ Complete | GET/POST handlers export |
| `src/app/login/page.tsx` | ✅ Complete | Server action with `signIn("google")` |
| `src/middleware.ts` | Needs fix | Imports from full config (Prisma-containing) — fails at edge |
| `src/app/page.tsx` | ✅ Complete | Root redirect to /dashboard or /login |
| `src/server/api/trpc.ts` | ✅ Complete | `protectedProcedure` checks `ctx.session?.user` |

## Critical Bugs to Fix

### Bug 1: Missing `pages.signIn`
**Impact**: Without `pages: { signIn: '/login' }`, unauthenticated users are redirected to
NextAuth's built-in `/api/auth/signin` page, NOT our custom `/login` page.
**Fix**: Add `pages: { signIn: '/login' }` to `authConfig`.

### Bug 2: Middleware imports Prisma (edge runtime failure)
**Impact**: `src/middleware.ts` does `export { auth as middleware } from "@/server/auth"`.
`@/server/auth` imports `PrismaAdapter` and `@/server/db`. Prisma uses Node.js native bindings
which are NOT available in Next.js Edge Runtime (where middleware runs).
This will fail silently in dev but crash in Vercel production.
**Fix**: Split auth config into edge-safe (no Prisma) vs full server config.

## Fix Strategy: Split Auth Config

### Pattern (standard T3/NextAuth v5 approach)

```
src/server/auth/
├── config.ts    ← EDGE-SAFE: providers + pages + authorized callback (NO Prisma)
└── index.ts     ← SERVER-ONLY: spreads config + adds PrismaAdapter + session callback
```

**`config.ts`** (edge-safe):
- Google provider (plain object, edge-compatible)
- `pages: { signIn: '/login' }`
- `callbacks.authorized`: `return !!auth?.user` — blocks unauthenticated access

**`index.ts`** (full server config):
- Spreads `authConfig`
- Adds `PrismaAdapter(db)`
- Adds `session` callback to inject `user.id` into session

**`middleware.ts`** (edge-safe):
- Creates its own NextAuth instance from the edge-safe `authConfig` only
- Does NOT import from `@/server/auth/index.ts`

## Auth Flow Verification
1. User visits `/dashboard` (protected)
2. Middleware: no session → `authorized` returns false → redirect `/login`
3. User clicks "Sign in with Google" → `signIn("google")` → OAuth
4. Google redirects to `/api/auth/callback/google`
5. PrismaAdapter creates/finds User + Account in DB
6. Session created → redirect to `/dashboard`
7. Subsequent requests: middleware reads session cookie → `authorized` returns true

## Session Callback
With PrismaAdapter (database sessions), the `session` callback receives `{ session, user }` where
`user` is the full DB User object. We inject `user.id` so all server components and tRPC
procedures can identify the owner.

## CoVe Triggers
- Auth config split → must verify edge-safety
- Middleware authorized callback → must verify redirect loop prevention
- Session callback → must verify user.id is always set

## Plans
1. `03-01`: Fix auth config split + middleware edge-safety
