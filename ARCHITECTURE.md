# SHARPIT Architecture Handbook

> This document is the **engineering** reference for every contributor and AI agent working on SHARPIT.
> Every pull request is evaluated against it. When this document and the code disagree, fix the code.
>
> **Domain concepts, Digital Twin, and pipeline flow:** [`docs/domain/DOMAIN.md`](docs/domain/DOMAIN.md)  
> **Inference execution platform:** [`docs/engineering/INFERENCE_PLATFORM.md`](docs/engineering/INFERENCE_PLATFORM.md)  
> **Product law:** [`docs/product/PRODUCT.md`](docs/product/PRODUCT.md)

---

## Table of Contents

1. [Project Philosophy](#1-project-philosophy)
2. [Architectural Principles](#2-architectural-principles)
3. [Folder Organization](#3-folder-organization)
4. [Domain Boundaries](#4-domain-boundaries)
5. [Naming Conventions](#5-naming-conventions)
6. [React Conventions](#6-react-conventions)
7. [State Management Rules](#7-state-management-rules)
8. [Data Modeling Principles](#8-data-modeling-principles)
9. [Feature Creation Workflow](#9-feature-creation-workflow)
10. [Code Review Checklist](#10-code-review-checklist)
11. [Common Mistakes to Avoid](#11-common-mistakes-to-avoid)
12. [Good vs Bad Implementations](#12-good-vs-bad-implementations)

---

## 1. Project Philosophy

SHARPIT is a **personal sports coaching system** powered by physiological models and AI. It is not a generic fitness tracker. Every architectural decision must serve two goals:

1. **Scientific correctness** — recommendations are only as good as the models behind them. The domain logic must be pure, testable, and traceable to published sources.
2. **Developer legibility** — the codebase must be navigable without prior context. A new contributor must be able to open a domain folder and immediately understand what it does.

### What SHARPIT is not

- It is not multi-tenant. The current design targets a single athlete. Do not add abstractions for multi-user scenarios without a deliberate architectural decision (and ADR).
- It is not a general-purpose CRUD app. Data models carry physiological meaning. Adding a field without understanding that meaning is a scientific regression.
- It is not a real-time system. Sync is periodic and deliberate. Do not introduce polling or WebSocket patterns without a concrete need.

### The non-negotiable constraint

**The domain logic must remain pure.** Functions in `src/core/` (and pure helpers under `src/lib/` that do not touch I/O) must have zero side effects, zero I/O, and zero framework dependencies. They take data, return data. They are the core of the product and must be tested to the same standard as production code.

---

## 2. Architectural Principles

### 2.1 Layered architecture

Requests flow in one direction only:

```
Browser
  └── React Component (render only)
        └── Custom Hook (query + mutation)
              └── Fetcher (HTTP client)
                    └── Route Handler (validate + orchestrate)
                          └── Query Function (Prisma + DB)
                                └── Domain Function (pure logic)
```

**Each layer knows only the layer directly below it.** A component must not call `fetch()` directly. A domain function must not import from `queries.ts`. A route handler must not contain business logic.

### 2.2 Pure domain functions

Domain functions are the core asset. They must be:

- **Stateless** — no module-level mutable state
- **Deterministic** — same input always produces same output
- **Free of I/O** — no `fetch`, no `prisma`, no `console.log` in the hot path
- **Independently testable** — no mocking required, only data structures

If a function needs the current date, pass it as a parameter. If it needs database records, accept them as plain objects.

### 2.3 The JSON serialization boundary

Every value that crosses the server/client boundary via `JSON.stringify` loses its `Date` instances — they become strings. This boundary is at the route handler response.

The pattern for handling this is non-negotiable:

1. Server query functions return rich Prisma types with `Date` fields.
2. Client types are inferred from query function return types via `Awaited<ReturnType<...>>`.
3. The `Serialized<T>` utility type represents the wire format (all `Date` → `string`).
4. Fetcher functions are the only place that calls `new Date()` to re-hydrate strings.

**Never use `as unknown as ClientType` to cast across this boundary.** It hides hydration bugs.

### 2.4 Single source of truth per concern

| Concern              | Authoritative source                     |
| -------------------- | ---------------------------------------- |
| Server data          | PostgreSQL via Prisma                    |
| Client cache         | TanStack Query                           |
| Type definitions     | Query function return types (inferred)   |
| Query cache keys     | `src/lib/query/keys.ts`                  |
| Validation schemas   | `src/lib/validators/` (Zod)              |
| Scientific constants | Domain function file with source comment |

No value lives in two places. No type is defined twice.

### 2.5 Optimistic mutations are the default

Every mutation that modifies a list should use `listOptimistic()`. Every mutation that modifies a single entity should use an equivalent pattern. The UI must never wait for a network round-trip to reflect user intent.

---

## 3. Folder Organization

### 3.1 Current structure (what exists)

```
src/
  app/
    (app)/              ← authenticated routes and page shells
    api/                ← route handlers (sibling of (app), not nested under it)
    sign-in/, sign-up/  ← Clerk auth pages
    ~offline/           ← PWA offline fallback
  components/           ← UI by feature domain (+ ui/, layout/, pwa/)
  hooks/                ← TanStack Query hooks
  providers/            ← React context providers (Clerk, theme, query)
  lib/                  ← app orchestration, I/O, presentation, validators (see §3.2)
  core/                 ← pure domain / Digital Twin / inference (no Prisma, no React)
  infrastructure/       ← Prisma adapters, Open-Meteo, event bus bindings
prisma/
  migrations/
  schema.prisma
scripts/
```

**Purity rule:** domain algorithms live in `src/core/` (preferred) or as pure helpers under `src/lib/` when they are app-facing projections. They must have zero side effects, zero I/O, and zero framework dependencies in the hot path. Functions take data, return data.

### 3.2 Current `src/lib/` and `src/core/` structure

```
src/core/                 ← frozen Core (models, inference, decision, observation, …)
  inference/              ← recovery, fatigue, adaptation, reasoning, environment, …
  decision/, features/, observation/, digital-twin/, presentation/, …
src/lib/
  integrations/           ← Garmin, Strava, Renpho, Withings, Google sync
  engines/                ← lazy singletons wrapping core inference for the app
  query/                  ← TanStack Query keys, fetchers, optimistic helpers
  validators/             ← Zod schemas
  presentation/           ← ViewModel builders (pure; I/O stays in api/presentation)
  product-insight/        ← page insight projections over core/product-insight
  decision-memory/        ← coaching decision aggregate helpers
  [domain folders]        ← today, effort, plan-gate, planned-session, travel-context, …
  [flat utils]            ← format, analytics, periodization, recovery helpers, …
```

**Rule:** integration adapters → `integrations/`; engine singletons → `engines/`; React Query → `query/`; pure Twin/inference → `core/`. Do not add files to a subdirectory without that clear classification.

### 3.3 Route handler organization

Route handlers in `src/app/api/` follow REST resource conventions:

```
/api/activities              ← collection CRUD
/api/activities/[id]         ← single resource CRUD
/api/activities/[id]/streams ← sub-resource
/api/planned-sessions/[id]/link    ← action on resource (not sub-resource)
/api/planned-sessions/[id]/analyze ← action on resource
```

Actions (verbs) are acceptable as path segments when the operation is not a standard CRUD action. Do not invent new resource nesting beyond two levels.

### 3.4 Component organization

Components live in `src/components/[domain]/`. A component belongs to the domain that uses it. If a component is used by more than two domains, it moves to `src/components/ui/`.

```
src/components/
  today/          ← Morning Experience + drill-downs (dashboard/, drill-down/, rich/)
  sleep/, recovery/, effort/, adaptation/
  training/, planning/, calendar/, coach/, coach-memory/
  corps/, goals/, settings/, analytics/, physical-health/
  ui/             ← reusable primitives (Button, Card, Skeleton, …)
  layout/         ← StickyHeader, Shell, Sidebar — structural chrome
  pwa/            ← install / offline / SW toasts
```

---

## 4. Domain Boundaries

SHARPIT has four domain boundaries. Code must not cross boundaries without going through the defined interface.

### Domain map

```
┌─────────────────────────────────────────────────────────┐
│  TRAINING                                               │
│  analytics · training-load · periodization · records    │
│  Core models: Activity, PerformanceRecord, PlanWeek     │
└───────────────────────────┬─────────────────────────────┘
                            │ produces: PMC, CTL/ATL/TSB, records
                            ▼
┌─────────────────────────────────────────────────────────┐
│  RECOVERY                                               │
│  recovery · sleep · physical-health                     │
│  Core models: DailyHealth, Condition                    │
└───────────────────────────┬─────────────────────────────┘
                            │ produces: readiness score, ACWR zone, sleep adequacy
                            ▼
┌─────────────────────────────────────────────────────────┐
│  COACHING                                               │
│  today · goals · sessions · plan-gate                   │
│  decision-memory (recommendation/action/outcome loop)   │
│  Core models: Goal, PlannedSession, AthleteProfile      │
└───────────────────────────┬─────────────────────────────┘
                            │ consumes: all above
                            ▼
┌─────────────────────────────────────────────────────────┐
│  AI                                                     │
│  coach-context · coach-tools · daily-briefing           │
│  Core model: Conversation, DailyBriefing, WeeklyReview  │
└─────────────────────────────────────────────────────────┘
```

**Rules:**

- TRAINING functions must not import from RECOVERY, COACHING, or AI.
- RECOVERY functions may import from TRAINING (e.g., ACWR needs activity load history).
- COACHING functions may import from TRAINING and RECOVERY.
- AI functions may import from all domains (they aggregate context for the LLM).
- SYNC (Garmin, Strava, Renpho) is infrastructure, not a domain. It writes to the database and must not contain business logic.

**`src/lib/plan-gate/`** — a deterministic validation layer between AI-generated `PlannedSession` proposals (coach/plan, coach/adapt) and persistence. It is COACHING-domain code, not a Core inference engine: every rule is a pure function reading already-computed `AthleteSnapshot`/`DecisionState` (see `docs/models/CORE_ARCHITECTURE.md`), never re-deriving physiological state. `evaluate-plan.ts` and `rules/*.ts` do no I/O; `build-context.ts` is the sole boundary that touches Prisma/the Snapshot service. See `docs/adr/ADR-005-plan-safety-gate-placement.md` for the placement decision.

**`src/lib/decision-memory/`** — the auditable loop linking a coach recommendation (LLM proposal + `GateSessionResult`) to what the athlete decided and what happened afterward. Three Prisma models: `CoachingDecision` (immutable proposal + gate result + a frozen `snapshotContext`, never a bare `snapshotId` reference — `AthleteSnapshotRecord` is upserted per day, so a reference would dangle), `CoachingDecisionAction` (append-only athlete-action log: ACCEPTED/MODIFIED/REJECTED/OVERRIDDEN), `CoachingDecisionOutcome` (retrospective evaluation, EVALUATED or INCONCLUSIVE, never a bare success/quality verdict). Session-execution states (SCHEDULED/COMPLETED/SKIPPED/SUPERSEDED) are derived on read from the existing `PlannedSession` fields, not stored in a fourth table. `evaluate-outcome.ts` is pure; `repository.ts` is the sole Prisma boundary. See `docs/adr/ADR-006-decision-memory-aggregate.md` for the placement and embed-vs-reference decisions.

**Presentation over `plan-gate`/`decision-memory`** — `src/lib/presentation/{session-rationale,weekly-coaching-brief,learning-feedback,snapshot-context-labels}.ts` and `src/lib/decision-memory/{describe-outcome,classify-trigger,learning-feedback}.ts` are read-only consumers: no new domain, no new tables, every builder pure (plain data in, ViewModel out), all I/O confined to the corresponding `src/app/api/presentation/*/route.ts`. See `docs/adr/ADR-007-coaching-explainability-presentation.md`.

### Domain input types

Each domain function defines its own minimal input interface. It does not accept Prisma model instances. This keeps domain functions decoupled from the ORM and independently testable.

```ts
// Good: domain-specific input type
export interface ActivityForAnalytics {
  date: Date;
  type: ActivityType;
  duration: number | null;
  load: number | null;
  bikeMetrics: { tss: number | null } | null;
}

// Bad: Prisma type in domain function signature
export function computePmcSeries(activities: Prisma.Activity[]) { ... }
```

---

## 5. Naming Conventions

### 5.1 Functions

| Pattern              | Convention              | Example                                |
| -------------------- | ----------------------- | -------------------------------------- |
| Domain computation   | `computeX(inputs)`      | `computePmcSeries(activities)`         |
| View construction    | `buildXView(data)`      | `buildReadinessView(entries, pmc)`     |
| Interpretation       | `xZone(value)`          | `acwrZone(acwr)`                       |
| Classification       | `xTone(value)`          | `feedbackTone(garminFeedback)`         |
| Estimation           | `estimateX(inputs)`     | `estimateFtp(activities)`              |
| Formatting           | `formatX(value)`        | `formatPace(secPerKm)`                 |
| Query (server)       | `getX(params?)`         | `getActivitiesList(params)`            |
| Query — full include | `getXWithY(id)`         | `getActivityWithMetrics(id)`           |
| Query — light select | `getXSummary(params?)`  | `getActivitiesSummary(params)`         |
| Route action         | `POST /api/x/[id]/verb` | `POST /api/planned-sessions/[id]/link` |

### 5.2 Types and interfaces

| Pattern                  | Convention                     | Example                                   |
| ------------------------ | ------------------------------ | ----------------------------------------- |
| Domain input             | `XForY`                        | `ActivityForAnalytics`                    |
| Client entity            | `ClientX`                      | `ClientActivity`, `ClientGoal`            |
| API payload (non-entity) | `XPayload`                     | `AthleteProfilePayload`, `RecordsPayload` |
| View model               | `XView`                        | `ReadinessView`, `FormView`               |
| Mutation variables       | `XPayload`                     | `GoalPayload`, `SessionPayload`           |
| Zod-inferred types       | `CreateXInput`, `UpdateXInput` | `CreateActivityInput`                     |

### 5.3 Files

| File            | Convention                                               |
| --------------- | -------------------------------------------------------- |
| Domain function | `kebab-case.ts` matching the main export concept         |
| React component | `kebab-case.tsx` matching the component name             |
| Hook            | `use-kebab-case.ts`                                      |
| Route handler   | `route.ts` (Next.js convention)                          |
| Validator       | `kebab-case.ts` inside `src/lib/validators/`             |
| Test            | `kebab-case.test.ts` co-located with the file under test |

### 5.4 Constants

Scientific constants must include a source comment. No magic numbers without attribution.

```ts
// Good
const RIEGEL_EXPONENT = 1.06; // Riegel (1979) + later refinements; 1.06 used by most modern predictors

// Bad
const RIEGEL_EXPONENT = 1.06;
```

### 5.5 Shared constants

Any string or number that appears in more than one file must be extracted to a named constant and imported. The `PROFILE_ID` string used for the singleton `AthleteProfile` is the canonical example of a violation of this rule.

---

## 6. React Conventions

### 6.1 The component contract

A component is responsible for **rendering only**. It receives data and emits events. It does not:

- Fetch data (use hooks for that)
- Compute derived values from raw query data (use hooks for that)
- Contain business logic (use domain functions for that)
- Call domain functions directly in render (call them inside hooks)

### 6.2 Page shells

Pages in `src/app/(app)/` are always thin shells. They pass no props and contain no logic:

```tsx
// Good — page shell
export default function GoalsPage() {
  return <GoalsView />;
}

// Bad — page with logic
export default function GoalsPage() {
  const { data } = useGoals();
  const sorted = data?.sort(...);
  return <div>{sorted?.map(...)}</div>;
}
```

### 6.3 Feature views

Feature view components (e.g., `GoalsView`, `AnalyticsView`) are the top-level client components for a page. They:

- Use custom hooks to get all necessary data
- Delegate rendering to smaller sub-components
- Are the only components that combine data from multiple hooks

**Maximum size: 150 lines.** If a view component exceeds this, a sub-component or hook extraction is mandatory.

### 6.4 The `useDomainState` pattern

When a view requires computation across multiple query results, extract a dedicated hook:

```tsx
// Bad — computation inside component
export function DashboardView() {
  const activitiesQuery = useActivities();
  const healthQuery = useHealthEntries();

  const pmc = useMemo(() => computePmcSeries(activitiesQuery.data ?? []), [activitiesQuery.data]);
  const alerts = useMemo(
    () => computeAlerts({ activities: activitiesQuery.data ?? [], health: healthQuery.data ?? [] }),
    [activitiesQuery.data, healthQuery.data],
  );

  return <div>{/* render */}</div>;
}

// Good — computation extracted to hook
function useDashboardState(date: Date) {
  const activitiesQuery = useActivities();
  const healthQuery = useHealthEntries();

  const pmc = useMemo(() => computePmcSeries(activitiesQuery.data ?? []), [activitiesQuery.data]);
  const alerts = useMemo(
    () => computeAlerts({ activities: activitiesQuery.data ?? [], health: healthQuery.data ?? [] }),
    [activitiesQuery.data, healthQuery.data],
  );

  return { pmc, alerts, activitiesQuery, healthQuery };
}

export function DashboardView() {
  const [date, setDate] = useState(() => new Date());
  const { pmc, alerts, activitiesQuery, healthQuery } = useDashboardState(date);
  return <div>{/* render only */}</div>;
}
```

### 6.5 Loading and error states

Every component that renders async data must handle loading and error states explicitly. Use `<Skeleton>` from `src/components/ui/skeleton` for loading. Do not render partial data.

### 6.6 'use client' boundary

Keep the `'use client'` boundary as deep as possible. Server components are preferred at the page level. A component needs `'use client'` only if it uses:

- React state (`useState`, `useReducer`)
- React effects (`useEffect`)
- TanStack Query hooks
- Browser APIs

---

## 7. State Management Rules

### 7.1 Two kinds of state

| Kind                                        | Tool           | Location             |
| ------------------------------------------- | -------------- | -------------------- |
| Server state (data from the API)            | TanStack Query | `src/hooks/use-*.ts` |
| Local UI state (open/closed, selected date) | `useState`     | Component            |

There is no global client state store (no Redux, no Zustand, no Jotai). Do not add one without an ADR justifying the decision.

### 7.2 Query keys

All query keys live in `src/lib/query/keys.ts`. Never write a query key inline.

```ts
// Good
useQuery({ queryKey: queryKeys.activities, queryFn: fetchActivities });

// Bad
useQuery({ queryKey: ['activities'], queryFn: fetchActivities });
```

### 7.3 staleTime policy

| Data category        | `staleTime`               | Rationale                                             |
| -------------------- | ------------------------- | ----------------------------------------------------- |
| Activity history     | `2 * 60 * 1000` (2 min)   | Shared by many views; mutations invalidate explicitly |
| Health / HRV entries | `2 * 60 * 1000` (2 min)   | Same as activity                                      |
| Goals                | `5 * 60 * 1000` (5 min)   | Infrequent changes                                    |
| Planned sessions     | `5 * 60 * 1000` (5 min)   | Infrequent changes                                    |
| Performance records  | `30 * 60 * 1000` (30 min) | Expensive to compute, rare change                     |
| Athlete profile      | `5 * 60 * 1000` (5 min)   | Rarely changes                                        |
| Activity streams     | `Infinity`                | Immutable historical data                             |
| Training plan        | `5 * 60 * 1000` (5 min)   | Infrequent changes                                    |

Every `useQuery` call must include a `staleTime`. Omitting it causes unnecessary refetches on every mount.

### 7.4 Mutations

Every mutation that modifies a list entity must use `listOptimistic()`:

```ts
// Good — uses listOptimistic
const createGoal = useMutation({
  mutationFn: (payload: GoalPayload) =>
    fetch('/api/goals', { method: 'POST', body: JSON.stringify(payload) }),
  ...listOptimistic({
    queryClient,
    queryKey: queryKeys.goals,
    apply: (prev, vars) => [optimisticGoal(vars), ...prev],
    success: 'Objectif créé',
  }),
});

// Bad — no optimistic update, user waits for network
const createGoal = useMutation({
  mutationFn: ...,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.goals }),
});
```

For mutations that do not fit the list pattern (e.g., updating a single entity), manually cancel queries, patch the cache, and rollback on error.

### 7.5 Mutation invalidation

`listOptimistic.onSettled` automatically invalidates the query. Do not add additional `invalidateQueries` calls unless the mutation affects a secondary query key (e.g., creating an activity should also invalidate `queryKeys.records`).

---

## 8. Data Modeling Principles

### 8.1 Schema is documentation

Every Prisma model field that carries physiological meaning must have a comment stating:

- The unit of measurement
- The valid range if constrained
- The source (Garmin field name, formula, etc.) if derived

```prisma
model AthleteProfile {
  ftpW                     Int?    // FTP vélo (W)
  maxHr                    Int?    // FC max (bpm)
  lthr                     Int?    // FC seuil lactique (bpm)
  runThresholdPaceSecPerKm Float?  // allure seuil (s/km)
}
```

### 8.2 Load units

`Activity.load` and `PlannedSession.load` represent **Training Stress Score (TSS) equivalents**. For all sports and all entry paths, load must be normalized to the same unit before being written to the database. Use `estimateActivityLoad()` from `src/lib/analytics.ts` as the normalizer.

If a load value cannot be expressed in TSS equivalents, it must not be stored in `load`. Use a sport-specific metrics field instead.

### 8.3 Never use Prisma types in domain functions

Domain function signatures must use the minimal input interfaces defined in the domain file, not Prisma types. This enforces the domain/infrastructure boundary and keeps domain functions independently testable.

### 8.4 JSON columns

JSON columns (`PlannedSession.analysis`, `BrickAnalysis.content`) are acceptable only when:

1. The content is always retrieved and rendered whole (never queried by field)
2. The schema evolves independently of the database migration cycle

Do not add JSON columns for structured data that will be filtered, sorted, or joined. That is relational data and belongs in proper columns.

### 8.5 Migrations

Every schema change requires a Prisma migration. Never modify the production schema without a migration file. Every migration must be reversible or include a comment explaining why reversal is not possible.

**Migration naming convention:** all migration directories must use the format `YYYYMMDDHHmmss_<description>` (e.g. `20260702110023_add_feature_set_table`). Do not use sequential integer names. The timestamp is generated automatically by `prisma migrate dev`.

### 8.6 Indexes

Every field used in a `WHERE` clause must have an index. Minimum requirements:

- `Activity`: indexes on `date` and `type` (already present)
- `DailyHealth`: index on `date`
- `PlannedSession`: index on `date` and `trainingPlanId`
- `PerformanceRecord`: index on `activityType`

---

## 9. Feature Creation Workflow

Follow this sequence for every new feature. Do not skip steps.

### Step 1 — Define the domain model change (if any)

Before writing code, answer:

- Does this feature require new database fields or models?
- If yes, write the Prisma schema change first and get it reviewed.
- Document the physiological meaning of every new field.

### Step 2 — Write the domain function

If the feature involves computation:

1. Create the function in the appropriate domain file under `src/core/` (or a pure helper under `src/lib/` when it is an app-facing projection).
2. Define a minimal input interface. Do not accept Prisma types.
3. Write the function as a pure, deterministic computation.
4. Add source comments for any scientific constants.
5. **Write tests before proceeding.** Domain functions with no tests will not be merged.

### Step 3 — Write the query function

If the feature reads from or writes to the database:

1. Add the query function to the appropriate file in `src/lib/data/server/`.
2. Use `Prisma.XSelect` with `satisfies` for typed light selects.
3. Add the corresponding migration if the schema changed.

### Step 4 — Write the route handler

1. Create `src/app/api/[resource]/route.ts`.
2. Structure: parse params → validate body with Zod → call query → return JSON.
3. Use the standard error shape: `{ error: string, details?: ZodFlattenedError }`.
4. Add the Zod schema to `src/lib/validators/` if not already present.

### Step 5 — Write the fetcher

1. Add the fetcher to `src/lib/query/fetchers.ts`.
2. Type the wire format with `Serialized<ClientX>`.
3. Re-hydrate all `Date` fields explicitly using `toDate()` / `toDateOrNull()`.
4. Export the client type in `src/lib/query/types.ts` if it is a new entity.

### Step 6 — Write the query key

Add the new key to `src/lib/query/keys.ts`. Never use inline key arrays.

### Step 7 — Write the hook

1. Add `useX()` and `useXMutation()` to the appropriate hook file in `src/hooks/`.
2. Include `staleTime` (see §7.3 policy table).
3. Use `listOptimistic()` for list mutations.

### Step 8 — Write the component

1. Create the component in `src/components/[domain]/`.
2. The component renders. It does not compute.
3. Extract a `useXState()` hook if aggregation across multiple queries is needed.

### Step 9 — Document

- If you introduced a new scientific constant or algorithm: document it in `docs/models/` and/or `knowledge/` (not a root SCIENCE.md).
- If you made a non-trivial architectural decision: create an ADR via `/ftn-adr`.
- If the README is now inaccurate: update it.

---

## 10. Code Review Checklist

Use this list on every pull request. A PR is not mergeable until all items are satisfied.

### Architecture

- [ ] No business logic in components (computation lives in hooks or domain functions)
- [ ] No direct `fetch()` calls in components or hooks (use fetchers)
- [ ] No Prisma types in domain function signatures
- [ ] No inline query keys (all keys in `src/lib/query/keys.ts`)
- [ ] No magic numbers without source comments
- [ ] Domain functions cross no domain boundaries (see §4)
- [ ] `'use client'` boundary is as deep as possible

### Data

- [ ] Every `useQuery` has an explicit `staleTime`
- [ ] Every list mutation uses `listOptimistic()` or an equivalent rollback pattern
- [ ] Every new schema field has a unit/meaning comment
- [ ] `Activity.load` and `PlannedSession.load` values are TSS equivalents
- [ ] Every new `Date` field is hydrated in the fetcher

### Quality

- [ ] New domain functions have unit tests
- [ ] Zod schema exists for every POST/PUT/PATCH body
- [ ] No `any` types without explicit justification comment
- [ ] No `as unknown as X` casts (use proper `Serialized<T>` hydration)
- [ ] Component size ≤ 150 lines (views), ≤ 80 lines (leaf components)

### Scientific integrity

- [ ] New physiological constants have source citations
- [ ] Changes to ACWR thresholds, TSB bands, or load factors require an ADR
- [ ] `estimateActivityLoad()` is the single normalizer for load values

---

## 11. Common Mistakes to Avoid

### M1 — Business logic in components

The most common and most damaging pattern. `computePmcSeries()`, `buildReadinessView()`, `computeAlerts()` belong in hooks, not in component render functions.

**Symptom:** a component file imports from `src/core/` (or pure `src/lib/` domain helpers) directly and calls domain functions inside `useMemo`.

**Fix:** extract a `useXState(params)` hook that owns all computation.

### M2 — Omitting `staleTime`

Without `staleTime`, TanStack Query refetches on every component mount and window focus. The dashboard mounts 8 query hooks. This means 8 network requests every time the user switches browser tabs.

**Fix:** every `useQuery` call must have `staleTime`.

### M3 — Writing query keys inline

```ts
// Wrong — duplicated, untracked, typo-prone
useQuery({ queryKey: ['activities'], ... })
queryClient.invalidateQueries({ queryKey: ['activites'] }) // silent typo
```

**Fix:** always use `queryKeys.*` from `src/lib/query/keys.ts`.

### M4 — Accepting Prisma types in domain functions

Domain functions that accept Prisma types cannot be tested without a database connection. They become untestable when the schema evolves.

**Fix:** define a minimal input interface in the domain file. The query function is responsible for selecting exactly the fields that interface requires.

### M5 — Adding a `Date` field without hydrating it

The `Serialized<T>` pattern is only as good as the hydration functions in `fetchers.ts`. If you add a new `Date` field to a model and forget to add it to the fetcher, the field silently arrives as a `string` in the client. TypeScript will not catch this because `Serialized<T>` transforms `Date` → `string`.

**Fix:** when adding a `Date` field to any model, update the corresponding fetcher on the same PR.

### M6 — Non-atomic multi-step writes

Any operation that writes to multiple tables must be wrapped in a `prisma.$transaction()`. A partial write is always worse than a failed write.

```ts
// Wrong — partial failure leaves orphaned data
await prisma.planned_session.create({ data: leg1 });
await prisma.planned_session.create({ data: leg2 }); // if this throws, leg1 is orphaned
```

**Fix:**

```ts
// Correct — atomic
await prisma.$transaction([
  prisma.planned_session.create({ data: leg1 }),
  prisma.planned_session.create({ data: leg2 }),
]);
```

### M7 — Unvalidated user input reaching domain functions or the AI prompt

Every value that enters the system from an HTTP request must pass through a Zod schema before it is used. The `AthleteProfile.context` field is a known violation: it is injected verbatim into the AI system prompt. Any free-text field that influences AI behavior must be length-capped and stripped of control characters before use.

### M8 — Skipping tests for domain functions

Domain functions are pure, deterministic, and require no mocks. They are the easiest things to test in the entire codebase. A domain function with no tests is unacceptable — a regression in `computePmcSeries` or `buildTrainingVerdict` silently produces wrong training recommendations.

**Minimum coverage required:** every function that implements a physiological model must have at least one test with known input/output derived from the scientific literature.

### M9 — Module-level mutable state

```ts
// Wrong — breaks in serverless; broken under any horizontal scale
let cachedContext: CoachContext | null = null;
let cachedAt = 0;

export function getCoachContext() {
  if (Date.now() - cachedAt < 30_000) return cachedContext;
  // ...
}
```

Next.js App Router on Vercel creates a new isolate per cold start. Module-level caches do not survive across requests. Use Vercel KV, Redis, or simply re-fetch — the fetch is fast.

### M10 — Duplicate type definitions

Client entity types are inferred from query function return types. They are never manually written. If you find yourself writing `interface Activity { id: string; date: Date; ... }` in a client file, stop — use `ClientActivity` from `src/lib/query/types.ts`.

---

## 12. Good vs Bad Implementations

### Example A — Domain function

**Bad:** Prisma type in signature, magic numbers, no source.

```ts
import { Activity } from '@prisma/client';

export function computeCtl(activities: Activity[]): number {
  let ctl = 0;
  for (const a of activities) {
    ctl = ctl + (a.load ?? 0) * (1 / 42) - ctl * (1 / 42);
  }
  return ctl;
}
```

**Good:** minimal input type, named constants with sources, pure computation.

```ts
// Source: Coggan (2003), TrainingPeaks PMC model. See knowledge/training-load.md and docs/models/TRAINING_STRESS_MODEL.md.
const CTL_TAU = 42;

export interface ActivityForPmc {
  date: Date;
  load: number | null;
}

export function computeCtl(activities: ActivityForPmc[]): number {
  const k = 1 / CTL_TAU;
  let ctl = 0;
  for (const a of activities) {
    ctl = ctl + (a.load ?? 0) * k - ctl * k;
  }
  return ctl;
}
```

---

### Example B — React component

**Bad:** queries, computation, and rendering all in one component.

```tsx
export function GoalsView() {
  const { data: goals } = useQuery({
    queryKey: ['goals'],
    queryFn: () => fetch('/api/goals').then((r) => r.json()),
  });
  const { data: activities } = useQuery({
    queryKey: ['activities'],
    queryFn: () => fetch('/api/activities').then((r) => r.json()),
  });

  const raceGoals = useMemo(
    () => goals?.filter((g) => g.kind === 'RACE').sort((a, b) => a.priority - b.priority),
    [goals],
  );
  const completionRate = useMemo(
    () => (goals ? goals.filter((g) => g.achieved).length / goals.length : 0),
    [goals],
  );

  return (
    <div>
      {raceGoals?.map((g) => (
        <GoalCard key={g.id} goal={g} />
      ))}
      <p>Completion: {completionRate}%</p>
    </div>
  );
}
```

**Good:** hook owns data and computation, component renders only.

```tsx
function useGoalsState() {
  const goalsQuery = useGoals();

  const raceGoals = useMemo(
    () =>
      (goalsQuery.data ?? [])
        .filter((g) => g.kind === 'RACE')
        .sort((a, b) => (a.priority ?? 'C').localeCompare(b.priority ?? 'C')),
    [goalsQuery.data],
  );

  const completionRate = useMemo(() => {
    const all = goalsQuery.data ?? [];
    return all.length === 0 ? 0 : all.filter((g) => g.achieved).length / all.length;
  }, [goalsQuery.data]);

  return { goalsQuery, raceGoals, completionRate };
}

export function GoalsView() {
  const { goalsQuery, raceGoals, completionRate } = useGoalsState();

  if (goalsQuery.isLoading) return <GoalsSkeleton />;

  return (
    <div>
      {raceGoals.map((g) => (
        <GoalCard key={g.id} goal={g} />
      ))}
      <p>Completion: {Math.round(completionRate * 100)}%</p>
    </div>
  );
}
```

---

### Example C — Route handler

**Bad:** no validation, catches nothing, wrong content-type handling.

```ts
export async function POST(request: Request) {
  const body = await request.json();
  const activity = await prisma.activity.create({ data: body });
  return new Response(JSON.stringify(activity));
}
```

**Good:** validate with Zod, structured error shapes, correct status codes.

```ts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createActivitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const activity = await createActivity(buildActivityCreateData(parsed.data));
    await updateRecordsForTypesSafe([parsed.data.type]);
    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Impossible de créer la séance' }, { status: 500 });
  }
}
```

---

### Example D — Serialization boundary

**Bad:** raw `fetch().json()` with no hydration, `any` type.

```ts
const data: any = await fetch('/api/goals').then((r) => r.json());
// data.targetDate is a string; code that calls .getTime() silently fails
```

**Good:** `Serialized<T>` on the wire, explicit hydration, no `any`.

```ts
export async function fetchGoals(): Promise<ClientGoal[]> {
  const data = await fetchJson<Serialized<ClientGoal>[]>('/api/goals');
  return data.map((g) => ({
    ...g,
    targetDate: toDateOrNull(g.targetDate),
    createdAt: toDate(g.createdAt),
    updatedAt: toDate(g.updatedAt),
  }));
}
```

---

### Example E — Mutation

**Bad:** no optimistic update, no rollback, no toast.

```ts
const deleteGoal = useMutation({
  mutationFn: (id: string) => fetch(`/api/goals/${id}`, { method: 'DELETE' }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.goals }),
});
```

**Good:** optimistic removal, rollback on failure, user feedback.

```ts
const deleteGoal = useMutation({
  mutationFn: (id: string) => fetch(`/api/goals/${id}`, { method: 'DELETE' }),
  ...listOptimistic({
    queryClient,
    queryKey: queryKeys.goals,
    apply: (prev, id) => prev.filter((g) => g.id !== id),
    success: 'Objectif supprimé',
    error: 'Impossible de supprimer cet objectif',
  }),
});
```

---

## Appendix — Known Violations in the Codebase

These are documented violations of this handbook that exist in the current code. They are tracked for remediation and must not be used as justification for adding new violations.

| File                                             | Violation                                                    | Section |
| ------------------------------------------------ | ------------------------------------------------------------ | ------- |
| `src/lib/queries/`                               | Still multi-domain; planned sessions extracted, rest pending | §3.2    |
| `src/hooks/use-data.ts`                          | Partially split (`use-planned-sessions.ts`); rest pending    | §3.2    |
| `src/lib/coach/coach-context.ts`                 | Module-level TTL cache — broken in serverless                | M9      |
| `src/lib/ai.ts` `COACH_MODEL`                    | Model identifier may not match an existing model             | —       |
| `prisma/schema.prisma` `AthleteProfile.context`  | Free-text field injected into AI prompt without validation   | M7      |
| `prisma/schema.prisma` `Activity.id = "default"` | Singleton pattern prevents multi-user migration              | §8.1    |

---

_Last updated: 2026-07-20. This document must be updated when architectural decisions change._
