# Project: FinanceManager

## Your Mission

You are working autonomously in a Ralph loop executing GSD plans for a personal finance dashboard (T3 stack + Basiq + Neon + Vercel). Each iteration executes one plan, verifies it, writes a summary, and advances state.

---

## 0. Use Your Tools

You are equipped with:
- **Context7**: Query up-to-date docs before using any library API. Use `mcp__context7__resolve-library-id` then `mcp__context7__get-library-docs`. Don't guess tRPC, Next.js, Prisma, or NextAuth APIs.
- **Installed skills**: nextjs-app-router-patterns, prisma-database-setup, prisma-client-api, web-design-guidelines
- **CoVe verification** (/rnv): Apply 4-stage verification on non-trivial code (auth, webhooks, DB mutations, financial calculations)

---

## 1. Read Current State

```
Read .planning/STATE.md → current phase + plan
Read .planning/ROADMAP.md → phase context + dependencies
```

---

## 2. Decision Tree

```
Is DISCOVERY.md missing for current phase?
  YES → Research phase: read PRD + explore codebase + write DISCOVERY.md. Use Context7 for unfamiliar tech.
  NO  ↓

Are plans for current phase not yet generated?
  YES → Generate {NN}-{NN}-PLAN.md files from DISCOVERY.md + PRD §3 "Traces to" sections
  NO  ↓

Is there an unexecuted plan?
  YES → Execute it (see §3 below)
  NO  ↓

Are all plans in phase complete?
  YES → Update ROADMAP.md status, advance STATE.md to next phase
  NO  → Set STATUS: BLOCKED, explain why

Are all 10 phases complete?
  YES → Run final verification, set EXIT_SIGNAL: true
```

---

## 3. Execute a Plan

1. Read `{phase-dir}/{NN}-{NN}-PLAN.md` completely
2. Execute each `<task>` in order
3. **Apply CoVe (from /rnv) for non-trivial tasks:**
   - Auth/session logic
   - Webhook signature verification
   - Prisma mutations and transactions
   - tRPC procedures with financial data
   - Any code where a subtle bug would be hard to spot
4. Run each task's `<verify>` checklist
5. Run the plan's `<verification>` section
6. Write `{NN}-{NN}-SUMMARY.md` with: what was done, files changed, issues encountered
7. Commit with: `git add -A && git commit -m "Phase N Plan NN: [name]"`
8. Update `.planning/STATE.md`

---

## 4. CoVe Triggers

Apply 4-stage CoVe (/rnv) for:
- NextAuth session handling and middleware
- Basiq webhook HMAC verification
- Prisma upsert logic (idempotency)
- tRPC procedures that write financial data
- Budget calculation (actual vs budget comparison)
- Any auth-protected route logic

Skip for: config files, placeholder pages, simple component markup.

---

## 5. Just-in-Time Plan Generation

When advancing to a new phase:
1. Read phase's DISCOVERY.md (create it via research if missing)
2. Read PRD "Traces to" sections for the phase
3. Use Context7: `resolve-library-id` for any new library, then `get-library-docs`
4. Generate all {NN}-{NN}-PLAN.md files for the phase
5. Begin executing plan 01

**Phase-specific research notes:**
- Phase 3: Look up NextAuth v5 App Router setup + Prisma adapter
- Phase 4: Look up Basiq API v3 consent flow + account endpoints
- Phase 5: Look up Basiq webhook payload format + signature verification
- Phase 9: Look up Recharts API for BarChart, PieChart, LineChart

---

## 6. Key Rules

- ONE plan per loop iteration
- Always run `npm run typecheck` after implementation tasks
- Write SUMMARY.md after every completed plan
- Update STATE.md after every completed plan
- Reference PRD for acceptance criteria — do not invent requirements
- Use Context7 for library docs — do not hallucinate APIs
- Apply CoVe on auth/webhook/financial code — do not ship unverified
- Commit after each completed plan
- Never commit real API keys or secrets

---

## 7. Required Output Format

At the END of every response, output EXACTLY:

---RALPH_STATUS---
STATUS: IN_PROGRESS | COMPLETE | BLOCKED
PHASE: [number and name]
PLAN: [plan number or "generating" or "researching"]
TASKS_COMPLETED_THIS_LOOP: <number>
FILES_MODIFIED: <number>
TESTS_STATUS: PASSING | FAILING | NOT_RUN
WORK_TYPE: RESEARCH | PLANNING | IMPLEMENTATION | VERIFICATION
COVE_APPLIED: true | false | N/A
EXIT_SIGNAL: false
RECOMMENDATION: <what was done, what's next>
---END_RALPH_STATUS---

Set EXIT_SIGNAL: true ONLY when:
- All 10 phases in ROADMAP.md show "Complete"
- All SUMMARY.md files written
- Final verification gate passes
- STATE.md shows 100% progress
