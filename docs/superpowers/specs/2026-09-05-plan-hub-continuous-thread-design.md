# Plan hub continuous thread — design

> **Date:** 2026-09-05
>
> **Status:** Approved visual direction, awaiting spec review
>
> **Scope:** Athlete-facing composition of `/plan` only. Routes, prefixes, and drill-downs stay as defined in [`2026-09-05-plan-hub-consolidation-design.md`](./2026-09-05-plan-hub-consolidation-design.md).
>
> **Approved companion:** continuous thread (fil continu), then enriched v3 (destination + macro-plan + completed preview rail). Choice `approve-continuous-v3`.
>
> **Does not change:** The frozen Core, the Digital Twin, inference engines, data contracts, or the visual identity in `DESIGN.md` / `DESIGN_LANGUAGE.md`. No new API route.

## Problem

The current `/plan` hub is a stack of independent panels. On a phone it reads as a desktop dashboard: destination and week decision compete, two columns break the scroll, completed previews overflow, and the athlete cannot see where they stand in the generated plan.

## Decisions already locked

1. **Primary job:** in the first viewport, the athlete knows what this week asks and what to adjust.
2. **Interaction depth:** the hub shows the essential reading and one or two quick actions. Full week editing stays on `/plan/semaine`.
3. **Completed density:** several completed sessions in a horizontal snap rail, using the same preview as Today (map + metrics), not chips and not a two-column list.
4. **Structure:** one vertical continuous thread. Destination and macro-plan come first. Then the week decision. Then remaining work, completed work, block state, projection.

## Composition

Single causal column on every viewport (`max-w-3xl`). No content grid. No second column for « À faire / Réalisé ».

```
[ Destination plate ]
  Objectif (J-n, title, target)
  Macro-plan rail (phases in this TrainingPlan)
  Semaine N du bloc + focus

[ Week decision ]
  One sentence: hold / ease / build
  One reason (gate, sleep, empty week, adherence)
  Primary action (1) + optional secondary (2)
  Seven-day strip (existing PlanWeekStrip)

[ Thread ]
  À faire     → next remaining PlannedSessionPreview (compact), max 2
  Réalisé     → horizontal snap rail of CompletedSessionPreview
  État du bloc → 4-week load + adaptation/charge as one reading
  Projection  → one sentence + caution + bilan line
```

Footer stays outside the thread: calibration confidence line (only when degraded), then Coach.

### 1. Destination plate

One `surface-ink` plate. It answers « where am I going, and where am I in the plan? »

- Countdown + goal title + date/detail, linking to `/moi/objectifs`.
- Progress rail only when `PlanGoalView.progress` is known.
- Macro-plan: one cell per **distinct consecutive phase run** that exists on the current `TrainingPlan` (Base, Développement, Spécifique, Affûtage, Course). Do not invent phases the plan never wrote. The current run is the only emphasised cell.
- Caption: `Semaine {n} du bloc` where `n` is 1-based index inside the current phase run, plus `focus` when present, plus deload when `isDeload`.

Absent states:

- No active goal: `InkEmptyState` « Définir un objectif ». No invented countdown.
- Goal but no `TrainingPlan` for this Monday: show the goal only. The macro rail is absent, never a fake phase.

### 2. Week decision

This is the first operational answer. It is not a restatement of the page title.

Inputs already on the hub:

- remaining vs done session counts
- intensity gate (`shouldGateHardIntensities` + hard remaining sessions)
- projection caution when present
- empty week

Output: one French sentence and one primary action.

| Situation          | Sentence (intent)                                 | Primary action                                                          |
| ------------------ | ------------------------------------------------- | ----------------------------------------------------------------------- |
| Empty week         | The week has nothing to compare.                  | Construire la semaine → `/plan/semaine`                                 |
| Hard session gated | Hold the prescribed session, ease or shift it.    | Adapter {jour} → open that planned session                              |
| Week in progress   | Hold the volume; name the next remaining session. | Ouvrir {prochaine séance} or « La semaine »                             |
| Week complete      | The week is done; read what it produced.          | Voir le bilan → `/plan/bilan` when a brief exists, else `/plan/semaine` |

Secondary action, only when it is not the same intent as the primary: `La semaine → /plan/semaine`.

The seven-day strip stays under the decision. It is a locator, not a second calendar editor.

### 3. À faire

Show the next one or two remaining `ThreadEntry` items with `PlannedSessionPreview` (`density="compact"`). Date above the card. Gated hard sessions keep `morningChoiceLabel` « Intensité en pause ».

If more remain, a single `explore-link` to `/plan/semaine` (`{n} autres prévues`). Do not list the whole week on the hub.

### 4. Réalisé rail

Reuse `CompletedSessionPreview` from Today. Do not fork a third card.

- Horizontal snap-scroll on every viewport (`snap-x snap-mandatory`, one card ~85vw on mobile, max ~20rem from `sm`).
- Newest completed first. Show up to **four** cards. Overflow link to `/activite` (`{n} de plus dans l’historique`).
- Metrics stay on a 3-column grid **inside the card**. The rail must not clip labels: the card has a fixed min-width and the metrics use `min-w-0` + truncate. The current overlap on `/plan` is a layout bug to fix in the rail wrapper, not by hiding metrics.
- Strength / no-GPS sessions keep the existing sport-identity band.
- Empty: omit the event. Do not show a decorative empty rail.

Add a `layout="rail"` (or equivalent className contract) on `CompletedSessionPreview` only if the Today stacked map/metrics split cannot snap cleanly. Prefer a wrapper around the existing component. Do not change Today’s default layout.

