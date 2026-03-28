# Directory Structure — FinanceManager

*Target structure after Phase 1 scaffold. Populated incrementally.*

```
financemanager/
├── .env                          — Local env vars (not committed)
├── .env.example                  — Template with all required vars
├── .planning/                    — GSD project management
│   ├── specs/PRD.md
│   ├── PROJECT.md
│   ├── ROADMAP.md
│   ├── STATE.md
│   ├── config.json
│   ├── codebase/
│   └── phases/
├── .ralph/                       — Ralph loop config
│   ├── PROMPT.md
│   └── AGENT.md
├── .ralphrc
├── prisma/
│   └── schema.prisma             — DB schema (User, Account, Transaction, Budget)
├── public/
├── src/
│   ├── app/
│   │   ├── layout.tsx            — Root layout (providers, fonts)
│   │   ├── page.tsx              — Redirect → /dashboard or /login
│   │   ├── login/
│   │   │   └── page.tsx          — Google sign-in page
│   │   ├── dashboard/
│   │   │   └── page.tsx          — Monthly overview (server component)
│   │   ├── transactions/
│   │   │   └── page.tsx          — Transaction feed (server component + client table)
│   │   ├── budgets/
│   │   │   └── page.tsx          — Budget management
│   │   ├── analytics/
│   │   │   └── page.tsx          — Charts (client component)
│   │   ├── settings/
│   │   │   └── accounts/
│   │   │       └── page.tsx      — Basiq account management
│   │   └── api/
│   │       ├── auth/
│   │       │   └── [...nextauth]/route.ts
│   │       ├── trpc/
│   │       │   └── [trpc]/route.ts
│   │       └── webhooks/
│   │           └── basiq/route.ts — Webhook handler
│   ├── components/
│   │   ├── ui/                   — shadcn/ui components
│   │   ├── layout/               — Nav, sidebar, header
│   │   └── [feature]/            — Feature-specific components
│   ├── server/
│   │   ├── auth.ts               — NextAuth config
│   │   ├── db.ts                 — Prisma client singleton
│   │   └── api/
│   │       ├── root.ts           — tRPC router aggregator
│   │       ├── trpc.ts           — tRPC init, protectedProcedure
│   │       └── routers/
│   │           ├── account.ts    — Account tRPC router
│   │           ├── transaction.ts — Transaction tRPC router
│   │           ├── budget.ts     — Budget tRPC router
│   │           └── basiq.ts      — Basiq API tRPC router
│   ├── lib/
│   │   ├── basiq.ts              — Basiq API client
│   │   └── categories.ts         — Category constants/helpers
│   ├── trpc/
│   │   └── react.tsx             — tRPC React provider + hooks
│   ├── env.js                    — T3 env validation (zod)
│   └── middleware.ts             — Auth protection middleware
├── tailwind.config.ts
├── tsconfig.json
├── next.config.js
└── package.json
```
