# HIKE Activity + Nuitée Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduire `ActivityType.HIKE` avec métriques, import Garmin, page détail randonnée (hero + carte) et bloc Nuitée/Synthèse, en laissant des extension points pour un futur dossier multi-séances.

**Architecture:** Même pattern que RUN/BIKE/SWIM — enum Prisma + `HikeMetrics`, mapping Garmin, includes/validators, identité sport, hero/specs, helper pur `buildHikeOvernightSummary`, branche UI sur `/training/[id]`. Core `SportType` reste gelé : HIKE se projette en `OTHER` côté observation.

**Tech Stack:** Prisma, Next.js App Router, Vitest, TanStack Query (streams existants), Tailwind v4 tokens sport-identity.

**Spec:** [`docs/superpowers/specs/2026-08-06-hike-activity-nuitee-design.md`](../specs/2026-08-06-hike-activity-nuitee-design.md)

## Global Constraints

- Phase Stabilization — ne pas ajouter de moteur Core ; ne pas étendre `SportType` core.
- Pas de backfill OTHER→HIKE, pas de narrative coach HIKE, pas de UI dossier V2.
- Métriques HIKE additives (distance, D+, durée, calories) pour agrégation V2 future.
- Helper Nuitée pur (zéro I/O), nommé pour une séance — pas « trip » / « déplacement ».
- Tout `Record<ActivityType, …>` / `switch` exhaustif doit inclure `HIKE`.
- Commits Conventional Commits (impératif, minuscule).
- Répondre / copy UI en français.

## File map

| File | Responsibility |
|------|----------------|
| `prisma/schema.prisma` | enum `HIKE` + model `HikeMetrics` + relation |
| `prisma/migrations/*_add_hike_activity/` | migration SQL |
| `src/lib/integrations/garmin-activities.ts` | map + create/enrich hikeMetrics |
| `src/lib/integrations/garmin-activities.test.ts` | tests mapping |
| `src/lib/activity/hike-overnight-summary.ts` | view model pur Nuitée |
| `src/lib/activity/hike-overnight-summary.test.ts` | tests day/overnight/endPoint |
| `src/lib/format.ts` | label `Randonnée` |
| `src/lib/activity/sport-identity.ts` | chroma terre/ambre HIKE |
| `src/lib/activity/activity-detail-skeleton-layout.ts` | HIKE → `map` |
| `src/lib/activity/activity-list-summary.ts` | métrique liste (distance) |
| `src/lib/queries/activity-include.ts` | include + list select hikeMetrics |
| `src/lib/validators/activity.ts` | hikeMetricsSchema + create include |
| `src/lib/analytics.ts` | LOAD_FACTOR / volumes / CHART_COLORS |
| `src/lib/planned-session/planning.ts` | PLANNED_LOAD_FACTOR |
| `src/components/activity/activity-type-indicator.tsx` | code `RA` |
| `src/components/training/hub/history-filters/*` | TYPE_ORDER + icône |
| `src/components/training/activity/activity-hero-stats.tsx` | slots HIKE |
| `src/components/training/activity/detail/*` | helpers, hero, overnight panel, page |
| `src/app/(app)/training/[id]/page.tsx` | brancher le bloc |
| Divers switches | `default` → OTHER ou cas HIKE explicite |

---

### Task 1: Schema Prisma `HIKE` + `HikeMetrics`

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260806_add_hike_activity/migration.sql` (timestamp may vary — use `prisma migrate dev` name if preferred)
- Test: `yarn db:generate` + `yarn typecheck` (partial OK until Task 4)

**Interfaces:**
- Produces: `ActivityType.HIKE`, `Prisma.HikeMetrics*`, `activity.hikeMetrics`

- [ ] **Step 1: Add enum value and model**

In `prisma/schema.prisma`, extend enum:

```prisma
enum ActivityType {
  RUN
  BIKE
  SWIM
  STRENGTH
  TRIATHLON
  HIKE
  OTHER
}
```

Add model (place after `SwimMetrics`):

```prisma
model HikeMetrics {
  id         String   @id @default(cuid())
  activityId String   @unique
  activity   Activity @relation(fields: [activityId], references: [id], onDelete: Cascade)

  distanceM      Float?
  elevationM     Float? // D+
  elevationLossM Float? // D−
  avgHr          Int?
  calories       Int?
  avgSpeedMps    Float?
}
```

On `model Activity`, add:

```prisma
  hikeMetrics    HikeMetrics?
