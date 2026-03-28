# Agent Instructions — FinanceManager

## Commands

### Install
```bash
npm install
```

### Dev Server
```bash
npm run dev
```

### Type Check
```bash
npm run typecheck
# or: npx tsc --noEmit
```

### Build
```bash
npm run build
```

### Lint
```bash
npm run lint
```

### DB Migrate (development)
```bash
npx prisma migrate dev --name <description>
```

### DB Push (quick schema sync, no migration file)
```bash
npx prisma db push
```

### DB Studio (inspect data)
```bash
npx prisma studio
```

## Equipped Tools

### Context7 (MCP)
Look up accurate library docs before using any API:
```
mcp__context7__resolve-library-id → get library ID
mcp__context7__get-library-docs   → get actual API docs
```
Use for: Next.js App Router, tRPC v11, Prisma, NextAuth v5, Recharts, shadcn/ui

### Installed Skills
- `nextjs-app-router-patterns` — App Router patterns, server/client component split
- `prisma-database-setup` — Prisma schema, migrations, Neon setup
- `prisma-client-api` — Prisma query patterns
- `web-design-guidelines` — UI/UX standards

### CoVe (/rnv skill)
Apply 4-stage Chain-of-Verification for non-trivial code.
See PROMPT.md §4 for trigger list.

## GSD Workflow
1. Read STATE.md → find current phase + plan
2. Read PLAN.md → execute tasks
3. Write SUMMARY.md → document results
4. Update STATE.md → advance progress
5. Commit → `git commit -m "Phase N Plan NN: name"`

## Environment Variables Required
See .env.example for full list. Key vars:
- `DATABASE_URL` — Neon PostgreSQL connection string
- `NEXTAUTH_SECRET` — Generate: `openssl rand -base64 32`
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — Google Cloud Console
- `BASIQ_API_KEY` — User already has this
- `BASIQ_WEBHOOK_SECRET` — From Basiq dashboard webhook config
