# HikeTrip Dossier — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow athletes to multi-select HIKE activities from Training, name a `HikeTrip` dossier, and open a compiled trip page (totals + timeline), with a Settings list entry — phase 1 only.

**Architecture:** Dedicated `HikeTrip` model + `Activity.hikeTripId` (brick-like linking, not triathlon JSON). Pure `buildHikeTripSummary` for aggregates. REST under `/api/hike-trips`. Detail at `/training/trips/[id]`; list at `/settings/trips`. Core engines untouched.

**Tech Stack:** Prisma, Next.js App Router, Zod, Vitest, TanStack Query, Tailwind / existing instrument UI primitives.

**Spec:** [`docs/superpowers/specs/2026-08-08-hike-trip-dossier-design.md`](../specs/2026-08-08-hike-trip-dossier-design.md)

## Global Constraints

- Phase Stabilization — no new Core engines; no `SportType` changes.
- Phase 1 only — do **not** migrate `AthleteTravelContext` out of coach memory.
- Only `ActivityType.HIKE` may join a trip; create requires ≥2 activities; block remove that would leave 0 members.
- Aggregates computed on read — never persist totals on `HikeTrip`.
- Copy UI in French; Conventional Commits (imperative, lowercase subject).
- Instant UX: create = Blocking; rename/add/remove/delete = SAFE_WITH_ROLLBACK.
- Do not reintroduce a day-hike « Synthèse » panel on single activities.

## File map

| File                                                 | Responsibility                                              |
| ---------------------------------------------------- | ----------------------------------------------------------- |
| `prisma/schema.prisma`                               | `HikeTrip` + `Activity.hikeTripId`                          |
| `prisma/migrations/*_add_hike_trip/`                 | SQL migration                                               |
| `src/lib/activity/hike-trip-summary.ts`              | Pure aggregate view-model                                   |
| `src/lib/activity/hike-trip-summary.test.ts`         | Unit tests                                                  |
| `src/lib/validators/hike-trip.ts`                    | Zod create/patch schemas                                    |
| `src/lib/queries/hike-trips.ts`                      | Prisma CRUD + membership rules                              |
| `src/lib/queries/activity-include.ts`                | Include `hikeTripId` / light trip select on activity detail |
| `src/app/api/hike-trips/route.ts`                    | GET list + POST create                                      |
| `src/app/api/hike-trips/[id]/route.ts`               | GET / PATCH / DELETE                                        |
| `src/lib/query/keys.ts` + `fetchers.ts` + `types.ts` | Client query keys / types                                   |
| `src/hooks/use-hike-trips.ts`                        | React Query hooks + optimistic mutations                    |
| `src/app/(app)/training/trips/[id]/page.tsx`         | Server trip detail page                                     |
| `src/components/training/trip/*`                     | Hero, timeline, add/remove UI, create dialog                |
| `src/components/training/hub/training-list.tsx`      | Multi-select mode entry                                     |
| `src/components/training/activity/activity-list.tsx` | Selectable rows when in selection mode                      |
| `src/app/(app)/training/[id]/page.tsx`               | Chip « Voir le déplacement »                                |
| `src/app/(app)/settings/trips/page.tsx`              | Settings list                                               |
| `src/components/settings/settings-home.tsx`          | Hub entry Déplacements                                      |

---

### Task 1: Prisma `HikeTrip` + `hikeTripId`

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_hike_trip/migration.sql` (use `yarn prisma migrate dev --name add_hike_trip`)
- Test: `yarn db:generate`

**Interfaces:**

- Produces: `HikeTrip` model, `Activity.hikeTripId`, relation `activities`

- [ ] **Step 1: Add model and FK**

In `prisma/schema.prisma`, add model (near activity metrics):

```prisma
model HikeTrip {
  id         String     @id @default(cuid())
  name       String
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt
  activities Activity[]
}
```

On `model Activity`, add:

```prisma
  hikeTripId String?
  hikeTrip   HikeTrip? @relation(fields: [hikeTripId], references: [id], onDelete: SetNull)

  @@index([hikeTripId])
