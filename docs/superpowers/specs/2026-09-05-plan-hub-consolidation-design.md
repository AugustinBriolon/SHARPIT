# Plan hub consolidation — design

> **Date:** 2026-09-05
>
> **Status:** Approved design, not yet implemented
>
> **Scope:** Athlete-facing information architecture for the Plan tab and its neighbours.
>
> **Posture:** Full UX rework, not an incremental migration. Legacy routes are deleted rather than redirected. This design supersedes the Plan-tab route mapping in [`INFORMATION_ARCHITECTURE.md`](../../design/INFORMATION_ARCHITECTURE.md); that document is rewritten as part of the work.
>
> **Does not change:** The frozen Core, the Digital Twin, inference engines, or any data contract. No new engine, no new API route.

## Problem

Information that forms one mental system for the athlete — goal, plan phase, week, load, adaptation, projection, weekly brief, recent history — is spread across surfaces that do not reference each other. The athlete knows the information exists but not where to look for it, nor in which order to read it.

## Root cause

Four findings from the audit of `/plan`, `/training/*`, `/activite`, `/moi/objectifs`, `/settings/calibration`.

### 1. Two competing hubs under one tab

`planNavItem.match` lights the Plan tab for both `/plan` and `/training` ("Le fil"). Both surfaces answer the same question with different readings:

| Information          | `/plan`                         | `/training`                           |
| -------------------- | ------------------------------- | ------------------------------------- |
| Goal countdown       | `PlanGoalBand`                  | `ThreadGoalBanner`                    |
| Planned vs completed | `WeekFigures` + `PlanWeekStrip` | `ThreadLoadRuler` + `ThreadPlanChart` |
| Load                 | Trajectory chip                 | 7-day figure in the banner            |
| Week sessions        | `EntryGroup` chips              | `ThreadTimeline`                      |
| Thresholds           | absent                          | `ThreadFormReadings`                  |

`/plan` contains **no link to `/training`**. The thread is only reachable sideways, from `today-instrument-card`, `activity-consistency-panel-parts`, `today-twin-navigation` and `pro-perks`. An athlete entering through the Plan tab sees a partial week and never learns the other half exists.

This is the OOUX _broken object_ failure mode: one object — the training week — with its data and actions scattered across two surfaces with no cross-linking.

### 2. "Plan" names three different objects

The tab `/plan`, the calendar editor `/training/planning`, and the generated `TrainingPlan` entity all use the word. A hierarchy cannot be learnt when one word denotes three things.

### 3. `/training` spans two opposite intentions

`isPlanTrainingPath` and `isActivityTrainingPath` exist precisely because `/training/*` holds both future organisation (`planning`, `weekly-review`) and completed execution (`[id]`, `manual`, `trips`). One prefix is split across two tabs by a predicate. The athlete-facing consequence: a completed activity lives under a route named "training" while the tab reads "Activité".

### 4. Thresholds are displayed as a reading, not as a ruler

`ThreadFormReadings` renders run threshold pace, bike FTP and the 10 km record inside a week timeline. A threshold is the scale against which load is read; it changes a few times a year and drives no daily decision. Showing it beside a timeline mixes _read my state_ with _configure my model_.

Calibration is also rendered twice from the same panel — at `/settings/calibration` and inside `/moi/performance` behind `<ExpertOnly>`. Two entry points to one editor, with different visibility rules.

## Decisions

1. **`/plan` is the single hub for the Plan tab.** It is not rebuilt; it already carries five of the seven blocks below. It gains plan phase, weekly-brief state, and a recent-load trend, and its projection is reduced to one reading.
2. **The thread and the calendar merge into one dedicated week surface,** `/plan/semaine`. They describe the same week; keeping both reproduces the problem one level down.
3. **Every hub block owns exactly one destination.** The hub summarises and routes; it never becomes the place where work happens.
4. **One route prefix per intention.** `/plan/*` is future and organisation. `/activite/*` is completed execution. `/training/*` disappears entirely, and with it the two predicates that split it.
5. **Thresholds do not appear on the hub as values.** They appear only as a confidence line, and only when they are missing, stale, or have a pending estimate — because in that case the load shown in blocks 3 and 4 is unreliable.
6. **Old routes are deleted, not redirected.** No compatibility layer, no `redirect()` shims. Internal links are updated in the same change; external bookmarks and stale PWA caches are accepted breakage.