```

(next to `swimMetrics` / `runMetrics`).

- [ ] **Step 2: Create migration SQL**

```sql
-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'HIKE';

-- CreateTable
CREATE TABLE "HikeMetrics" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "distanceM" DOUBLE PRECISION,
    "elevationM" DOUBLE PRECISION,
    "elevationLossM" DOUBLE PRECISION,
    "avgHr" INTEGER,
    "calories" INTEGER,
    "avgSpeedMps" DOUBLE PRECISION,

    CONSTRAINT "HikeMetrics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HikeMetrics_activityId_key" ON "HikeMetrics"("activityId");

ALTER TABLE "HikeMetrics" ADD CONSTRAINT "HikeMetrics_activityId_fkey"
  FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

Note: on PostgreSQL, `ADD VALUE` to enum cannot run in the same transaction as some uses — if migrate fails, split into two migrations (enum first, then table). Follow existing project pattern.

- [ ] **Step 3: Generate client**

Run: `yarn db:generate`  
Expected: Prisma client regenerates with `HIKE` and `HikeMetrics`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add HIKE activity type and HikeMetrics schema"
```

---

### Task 2: Garmin mapping → `HIKE` + métriques

**Files:**
- Modify: `src/lib/integrations/garmin-activities.ts`
- Modify: `src/lib/integrations/garmin-activities.test.ts`
- Test: `yarn test src/lib/integrations/garmin-activities.test.ts`

**Interfaces:**
- Consumes: `ActivityType.HIKE`, `HikeMetrics` create shape
- Produces: `mapGarminType('hiking'|'walking'|'mountaineering') === HIKE`; `buildGarminActivityData` crée `hikeMetrics`

- [ ] **Step 1: Write failing tests**

Append to `garmin-activities.test.ts`:

```ts
  it.each([
    ['hiking', ActivityType.HIKE],
    ['walking', ActivityType.HIKE],
    ['mountaineering', ActivityType.HIKE],
    ['hike', ActivityType.HIKE],
  ])('%s -> HIKE', (typeKey, expected) => {
    expect(mapGarminType(typeKey)).toBe(expected);
  });

  it('keeps trail_running as RUN', () => {
    expect(mapGarminType('trail_running')).toBe(ActivityType.RUN);
  });
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `yarn test src/lib/integrations/garmin-activities.test.ts`  
Expected: FAIL — hiking → OTHER (actuel).

- [ ] **Step 3: Implement `mapGarminType`**

In `mapGarminType`, **before** the final `return ActivityType.OTHER`, add (and ensure run branch does not catch `hike` via `includes('run')` — `trail_running` already handled; `hiking` does not include `run`):

```ts
  if (
    k === 'hiking' ||
    k === 'walking' ||
    k === 'mountaineering' ||
    k === 'hike' ||
    (k.includes('hike') && !k.includes('run')) ||
    k.includes('mountaineering')
  ) {
    return ActivityType.HIKE;
  }
```

Place this **after** the RUN block so `trail_running` stays RUN.

- [ ] **Step 4: Create hikeMetrics in `buildGarminActivityData`**

In the `switch (type)`, add:

```ts
    case ActivityType.HIKE: {
      const elevationLoss =
        typeof (activity as { elevationLoss?: number }).elevationLoss === 'number' &&
        (activity as { elevationLoss?: number }).elevationLoss! > 0
          ? (activity as { elevationLoss: number }).elevationLoss
          : null;
      base.hikeMetrics = {
        create: {
          distanceM: activity.distance > 0 ? activity.distance : null,
          elevationM: activity.elevationGain > 0 ? activity.elevationGain : null,
          elevationLossM: elevationLoss,
          avgHr: activity.averageHR ? Math.round(activity.averageHR) : null,
          calories: activity.calories > 0 ? Math.round(activity.calories) : null,
          avgSpeedMps:
            activity.averageSpeed && activity.averageSpeed > 0 ? activity.averageSpeed : null,
        },
      };
      break;
    }
```

Also update `garminEnrichmentUpdate` with a HIKE upsert analogous to RUN (create/update distance, elevation, avgHr). Remove HIKE from any early-return that only handles TRIATHLON/OTHER without metrics — currently:

```ts
  if (type === ActivityType.TRIATHLON || type === ActivityType.OTHER) {
    return data;
  }
```

Keep that as-is (HIKE gets its own block **before** that return).

- [ ] **Step 5: Run tests — expect PASS**

