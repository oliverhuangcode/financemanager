# Phase 2 Plan 01 Summary: Database Schema & Prisma Setup

## What Was Done

Extended `prisma/schema.prisma` with all four domain models required by the PRD §4 Data Model, plus relations back to the existing NextAuth `User` model.

## Models Added

### BasiqConnection
- Links a User to a Basiq identity (`basiqUserId` unique)
- Has optional `basiqConsentId` for the consent flow
- `status` field defaults to "active"
- Index on `userId`

### BankAccount
- Named `BankAccount` (not `Account`) to avoid collision with NextAuth's `Account` model
- Links to `BasiqConnection` via `connectionId`
- `basiqAccountId` unique — idempotent upsert key
- `balance` as `Decimal @db.Decimal(12, 2)` — avoids floating-point errors
- Index on `connectionId`

### Transaction
- `basiqTxId` unique — idempotent upsert key for webhook deduplication
- `amount` as `Decimal @db.Decimal(12, 2)`
- `userCategory` nullable — manual override, never overwritten by sync (enforced at app layer)
- `basiqCategory` nullable — may not be present on all transactions
- Indices on `accountId` and `date` for efficient filtered queries

### Budget
- `monthYear` String ("YYYY-MM" format) for easy filtering without timezone concerns
- `amountCents Int` for whole-cent precision on budget amounts
- Composite unique constraint on `(userId, category, monthYear)` for upsert
- Indices on `userId` and `monthYear`

## Files Changed

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Added BasiqConnection, BankAccount, Transaction, Budget models + User relations |

## Verification Results

- [x] `npx prisma validate` — schema is valid
- [x] `npx prisma generate` — Prisma Client v6.19.2 generated successfully
- [x] `npm run typecheck` — 0 TypeScript errors
- [x] All FK relations bidirectional
- [x] Unique constraints on basiqUserId, basiqAccountId, basiqTxId
- [x] Composite unique on Budget(userId, category, monthYear)
- [x] No existing NextAuth models modified

## Migration Note

`prisma migrate dev` was not run because `DATABASE_URL` points to a placeholder. When real Neon credentials are configured (Phase 10 or manually), run:
```bash
npx prisma migrate dev --name domain-models
```
The schema is ready and validated — the migration will apply cleanly.

## Issues Encountered

None. Schema was straightforward given the clear PRD data model.