## Hub composition — `/plan`

### Header

The current header reads "Organiser les prochains jours" — accurate when the hub only held the week, too narrow now that it also carries the goal, the plan phase, recent history and the brief. It becomes:

- eyebrow: `Plan`
- title: `Où tu en es, et où ça te mène`
- subtitle: `Ton objectif, la phase du plan, la semaine, comment tu te portes, et ce que ça va produire.`

### Blocks

Seven blocks in causal order: where I am going, where I stand, what is being asked, what I have done, how I am holding up, what it will produce.

| #   | Block                                                                   | Component                         | Data source                                                       | Destination                        |
| --- | ----------------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------- | ---------------------------------- |
| 1   | **Objectif** — countdown, target, progress                              | `PlanGoalBand` (exists)           | `useGoals()`                                                      | `/moi/objectifs`                   |
| 2   | **Phase du plan** — phase, deload flag, S-{n} to race                   | new `PlanPhaseBand`               | `useTrainingPlan()`, `lib/training/periodization`                 | `/plan/semaine`                    |
| 3   | **La semaine** — planned/completed figures, 7-day strip, intensity gate | `PlanWeekSection` (exists)        | `usePlannedSessions()`, `useActivities()`, `useAthleteSnapshot()` | `/plan/semaine`                    |
| 4   | **4 dernières semaines** — planned vs completed, one bar per week       | new `PlanLoadTrend`               | `buildLoadRuler(weeks, 4)`, `buildThreadAdherence`                | `/activite`                        |
| 5   | **Comment je me porte** — Adaptation, Charge                            | `PlanTrajectoryStrip` (exists)    | `useAthleteSnapshot()`                                            | `/plan/adaptation`, `/plan/charge` |
| 6   | **Projection** — one directional verdict, one supporting figure         | `PlanProjectionSection` (reduced) | `useProjectedAthleteViewModel(7)`                                 | `/plan/semaine`                    |
| 7   | **Bilan** — its state plus one line of content, or "not generated yet"  | new `PlanBriefCard`               | `useWeeklyCoachingBriefViewModel(weekStart)`                      | `/plan/bilan`                      |

Block 2 renders only when a `TrainingPlan` exists. Without a plan there is no phase, so the block is absent rather than showing an empty state.

Block 4 reuses `buildLoadRuler` from `src/lib/training/thread/load-ruler.ts` with `window = 4`, and `buildThreadAdherence` from `thread-adherence.ts`. Both are library functions and survive the deletion of the thread page.

### Projection reduction

`PlanProjectionSection` currently stacks `synthesisSentence`, `LoadCeiling`, `ProjectionCaution`, `ChangeDrivers` and a brief link — five readings in one panel. On the hub it keeps:

- the directional verdict: `vm.synthesisSentence`, already documented in `ProjectedAthleteCardViewModel` as "trajectory verdict only (no confidence %)". No new computation is needed — the verdict already exists and is simply no longer buried;
- one supporting figure: planned load against the tolerated ceiling, only when a ceiling exists and planned load is above zero (the existing `LoadCeiling` guard);
- the caution, only when `vm.caution` is present.

`ChangeDrivers` and the brief link move to `/plan/semaine` and block 7 respectively.

### Calibration confidence line

A quiet line at the foot of the hub, rendered only when calibration degrades what the hub shows:

- no threshold set at all — the load figures above have no scale;
- `thresholdsSyncedAt` older than 90 days, roughly one training block, after which a threshold has usually moved. No such constant exists today; the implementation adds `THRESHOLD_STALE_DAYS = 90` beside the calibration hooks;
- `useThresholdPreview()` returns a pending suggestion the athlete has not applied.

It links to `/moi/calibration`. It never renders FTP, LTHR, threshold pace or CSS values.

## Route map

```
/plan                  hub (seven blocks)
/plan/semaine          the editable week — thread and calendar merged
/plan/bilan            weekly coaching brief
/plan/adaptation       adaptation drill-down
/plan/charge           load drill-down
/activite              full activity history
/activite/nouvelle     manual session entry
/activite/[id]         completed session detail
/activite/[id]/edit    session editing
/activite/sejours      hiking trips list
/activite/sejours/[id] hiking trip detail
/moi/objectifs         goals (unchanged)
/moi/calibration       thresholds — the single calibration editor
/moi/performance       records (calibration section removed)
```

### Routes deleted

