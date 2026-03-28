# Conventions — FinanceManager

## TypeScript
- Strict mode enabled
- No `any` — use `unknown` + type narrowing or proper types
- Zod for all external data validation (API responses, webhook payloads)

## Next.js App Router
- Server Components by default — add `"use client"` only when needed (event handlers, hooks, browser APIs)
- Data fetching in server components via Prisma directly (not tRPC)
- tRPC used for client-side mutations and reactive queries
- Route handlers in `app/api/` — use Next.js `route.ts` convention

## tRPC
- All procedures in `src/server/api/routers/`
- Protected procedures use `protectedProcedure` (checks session)
- Public procedures only for login page
- Input validated with Zod schemas inline

## Prisma
- Client singleton in `src/server/db.ts`
- Never import PrismaClient directly — always use `import { db } from "@/server/db"`
- Migrations for all schema changes: `npx prisma migrate dev`

## Financial Data
- Amounts stored as cents (integers) — never floats for money
- Field naming: `amountCents` (not `amount`)
- Display formatting: divide by 100, use `Intl.NumberFormat` with AUD locale

## Components
- shadcn/ui components in `src/components/ui/` — do not edit these directly
- Feature components in `src/components/[feature]/`
- Layout components (nav, sidebar) in `src/components/layout/`

## Environment Variables
- All vars validated by `src/env.js` (T3 pattern with zod)
- Server-only vars (Prisma, Basiq, NextAuth) in `server` schema
- Never expose server vars to client

## Naming
- Files: kebab-case (`transaction-row.tsx`)
- Components: PascalCase (`TransactionRow`)
- tRPC procedures: camelCase verbs (`list`, `updateCategory`, `upsert`)
- Database fields: camelCase
- CSS classes: Tailwind utility classes only (no custom CSS unless unavoidable)

## Commits
- One commit per completed plan: `Phase N Plan NN: description`
- Never commit `.env` (real values) or API keys
