# Navigation shell Suspense fallbacks

**Date:** 2026-08-10  
**Status:** Implemented  
**Related:** [ADR-010](../../adr/ADR-010-cache-components-and-instant-navigation.md) · [INSTANT_UX_ARCHITECTURE.md](../../INSTANT_UX_ARCHITECTURE.md) §6

---

## Problem

With Cache Components + partial prefetching, the prerendered route shell is what the athlete sees on the first paint of a client navigation. That shell is: layout chrome + everything **outside** `<Suspense>` + the Suspense **fallback**.

Several `(app)` pages wrap their entire client tree in `<Suspense>` with an **empty** fallback. The Instant UX note that “on a client navigation the view renders synchronously, so the fallback is never seen” is false whenever the destination still needs an RSC flight, a JS chunk, or `useSearchParams` resolution. Result: nav chrome stays, main content goes blank — page-owned micro-skeletons never mount in time.

Removing `PageFade` / `(app)/template.tsx` did not cause this; it only removed an opacity enter on a tree that was already blank.

---

## Goal

On every client navigation into a covered route, the athlete sees **stable page chrome** (title / back / tabs) plus a **layout-matched value micro-skeleton** before live data arrives. Never an empty main region.

Non-goals:

- No new hub `loading.tsx` route files.
- No restore of `(app)/template.tsx` (would reset React Activity state).
- No Core / Digital Twin / Query-key changes.
- No full-page SaaS skeleton plates that diverge from the live layout.

---

## Approach (hybrid C)

| Pattern                            | When                                                           | Shell content                                                                               |
| ---------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Reuse existing hub skeleton**    | Component already exists and matches live chrome               | Wire as `fallback={…}`                                                                      |
| **Compose loading shell**          | Today / Training already paint via `loading` + `*LoadingShell` | Export a thin presentational shell used as fallback **and** cold-mount path where practical |
| **Chrome outside, value fallback** | Page already keeps StickyHeader / back link outside Suspense   | Add content-only micro-skeleton as fallback                                                 |
| **Leave alone**                    | Drill-downs Today + history already have useful fallbacks      | No change                                                                                   |

---

## Per-route design

### Full-tree Suspense (blank today)

| Route                   | Fallback                                                                                                                                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/` (Today)             | Presentational shell equivalent to `TodayDashboard` with `todayLoadingShell()` + `loading` flags (hero / strip / action / trajectory). Prefer extracting a `TodayDashboardShell` (or similar) so cold mount and Suspense fallback share one tree. |
| `/training`             | Presentational shell of `TrainingDashboard` in `valuesLoading` mode (instrument plate + week strip + chip skeletons). Extract if needed to avoid duplicating markup.                                                                              |
| `/coach`                | Existing `CoachHubSkeleton`.                                                                                                                                                                                                                      |
| `/biology`              | New thin `CorpsHubSkeleton` (or inline in page): StickyHeader with default Composition copy + tab pills (Composition active) + value-area skeleton matching composition cold state. Do **not** require `useSearchParams` in the fallback.         |
| `/training/sessions`    | Existing `SessionsHubSkeleton`.                                                                                                                                                                                                                   |
| `/training/trips`       | Export `HikeTripsListSkeleton` (or `TripsPageHeader` + 3 pulse chips) from the list module; wire as fallback. Header must not depend on query.                                                                                                    |
| `/training/progression` | StickyHeader (Progression chrome) + panel micro-skeleton as fallback while `ProgressionHubWithProfile` streams.                                                                                                                                   |
| `/settings/memory`      | Ink-band identity chrome (title “Mémoire du coach”, no counters / no focus) + list pulse rows. Prefer a small `CoachMemoryShell` without awaiting `searchParams`.                                                                                 |

### Chrome already outside Suspense (content blank today)

| Route                  | Fallback (content only)                                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `/training/planning`   | Planning value micro-skeleton (same shapes as `PlanningView` `isLoading` / embedded loading rows). Export if not already.               |
| `/training/calendar`   | `CalendarSkeleton` with `showHeader={false}` (page header is already outside). Export from calendar module if private today.            |
| `/training/manual`     | Compact form-field pulse block under the existing StickyHeader (date defaults are why Suspense exists — form itself need not be blank). |
| `/settings/equipment`  | Equipment panel micro-skeleton under existing header.                                                                                   |
| `/training/trips/[id]` | Keep `MobileBackLink` outside; fallback = ink-band pulse + timeline pulse (no trip name until stream).                                  |

### Already correct — no change

- `/today/{recovery,sleep,effort,adaptation}` — `MobileDrillDownHeader` in fallback.
- `/training/history` — `TrainingListFallback`.
- `/settings/integrations` — `IntegrationsHubShell pending` (verify still wired).

---

## Documentation

Update `docs/INSTANT_UX_ARCHITECTURE.md` §6:

- Empty Suspense fallback is allowed **only** when (a) the suspending child renders synchronously on client navigation **and** (b) all athlete-visible chrome for that route already lives outside the boundary (or in a non-empty fallback).
- With Cache Components, the Suspense fallback **is** the prerendered shell for that boundary — it must not be empty if the boundary wraps the page’s visible chrome or value region.
- Keep the ban on hub `loading.tsx` that duplicates page-owned micro-skeletons; the fix is fallback = same chrome/micro-skeleton contract, not a second route-level skeleton system.

Optional one-line cross-link in ADR-010 consequences if useful; no ADR revision required unless implementation discovers a new architectural fork.

---

## Testing

- Existing micro-skeleton unit tests (`today-micro-skeleton`, `coach-micro-skeleton`, `biology-micro-skeleton`) stay green; add/adjust if new shell exports are introduced.
- `yarn typecheck && yarn lint && yarn test && yarn build`.
- Manual: cold click between `/`, `/training`, `/biology`, `/coach`, `/training/sessions` — chrome visible before data.
- E2E `instant()` for authenticated athlete routes remains optional (auth storage not in repo); do not block on expanding `e2e/instant-navigation.spec.ts` unless auth fixture is already available.

---

## Implementation order

1. Coach + Sessions (wire existing skeletons).
2. Today + Training (extract/share loading shells).
3. Biology + Trips + Progression + Memory.
4. Content-only fallbacks (planning, calendar, manual, equipment, trip detail).
5. Instant UX §6 doc update.
6. Verify gate + commit via `/ftn-commit` when requested.

---

## Success criteria

- No covered route shows an empty main region on first client navigation paint.
- Fallbacks match live layout dimensions (DESIGN_LANGUAGE §9.4).
- React Activity state preservation remains intact (no template reintroduction).
- Build still produces partial prerenders for these routes (`instant` shells non-empty where asserted by architecture).
