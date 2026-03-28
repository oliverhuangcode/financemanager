# PRD: FinanceManager

## 1. Overview

A private, single-user personal finance dashboard built on the T3 stack (Next.js + tRPC + Prisma + Tailwind). It connects to ANZ bank accounts via the Basiq API, receives realtime transaction updates via webhooks, and presents spending analytics, budget tracking, and account overviews. Access is restricted to the owner via Google OAuth — no data is ever public.

---

## 2. Target Users

| User Type | Description | Primary Need |
|-----------|-------------|--------------|
| Owner (you) | Single authenticated user | See where money is going, track budgets, understand spending patterns |

This is a single-user personal tool — not a SaaS product.

---

## 3. User Stories

### Epic: Authentication & Access Control
- **US-001**: As the owner, I want to log in with my Google account so that only I can access my financial data.
  - Acceptance Criteria:
    - [ ] Google OAuth login via NextAuth.js
    - [ ] All routes are protected — unauthenticated requests redirect to login
    - [ ] Session persists across browser refreshes

### Epic: Bank Account Connection
- **US-002**: As the owner, I want to connect my ANZ accounts via Basiq so that my transactions are automatically imported.
  - Acceptance Criteria:
    - [ ] Basiq consent UI flow to connect ANZ account(s)
    - [ ] Multiple accounts supported (savings, credit, transaction)
    - [ ] Each account stored with name, type, current balance

### Epic: Realtime Transaction Sync
- **US-003**: As the owner, I want new transactions to appear automatically when they occur at ANZ, without me needing to manually refresh.
  - Acceptance Criteria:
    - [ ] Basiq webhook endpoint receives transaction events
    - [ ] Webhook signature verified before processing
    - [ ] New transactions upserted into database immediately
    - [ ] Duplicate transactions prevented via Basiq transaction ID

### Epic: Transaction Display
- **US-004**: As the owner, I want to see all my transactions in a feed so that I can review my spending history.
  - Acceptance Criteria:
    - [ ] Transactions listed in reverse chronological order
    - [ ] Each row shows: date, merchant/description, amount, category, account
    - [ ] Paginated or infinite-scroll (50 items per page)
    - [ ] Filterable by account, date range, category

- **US-005**: As the owner, I want to manually override a transaction's category so that miscategorised transactions are corrected.
  - Acceptance Criteria:
    - [ ] Inline category dropdown on each transaction row
    - [ ] Override saved immediately via tRPC mutation
    - [ ] Overridden category persists and is never overwritten by future syncs

### Epic: Spending Categories
- **US-006**: As the owner, I want transactions to be automatically categorised using Basiq's category data so that I don't have to tag everything manually.
  - Acceptance Criteria:
    - [ ] Basiq category stored on each transaction
    - [ ] Fallback to "Uncategorised" when Basiq provides no category
    - [ ] Category list is a fixed set drawn from Basiq's taxonomy

### Epic: Monthly Budgets
- **US-007**: As the owner, I want to set a monthly spending budget per category so that I know when I'm overspending.
  - Acceptance Criteria:
    - [ ] Budget amount settable per category per month
    - [ ] Budget vs actual comparison shown as a progress bar
    - [ ] Budgets carry forward to next month if not updated
    - [ ] Over-budget categories highlighted in red

### Epic: Dashboard
- **US-008**: As the owner, I want a dashboard showing this month's spend at a glance so that I can quickly understand my financial status.
  - Acceptance Criteria:
    - [ ] Total spent this month (across all accounts)
    - [ ] Top 5 spending categories with amounts
    - [ ] Recent transactions (last 10)
    - [ ] Account balances for each connected account
    - [ ] Month selector to view previous months

### Epic: Charts & Analytics
- **US-009**: As the owner, I want charts showing spending over time and by category so that I can identify trends.
  - Acceptance Criteria:
    - [ ] Bar chart: monthly spend for the last 6 months
    - [ ] Pie/donut chart: spending by category for selected month
    - [ ] Line chart: daily cumulative spend for current month
    - [ ] Income vs expenses comparison per month

---

## 4. Technical Requirements

### Stack
| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js 14 (App Router) | T3 stack default, file-based routing, server components |
| Language | TypeScript | Type safety end-to-end |
| API | tRPC v11 | Type-safe RPC, no REST boilerplate |
| ORM | Prisma | Type-safe DB client, great migration tooling |
| Database | PostgreSQL on Neon | Free tier, 0.5GB, serverless-friendly, Prisma-compatible |
| Auth | NextAuth.js v5 | T3 standard, Google OAuth, session management |
| Styling | Tailwind CSS + shadcn/ui | T3 default, composable components |
| Charts | Recharts | Popular, Tailwind-friendly, well-documented |
| Hosting | Vercel | Free hobby tier, zero-config Next.js deploys |
| External API | Basiq API v3 | Bank data aggregator, ANZ connection, webhooks |

