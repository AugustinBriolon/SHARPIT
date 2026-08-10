# Navigation Shell Suspense Fallbacks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every covered `(app)` route paints stable chrome + layout-matched value micro-skeletons on first client-navigation paint — never an empty main region.

**Architecture:** Hybrid C from the design spec. Suspense fallbacks become the Cache Components prerendered shell for each boundary. Prefer wiring existing hub skeletons; extract shared loading presentational trees for Today/Training; add content-only fallbacks where page chrome already sits outside Suspense.

**Tech Stack:** Next.js App Router + Cache Components, React `<Suspense>`, existing SHARPIT skeleton / loading-shell components, Vitest `renderToStaticMarkup` contracts.

**Spec:** [`docs/superpowers/specs/2026-08-10-navigation-shell-fallbacks-design.md`](../specs/2026-08-10-navigation-shell-fallbacks-design.md)

## Global Constraints

- No new hub `loading.tsx` route files.
- Do not restore `(app)/template.tsx`.
- No Core / Twin / Query-key changes.
- Fallbacks must match live layout (DESIGN_LANGUAGE §9.4) — no divergent SaaS plates.
- Commits only when the user explicitly requests `/ftn-commit` (project commit rule).
- Artifacts in English; user-facing UI copy stays French as today.

## File map

| File                                                                       | Role                                           |
| -------------------------------------------------------------------------- | ---------------------------------------------- |
| `src/app/(app)/coach/page.tsx`                                             | Wire `CoachHubSkeleton` fallback               |
| `src/app/(app)/training/sessions/page.tsx`                                 | Wire `SessionsHubSkeleton` fallback            |
| `src/components/today/today-dashboard-shell.tsx` (create)                  | Presentational Today loading tree              |
| `src/components/today/today-dashboard.tsx`                                 | Use shell for cold mount                       |
| `src/app/(app)/(home)/page.tsx`                                            | Fallback = `TodayDashboardShell`               |
| `src/components/training/hub/training-dashboard-shell.tsx` (create)        | Presentational Training loading tree           |
| `src/components/training/hub/training-dashboard.tsx`                       | Use shell when `valuesLoading` where practical |
| `src/app/(app)/training/page.tsx`                                          | Fallback = training shell                      |
| `src/components/corps/corps-hub-skeleton.tsx` (create)                     | Biology chrome + value skeleton                |
| `src/app/(app)/biology/page.tsx`                                           | Wire biology fallback                          |
| `src/components/training/trip/hike-trips-list.tsx`                         | Export list skeleton                           |
| `src/app/(app)/training/trips/page.tsx`                                    | Wire trips fallback                            |
| `src/components/training/hub/progression-hub-skeleton.tsx` (create)        | Progression chrome + panel skeleton            |
| `src/app/(app)/training/progression/page.tsx`                              | Wire progression fallback                      |
| `src/components/coach-memory/coach-memory-shell.tsx` (create)              | Ink band chrome + list pulses                  |
| `src/app/(app)/settings/memory/page.tsx`                                   | Wire memory fallback                           |
| `src/components/calendar/calendar-view.tsx`                                | Export `CalendarSkeleton`                      |
| `src/app/(app)/training/calendar/page.tsx`                                 | Content fallback                               |
| `src/components/planning/planning-view.tsx` or new `planning-skeleton.tsx` | Export embedded loading skeleton               |
| `src/app/(app)/training/planning/page.tsx`                                 | Content fallback                               |
| `src/app/(app)/training/manual/page.tsx`                                   | Form-field pulse fallback                      |
| `src/app/(app)/settings/equipment/page.tsx`                                | Equipment panel pulse fallback                 |
| `src/app/(app)/training/trips/[id]/page.tsx`                               | Trip detail pulse fallback                     |
| `docs/INSTANT_UX_ARCHITECTURE.md`                                          | §6 correction                                  |

---

### Task 1: Coach + Sessions (wire existing skeletons)

**Files:**

- Modify: `src/app/(app)/coach/page.tsx`
- Modify: `src/app/(app)/training/sessions/page.tsx`
- Test: `src/components/coach/coach-micro-skeleton.test.ts` (already covers `CoachHubSkeleton`)

**Interfaces:**

- Consumes: `CoachHubSkeleton` from `@/components/coach/coach-hub-skeleton`; `SessionsHubSkeleton` from `@/components/sessions/sessions-hub`
- Produces: non-empty Suspense fallbacks on `/coach` and `/training/sessions`

