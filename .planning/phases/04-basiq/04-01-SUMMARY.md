# Summary: Plan 04-01 — Basiq API Client + Account Connection Flow

## What Was Done

Implemented the Basiq API integration for account connection — the complete flow from
consent URL generation through account sync and display.

### Files Created
| File | Purpose |
|------|---------|
| `src/lib/basiq.ts` | Basiq API client: getServerToken, createBasiqUser, createAuthLink, getBasiqAccounts |
| `src/server/api/routers/basiq.ts` | tRPC: createConsentUrl mutation, syncAccounts mutation |
| `src/server/api/routers/account.ts` | tRPC: account.list query (user-scoped) |
| `src/app/settings/accounts/_components/AccountsClient.tsx` | Client component: connect + sync buttons, account list |

### Files Modified
| File | Change |
|------|--------|
| `src/server/api/root.ts` | Registered basiqRouter and accountRouter |
| `src/app/settings/accounts/page.tsx` | Replaced placeholder with real UI |

## Implementation Details

### Basiq API Client (`src/lib/basiq.ts`)
- `getServerToken`: POST /token with Basic auth (base64(API_KEY + ":")) and SERVER_ACCESS scope
- `createBasiqUser`: POST /users with email; returns Basiq userId
- `createAuthLink`: POST /users/{id}/auth_link; returns `links.public` consent URL
- `getBasiqAccounts`: GET /users/{id}/accounts; returns typed `BasiqAccount[]`

### tRPC Routers
- `basiq.createConsentUrl`: Finds or creates a `BasiqConnection` row, then creates an auth link
- `basiq.syncAccounts`: Fetches accounts from Basiq and upserts into `BankAccount` table using
  `basiqAccountId` as the unique key (idempotent)
- `account.list`: Returns BankAccounts scoped to the authenticated user via their connection

### Settings UI
- "Connect bank account" button → calls `createConsentUrl`, opens consent URL in new tab
- "Sync accounts" button → calls `syncAccounts`, invalidates `account.list` query cache
- Account list renders name, type (capitalised), currency + balance
- Graceful empty state and error messages

## Verification
- `npm run typecheck` → 0 errors
- Manual verification requires real BASIQ_API_KEY in `.env`

## Issues Encountered
- None. All API surface was confirmed via Basiq v3 docs (Context7).

## CoVe Applied
- Yes: reviewed token flow (HTTP Basic auth encoding), DB upsert idempotency (basiqAccountId
  unique key), and auth guard (protectedProcedure on all mutations).
