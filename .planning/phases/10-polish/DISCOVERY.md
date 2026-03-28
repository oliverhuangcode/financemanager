# Discovery: Phase 10 — Polish, Deployment & Verification

## Goal
Responsive mobile layout, navigation, empty states, error boundaries, Vercel deployment prep, end-to-end smoke test readiness.

## Current State
- All 5 app routes exist (`/dashboard`, `/transactions`, `/budgets`, `/analytics`, `/settings/accounts`)
- **No navigation** — users can't move between pages after loading any page
- No `error.tsx` error boundaries anywhere
- No `loading.tsx` skeletons anywhere
- No `not-found.tsx` 404 page
- Empty states exist inline (adequate, no refactor needed)
- Root layout is minimal — no nav structure

## Key Design Decision: Route Group

Use `(app)` route group to share a layout (with nav) across all authenticated pages without affecting URL structure.

```
src/app/
  (app)/
    layout.tsx        ← NEW: sidebar/topnav + auth check
    error.tsx         ← NEW: shared error boundary
    loading.tsx       ← NEW: shared loading state
    dashboard/        ← MOVE from src/app/dashboard/
    transactions/     ← MOVE from src/app/transactions/
    budgets/          ← MOVE from src/app/budgets/
    analytics/        ← MOVE from src/app/analytics/
    settings/         ← MOVE from src/app/settings/
  login/              ← stays (public)
  page.tsx            ← stays (redirect)
  layout.tsx          ← stays (root HTML shell)
  not-found.tsx       ← NEW
```

All `@/` imports within pages are unaffected by the move.

## Navigation Design

Top nav bar (simpler than sidebar on mobile):
- Logo/brand "Finance Manager" on left
- Nav links: Dashboard · Transactions · Budgets · Analytics · Accounts
- Sign out button on right

Use `usePathname()` for active link highlighting (client component).
Nav component: `src/components/AppNav.tsx` (client, uses `usePathname`)

Group layout wraps children with nav:
```tsx
// src/app/(app)/layout.tsx — server component, auth guard
export default async function AppLayout({ children }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav user={session.user} />
      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </div>
  );
}
```

Individual page `<main className="p-8">` wrappers should be simplified to just return content (layout now handles padding). But to minimise changes — keep existing page wrappers; they'll just have a little extra padding.

Actually: to avoid modifying every page, keep the page `<main>` wrappers as-is. Layout provides minimal padding. Pages provide their own internal padding. This is fine.

## Error Boundary

`src/app/(app)/error.tsx` — client component (required by Next.js):
- Shows "Something went wrong" with retry button
- `reset()` function from Next.js error props

## Loading State

`src/app/(app)/loading.tsx`:
- Simple spinner or skeleton
- Auto-shown by Next.js during navigation/suspense

## 404 Page

`src/app/not-found.tsx`:
- "Page not found" with link back to dashboard

## Sign Out

Server action in layout or separate component. Use `signOut` from `@/server/auth`.

## Deployment Notes (documentation only)

Since we can't deploy here, add `.env.example` improvements and document Vercel steps in a comment. The repo already has `.env.example`.

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/app/(app)/layout.tsx` | NEW: app shell with auth guard + nav |
| `src/app/(app)/error.tsx` | NEW: error boundary |
| `src/app/(app)/loading.tsx` | NEW: loading state |
| `src/app/not-found.tsx` | NEW: 404 page |
| `src/components/AppNav.tsx` | NEW: top nav bar (client) |
| `src/app/(app)/dashboard/` | MOVE from `src/app/dashboard/` |
| `src/app/(app)/transactions/` | MOVE from `src/app/transactions/` |
| `src/app/(app)/budgets/` | MOVE from `src/app/budgets/` |
| `src/app/(app)/analytics/` | MOVE from `src/app/analytics/` |
| `src/app/(app)/settings/` | MOVE from `src/app/settings/` |

## Mobile Considerations
- `max-w-6xl mx-auto px-4` wrapper in app layout handles viewport constraint
- Nav uses `flex-wrap` for small screens or hamburger-style
- Charts already use `ResponsiveContainer` — fine on mobile
- Table on transactions page: horizontal scroll with `overflow-x-auto`