```

- [ ] **Step 2: Migrate**

Run: `yarn prisma migrate dev --name add_hike_trip`  
Expected: migration applied; client regenerated with `HikeTrip`.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add HikeTrip model and activity hikeTripId"
```

---

### Task 2: Pure `buildHikeTripSummary`

**Files:**

- Create: `src/lib/activity/hike-trip-summary.ts`
- Create: `src/lib/activity/hike-trip-summary.test.ts`
- Modify: `src/lib/activity/hike-overnight-summary.ts` (update V2 comment to point at this module)

**Interfaces:**

- Produces:

```ts
export type HikeTripMemberInput = {
  date: Date | string;
  duration: number | null;
  load: number | null;
  observedLocationLabel: string | null;
  hikeMetrics: {
    distanceM: number | null;
    elevationM: number | null;
    elevationLossM: number | null;
  } | null;
};

export type HikeTripSummary = {
  memberCount: number;
  startAt: Date;
  endAt: Date;
  durationSec: number | null;
  distanceM: number | null;
  elevationM: number | null;
  elevationLossM: number | null;
  load: number | null;
  locationLabels: string[];
};

export function buildHikeTripSummary(members: HikeTripMemberInput[]): HikeTripSummary;
```

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { buildHikeTripSummary } from './hike-trip-summary';

const a = {
  date: new Date('2026-08-01T08:00:00'),
  duration: 3600,
  load: 40,
  observedLocationLabel: 'Chamonix',
  hikeMetrics: { distanceM: 10000, elevationM: 800, elevationLossM: 700 },
};
const b = {
  date: new Date('2026-08-02T09:00:00'),
  duration: 7200,
  load: 55,
  observedLocationLabel: 'Chamonix',
  hikeMetrics: { distanceM: 15000, elevationM: 1200, elevationLossM: 1100 },
};