- [ ] **Step 1: Wire coach page fallback**

```tsx
import { Suspense } from 'react';
import { CoachView } from '@/components/coach/coach-view';
import { CoachHubSkeleton } from '@/components/coach/coach-hub-skeleton';

export default function CoachPage() {
  return (
    <Suspense fallback={<CoachHubSkeleton />}>
      <CoachView />
    </Suspense>
  );
}
```

- [ ] **Step 2: Wire sessions page fallback**

```tsx
import { Suspense } from 'react';
import { SessionsHub, SessionsHubSkeleton } from '@/components/sessions/sessions-hub';

export default function TrainingSessionsPage() {
  return (
    <Suspense fallback={<SessionsHubSkeleton />}>
      <SessionsHub basePath="/training/sessions" />
    </Suspense>
  );
}
```

- [ ] **Step 3: Verify coach skeleton test still passes**

Run: `yarn vitest run src/components/coach/coach-micro-skeleton.test.ts`  
Expected: PASS

- [ ] **Step 4: Add sessions skeleton smoke test if missing**

Create or extend a small test that `SessionsHubSkeleton` markup contains `aria-busy` or calendar grid pulses and real-looking title skeleton classes — mirror coach test style with `renderToStaticMarkup`.

---

### Task 2: Today dashboard shell

**Files:**

- Create: `src/components/today/today-dashboard-shell.tsx`
- Modify: `src/components/today/today-dashboard.tsx`
- Modify: `src/app/(app)/(home)/page.tsx`
- Test: `src/components/today/today-micro-skeleton.test.ts` (extend)

**Interfaces:**

- Consumes: `todayLoadingShell`, `TodayVerdictHero`, `TodaySignalStrip`, `TodayActionRow`, `TodayWeeklyTrajectory`
- Produces: `export function TodayDashboardShell({ trainingDayId }: { trainingDayId?: string })`

- [ ] **Step 1: Extract presentational shell**