### 5. État du bloc

One thread event, not a pair of dashboard chips beside a bar chart.

- Four-week load ruler (existing `buildPlanLoadTrend`, hidden when fewer than two weeks).
- One sentence for adherence (existing).
- Adaptation and Charge as two compact instrument lines under that sentence, each linking to `/plan/adaptation` and `/plan/charge`. They are evidence for the week decision, not a second hero.

### 6. Projection and bilan

One event. Keep the reduced projection: `synthesisSentence`, load vs ceiling when known, caution only when present. Link « 7 jours » → `/plan/semaine`.

Bilan is a single line under the projection (`briefHubLine`) linking to `/plan/bilan`. Do not mount a second titled card that only repeats the phase name.

### Header

- eyebrow: `Plan`
- title: `Ton cap, cette semaine`
- no subtitle inventory. The destination plate carries destination; the decision plate carries the week.

## What is removed from the current hub

| Remove                                                | Why                                                  |
| ----------------------------------------------------- | ---------------------------------------------------- |
| Separate `PlanPhaseBand` card under the goal          | Macro-plan lives inside the destination plate        |
| Two-column « À faire / Réalisé »                      | Breaks the thread and overflows completed metrics    |
| Listing every remaining session                       | Hub summarises; `/plan/semaine` edits                |
| Side-by-side Adaptation / Projection grid             | One column; projection is a later event              |
| Standalone « Bilan » panel that only prints the phase | Folded into the projection event                     |
| Page subtitle listing every block                     | Noise; first viewport must be destination + decision |

Keep the existing data helpers: `usePlanHubModel`, `resolvePlanPhase`, `buildPlanWeek`, `buildPlanLoadTrend`, `selectHubDoneEntries` (raise featured cap from 2 to 4), `briefHubLine`, `resolveCalibrationConfidence`.

## New / extended helpers

| Helper                                          | Responsibility                                       |
| ----------------------------------------------- | ---------------------------------------------------- |
| `buildMacroPhaseRail(plan, now)`                | Consecutive phase runs, current index, `weekInRun`   |
| `buildWeekDecision({ week, verdict, caution })` | Sentence + primary action + optional secondary       |
| `selectHubDoneEntries`                          | Featured cap becomes 4, newest first, overflow count |

Both new helpers are pure and unit-tested. Components stay presentational.

## PWA / UX constraints

- Touch targets ≥ 44px on the decision action and rail cards.
- Rail uses CSS scroll-snap, not a JS carousel.
- Motion: none on first paint. Press feedback via existing `pressable-lg` only.
- Offline gate stays at the hub (`useOfflineSnapshot`), not inside a thread event.
- Loading: destination + decision skeletons match the final plates. Rail skeletons are card-shaped, not a spinner.
- Essential / Expert: load acronyms stay Expert (`charge`, never `TSS` in Essential). Calibration values still never appear on the hub.

## Visual law

Instrument-editorial. Tokens only: `surface-ink`, `analysis-panel`, `text-page-title`, `text-section-title`, `text-label`, `text-data`. No drop shadows, no decorative gradients, no landing-page hero, no new typeface.

## Code shape

Rebuild the page as a short composition, not another 90-line widget.

```
PlanHub
  StickyHeader
  PlanHubWidgets          // data via usePlanHubModel
    PlanDestinationPlate  // goal + macro rail
    PlanWeekDecision      // sentence + actions + strip
    PlanWeekThread
      PlanUpcomingEvent
      PlanCompletedRail
      PlanBlockStateEvent
      PlanProjectionEvent
    PlanCalibrationLine
    PlanActions           // Coach only
```

Delete leftover layout from the stacked-card pass when it no longer has a caller (`PlanPhaseBand` as a standalone section, two-column week entries).

## States

| State                  | Render                                                         |
| ---------------------- | -------------------------------------------------------------- |
| Loading                | Plate-shaped skeletons in destination → decision → strip order |
| No goal                | Destination empty state                                        |
| No plan                | Goal only; no macro rail; no invented phase                    |
| Empty week             | Decision « Construire la semaine »                             |
| No completed this week | Skip Réalisé event                                             |
| < 2 weeks of load      | Skip 4-week ruler; Adaptation/Charge may still show            |
| Degraded calibration   | Footer line only                                               |
| Offline cold cache     | Existing hub offline snapshot                                  |

## Out of scope

- `/plan/semaine` editor internals
- New engines, new snapshot fields, new API routes
- Changing Today’s `CompletedSessionPreview` default composition except a non-breaking optional layout prop
- Rewriting Adaptation / Charge drill-down pages
- Visual identity change

## Testing

- `buildMacroPhaseRail`: no plan; week outside plan; mid-run week; deload; phases not in the plan stay omitted.
- `buildWeekDecision`: empty; gated hard session; in progress; complete with and without brief.
- `selectHubDoneEntries`: 0, 1, 4, 5 items (overflow = 1).
- Rail wrapper: metrics labels do not share a collapsing flex row with the title.
- Repo assertion from the consolidation spec still holds: no `/training` hrefs.
- Visual check on a 390px phone and a 1280px desktop: first viewport shows destination + decision without scrolling past the action.

## Relationship to the consolidation spec

[`2026-09-05-plan-hub-consolidation-design.md`](./2026-09-05-plan-hub-consolidation-design.md) remains the route and ownership contract. This document replaces only its **visual composition of `/plan`**: seven stacked cards become one destination plate, one week decision, and a four-event thread.