Run: `yarn test src/lib/integrations/garmin-activities.test.ts`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/integrations/garmin-activities.ts src/lib/integrations/garmin-activities.test.ts
git commit -m "feat: map garmin hiking activities to HIKE metrics"
```

---

### Task 3: Helper pur `buildHikeOvernightSummary`

**Files:**
- Create: `src/lib/activity/hike-overnight-summary.ts`
- Create: `src/lib/activity/hike-overnight-summary.test.ts`
- Test: `yarn test src/lib/activity/hike-overnight-summary.test.ts`

**Interfaces:**
- Produces:

```ts
export type HikeOvernightSummary = {
  variant: 'overnight' | 'day';
  startAt: Date;
  endAt: Date;
  durationSec: number | null;
  locationLabel: string | null;
  weather: string | null;
  load: number | null;
  distanceM: number | null;
  elevationM: number | null;
  elevationLossM: number | null;
  endPoint: { lat: number; lng: number } | null;
  endLocationFallback: string | null;
};

export type HikeOvernightInput = {
  date: Date | string;
  duration: number | null;
  weather: string | null;
  load: number | null;
  observedLocationLabel: string | null;
  hikeMetrics: {
    distanceM: number | null;
    elevationM: number | null;
    elevationLossM: number | null;
  } | null;
};

export function buildHikeOvernightSummary(
  activity: HikeOvernightInput,
  opts?: {
    path?: [number, number][] | null; // [lng, lat] MapLibre order OR [lat,lng] — document and match ActivityStreamPayload.path
    streamElevationLossM?: number | null;
  },
): HikeOvernightSummary;
```

**Important:** Inspect `ActivityStreamPayload.path` usage in `route-map` — use the **same** coordinate order when taking the last point. If path is `[lng, lat][]`, map to `{ lat: last[1], lng: last[0] }`.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { buildHikeOvernightSummary } from './hike-overnight-summary';

const base = {
  date: new Date('2026-08-06T09:00:00'),
  duration: 3600,
  weather: 'Clear',
  load: 42,
  observedLocationLabel: 'Chamonix',
  hikeMetrics: { distanceM: 12000, elevationM: 800, elevationLossM: 750 },
};

describe('buildHikeOvernightSummary', () => {
  it('marks day variant under 8h without midnight crossing', () => {
    const s = buildHikeOvernightSummary(base);
    expect(s.variant).toBe('day');
    expect(s.endAt.getTime()).toBe(new Date('2026-08-06T10:00:00').getTime());
  });

  it('marks overnight when duration >= 8h', () => {
    const s = buildHikeOvernightSummary({ ...base, duration: 8 * 3600 });
    expect(s.variant).toBe('overnight');
  });

  it('marks overnight when window crosses local midnight', () => {
    const s = buildHikeOvernightSummary({
      ...base,
      date: new Date('2026-08-06T22:00:00'),
      duration: 3 * 3600,
    });
    expect(s.variant).toBe('overnight');
  });

  it('takes endPoint from last path coordinate', () => {
    // Adjust expected lat/lng to match real path order in codebase
    const s = buildHikeOvernightSummary(base, {
      path: [
        [6.86, 45.92],
        [6.87, 45.93],
      ],
    });
    expect(s.endPoint).toEqual({ lng: 6.87, lat: 45.93 });
  });

  it('falls back elevationLoss to stream when metrics null', () => {
    const s = buildHikeOvernightSummary(
      { ...base, hikeMetrics: { distanceM: 1, elevationM: 1, elevationLossM: null } },
      { streamElevationLossM: 400 },
    );
    expect(s.elevationLossM).toBe(400);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `yarn test src/lib/activity/hike-overnight-summary.test.ts`  
Expected: FAIL module not found.

- [ ] **Step 3: Implement helper**

```ts
const OVERNIGHT_DURATION_SEC = 8 * 3600;

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function crossesLocalMidnight(start: Date, end: Date): boolean {
  return (
    start.getFullYear() !== end.getFullYear() ||
    start.getMonth() !== end.getMonth() ||
    start.getDate() !== end.getDate()
  );
}

