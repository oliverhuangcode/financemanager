# Summary: Plan 05-01 — Basiq Webhook Handler + Transaction Sync

## What Was Done

Implemented the Basiq webhook endpoint with HMAC-SHA256 signature verification,
idempotent transaction upserts, and a manual syncTransactions tRPC mutation.

### Files Created
| File | Purpose |
|------|---------|
| `src/lib/upsertTransactions.ts` | Shared upsert helper — preserves userCategory, maps Basiq categories |
| `.planning/phases/05-webhooks/DISCOVERY.md` | Phase research |
| `.planning/phases/05-webhooks/05-01-PLAN.md` | Execution plan |

### Files Modified
| File | Change |
|------|--------|
| `src/lib/basiq.ts` | Added `BasiqTransaction` interface + `getBasiqTransactions()` |
| `src/app/api/webhooks/basiq/route.ts` | Replaced placeholder with full HMAC-verified handler |
| `src/server/api/routers/basiq.ts` | Added `syncTransactions` mutation |

## Implementation Details

### HMAC Signature Verification (`route.ts`)
- Raw body read via `req.arrayBuffer()` before any parsing
- `crypto.createHmac("sha256", secret).update(rawBody).digest("hex")`
- `crypto.timingSafeEqual()` for constant-time comparison (prevents timing oracle)
- Header: `x-basiq-signature` (Basiq v3 standard)
- Skipped when `BASIQ_WEBHOOK_SECRET` not configured (safe for local dev)
- Always returns 200 to Basiq even on internal errors (prevents retry storms)

### Idempotent Transaction Upsert (`upsertTransactions.ts`)
- Keyed on `basiqTxId` (Basiq's unique transaction ID)
- `create` block: full row with `basiqCategory` (or "Uncategorised")
- `update` block: only `description`, `amount`, `basiqCategory`
- **`userCategory` intentionally absent from `update`** — user overrides never overwritten
- Sequential processing (not parallel) to avoid Prisma connection pool pressure

### Webhook Event Routing
- `connector.data.updated` + `account.updated` → refresh balances + sync transactions
- Other events → acknowledged with 200, no action
- basiqUserId extracted from `eventEntity` URL via regex

### Manual Sync
- `basiq.syncTransactions` tRPC mutation provides same functionality as webhook
- Useful when Basiq free tier doesn't support webhook delivery

## Verification
- `npm run typecheck` → 0 errors
- CoVe applied to HMAC verification and upsert idempotency logic

## Issues Encountered
- Basiq free tier webhook availability is unknown; `syncTransactions` mutation is the
  fallback for manual triggering