describe('buildHikeTripSummary', () => {
  it('sums additive metrics and builds date window', () => {
    const s = buildHikeTripSummary([a, b]);
    expect(s.memberCount).toBe(2);
    expect(s.distanceM).toBe(25000);
    expect(s.elevationM).toBe(2000);
    expect(s.elevationLossM).toBe(1800);
    expect(s.durationSec).toBe(10800);
    expect(s.load).toBe(95);
    expect(s.startAt.getTime()).toBe(a.date.getTime());
    expect(s.endAt.getTime()).toBe(new Date('2026-08-02T11:00:00').getTime());
    expect(s.locationLabels).toEqual(['Chamonix']);
  });

  it('omits null-only aggregates', () => {
    const s = buildHikeTripSummary([
      { ...a, duration: null, load: null, hikeMetrics: null },
      { ...b, duration: null, load: null, hikeMetrics: null },
    ]);
    expect(s.durationSec).toBeNull();
    expect(s.distanceM).toBeNull();
    expect(s.load).toBeNull();
  });

  it('keeps distinct locations in chronological order', () => {
    const s = buildHikeTripSummary([a, { ...b, observedLocationLabel: 'Argentière' }]);
    expect(s.locationLabels).toEqual(['Chamonix', 'Argentière']);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `yarn test src/lib/activity/hike-trip-summary.test.ts`  
Expected: FAIL (module missing).

- [ ] **Step 3: Implement**

```ts
function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function sumNullable(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0);
}

export function buildHikeTripSummary(members: HikeTripMemberInput[]): HikeTripSummary {
  if (members.length === 0) {
    const now = new Date();
    return {
      memberCount: 0,
      startAt: now,
      endAt: now,
      durationSec: null,
      distanceM: null,
      elevationM: null,
      elevationLossM: null,
      load: null,
      locationLabels: [],
    };
  }

  const ordered = [...members].sort((x, y) => asDate(x.date).getTime() - asDate(y.date).getTime());

  const startAt = asDate(ordered[0].date);
  let endAt = startAt;
  for (const m of ordered) {
    const start = asDate(m.date);
    const end =
      m.duration != null && m.duration > 0 ? new Date(start.getTime() + m.duration * 1000) : start;
    if (end.getTime() > endAt.getTime()) endAt = end;
  }

  const locationLabels: string[] = [];
  for (const m of ordered) {
    const label = m.observedLocationLabel?.trim();
    if (label && !locationLabels.includes(label)) locationLabels.push(label);
  }

  return {
    memberCount: ordered.length,
    startAt,
    endAt,
    durationSec: sumNullable(ordered.map((m) => m.duration)),
    distanceM: sumNullable(ordered.map((m) => m.hikeMetrics?.distanceM ?? null)),
    elevationM: sumNullable(ordered.map((m) => m.hikeMetrics?.elevationM ?? null)),
    elevationLossM: sumNullable(ordered.map((m) => m.hikeMetrics?.elevationLossM ?? null)),
    load: sumNullable(ordered.map((m) => m.load)),
    locationLabels,
  };
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `yarn test src/lib/activity/hike-trip-summary.test.ts`

- [ ] **Step 5: Point overnight comment at this module**

Replace top comment in `hike-overnight-summary.ts` with:

```ts
// Single-session overnight/day window. Multi-session: `buildHikeTripSummary`.
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/activity/hike-trip-summary.ts src/lib/activity/hike-trip-summary.test.ts src/lib/activity/hike-overnight-summary.ts
git commit -m "feat: add hike trip summary view model"
```

---

### Task 3: Validators + query queries

**Files:**

- Create: `src/lib/validators/hike-trip.ts`
- Create: `src/lib/validators/hike-trip.test.ts`
- Create: `src/lib/queries/hike-trips.ts`
- Create: `src/lib/queries/hike-trips.test.ts` (unit-test pure error helpers if DB-heavy; otherwise route tests in Task 4)
- Modify: `src/lib/queries/index.ts` (re-export)
- Modify: `src/lib/queries/activity-include.ts` — add `hikeTripId: true` to `activityInclude` and `activityListSelect`

**Interfaces:**

- Produces:

```ts
// validators
createHikeTripSchema // { name: string.min(1), activityIds: string[].min(2) }
patchHikeTripSchema  // { name?: string.min(1), addActivityIds?: string[], removeActivityIds?: string[] }

// queries
createHikeTrip(input: { name: string; activityIds: string[] }): Promise<HikeTripWithActivities>
getHikeTripById(id: string): Promise<HikeTripWithActivities | null>
listHikeTrips(): Promise<HikeTripListItem[]>
updateHikeTrip(id: string, patch: {...}): Promise<HikeTripWithActivities>
deleteHikeTrip(id: string): Promise<void>
```

Membership errors: throw typed errors or return Result — prefer thrown `HikeTripConflictError` / `HikeTripValidationError` caught in routes.

- [ ] **Step 1: Zod schemas + tests**

```ts
import { z } from 'zod';

export const createHikeTripSchema = z.object({
  name: z.string().trim().min(1, 'Nom requis'),
  activityIds: z.array(z.string().min(1)).min(2, 'Au moins deux randonnées'),
});

export const patchHikeTripSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    addActivityIds: z.array(z.string().min(1)).optional(),
    removeActivityIds: z.array(z.string().min(1)).optional(),
  })
  .refine(
    (v) =>
      v.name != null ||
      (v.addActivityIds?.length ?? 0) > 0 ||
      (v.removeActivityIds?.length ?? 0) > 0,
    { message: 'Aucune modification' },
  );
```

Test invalid create (1 id, empty name) and valid create.

- [ ] **Step 2: Implement `hike-trips.ts` queries**

Logic for `createHikeTrip`:

1. Load activities by ids.
2. If count mismatch → validation error.
3. If any `type !== HIKE` → validation error.
4. If any `hikeTripId != null` → conflict (include other trip name if loaded).
5. Create trip + `updateMany` set `hikeTripId`.
6. Return trip with activities ordered by `date asc`, include `hikeMetrics` + location fields.

Logic for `updateHikeTrip` remove: after planned removes, remaining count must be ≥ 1.

Logic for `deleteHikeTrip`: `updateMany` unlink then `delete`.

Include shape for members:

```ts
const hikeTripActivitySelect = {
  id: true,
  type: true,
  date: true,
  title: true,
  duration: true,
  load: true,
  observedLocationLabel: true,
  hikeMetrics: {
    select: { distanceM: true, elevationM: true, elevationLossM: true },
  },
} satisfies Prisma.ActivitySelect;
```

- [ ] **Step 3: Wire includes**

Add to `activityInclude` and `activityListSelect`:

```ts
hikeTripId: true,
```

Optionally on detail include only:

```ts
hikeTrip: { select: { id: true, name: true } },
```

in `activityInclude` (needed for Task 7 chip).

- [ ] **Step 4: Run validator tests**

Run: `yarn test src/lib/validators/hike-trip.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/validators/hike-trip.ts src/lib/validators/hike-trip.test.ts src/lib/queries/hike-trips.ts src/lib/queries/index.ts src/lib/queries/activity-include.ts
git commit -m "feat: add hike trip validators and queries"
```

---

### Task 4: API routes

**Files:**

- Create: `src/app/api/hike-trips/route.ts`
- Create: `src/app/api/hike-trips/[id]/route.ts`
- Create: `src/app/api/hike-trips/route.test.ts` (and/or `[id]/route.test.ts`) following existing API test patterns (mock queries)

**Interfaces:**

- Consumes: validators + queries from Task 3
- Produces: JSON trip payloads; 400 / 404 / 409 / 500

- [ ] **Step 1: Implement collection route**

`GET` → `listHikeTrips()` + attach `buildHikeTripSummary` per item (or compute inside list query).  
`POST` → parse `createHikeTripSchema` → `createHikeTrip` → 201.

Map conflict → 409 `{ error, tripId?, tripName? }`.  
Map validation → 400.

- [ ] **Step 2: Implement item route**

`GET` → 404 if null.  
`PATCH` → `patchHikeTripSchema` + `updateHikeTrip`.  
`DELETE` → `deleteHikeTrip` → 204.

- [ ] **Step 3: Tests for 400 / 409 / 201 happy path** (mock prisma/queries)

- [ ] **Step 4: Commit**

```bash
git add src/app/api/hike-trips
git commit -m "feat: add hike trips API routes"
```

---

### Task 5: Client hooks + query keys

**Files:**

- Modify: `src/lib/query/keys.ts` — add `hikeTrips`, `hikeTrip: (id: string) => ...`
- Modify: `src/lib/query/fetchers.ts` — `fetchHikeTrips`, `fetchHikeTrip(id)`
- Modify: `src/lib/query/types.ts` — client trip types
- Create: `src/hooks/use-hike-trips.ts`
- Modify: `src/hooks/use-data.ts` — re-export if that is the project pattern

**Interfaces:**

- Produces: `useHikeTrips()`, `useHikeTrip(id)`, `useHikeTripMutations()` with `create`, `patch`, `remove`

- [ ] **Step 1: Keys + fetchers + types** mirroring planned-sessions / activities patterns (`jsonFetch`, same base URL style).

- [ ] **Step 2: Mutations**

- `create`: Blocking — no optimistic list required; onSuccess invalidate `hikeTrips` and return created trip for redirect.
- `patch` / `remove`: cancel queries, optimistic update `hikeTrip(id)` + `hikeTrips`, rollback on error, invalidate `queryKeys.activities` when membership changes (list chips / detail link).

- [ ] **Step 3: Commit**

```bash
git add src/lib/query/keys.ts src/lib/query/fetchers.ts src/lib/query/types.ts src/hooks/use-hike-trips.ts src/hooks/use-data.ts
git commit -m "feat: add hike trip react-query hooks"
```

---

### Task 6: Trip detail page UI

**Files:**

- Create: `src/app/(app)/training/trips/[id]/page.tsx`
- Create: `src/components/training/trip/hike-trip-hero.tsx`
- Create: `src/components/training/trip/hike-trip-timeline.tsx`
- Create: `src/components/training/trip/hike-trip-actions.tsx` (rename / delete / add sheet)
- Create: `src/components/training/trip/hike-trip-hero.test.ts` (renderToStaticMarkup)

**Interfaces:**

- Consumes: `getHikeTripById`, `buildHikeTripSummary`
- Produces: server page + client islands for mutations

- [ ] **Step 1: Server page**

```tsx
// load trip; notFound if missing
// MobileBackLink
// header with name + date range (formatDate start–end)
// <HikeTripHero summary={...} />
// <HikeTripTimeline members={...} />
// client actions island with trip id
```

Hero uses existing `InstrumentMetricGrid` (same as activity hero stats) with slots: Durée, Distance, D+, D−, Charge — omit nulls.

Timeline: chronological list; each row is a `Link` to `/training/[id]` with date, title fallback « Randonnée », metric chips.

- [ ] **Step 2: Add/remove UI**

- Remove: per-row control confirming unlink (disabled if only 1 member left — show tooltip « Ajoute une étape ou supprime le déplacement »).
- Add: sheet listing HIKE activities where `hikeTripId == null` (fetch via `GET /api/activities?type=HIKE` filtered client-side, or dedicated query param later — YAGNI: client filter).

- [ ] **Step 3: Component test**

Assert hero markup contains aggregated distance label and timeline contains member title.

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/training/trips src/components/training/trip
git commit -m "feat: add hike trip detail page"
```

---

### Task 7: Training multi-select + create dialog

**Files:**

- Modify: `src/components/training/hub/training-list.tsx`
- Modify: `src/components/training/activity/activity-list.tsx`
- Create: `src/components/training/trip/create-hike-trip-dialog.tsx`

**Interfaces:**

- Consumes: `useHikeTripMutations().create`
- Produces: selection mode → dialog name → `router.push(/training/trips/${id})`

- [ ] **Step 1: Selection mode state in `TrainingList`**

- Toggle button « Lier des randonnées » (only useful when ≥1 HIKE visible; still show always for discoverability or hide when filter excludes HIKE — prefer show when any HIKE in current filtered list).
- Pass `selectionMode`, `selectedIds`, `onToggle` into `ActivityList`.

- [ ] **Step 2: Selectable rows**

In `ActivityList` chip/panel rows:

- If `selectionMode` and `activity.type === HIKE`: show checkbox; click toggles selection (do not navigate).
- If `selectionMode` and type ≠ HIKE: row visible, `opacity-50`, not selectable, still no navigation (or allow navigate — prefer **no navigate in selection mode** for all rows to avoid accidents).

- [ ] **Step 3: Action bar**

When `selectedIds.length >= 2`, sticky/footer bar: « Créer un déplacement (N) » opens dialog.

Dialog: controlled input name, Confirm disabled if trim empty; on submit call create mutation; on success `router.push(`/training/trips/${trip.id}`)`.

- [ ] **Step 4: Manual smoke**

Run app, select 2 HIKE, create, land on trip page with correct totals.

- [ ] **Step 5: Commit**

```bash
git add src/components/training/hub/training-list.tsx src/components/training/activity/activity-list.tsx src/components/training/trip/create-hike-trip-dialog.tsx
git commit -m "feat: create hike trip from training multi-select"
```

---

### Task 8: Activity detail link + Settings list

**Files:**

- Modify: `src/app/(app)/training/[id]/page.tsx`
- Create: `src/components/training/trip/hike-trip-member-link.tsx` (optional thin component)
- Create: `src/app/(app)/settings/trips/page.tsx`
- Create: `src/components/settings/hike-trips-list.tsx` (client list using `useHikeTrips`)
- Modify: `src/components/settings/settings-home.tsx` — add Déplacements entry

**Interfaces:**

- Consumes: `activity.hikeTrip` from include; list API

- [ ] **Step 1: Member link on HIKE detail**

If `activity.hikeTrip`, render under meta/header:

```tsx
<Link href={`/training/trips/${activity.hikeTrip.id}`} className="text-label ...">
  Voir le déplacement · {activity.hikeTrip.name}
</Link>
```

Only for `ActivityType.HIKE`.

- [ ] **Step 2: Settings page**

Server or client page with `InkEmptyState` when empty; else list rows → Link to `/training/trips/[id]` showing name, date range, memberCount, short totals from summary.

- [ ] **Step 3: Settings hub entry**

In group `coach-context` (or `athlete` — prefer **athlete** next to goals, since Déplacements is life/sport archive not only coach):

```ts
{
  href: '/settings/trips',
  title: 'Déplacements',
  description: 'Dossiers de randonnées liées (historique).',
  icon: MapPinned, // or Mountain from lucide
  statusKey: /* use a static 'ok' path — if statusKey required, add optional key or reuse a benign one */,
}
```

If `statusKey` is strictly typed and has no trips key, either extend `SettingsHubStatus` with a no-op `trips: 'ready'` or place entry without status badge — **follow existing hub patterns**; simplest: add `trips` optional status always ready.

Do **not** remove Mémoire du coach.

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/training/[id]/page.tsx src/app/(app)/settings/trips src/components/settings src/components/training/trip
git commit -m "feat: add hike trip settings list and activity deep link"
```

---

### Task 9: Spec/plan polish + manual QA checklist

**Files:**

- Modify (optional): `docs/superpowers/specs/2026-08-06-hike-activity-nuitee-design.md` §4 — one-line pointer to new spec as implemented phase 1

- [ ] **Step 1: Manual QA**

- [ ] Create trip from 2+ HIKE → lands on fiche with correct sums
- [ ] Add / remove member; cannot remove last
- [ ] Delete trip → activities remain, link gone
- [ ] 409 when selecting an already-linked HIKE (if UI still offers it — picker must exclude linked)
- [ ] Settings list + empty state
- [ ] Day HIKE detail has **no** Synthèse panel; overnight still has Nuitée

- [ ] **Step 2: Run focused tests**

```bash
yarn test src/lib/activity/hike-trip-summary.test.ts src/lib/validators/hike-trip.test.ts src/app/api/hike-trips
```

- [ ] **Step 3: Final commit if docs touched**

```bash
git add docs/superpowers/specs/2026-08-06-hike-activity-nuitee-design.md
git commit -m "docs: point hike nuitee V2 sketch to HikeTrip spec"
```

---

## Spec coverage check

| Spec requirement                               | Task                   |
| ---------------------------------------------- | ---------------------- |
| `HikeTrip` + `hikeTripId`                      | 1                      |
| `buildHikeTripSummary`                         | 2                      |
| API CRUD + 409 / min 2 / HIKE only             | 3–4                    |
| Instant UX hooks                               | 5                      |
| `/training/trips/[id]` hero + timeline         | 6                      |
| Multi-select Training + name dialog + redirect | 7                      |
| Add/remove on fiche                            | 6                      |
| Activity deep link                             | 8                      |
| `/settings/trips` + Settings hub               | 8                      |
| Phase 2 travel migration                       | Explicitly out of plan |
| No day Synthèse regression                     | 9 QA                   |

## Out of scope (do not implement in this plan)

- Migrating travel contexts out of coach memory
- Auto-suggest grouping
- Coach narrative on trips
- Compiled multi-track map
- Linking non-HIKE activities