### Architecture

```
Browser
  └─ Next.js App Router (Vercel)
       ├─ Server Components (data fetching via Prisma directly)
       ├─ Client Components (interactivity via tRPC hooks)
       └─ API Routes
            ├─ /api/auth/[...nextauth]   — NextAuth.js
            ├─ /api/trpc/[trpc]          — tRPC handler
            └─ /api/webhooks/basiq       — Basiq transaction webhook

Neon PostgreSQL
  └─ Prisma ORM

Basiq API
  ├─ OAuth consent flow (user connects ANZ)
  ├─ Account & transaction fetch
  └─ Webhook → /api/webhooks/basiq
```

### Data Model

| Entity | Key Fields | Relationships |
|--------|-----------|---------------|
| User | id, email, googleId, createdAt | has many BasiqConnections, Budgets |
| BasiqConnection | id, userId, basiqUserId, basiqConsentId | has many Accounts |
| Account | id, connectionId, basiqAccountId, name, type, balance, currency | has many Transactions |
| Transaction | id, accountId, basiqTxId, date, description, amount, currency, basiqCategory, userCategory, isCredit | belongs to Account |
| Budget | id, userId, category, monthYear, amountCents | belongs to User |

### API Routes (tRPC)
| Router | Procedure | Purpose |
|--------|-----------|---------|
| account | list | List all connected accounts with balances |
| transaction | list | Paginated transactions with filters |
| transaction | updateCategory | Override a transaction's category |
| transaction | summary | Monthly totals by category |
| budget | list | All budgets for a given month |
| budget | upsert | Create or update a budget |
| basiq | createConsentUrl | Generate Basiq consent flow URL |
| basiq | syncAccounts | Fetch latest accounts + balances from Basiq |

---

## 5. Screens & Navigation

### Screen Map
```
/ (redirect to /dashboard if authed, /login if not)
├─ /login
├─ /dashboard              — Monthly overview
├─ /transactions           — Full transaction feed
├─ /budgets                — Budget management
├─ /analytics              — Charts & trends
└─ /settings
     └─ /settings/accounts — Connected bank accounts
```

### Screen Descriptions
| Screen | Purpose | Key Components |
|--------|---------|----------------|
| /login | Google OAuth entry point | Sign in button, branding |
| /dashboard | At-a-glance monthly summary | Total spend card, top categories, recent transactions, account balances |
| /transactions | Full browsable transaction history | Filterable table, category override dropdown, pagination |
| /budgets | Set & track monthly budgets | Budget cards with progress bars, edit modal |
| /analytics | Trend charts | Monthly bar chart, category pie chart, daily line chart |
| /settings/accounts | Manage Basiq connections | Account list, connect new account button, disconnect |

---

## 6. Non-Functional Requirements

- **Performance**: Dashboard loads in < 2s; charts render client-side
- **Security**: All routes auth-protected; webhook signature verified; API keys stored in env vars; no financial data in logs
- **Privacy**: Single-user app; no data sharing; HTTPS only (enforced by Vercel)
- **Reliability**: Webhook upserts are idempotent (Basiq transaction ID as unique key)
- **Accessibility**: Keyboard navigable, sufficient colour contrast (WCAG AA)
- **Mobile**: Responsive layout — works on phone browser for on-the-go checks

---

## 7. MVP Scope

### In Scope (MVP)
- Google OAuth login (single user)
- Basiq ANZ account connection via consent flow
- Realtime transaction ingestion via Basiq webhooks
- Transaction feed with category override
- Monthly dashboard with spend summary
- Budget setting per category
- Charts: monthly bar, category pie, daily cumulative
- Multiple account support
- Vercel + Neon deployment

### Out of Scope (Post-MVP)
- Push notifications / email alerts
- CSV export
- Receipt scanning
- Multiple users / sharing
- Recurring transaction detection
- Investment/super account tracking
- iOS/Android native app

---

## 8. Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Transaction freshness | < 60s from bank to dashboard | Webhook delivery time |
| Zero manual categorisation errors | <5% mis-categorised after override | Manual review |
| Dashboard load time | < 2s on Vercel | Vercel analytics |
| Budget accuracy | Actual vs budget within 1% | Data verification |

---

## 9. Open Questions

- Does Basiq's free tier support webhooks, or does it require a paid plan? (Check Basiq dashboard)
- What is the exact Basiq webhook payload structure for new transactions?
- Will Neon's 0.5GB free tier be sufficient long-term? (Estimate: ~1KB/tx × 100tx/month = minimal)
