# Architecture — FinanceManager

## Overview

Single-user personal finance app. No public API. All data access is authenticated. Basiq webhooks are the only inbound endpoint that bypasses auth (verified by HMAC signature instead).

## Request Flow

```
Browser
  │
  ├── Page request → Next.js App Router (server component)
  │     └── auth() check → redirect /login if no session
  │     └── Prisma query directly in server component (dashboard, transactions)
  │
  ├── Mutation request → tRPC client → /api/trpc/[trpc]
  │     └── auth check in tRPC middleware (protectedProcedure)
  │     └── Prisma mutation
  │
  └── Webhook → /api/webhooks/basiq
        └── HMAC-SHA256 signature verification (BASIQ_WEBHOOK_SECRET)
        └── Prisma upsert (idempotent on basiqTxId)

Basiq API
  ├── Consent flow: user connects ANZ
  ├── Account fetch: GET /users/{id}/accounts
  ├── Transaction fetch: GET /accounts/{id}/transactions
  └── Webhook: POST /api/webhooks/basiq (new transaction events)

Neon PostgreSQL
  └── Prisma ORM
        ├── User (NextAuth managed)
        ├── Session / Account (NextAuth managed)
        ├── BasiqConnection
        ├── Account (bank account)
        ├── Transaction
        └── Budget
```

## Key Patterns

### Server Components for Data Fetching
Dashboard and transaction list pages use React Server Components. They call Prisma directly (not via tRPC) for initial data load. This avoids a client→API roundtrip on page load.

### tRPC for Mutations
All writes (category override, budget upsert) go through tRPC `protectedProcedure`. The protectedProcedure middleware checks the session and throws UNAUTHORIZED if not authenticated.

### Idempotent Webhook Processing
The webhook handler uses `prisma.transaction.upsert` with `basiqTxId` as the unique key. Re-delivered webhooks are safe.

### Category Override Logic
Transactions have two category fields:
- `basiqCategory` — set on ingest, never overwritten
- `userCategory` — set by user override, persists forever
The UI displays `userCategory ?? basiqCategory`.

## Auth Flow

```
User visits /dashboard
  → middleware checks session (src/middleware.ts)
  → no session: redirect /login
  → /login: Google OAuth via NextAuth
  → callback: user upserted in DB, session created
  → redirect /dashboard
```

## Environment

| Environment | DB | Auth URL | Notes |
|------------|-----|----------|-------|
| Development | Neon (same DB) | localhost:3000 | .env file |
| Production | Neon (same DB) | Vercel domain | Vercel env vars |