| Deleted                                    | Replaced by                                   |
| ------------------------------------------ | --------------------------------------------- |
| `/training`                                | `/plan/semaine`                               |
| `/training/planning`                       | `/plan/semaine`                               |
| `/training/weekly-review`                  | `/plan/bilan`                                 |
| `/training/sessions`                       | already a redirect — removed outright         |
| `/training/progression`                    | already a redirect — removed outright         |
| `/training/manual`                         | `/activite/nouvelle`                          |
| `/training/[id]`, `/training/[id]/edit`    | `/activite/[id]`, `/activite/[id]/edit`       |
| `/training/trips`, `/training/trips/[id]`  | `/activite/sejours`, `/activite/sejours/[id]` |
| `/today/adaptation`, `/today/effort`       | `/plan/adaptation`, `/plan/charge`            |
| `/settings/calibration`                    | `/moi/calibration`                            |
| `/progress`, `/biology`, `/settings/goals` | already redirects — removed outright          |

`/training` no longer exists as a prefix. `isPlanTrainingPath` and `isActivityTrainingPath` are deleted from `src/lib/app-navigation.ts`; `planNavItem.match` becomes a `/plan` prefix test and `activityNavItem.match` an `/activite` prefix test.

`/today/sleep` and `/today/recovery` stay: overnight recovery is a Today reading, unlike adaptation and load which are block-scale. Their English segment names are inconsistent with the French routes around them, but renaming them is outside this perimeter.

## What `/plan/semaine` holds

One surface, assembled from the two it replaces:

- week chrome: previous/next navigation, current/upcoming badge, `TravelContextBanner`, scenario comparison, Coach menu (from `PlanningWeekChrome`);
- week summary: S-{n}, phase and deload, planned load against target, session count (from `PlanningWeekSummary`);
- the seven-day panel with planned sessions, completed activities, rest planning and add controls (from `PlanningDaysPanel`);
- the full load ruler across nine weeks (from `ThreadLoadRuler`), which the hub shows trimmed to four;
- upcoming constraints (from `ThreadConstraintsCard`);
- `ChangeDrivers`, moved off the hub;
- the existing overlays: session create/edit, plan generator, plan adapter, macro plan, scenario comparison.

## Calibration consolidation

One editor, one route. `PerformanceCalibrationPanel` is mounted only at `/moi/calibration`.

The page is **not** gated behind `<ExpertOnly>`. Repairing a stale threshold is maintenance, not expert reading: the confidence line on the hub must lead somewhere actionable whatever the athlete's reading level. What stays Expert-only is the _display of threshold-derived metrics_ — NP, IF, zone distributions, the power curve — not the ability to set one's own ruler.

`CalibrationSection` is removed from `/moi/performance`, which keeps records only. The Moi hub lists Calibration under **Essentiel**, beside Corps and Objectifs, rather than under "Autre".

## What is removed

| Removed                                        | Reason                                                                                                     |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `ThreadGoalBanner`                             | Block 1 owns the goal.                                                                                     |
| `ThreadFormReadings`                           | Thresholds are not a week reading. They live on `/moi/calibration` and `/moi/performance`.                 |
| `ThreadPlanChart`                              | Block 4 owns planned-vs-completed history.                                                                 |
| `PlanActions`                                  | Its links are absorbed by the blocks that own them. Only the Coach entry survives, at the foot of the hub. |
| `TrainingThreadView` and `/training` as a hub  | `/plan` is the only hub; the thread's week content moves to `/plan/semaine`.                               |
| `CalibrationSection` in `/moi/performance`     | One calibration editor, at `/moi/calibration`.                                                             |
| `isPlanTrainingPath`, `isActivityTrainingPath` | No prefix is split across two tabs any more.                                                               |

## Out of scope

- Any change to the Digital Twin, DecisionState, snapshot, or projection engines.
- Any new API route. Every block above reads an endpoint that already exists. `/api/physical-notes` and the Prisma model names are untouched, as are all API paths — this is a page-route rework only.
- The visual language. Existing tokens and panel classes (`analysis-panel`, `surface-ink`, `rounded-analysis-lg`, `text-section-title`, `text-label`) are reused as-is.
- The internals of the activity, goal and record surfaces. They move route, they do not change content.
- `/today/sleep` and `/today/recovery`, the remaining `/settings/*` utility pages, `/coach`, `/nutrition`.

## States

