# Phase 4 Discovery: Basiq Integration — Account Connection

## Goal
Implement a Basiq API client, consent flow to connect ANZ accounts, and initial account/balance
fetch. Store BasiqConnections and BankAccounts in the DB.

---

## Basiq API v3 — Key Findings

### Base URL
`https://au-api.basiq.io`

### Authentication Flow
1. **SERVER_ACCESS token**: `POST /token` with header `basiq-version: 3.0` and body
   `{ scope: "SERVER_ACCESS" }`. Use `Authorization: Basic <BASE64(API_KEY:)>` (API key with
   trailing colon). Returns `access_token` (JWT, 1hr expiry).
2. **CLIENT_ACCESS token** (for consent link): Same endpoint but with `scope: "CLIENT_ACCESS"`
   and `userId` in body.

### User Management
- `POST /users` — creates a Basiq user entity. Fields: email, mobile (optional), firstName,
  lastName.
- We store the Basiq user ID (`basiqUserId`) in our `BasiqConnection` model.
- A user only needs one Basiq user ID for the lifetime of their connections.

### Consent / Auth Link
- `POST /users/{userId}/auth_link` — creates a hosted consent URL.
- Response: `links.public` = URL to redirect user to.
- Auth links expire after 30 days and are single-use per session (new link needed if user exits).
- Mobile optional: Basiq uses it for SMS 2FA. For CDR (Open Banking) ANZ connections, the bank
  handles its own authentication — SMS 2FA may not be required.
- After consent, accounts become available at `GET /users/{userId}/accounts`.

### Account Fetch
- `GET /users/{userId}/accounts` — returns array of account objects.
- Key fields: `id`, `name`, `currency`, `balance`, `class.type`, `status`, `connection`.

---

## Implementation Plan

### New Files
| File | Purpose |
|------|---------|
| `src/lib/basiq.ts` | Basiq API client (token, user, auth_link, accounts) |
| `src/server/api/routers/basiq.ts` | tRPC: createConsentUrl, syncAccounts |
| `src/server/api/routers/account.ts` | tRPC: account.list |
| `src/app/settings/accounts/page.tsx` | Updated UI: account list + connect button |

### Modified Files
| File | Change |
|------|--------|
| `src/server/api/root.ts` | Register basiqRouter, accountRouter |

### Consent Flow (UX)
1. User visits `/settings/accounts`
2. Clicks "Connect bank account" → calls `basiq.createConsentUrl` mutation
3. Mutation: create Basiq user (if none exists), create auth_link, return URL
4. Client redirects user to Basiq consent URL (new tab)
5. User completes consent at Basiq
6. User returns to `/settings/accounts` and clicks "Sync accounts" (or page auto-syncs)
7. `basiq.syncAccounts` fetches accounts from Basiq and upserts into DB
8. Page re-renders with connected accounts list

### DB State After Phase 4
- `BasiqConnection` row created with `basiqUserId`, linked to our `User`
- `BankAccount` rows created with balance, name, type for each connected account

---

## Decisions

1. **No callback URL on auth link**: Basiq doesn't expose a redirect_uri parameter in auth_link
   creation (v3). User returns manually and triggers sync. Acceptable for personal tool.
2. **Token caching**: Basiq tokens expire in 3600s. For simplicity, we fetch a new SERVER_ACCESS
   token per request in Phase 4. Caching can be added in Phase 10 polish.
3. **Mobile not required**: We omit mobile from auth_link creation. Basiq may still work for
   CDR-based ANZ connections without SMS 2FA. If it fails in production, add a BASIQ_USER_MOBILE
   env var.
4. **No upsert in this phase**: Account sync does a full upsert (create-or-update) on
   `BankAccount` using `basiqAccountId` as unique key.

---

## PRD Traces
- US-002: Basiq consent UI flow, multiple accounts, each stored with name/type/balance
- PRD §4 API Routes: `basiq.createConsentUrl`, `basiq.syncAccounts`, `account.list`
- PRD §5 /settings/accounts: account list, connect button, disconnect