export function buildHikeOvernightSummary(
  activity: HikeOvernightInput,
  opts?: {
    path?: [number, number][] | null;
    streamElevationLossM?: number | null;
  },
): HikeOvernightSummary {
  const startAt = asDate(activity.date);
  const durationSec = activity.duration != null && activity.duration > 0 ? activity.duration : null;
  const endAt =
    durationSec != null ? new Date(startAt.getTime() + durationSec * 1000) : new Date(startAt);

  const variant: 'overnight' | 'day' =
    (durationSec != null && durationSec >= OVERNIGHT_DURATION_SEC) ||
    (durationSec != null && crossesLocalMidnight(startAt, endAt))
      ? 'overnight'
      : 'day';

  const path = opts?.path;
  const last = path && path.length > 0 ? path[path.length - 1] : null;
  // path is [lng, lat] — confirm against route-map before shipping
  const endPoint = last ? { lng: last[0], lat: last[1] } : null;

  const metrics = activity.hikeMetrics;
  return {
    variant,
    startAt,
    endAt,
    durationSec,
    locationLabel: activity.observedLocationLabel,
    weather: activity.weather,
    load: activity.load,
    distanceM: metrics?.distanceM ?? null,
    elevationM: metrics?.elevationM ?? null,
    elevationLossM: metrics?.elevationLossM ?? opts?.streamElevationLossM ?? null,
    endPoint,
    endLocationFallback: activity.observedLocationLabel,
  };
}
```

Comment at top of file: *V2: compose via `buildHikeTripSummary(activities[])` — keep this single-session.*

- [ ] **Step 4: Run — expect PASS**

Run: `yarn test src/lib/activity/hike-overnight-summary.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/activity/hike-overnight-summary.ts src/lib/activity/hike-overnight-summary.test.ts
git commit -m "feat: add hike overnight summary view model"
```

---

### Task 4: Exhaustivité `ActivityType` (app layer)

**Files (modify all that break typecheck):**
- `src/lib/format.ts` — `HIKE: 'Randonnée'`
- `src/lib/activity/sport-identity.ts` — famille ambre/terre (pas orange RUN, pas Lime)
- `src/lib/activity/sport-identity.test.ts` — assert HIKE amber/stone, ≠ RUN
- `src/lib/activity/activity-detail-skeleton-layout.ts` — `case HIKE: return 'map'`
- `src/lib/activity/activity-detail-skeleton-layout.test.ts` — test HIKE map
- `src/lib/activity/activity-list-summary.ts` — distance via hikeMetrics ; étendre `ActivityMetricSource`
- `src/lib/activity/activity-list-summary.test.ts`
- `src/lib/queries/activity-include.ts` — `hikeMetrics: true` + list select `{ distanceM, elevationM }`
- `src/lib/validators/activity.ts` — `hikeMetricsSchema` + create/update + local `activityInclude`
- `src/lib/analytics.ts` — `HIKE: 0.8` load factor ; buckets ; labels ; `CHART_COLORS.HIKE` (ambre `#b45309`)
- `src/lib/planned-session/planning.ts` — `HIKE: 0.8`
- `src/components/activity/activity-type-indicator.tsx` — `HIKE: 'RA'`
- `src/components/training/hub/history-filters/mobile-filter-drawer.tsx` — TYPE_ORDER + `Mountain` icon
- `src/components/training/hub/history-filters/desktop-filter-menu.tsx` — TYPE_ORDER
- `src/lib/manual-observation-sync.ts` — optional explicit `case 'HIKE': return 'OTHER'` (default already OK)
- Any other `Record<ActivityType, …>` revealed by typecheck

**Interfaces:**
- Consumes: `ActivityType.HIKE`
- Produces: labels, colors, includes, filters compilent

Suggested sport-identity tokens:

```ts
HIKE: 'bg-amber-800/20 text-amber-950 dark:bg-amber-500/25 dark:text-amber-100 border-amber-800/35 border',
// TEXT: text-amber-800 dark:text-amber-200
// HEX: '#b45309'
// PANEL: border-amber-800/30 bg-amber-800/5
```

- [ ] **Step 1: Apply exhaustiveness edits** (batch — follow existing patterns file-by-file)

- [ ] **Step 2: Run typecheck**

Run: `yarn typecheck`  
Expected: PASS (or only pre-existing unrelated errors). Fix every `ActivityType` missing `HIKE`.

- [ ] **Step 3: Run related unit tests**

Run:

```bash
yarn test src/lib/activity/sport-identity.test.ts \
  src/lib/activity/activity-detail-skeleton-layout.test.ts \
  src/lib/activity/activity-list-summary.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/format.ts src/lib/activity src/lib/queries/activity-include.ts \
  src/lib/validators/activity.ts src/lib/analytics.ts src/lib/planned-session/planning.ts \
  src/components/activity/activity-type-indicator.tsx \
  src/components/training/hub/history-filters
git commit -m "feat: wire HIKE across labels identity filters and analytics"
```