Each new block must define its loading, empty, offline and error state, following the pattern already used on the hub: chrome outside `Suspense`, widgets streaming inside it, with `PlanHubWidgetsFallback` extended to cover the three new blocks.

- Block 2: absent when no plan exists.
- Block 4: absent when fewer than two weeks of data exist, since a trend needs a comparison.
- Block 7: renders "pas encore de bilan" with a generate action for Pro athletes, and the Pro gate otherwise — reusing the existing `WeeklyReviewLocked` copy.
- The offline gate stays at the hub, not inside a block, so a cold-cache offline athlete still gets the snapshot summary.

## Delivery sequence

Deleting routes instead of redirecting them means a stage cannot end with dangling internal links. Each stage below moves its routes _and_ every reference to them, so the tree is coherent at every commit.

1. **Hub completion (medium).** Add blocks 2, 4 and 7, reduce block 6, add the calibration confidence line, update the header, extend `PlanHubWidgetsFallback`. No route changes yet; blocks 5 and the confidence line point at their current destinations and are retargeted in stage 4.
2. **Week merge (large).** Build `/plan/semaine` from `PlanningView` plus the thread parts worth keeping. Delete `TrainingThreadView`, `/training`, `/training/planning`, `/training/sessions`, `/training/progression`, and retarget the four sideways entry points that pointed at `/training`.
3. **Activity prefix move (medium).** `/activite/nouvelle`, `/activite/[id]`, `/activite/[id]/edit`, `/activite/sejours/*`. Delete the `/training` tree entirely. Update `activityNavItem.match`, the route registry, the nav stack, prefetch entries, and every internal `href` — including the Coach discuss contexts and `today-twin-navigation`.
4. **Drill-downs and calibration (medium).** `/plan/bilan`, `/plan/adaptation`, `/plan/charge`, `/moi/calibration`. Delete `/training/weekly-review`, `/today/adaptation`, `/today/effort`, `/settings/calibration`, and the leftover `/progress`, `/biology`, `/settings/goals` redirect stubs. Remove `CalibrationSection` from `/moi/performance` and move Calibration into the Moi hub's Essentiel group.
5. **Navigation cleanup (small).** Delete `isPlanTrainingPath` and `isActivityTrainingPath`, simplify both `match` predicates, and update `app-navigation.test.ts`, `route-registry.test.ts` and `nav-stack.test.ts`.

## Documentation

- **ADR required.** The route model changes shape: `/training/*` disappears, `/plan/*` and `/activite/*` become the two athlete-facing prefixes, calibration leaves Settings, and legacy links are dropped rather than redirected. That last point is the one a future reader will most need explained.
- **`INFORMATION_ARCHITECTURE.md` rewritten,** not amended. Its canonical route table, its "My week" surface contract, its `/biology` split section and its delivery sequence all describe the previous model. The Shell V1 label table and the reading-levels section survive; the route mapping does not.
- **`ARCHITECTURE.md`** updated where it names the `src/app/(app)/training` tree or the `src/components/training/thread` directory.

## Testing

- Unit tests per new component, following the existing `*.test.ts` server-render assertions in `src/components/plan/` and `src/components/today/dashboard/`.
- `buildLoadRuler` with `window = 4`: fewer than four weeks of data, no prescribed load, current week not last.
- A repo-wide assertion that no `href`, `redirect()` or router call targets `/training`, `/settings/calibration`, `/today/adaptation`, `/today/effort`, `/progress` or `/biology`. With no redirect safety net, a missed link is a dead end rather than a detour, so this replaces the redirect tests.
- `app-navigation.test.ts` rewritten: `/plan/*` lights Plan, `/activite/*` lights Activité, and no path is claimed by two tabs.
- `route-registry.test.ts` and `nav-stack.test.ts` updated for the new labels and fallbacks.
- `use-prefetch-nav.ts` route map updated. Its `routes` record is keyed by literal href, so a deleted route becomes a silently dead key rather than a build error: `/training`, `/training/planning`, `/progress`, `/settings`, `/today/effort` and `/today/adaptation` all need retargeting, and `/plan/semaine`, `/plan/adaptation`, `/plan/charge` adding. There is no service-worker route precache to migrate — offline coverage goes through `useOfflineSnapshot()` and TanStack Query, not a URL manifest.
- Each redesigned surface validated on mobile and desktop, in Essential and Expert reading levels, with partial data and an active health constraint.
