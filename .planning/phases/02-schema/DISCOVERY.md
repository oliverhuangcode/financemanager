# Phase 2 Discovery: Database Schema & Prisma Setup

## Goal
Extend the existing Prisma schema with the app's domain models (BasiqConnection, BankAccount, Transaction, Budget) and add relations to the existing NextAuth User model. Connect to Neon PostgreSQL. Generate Prisma client.

## Current State
- `prisma/schema.prisma` has the T3 starter NextAuth models: `User`, `Account`, `Session`, `VerificationToken`
- `DATABASE_URL` env var exists but points to a placeholder (real Neon URL added at deployment time)
- Prisma 6 is installed

## Key Constraint: Name Collision
The NextAuth Prisma adapter requires a model named `Account`. Our domain has a "bank account" concept which must be named `BankAccount` to avoid collision.

## Models to Add

### BasiqConnection
Represents a user's consent token / linked identity in Basiq.
- `id`, `userId` (FK → User), `basiqUserId` (unique), `basiqConsentId`, `status`, `createdAt`, `updatedAt`
- Relation: User → many BasiqConnections, BasiqConnection → many BankAccounts

### BankAccount
A bank account imported from Basiq (ANZ savings, transaction, credit card, etc.)
- `id`, `connectionId` (FK → BasiqConnection), `basiqAccountId` (unique), `name`, `type`, `balance` (Decimal), `currency`, `createdAt`, `updatedAt`
- Relation: BankAccount → many Transactions

### Transaction
A single financial transaction imported from Basiq.
- `id`, `accountId` (FK → BankAccount), `basiqTxId` (unique — idempotency key), `date`, `description`, `amount` (Decimal), `currency`, `basiqCategory`, `userCategory` (nullable — manual override), `isCredit`, `createdAt`
- `userCategory` is never overwritten by webhook syncs once set (enforced at app layer)

### Budget
A monthly spending budget per category.
- `id`, `userId` (FK → User), `category`, `monthYear` (String, "YYYY-MM"), `amountCents` (Int), `createdAt`, `updatedAt`
- Unique constraint: (userId, category, monthYear)

## Migration Strategy
- In dev without a real DB: run `prisma validate` to check schema, `prisma generate` to produce the TypeScript client
- SQL migration file created with `prisma migrate dev --create-only --name domain-models` when Neon URL is available
- For this loop: validate + generate only (Neon credentials not yet configured)

## Decisions
- Use `Decimal @db.Decimal(12, 2)` for monetary amounts (not Float) — avoids floating-point rounding
- `amountCents Int` for Budget (budgets are set in whole cents, avoids decimal for simpler comparison)
- Indices on all FK columns + `date` on Transaction + `monthYear`/`userId` on Budget
- `monthYear` as String ("2024-03") for easy filtering and display — no timezone concerns

## Plans
1. `02-01`: Update schema, validate, generate client
