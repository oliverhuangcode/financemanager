# Stack — FinanceManager

*Populated during Phase 1 execution. This is the intended stack.*

## Runtime
- **Node.js**: 20+
- **TypeScript**: 5+

## Framework
- **Next.js 14** (App Router)
- **React 18**

## API Layer
- **tRPC v11** — type-safe RPC procedures
- **@trpc/server**, **@trpc/client**, **@trpc/react-query**

## Database
- **PostgreSQL** on Neon (free tier)
- **Prisma** ORM (schema, migrations, client)

## Authentication
- **NextAuth.js v5** (beta) — Google OAuth provider
- **@auth/prisma-adapter** — stores sessions in DB

## Styling
- **Tailwind CSS v3**
- **shadcn/ui** — accessible component library
- **Lucide React** — icons

## Charts
- **Recharts** — bar, pie, line charts

## Utilities
- **date-fns** — date formatting and arithmetic
- **zod** — schema validation (used by T3 env.js and tRPC inputs)

## External Services
- **Basiq API v3** — bank data aggregation, ANZ connection, webhooks
- **Neon** — serverless PostgreSQL hosting
- **Vercel** — Next.js hosting, automatic deploys from git
- **Google Cloud** — OAuth 2.0 credentials

## Dev Tools
- **ESLint** (T3 config)
- **Prettier** (T3 config)
