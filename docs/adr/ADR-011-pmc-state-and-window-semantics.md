# ADR-011: PMC State and Window Semantics

**Status:** Accepted  
**Date:** 2026-08-11  
**Author:** Augustin Briolon  
**Supersedes:** N/A

---

## Context

The PMC (CTL/ATL/TSB) is an exponentially weighted moving average. Its defining property is that it has memory: the value on any day depends on every prior day, decaying at a rate set by the time constant. Convergence from a zero start is `1 - (1 - 1/tau)^n`, so with `tau_ctl = 42` (ADR-001) a series needs roughly `3x tau` before CTL approaches its true value.

The implementation removed by this ADR (`computePmcSeries` and `computePmcSeriesFromDailyLoad` in `src/lib/analytics.ts`) took a `days` parameter, built a day range of that length ending at the reference date, and seeded `ctl = 0; atl = 0` at the start of that range. The window was therefore both the display width and the computation boundary. Because each consumer chose its own width, each got a different answer for the same athlete on the same day:

| Consumer                                         | Width | Convergence |
| ------------------------------------------------ | ----- | ----------- |
| `presentation/effort.ts` (dashboard)             | 28 d  | 49%         |
| `coach/coach-context.ts`                         | 90 d  | 88%         |
| `activity/activity-narrative-athlete-context.ts` | 90 d  | 88%         |
| `projection/build-projection-input.ts`           | 180 d | 98.6%       |
| `api/training-plans/route.ts` (`baselineCtl`)    | 180 d | 98.6%       |
| `components/analytics/analytics-view.tsx`        | 180 d | 98.6%       |

Several call sites also capped the input query (`sinceDays: 60`, `sinceDays: 90`, `take: 120`), so correcting the seeding alone would not have supplied the history the recurrence needs.

Measured on the production dataset (303 activities spanning 1007 days, 24x `tau_ctl`):

| Path           | CTL | ATL | TSB | CTL error |
| -------------- | --- | --- | --- | --------- |
| Whole history  | 43  | 23  | +20 | —         |
| 28-day window  | 15  | 23  | −8  | −65.9%    |
| 90-day window  | 37  | 23  | +14 | −13.3%    |
| 180-day window | 43  | 23  | +19 | −0.6%     |

The dashboard reported a negative TSB — the athlete carrying fatigue debt — while the athlete was in fact fresh at +20. The sign of the most actionable number in the product was inverted.

`docs/SNAPSHOT_QUALITY_V1_AUDIT.md` had already recorded the symptom ("TSB/readiness numbers cited from coach context (PMC), not snapshot fields — can diverge") without identifying the cause.

Note on ADR-001: that ADR accepts "new users initialize at CTL=0" as a consequence. That refers to the athlete's genuine first day, which remains correct and is retained here as `PMC_COLD_START`. Reseeding at the start of a rolling window is not that consequence; it was an implementation defect.

Two further duplications existed: `PMC_MODEL` (`analytics.ts`) and `PMC_CTL_TAU`/`PMC_ATL_TAU` (`projection/pmc-forward.ts`) independently defined the same time constants, and `pmc-forward.ts` rounded to one decimal _inside_ the recurrence, feeding rounded state back into the next step.

---

## Decision

Treat a window as a display slice and never as a computation boundary.

1. `src/lib/training/pmc.ts` owns the recurrence and the time constants, and is the only place they are defined. It depends on nothing in the codebase.
2. The recurrence always starts at the athlete's first recorded day. `computeAthletePmc` takes the whole history; `slicePmcWindow` trims the result for display.
3. State is carried at full precision. Rounding happens only at presentation boundaries (`toPmcPoints`, `projectPmcForward`).
4. `getActivitiesForPmc()` reads the whole history with the narrowest possible select, with no `sinceDays` and no `limit`.
5. `runPmc` accepts an optional `initial` state, so a run resumed from a known day is available without a second code path.

---

## Rationale

The recurrence is pure: `state(n)` is a deterministic function of `state(n-1)` and that day's load. This makes "resume from a known day" mathematically identical to "recompute from the first day" — not an approximation. That single property is what makes both the correctness fix and the later persistence layer safe, and it is why `initial` is part of the API from the start rather than added when persistence arrives.

Placing the recurrence in a module with no dependencies means the pipeline that estimates daily load can be replaced (the five-tier cascade in `src/core/features/extractors/session-extractor.ts` should supersede `activity-load.ts`) without touching the PMC.

Full-history recomputation was chosen over persistence as the _correctness_ fix because it needs no migration, no invalidation logic, and no backfill, and because the cost is negligible at this scale: 1007 days of arithmetic over 303 activities. Persistence is a performance concern and is addressed separately, as a materialised view of this function rather than as a second source of truth.

---

## Alternatives Considered

### Alternative 1: Keep the window, extend it with a warm-up period

**Description:** compute from `windowStart - 3x tau_ctl` and slice to the requested window.

**Pros:**

- Smallest diff; each consumer keeps its existing shape

**Cons:**

- Convergence is still approximate (95% at `3x tau`), so consumers with different widths still disagree at the margin
- The warm-up length becomes a tuning parameter nobody can justify
- Leaves the "window is a computation input" mental model in place, so the defect can return

**Rejected because:** it makes the error small rather than removing it, and preserves the model that caused it.

### Alternative 2: Persist CTL/ATL first, with no pure-function fix

**Description:** add the `PmcDay` table immediately and read from it.

**Pros:**

- Solves correctness and read cost in one change

**Cons:**

- Couples a schema migration and backfill to a numerical correctness fix, so a rollback of one is a rollback of both
- Requires a trusted computation to backfill _from_, which did not yet exist
- Makes the table the de facto authority, with no pure function to rebuild it

**Rejected because:** the materialised view needs a correct generator before it can exist. Sequencing, not scope, was the objection.

---

## Consequences

### Positive

- One recurrence and one pair of time constants for history and projection; a projection cannot drift from the history it continues
- Displayed CTL/ATL/TSB are identical across every surface for a given day, enforced by a test rather than by convention
- The `initial` parameter makes the persistence layer additive
- One fewer query in the projection path: `getActivitiesList({ sinceDays: 180 })` existed only to feed the PMC and was removed

### Negative

- Every read that needs the PMC now scans the athlete's whole activity history. Acceptable at present scale, and the reason the persistence layer follows.
- `computeAthletePmc([])` returns an empty series where the old code returned a run of zero-valued points. Consumers already handled an empty series; no caller depended on the zero points.
- Displayed CTL values change substantially — roughly +180% on the effort dashboard, +16% for the coach. This is the correction, but historical screenshots and any notes an athlete kept will not match.
- `activity-load.ts` remains the primary load estimator on this path despite ranking last in the Core's cascade. Unchanged by this ADR, deliberately: correctness of the recurrence and correctness of its input are separate changes.

### Scientific debt created

None. This ADR removes an implementation defect; it does not change the model. The pre-existing debt in ADR-001 (SD-003, individual `tau` calibration) and ADR-002 (SD-003, sport-segregated PMC) is unaffected.

---

## Review Criteria

Revisit if:

- Whole-history reads become a measurable cost (p95 on a PMC-backed route regresses past 500 ms), which is the trigger for the `PmcDay` materialised view
- The load estimation pipeline is unified, at which point `computeAthletePmc` should consume the Core's tiered TSS instead of `activity-load.ts`
- Individual `tau` calibration lands (SD-003), which would make the time constants athlete-scoped state rather than module constants
