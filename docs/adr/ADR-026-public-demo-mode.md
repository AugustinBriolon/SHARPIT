# ADR-026: Public read-only demo mode

**Status:** Accepted
**Date:** 2026-08-24
**Author:** Principal Architect
**Supersedes:** N/A
**Superseded by:** N/A

---

## Context

The owner wants SHARPIT reachable by a visitor with no account: a single shared, read-only demo session showing realistic seeded data, publicly linked from the sign-in page. This was the original request that triggered ADR-025 — a demo visitor turned out to be unsafe to build on the old single-tenant schema, because there was no tenant boundary to protect the real athlete's data behind. ADR-025 Phase 0 and Phase 1 are now complete and committed: every athlete-owned table carries a real `athleteId` FK, and `getCurrentAthleteId()` (`src/lib/auth/current-athlete.ts`) resolves the current tenant at every route/RSC boundary — 208 call sites across 89 of 101 route files, plus a handful of RSC pages, all funnel through it. Multi-tenancy being real is what unblocks this ADR.

Two Explore passes mapped the exact chokepoints before writing any code:

- `src/proxy.ts` (Next 16's `middleware.ts` equivalent) is the sole request-level gate — `clerkMiddleware` calls `auth.protect()` for every non-public route. It already had a boolean-bypass precedent, `isDevClerkBypass()` (`src/lib/dev/dev-auth.ts`), checked at exactly three sites: the proxy itself, `getCurrentAthleteId()`, and `AccessGate` (`src/components/auth/access-gate.tsx`) — the template this ADR's demo bypass follows structurally.
- No shared API route wrapper exists anywhere in the codebase. All 62 files / 71 non-GET exports under `src/app/api/**` independently call `getCurrentAthleteId()` then do their own thing — there is no single function to patch for write-blocking. The only real chokepoint for "block every mutation" is `src/proxy.ts`, before a request ever reaches a handler.
- `prisma/seed.ts` exists but is minimal (4 activities, 1 goal, 1 health row) and assumes a single pre-existing `AthleteProfile` — unsuitable to reuse for a public-facing demo without risking the real athlete's seed behavior.
- Every athlete-owned table cascades from `AthleteProfile` (45 `onDelete: Cascade` FKs) — deleting/reseeding one tenant's row is a single safe operation that can never touch another tenant's rows.

---

## Decision

### 1. A cookie-based demo session, not a duplicated route tree

A visitor hits `GET /demo` (`src/app/demo/route.ts`), which sets an httpOnly `sharpit_demo=1` cookie and redirects into the app's real home page (`/`). From there the visitor uses the existing `(app)` route tree exactly as a real athlete would — no parallel `/demo/*` page tree, no duplicated components. The cookie needs no signing: it only ever resolves to one fixed, low-privilege, read-only tenant, so forging it grants nothing beyond what visiting `/demo` already grants for free.

A route-tree fork (mirroring every `(app)` page under `/demo/*`) was considered and rejected: it would double the maintenance surface for every future page for no benefit, since nothing about the demo experience needs different UI — only a different tenant behind the same UI.

### 2. `isDemoSession()` is the single source of truth — including "does a real session win"

`src/lib/demo/demo-session.ts`:

```ts
export async function isDemoSession(): Promise<boolean> {
  if (isDevClerkBypass()) return false;

  const store = await cookies();
  if (store.get(DEMO_COOKIE)?.value !== '1') return false;

  const { userId } = await auth();
  return !userId;
}
```

This function is true only for a genuinely anonymous visitor: dev-bypass always wins (a developer running locally is never accidentally the demo tenant), and — critically — **a real Clerk session always wins over a stray demo cookie** left over in the same browser (e.g. an athlete who tested `/demo` once while also signed in, or clicked a demo link from an old tab). Every RSC-side consumer (`getCurrentAthleteId()`, `AccessGate`, `SettingsLayout`, `CoachPage`, `DemoBanner`) calls this one function, so the precedence is enforced once, not re-derived at each call site.

This was not the first implementation. The first pass checked the cookie directly at each site, with the real-session check bolted on separately inside `getCurrentAthleteId()`. Testing surfaced the gap immediately: with the precedence split across files, `getCurrentAthleteId()` correctly favored a real session, but `SettingsLayout`/`DemoBanner`/`CoachPage` still keyed off the raw cookie alone — a real signed-in athlete with a stray cookie saw their own data behind a "Mode démo" banner and a disabled Settings page, and worse, `src/proxy.ts`'s independent write-block would have 403'd their own real mutations. Consolidating the check into one function removed the class of bug, not just the one instance found.

`src/proxy.ts` cannot call `isDemoSession()` directly — Edge middleware has no `next/headers` `cookies()` — so it re-derives the same precedence with the APIs available to `clerkMiddleware`'s callback (`await auth()` for the real session, `req.cookies` for the demo cookie). This is the one unavoidable duplication; the plan and this ADR both call it out explicitly rather than let it drift silently.

### 3. Write-blocking lives in the proxy, not per-route

`src/proxy.ts` rejects with 403 any `/api/**` request from a demo session that is not a plain `GET`/`HEAD`, plus an explicit exception list for the one gap a method check misses: OAuth provider callbacks (`/api/strava/callback`, `/api/withings/callback`, `/api/google/callback`) mutate via `GET` on the provider's redirect back. This one change protects all 62 mutating route files at once — including any added later, with nothing new to remember — instead of retrofitting a guard into each handler individually, which the "no shared wrapper exists" finding above ruled out as impractical.

### 4. The highest-risk, zero-value surface is hidden, not just blocked

The proxy 403 is the real security boundary regardless of UI, but `/settings/**` (identity, integrations, equipment) is both meaningless in a demo and the one place a visitor could otherwise be invited to authenticate _their own_ real provider account against the shared demo tenant. `src/app/(app)/settings/layout.tsx` renders a short "Indisponible en démo" state for the whole settings section when `isDemoSession()` is true, wrapped in `<Suspense>` — same reasoning as `AccessGate`, which already established that awaiting `cookies()`/`auth()` outside Suspense blocks the route from prerendering (Next 16's `blocking-prerender-runtime` diagnostic caught this during implementation). The Coach page (`src/app/(app)/coach/page.tsx`) gets the same treatment for its send-message flow: the API is already POST-blocked, but an empty conversation with a composer that silently 403s is a bad dead end, so demo visitors see a short explanation instead.

A `<DemoBanner>` (`src/components/demo/demo-banner.tsx`) — an async Server Component, passed into the Client Component `AppShell` as a prop since a Client Component cannot itself await `cookies()` — states "Mode démo — lecture seule" with a "Quitter" link to `/api/demo/exit`, which clears the cookie and redirects to `/sign-in`.

### 5. A dedicated, idempotent demo seed — never the real athlete's seed path

`prisma/seed-demo.ts` (run via `yarn db:seed:demo`) is a separate file from `prisma/seed.ts` and never touches it. It `upsert`s the `AthleteProfile` on the sentinel `clerkUserId: 'demo'` (real Clerk ids are always `user_...`, so this can never collide), then deletes and recreates everything scoped to that one `athleteId` — safe because of the cascade shape ADR-025 established. Verified empirically, not assumed: running it twice in a row against the real dev database produced identical row counts for the demo tenant and left the real athlete's 312 activities / 546 health rows / 12 nutrition rows / 48 planned sessions / 1 goal completely unchanged both times.

Scope is deliberately narrow — three weeks of activities (bike/run/swim/strength mix), ten days of recovery data, seven days of nutrition (one day left empty on purpose, to exercise the "no data" pill in `NutritionMacroBreakdownSection`), a week of planned sessions, one goal. Coach conversations and integration accounts are left empty: Coach is shown as unavailable per Decision 4, and no fake connected providers sidesteps needing to fake OAuth state entirely.

---

## Options considered

### Option A — Per-visitor ephemeral tenant, not a shared account

**Pros:** Each visitor gets an isolated, writable sandbox; closer to the real product experience.
**Cons:** Needs a provisioning path, a cleanup job, and materially more infrastructure for a first pass.
**Rejected because:** the owner explicitly chose the simpler shared read-only account (`AskUserQuestion`, this session) — the ephemeral-tenant approach remains available later without any of this work being wasted, since the tenant-resolution and write-block plumbing is identical either way.

### Option B — Duplicate the `(app)` route tree under `/demo/*`

See Decision 1. Rejected: doubles the page-maintenance surface for zero UI difference.

### Option C — A shared API route wrapper (`withAuth`-style) instead of a proxy-level block

**Pros:** Would also be the natural place to add future per-route policy (rate limits, etc.).
**Cons:** No such wrapper exists today (confirmed by direct inspection of all 101 route files) — introducing one now to solve a narrow write-blocking problem is a much larger, unrelated refactor of every route handler in the app.
**Rejected because:** disproportionate to the problem; the proxy already inspects every request and needed only a few lines.

### Option D — Check the demo cookie independently at each call site (the first implementation)

**Pros:** No shared helper to reason about; each site is locally simple.
**Cons:** Directly caused the precedence bug described in Decision 2 — found during manual browser verification, not by inspection.
**Rejected because:** demonstrated to be unsafe in practice, not just theoretically inferior.

---

## Consequences

### Positive

- A public demo is reachable with zero new pages beyond the two tiny entry/exit routes — every existing screen, component, and data-fetching path is reused unmodified.
- The write-boundary is enforced at exactly one place (`src/proxy.ts`) for the API surface, so it automatically covers every route added after this ADR, not just the 62 that existed when it was written.
- `isDemoSession()`'s real-session-wins precedence means this feature is safe to ship without any risk to the existing athlete's own workflow, even in the edge case of a shared browser or a stale cookie — verified directly (real Settings/Integrations page rendered correctly for the real athlete despite a leftover demo cookie still present in the same browser).
- The demo seed is fully idempotent and isolated — safe to rerun at any time to refresh the "last N days" window without any operational ceremony.

### Negative

- `src/proxy.ts` now duplicates `isDemoSession()`'s precedence logic (real session wins) using Edge-middleware-compatible APIs, since it cannot import the RSC helper directly. This is a real, if small, drift risk if the RSC-side logic changes without the proxy being updated in lockstep — called out here explicitly so it isn't rediscovered as a mystery later.
- `/settings/**` and Coach's composer are fully unavailable in demo rather than degraded gracefully field-by-field — a deliberate scope cut (Decision 4), not an oversight, but it does mean a demo visitor cannot see what those two sections look like at all.
- The demo seed's three-week/ten-day/seven-day windows are hand-picked constants tuned to look populated across Today, Training, Nutrition, and Progress; they carry no relationship to what a real athlete's data density looks like and will need re-tuning by hand if those pages' data requirements change.

### Neutral

- `export const instant = false` was added to `src/app/(app)/settings/page.tsx`, following the same pattern already used by `settings/goals`, `training/progression`, and `biology` — Next 16's instant-navigation validation cannot statically prove a conditionally-gated segment always renders, and this is the codebase's established way to opt out of that check rather than fight it. Only the root `/settings` page carries this annotation; the same warning would appear for other settings subpages if visited directly during local development, and can be silenced the same way if it becomes noticeable — not applied preemptively to all twelve subpages to avoid touching files with no other reason to change.

---

## Roadmap

- If per-visitor ephemeral demo tenants (Option A) are wanted later, the write-block, cookie-precedence, and seed-shape work here transfers directly — only the provisioning/cleanup layer would be new.
- Onboarding UX for a genuinely-empty _new real_ athlete (ADR-025 Phase 2) is unrelated to and unblocked by this work, and remains separately deferred.

## Explicitly deferred, not forgotten

Per-visitor ephemeral tenants, analytics on demo usage, rate-limiting the demo entry route, and any UI degrade-gracefully treatment for `/settings/**` beyond the current full block.

---

## References

- `docs/adr/ADR-025-multi-tenant-conversion.md` — the tenancy foundation this ADR builds on; this feature is literally what triggered ADR-025.
- `src/proxy.ts`, `src/lib/demo/demo-session.ts`, `src/lib/auth/current-athlete.ts` — implementation.
- `src/app/demo/route.ts`, `src/app/api/demo/exit/route.ts` — entry/exit.
- `src/app/(app)/settings/layout.tsx`, `src/app/(app)/coach/page.tsx`, `src/components/demo/demo-banner.tsx` — demo-aware surfaces.
- `prisma/seed-demo.ts` — the demo dataset.
- `src/lib/dev/dev-auth.ts`, `src/components/auth/access-gate.tsx` — the `isDevClerkBypass()` precedent this ADR's bypass pattern follows.