`TodayDashboardShell` renders the same tree as the loading branch of `TodayDashboard`: `content = todayLoadingShell()`, all child `loading` props `true`. Accept optional `trainingDayId` defaulting via `format(new Date(), 'yyyy-MM-dd')` only inside the client shell used after mount; for the **page fallback**, pass a stable placeholder day id from a client wrapper or call `todayLoadingShell()` without needing live day for layout (action row may need an id — use `todayLoadingShell()`'s day or `format(new Date(), 'yyyy-MM-dd')` in the client component fallback).

Important: the Suspense fallback component must be a **client** component if it uses hooks/date, OR a pure server-safe presentational tree. Prefer `'use client'` shell that mirrors cold mount.

- [ ] **Step 2: Refactor `TodayDashboard` to render `<TodayDashboardShell trainingDayId={…} />` when `!vm` / values loading path matches current behavior** — keep empty-state / offline branches unchanged.

- [ ] **Step 3: Home page**

```tsx
import { Suspense } from 'react';
import { TodayDashboard } from '@/components/today/today-dashboard';
import { TodayDashboardShell } from '@/components/today/today-dashboard-shell';

export default function TodayPage() {
  return (
    <Suspense fallback={<TodayDashboardShell />}>
      <TodayDashboard />
    </Suspense>
  );
}
```

- [ ] **Step 4: Extend micro-skeleton test** to assert shell markup includes verdict/action regions (class or text hooks already used by Today loading).

Run: `yarn vitest run src/components/today/today-micro-skeleton.test.ts`  
Expected: PASS

---

### Task 3: Training dashboard shell

**Files:**

- Create: `src/components/training/hub/training-dashboard-shell.tsx`
- Modify: `src/components/training/hub/training-dashboard.tsx` (optional reuse)
- Modify: `src/app/(app)/training/page.tsx`
- Test: new `src/components/training/hub/training-dashboard-shell.test.ts`

**Interfaces:**

- Produces: `export function TrainingDashboardShell()`

- [ ] **Step 1: Build shell** that paints `TrainingInstrumentPlate` / `TrainingWeekStrip` / preview chip skeletons with `loading={true}` and empty data arrays — same visual as `valuesLoading` branch in `TrainingDashboard`.

- [ ] **Step 2: Wire page fallback** to `<TrainingDashboardShell />`.

- [ ] **Step 3: Unit test** — `renderToStaticMarkup` contains plate/week structure and pulse chips; no empty root.

---

### Task 4: Biology + Trips + Progression + Memory

**Files:**

- Create: `src/components/corps/corps-hub-skeleton.tsx`
- Modify: `src/app/(app)/biology/page.tsx`
- Modify: `src/components/training/trip/hike-trips-list.tsx` (export skeleton)
- Modify: `src/app/(app)/training/trips/page.tsx`
- Create: `src/components/training/hub/progression-hub-skeleton.tsx`
- Modify: `src/app/(app)/training/progression/page.tsx`
- Create: `src/components/coach-memory/coach-memory-shell.tsx`
- Modify: `src/app/(app)/settings/memory/page.tsx`
- Tests: extend `biology-micro-skeleton.test.ts`; add small smoke tests for trips/progression/memory shells

**Interfaces:**

- `CorpsHubSkeleton()` — StickyHeader “Mon corps / Forme & bien-être”, Composition description, tab pills with Composition active, value pulse region. No `useSearchParams`.
- `HikeTripsListSkeleton()` — `TripsPageHeader` + 3 pulse chips (extract from pending branch).
- `ProgressionHubSkeleton()` — back link + StickyHeader “Progression” + default tab description + tab pills + panel pulse. No `useSearchParams`.
- `CoachMemoryShell()` — ink identity (title Mémoire du coach, empty counters) + 3–4 list pulses. No focus / no data fetch.

- [ ] **Step 1–4:** Implement each skeleton + wire corresponding `page.tsx` fallback.
- [ ] **Step 5:** Run related vitest files — all PASS.

---

### Task 5: Content-only fallbacks

**Files:**

- Modify: `src/components/calendar/calendar-view.tsx` — `export function CalendarSkeleton`
- Modify: `src/app/(app)/training/calendar/page.tsx` — `fallback={<CalendarSkeleton showHeader={false} />}`
- Modify: planning module — export `PlanningEmbeddedSkeleton` (content rows matching embedded loading)
- Modify: `src/app/(app)/training/planning/page.tsx`
- Modify: `src/app/(app)/training/manual/page.tsx` — inline or small `ActivityFormSkeleton` pulses
- Modify: `src/app/(app)/settings/equipment/page.tsx` — equipment panel pulses
- Modify: `src/app/(app)/training/trips/[id]/page.tsx` — ink band + timeline pulses under existing back link

- [ ] **Step 1:** Export calendar skeleton; wire calendar page.
- [ ] **Step 2:** Planning embedded skeleton; wire planning page.
- [ ] **Step 3:** Manual form pulse fallback (fields under existing header).
- [ ] **Step 4:** Equipment panel pulse fallback.
- [ ] **Step 5:** Trip detail pulse fallback (band + steps list).
- [ ] **Step 6:** Grep for remaining `<Suspense>` without fallback under `src/app/(app)` — only allow empty if chrome+value already outside AND child is sync (document in comment). History + Today drill-downs already OK.

---

### Task 6: Docs + verification gate

**Files:**

- Modify: `docs/INSTANT_UX_ARCHITECTURE.md` §6 (and the Cache Components paragraph under it)
- Optionally touch: `docs/superpowers/specs/2026-08-10-navigation-shell-fallbacks-design.md` status → Implemented

- [ ] **Step 1: Rewrite §6** so empty fallback is forbidden when the boundary wraps visible chrome/value; fallback must equal the page-owned chrome + micro-skeleton contract; hub `loading.tsx` remains banned.

- [ ] **Step 2: Verify**

Run: `yarn typecheck && yarn lint && yarn test && yarn build`  
Expected: all green; routes still partial-prerender.

- [ ] **Step 3: Manual smoke** (dev): click `/` → `/training` → `/biology` → `/coach` → `/training/sessions` — chrome visible before data.

- [ ] **Step 4: Commit only when user asks** via `/ftn-commit`.

---

## Spec coverage checklist

| Spec item                                              | Task   |
| ------------------------------------------------------ | ------ |
| Coach / Sessions existing skeletons                    | 1      |
| Today / Training shared shells                         | 2–3    |
| Biology / Trips / Progression / Memory                 | 4      |
| Planning / Calendar / Manual / Equipment / Trip detail | 5      |
| Instant UX §6 update                                   | 6      |
| No hub `loading.tsx` / no template                     | Global |
| Verify gate                                            | 6      |

## Placeholder scan

None intentional. Trip-detail / equipment / manual skeletons may be inline JSX in the page file if <~40 lines; extract only if reused.
