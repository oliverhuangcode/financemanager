# Phase 1 Discovery: Project Scaffold & Infrastructure

## Summary

Bootstrap the T3 stack application using `create-t3-app` with Next.js App Router, tRPC, Prisma, Tailwind, and NextAuth. Then layer in shadcn/ui and configure environment variables for Neon, Google OAuth, and Basiq.

## Stack Decisions

| Concern | Choice | Notes |
|---------|--------|-------|
| T3 CLI | create-t3-app | Latest version, select App Router, tRPC, Prisma, Tailwind, NextAuth |
| UI components | shadcn/ui | Install after scaffolding, uses Tailwind |
| Charts | recharts | Install separately in Phase 9 |
| Node version | 20+ | Required by Next.js 14 |
| Package manager | npm | T3 default |

## Required Environment Variables

```
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generated>
AUTH_GOOGLE_ID=<from Google Cloud Console>
AUTH_GOOGLE_SECRET=<from Google Cloud Console>

# Database
DATABASE_URL=<Neon connection string>

# Basiq
BASIQ_API_KEY=<user's existing key>
BASIQ_WEBHOOK_SECRET=<from Basiq dashboard>
```

## Key Files After Scaffold

```
src/
  app/
    layout.tsx          — Root layout
    page.tsx            — Redirect to /dashboard or /login
    dashboard/page.tsx  — Placeholder
    login/page.tsx      — Placeholder
    api/
      auth/[...nextauth]/route.ts
      trpc/[trpc]/route.ts
      webhooks/basiq/route.ts  — Placeholder
  server/
    api/
      root.ts
      trpc.ts
      routers/          — One file per domain
    auth.ts             — NextAuth config
    db.ts               — Prisma client
  trpc/
    react.tsx           — Client provider
  env.js                — T3 env validation
  middleware.ts         — Auth protection
```

## Steps

1. Run `create-t3-app` with correct options
2. Install shadcn/ui and initialise
3. Install additional deps: recharts, @basiq-io/... (or raw fetch)
4. Set up .env.example with all required vars
5. Verify `npm run dev` works
6. Verify `npm run build` (type check) passes
