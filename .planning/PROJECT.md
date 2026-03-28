# Project: FinanceManager

## Vision

A private, single-user personal finance dashboard. Connects to ANZ via Basiq API, ingests transactions in realtime via webhooks, and visualises spending patterns, categories, and budgets. Hosted on Vercel (free). Access locked to the owner via Google OAuth.

---

## Requirements

### Validated
- Google OAuth authentication (single user, all routes protected)
- Basiq ANZ account connection via consent flow
- Realtime transaction sync via Basiq webhooks (idempotent upsert)
- Multiple ANZ accounts supported (savings, credit, transaction)
- Transaction feed with date/merchant/amount/category display
- Manual category override per transaction (persists, not overwritten by sync)
- Auto-categorisation using Basiq's category data
- Monthly budget per category with progress tracking
- Dashboard: total spend this month, top 5 categories, recent 10 transactions, account balances
- Charts: monthly bar (6mo), category pie, daily cumulative line, income vs expenses
- Hosted on Vercel (free hobby tier) + Neon PostgreSQL (free tier)

### Active (Under Discussion)
- Basiq webhook availability on free tier — verify in Basiq dashboard before implementing webhook phase
- Basiq webhook payload structure — check API docs during Phase 4 research

### Out of Scope
- Push notifications / email alerts
- CSV export
- Multiple users or sharing
- Native mobile app
- Investment/super account tracking

---

## Constraints
- Database: Neon free tier (~0.5GB PostgreSQL)
- Hosting: Vercel free hobby tier
- Auth: NextAuth.js v5 with Google OAuth only
- No paid third-party services beyond Basiq (which user already has an API key for)

---

## Key Decisions

| Decision | Status | Rationale |
|----------|--------|-----------|
| T3 Stack (Next.js + tRPC + Prisma + Tailwind) | Approved | User's explicit preference |
| Neon PostgreSQL | Approved | Free tier, Prisma-compatible, serverless-friendly |
| NextAuth v5 + Google OAuth | Approved | T3 standard, zero password management |
| Vercel hosting | Approved | Free, zero-config Next.js deploys |
| Recharts for charts | Approved | Tailwind-friendly, well-documented |
| shadcn/ui for components | Approved | T3 community default, accessible |
| Basiq webhooks for sync | Approved | User wants realtime — verify free tier support |
| Category override stored separately | Approved | Never overwritten by future syncs |
