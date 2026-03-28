# Phase 5 Discovery: Basiq Webhooks — Realtime Transaction Sync

## Goal
Implement `/api/webhooks/basiq`: verify Basiq HMAC signatures, upsert transactions
idempotently, map Basiq categories. Add manual syncTransactions trigger for dev.

---

## Basiq Webhook System — Key Findings

### Registration (done once via Basiq dashboard or API)
- `POST /notifications/webhooks` with `{ url, subscribedEvents: ["connector.data.updated"] }`
- Response includes `secret` — used to sign all outgoing messages (HMAC-SHA256)
- The secret is stored in our `BASIQ_WEBHOOK_SECRET` env var

### Payload Structure
Basiq POSTs to our URL with a JSON body:
```json
{
  "id": "11a85f64-...",
  "payload": {
    "eventTypeId": "connector.data.updated",
    "eventId": "44a85f64-...",
    "links": {
      "event": "https://au-api.basiq.io/events/44a85f64-...",
      "eventEntity": "https://au-api.basiq.io/users/88a85f64-.../connections/..."
    }
  }
}
```

Key fields:
- `payload.eventTypeId` — event type (e.g. `connector.data.updated`, `account.updated`)
- `payload.links.eventEntity` — URL to the entity; for user events, contains basiq userId

### Signature Verification
- Algorithm: HMAC-SHA256 of raw request body using `secret`
- Header: `x-basiq-signature` (standard Basiq v3 pattern)
- Must use raw body bytes (not parsed JSON) for HMAC computation
- Return HTTP 401 if signature invalid; HTTP 200 to acknowledge

### Transaction Endpoint
- `GET /users/{userId}/transactions` — all transactions for a user
- Filter by account: `?filter=account.id.eq('{basiqAccountId}')`
- Transaction fields used:
  - `id` → `basiqTxId`
  - `postDate ?? transactionDate` → `date`
  - `description` → `description`
  - `amount` → `amount` (string like "-45.00" or "1200.00")
  - `currency` → `currency`
  - `enrich.category` → `basiqCategory`
  - `transactionType` ("debit"|"credit") → `isCredit`

### Event Types We Handle
| eventTypeId | Action |
|------------|--------|
| `connector.data.updated` | Fetch + upsert transactions for all user accounts |
| `account.updated` | Fetch + upsert accounts (refresh balances) |
| *(others)* | Acknowledge with 200, no action |

---

## Idempotency Requirements (PRD US-003, US-005)
- Upsert transactions on `basiqTxId` unique key → no duplicates
- **`userCategory` must NEVER be overwritten** — protected field, once set by user it persists
- Basiq `basiqCategory` is always updated (Basiq may enrich it over time)

---

## Implementation Plan

### Files Modified
| File | Change |
|------|--------|
| `src/lib/basiq.ts` | Add `getBasiqTransactions()` |
| `src/app/api/webhooks/basiq/route.ts` | Replace placeholder with full handler |
| `src/server/api/routers/basiq.ts` | Add `syncTransactions` mutation |

### Notes
- Free-tier caveat: Basiq free tier may require webhook approval. Phase 5 implements the
  handler correctly; actual delivery depends on Basiq account tier.
- Manual sync: add `basiq.syncTransactions` tRPC mutation for dev/testing when no webhook
  is available.
- Next.js App Router: to read raw body in a route handler, use `req.arrayBuffer()` then
  convert to Buffer — avoids stream consumption issues.

---

## PRD Traces
- US-003: Webhook endpoint, HMAC verification, upsert new transactions immediately
- US-006: Basiq category stored; fallback to "Uncategorised"
- PRD §4 API Routes: webhook handler at /api/webhooks/basiq
- PRD §6 Security: webhook signature verified before processing