---

### Task 5: Hero stats + specs détail HIKE

**Files:**
- Modify: `src/components/training/activity/activity-hero-stats.tsx`
- Modify: `src/components/training/activity/detail/activity-detail-helpers.ts`
- Modify: `src/components/training/activity/detail/activity-detail-helpers.test.ts` (si présent)
- Test: hero via existing patterns / typecheck

**Interfaces:**
- Consumes: `activity.hikeMetrics`, stream stats
- Produces: hero slots Distance · D+ · Durée · FC moy. ; specs D−, vitesse, calories

- [ ] **Step 1: Extend `HeroActivity`**

```ts
  hikeMetrics: {
    distanceM: number | null;
    elevationM: number | null;
    avgHr: number | null;
  } | null;
```

Update `toHeroActivity` accordingly.

- [ ] **Step 2: Add `case ActivityType.HIKE` in `buildSlots`**

```ts
    case ActivityType.HIKE: {
      const m = activity.hikeMetrics;
      const elevation = m?.elevationM ?? stream?.totalAscent ?? null;
      const distance = m?.distanceM ?? stream?.totalDistance ?? null;
      const avgHr = m?.avgHr ?? stream?.avgHr ?? null;
      return [
        {
          label: 'Distance',
          value: distance != null ? formatDistance(distance) : null,
          needsStream: m?.distanceM == null,
        },
        {
          label: 'Dénivelé',
          value: elevation != null ? `${Math.round(elevation)} m` : null,
          needsStream: m?.elevationM == null,
        },
        { label: 'Temps', value: duration },
        {
          label: 'FC moy.',
          value: avgHr != null ? `${avgHr} bpm` : null,
          needsStream: m?.avgHr == null,
        },
      ];
    }
```

- [ ] **Step 3: `buildActivitySpecs` for HIKE**

Push D−, vitesse moy. (from metrics `avgSpeedMps` → km/h), calories. Icon: add `Mountain` from lucide to `sportIcon` for HIKE.

- [ ] **Step 4: Typecheck + commit**

```bash
yarn typecheck
git add src/components/training/activity
git commit -m "feat: add HIKE hero metrics and activity specs"
```

---

### Task 6: Bloc UI Nuitée + page détail

**Files:**
- Create: `src/components/training/activity/detail/activity-hike-overnight-panel.tsx`
- Modify: `src/app/(app)/training/[id]/page.tsx`
- Optional client wrapper if streams needed for endPoint — prefer server summary without path first; enhance client-side endPoint via stream hook only if cheap. **V1 minimal:** server-side summary without path (lieu observé as fallback); path endPoint can be filled by a thin client child using `useActivityStream` if map already loads.

**Recommended V1:** server builds summary without path; client panel optional enhancement.

**Interfaces:**
- Consumes: `buildHikeOvernightSummary`, `ActivityDetail`
- Produces: panel « Nuitée » | « Synthèse »

- [ ] **Step 1: Create panel component (server-friendly)**

```tsx
import { formatDate, formatDistance, formatDuration } from '@/lib/format';
import type { HikeOvernightSummary } from '@/lib/activity/hike-overnight-summary';
import { SPORT_IDENTITY_PANEL } from '@/lib/activity/sport-identity';
import { ActivityType } from '@prisma/client';
import { cn } from '@/lib/utils';

function formatRange(start: Date, end: Date): string {
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  const t = (d: Date) =>
    new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(d);
  if (sameDay) return `${formatDate(start)} · ${t(start)} → ${t(end)}`;
  return `${formatDate(start)} ${t(start)} → ${formatDate(end)} ${t(end)}`;
}

export function ActivityHikeOvernightPanel({ summary }: { summary: HikeOvernightSummary }) {
  const title = summary.variant === 'overnight' ? 'Nuitée' : 'Synthèse';
  const rows: { label: string; value: string }[] = [];
  rows.push({ label: 'Fenêtre', value: formatRange(summary.startAt, summary.endAt) });
  if (summary.durationSec != null) {
    rows.push({ label: 'Durée', value: formatDuration(summary.durationSec) });
  }
  if (summary.distanceM != null) {
    rows.push({ label: 'Distance', value: formatDistance(summary.distanceM) });
  }
  if (summary.elevationM != null) {
    rows.push({ label: 'D+', value: `${Math.round(summary.elevationM)} m` });
  }
  if (summary.elevationLossM != null) {
    rows.push({ label: 'D−', value: `${Math.round(summary.elevationLossM)} m` });
  }
  if (summary.locationLabel) rows.push({ label: 'Lieu', value: summary.locationLabel });
  if (summary.weather) rows.push({ label: 'Météo', value: summary.weather });
  if (summary.load != null) rows.push({ label: 'Charge', value: `${Math.round(summary.load)} TSS` });
  const endLabel =
    summary.endPoint != null
      ? `${summary.endPoint.lat.toFixed(4)}, ${summary.endPoint.lng.toFixed(4)}`
      : summary.endLocationFallback;
  if (endLabel) rows.push({ label: 'Fin de parcours', value: endLabel });

  if (rows.length === 0) return null;

  return (
    <section
      className={cn(
        'analysis-panel space-y-3 border p-4',
        SPORT_IDENTITY_PANEL[ActivityType.HIKE],
      )}
      aria-label={title}
    >
      <h2 className="text-section-title">{title}</h2>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0">
            <dt className="text-label text-muted-foreground">{row.label}</dt>
            <dd className="text-data mt-1 truncate">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
```

