# Roadmap — Milestone 1: MVP

## Progress

| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 1 | Project Scaffold & Infrastructure | Complete | 01-01 |
| 2 | Database Schema & Prisma Setup | Complete | 02-01 |
| 3 | Authentication (NextAuth + Google) | Complete | 03-01 |
| 4 | Basiq Integration — Account Connection | Complete | 04-01 |
| 5 | Basiq Webhooks — Realtime Transaction Sync | Complete | 05-01 |
| 6 | Transaction Feed UI | Complete | 06-01 |
| 7 | Dashboard | Complete | 07-01 |
| 8 | Budgets | Not Started | TBD |
| 9 | Analytics & Charts | Not Started | TBD |
| 10 | Polish, Deployment & Verification | Not Started | TBD |

---

### Phase 1: Project Scaffold & Infrastructure
**Goal**: Bootstrap T3 app with Next.js App Router, tRPC, Prisma, Tailwind, shadcn/ui. Establish project structure, environment variable setup, and CI-ready configuration.
**Depends on**: None
**Research**: Likely (T3 CLI options, shadcn/ui setup with App Router)
**Research topics**: create-t3-app v7+, shadcn/ui installation, Vercel env var config
**Traces to**: PRD §4 Stack, PRD §4 Architecture

### Phase 2: Database Schema & Prisma Setup
**Goal**: Define Prisma schema for User, BasiqConnection, Account, Transaction, Budget. Connect to Neon PostgreSQL. Run initial migration.
**Depends on**: Phase 1
**Research**: Unlikely
**Traces to**: PRD §4 Data Model

### Phase 3: Authentication (NextAuth + Google)
**Goal**: Implement NextAuth.js v5 with Google OAuth. Protect all non-login routes. Store session user in DB.
**Depends on**: Phase 1, Phase 2
**Research**: Likely (NextAuth v5 App Router adapter, middleware auth)
**Research topics**: next-auth v5 with App Router, auth middleware, Prisma adapter
**Traces to**: PRD §3 Epic: Authentication, US-001, PRD §5 /login screen

### Phase 4: Basiq Integration — Account Connection
**Goal**: Implement Basiq API client, consent flow to connect ANZ accounts, and initial account/balance fetch. Store connections and accounts in DB.
**Depends on**: Phase 2, Phase 3
**Research**: Likely (Basiq API v3 docs, consent flow, account endpoints)
**Research topics**: Basiq API v3 consent/auth flow, account listing, transaction listing
**Traces to**: PRD §3 Epic: Bank Account Connection, US-002, PRD §5 /settings/accounts

### Phase 5: Basiq Webhooks — Realtime Transaction Sync
**Goal**: Implement /api/webhooks/basiq endpoint. Verify Basiq webhook signatures. Upsert transactions idempotently. Handle Basiq category mapping.
**Depends on**: Phase 4
**Research**: Likely (Basiq webhook payload, signature verification, event types)
**Research topics**: Basiq webhook documentation, transaction event structure, HMAC verification
**Traces to**: PRD §3 Epic: Realtime Transaction Sync, US-003, US-006

### Phase 6: Transaction Feed UI
**Goal**: Build /transactions page with filterable, paginated transaction table. Implement category override mutation.
**Depends on**: Phase 5
**Research**: Unlikely
**Traces to**: PRD §3 Epic: Transaction Display, US-004, US-005, PRD §5 /transactions

### Phase 7: Dashboard
**Goal**: Build /dashboard with monthly spend summary, top categories, recent transactions, and account balances. Add month selector.
**Depends on**: Phase 6
**Research**: Unlikely
**Traces to**: PRD §3 Epic: Dashboard, US-008, PRD §5 /dashboard

### Phase 8: Budgets
**Goal**: Build /budgets page. Implement budget upsert tRPC procedure. Show budget vs actual progress bars with over-budget highlighting.
**Depends on**: Phase 7
**Research**: Unlikely
**Traces to**: PRD §3 Epic: Monthly Budgets, US-007, PRD §5 /budgets

### Phase 9: Analytics & Charts
**Goal**: Build /analytics page with Recharts visualisations: monthly bar chart, category pie chart, daily cumulative line chart, income vs expenses.
**Depends on**: Phase 7
**Research**: Unlikely (Recharts API is well-known)
**Traces to**: PRD §3 Epic: Charts & Analytics, US-009, PRD §5 /analytics

### Phase 10: Polish, Deployment & Verification
**Goal**: Responsive mobile layout, empty states, error boundaries, Vercel deployment, Neon production DB connection, end-to-end smoke test.
**Depends on**: All previous phases
**Research**: Unlikely
**Traces to**: PRD §6 Non-Functional Requirements, PRD §8 Success Metrics