- [ ] **Step 2: Wire page**

In `training/[id]/page.tsx`:

```tsx
import { buildHikeOvernightSummary } from '@/lib/activity/hike-overnight-summary';
import { ActivityHikeOvernightPanel } from '@/components/training/activity/detail/activity-hike-overnight-panel';

// ...
const isHike = activity.type === ActivityType.HIKE;
const hikeSummary = isHike
  ? buildHikeOvernightSummary({
      date: activity.date,
      duration: activity.duration,
      weather: activity.weather,
      load: activity.load,
      observedLocationLabel: activity.observedLocationLabel,
      hikeMetrics: activity.hikeMetrics
        ? {
            distanceM: activity.hikeMetrics.distanceM,
            elevationM: activity.hikeMetrics.elevationM,
            elevationLossM: activity.hikeMetrics.elevationLossM,
          }
        : null,
    })
  : null;

// After ActivityDetailHero:
{hikeSummary ? <ActivityHikeOvernightPanel summary={hikeSummary} /> : null}
```

Ensure `getActivityById` include already has `hikeMetrics` (Task 4).

Insights already render for non-strength — HIKE will get map via skeleton `map`. Do **not** add HIKE to `NARRATIVE_TYPES`.

- [ ] **Step 3: Manual sanity**

Run: `yarn typecheck && yarn test src/lib/activity/hike-overnight-summary.test.ts src/lib/integrations/garmin-activities.test.ts`  
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/training/activity/detail/activity-hike-overnight-panel.tsx \
  src/app/\(app\)/training/\[id\]/page.tsx
git commit -m "feat: add hike overnight panel on activity detail"
```

---

### Task 7: Verification finale

**Files:** none new — verify only

- [ ] **Step 1: Full checks**

```bash
yarn typecheck
yarn test
yarn lint
```

Expected: typecheck PASS ; tests PASS (or only pre-existing failures unrelated to HIKE) ; lint clean on touched files.

- [ ] **Step 2: Grep safety**

```bash
rg "Record<ActivityType" -g'*.ts' -g'*.tsx' src
rg "ActivityType\.(OTHER|TRIATHLON)" -g'*.ts' -g'*.tsx' src/lib/analytics.ts
```

Manually confirm every `Record<ActivityType, …>` includes `HIKE`.

- [ ] **Step 3: Push + update PR**

```bash
git push -u origin cursor/hike-activity-impl-1fb9
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| `HIKE` + `HikeMetrics` | 1 |
| Garmin hiking → HIKE + metrics | 2 |
| `buildHikeOvernightSummary` pur | 3 |
| Labels / identity / switches / includes | 4 |
| Hero Distance·D+·Durée·FC + specs | 5 |
| Page détail + bloc Nuitée/Synthèse + map | 5–6 |
| Pas narrative / pas backfill / pas Core SportType | 2, 4, 6 |
| Extension points V2 (additives, naming) | 3 comment + metrics shape |
| Tests mapping + overnight + typecheck | 2, 3, 7 |

## Out of scope (do not implement)

- `HikeTrip` / `hikeTripId` / route `/training/trips/[id]`
- Strava hiking import
- Coach narrative HIKE
- Backfill historique OTHER
