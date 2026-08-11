# ADR-012: Bidirectional Threshold Revision with Recency Window

**Status:** Accepted  
**Date:** 2026-08-11  
**Author:** Augustin Briolon  
**Supersedes:** N/A

---

## Context

Athlete thresholds (FTP, run threshold pace) drive Intensity Factor, TSS, and every downstream load signal. Two defects in the estimation → suggestion path compounded after illness, injury, or a training cut:

1. `previewThresholdApply` only suggested revisions that raised FTP (`estimated > current`) or sped up threshold pace (`estimated < current`). A stale-high threshold could never come down through the product path.
2. `estimateFtp` / `estimateRunThresholdPace` took the lifetime envelope of demonstrated capacity. On the production dataset the run threshold estimate was **4:37/km** from a half marathon **520 days** old, while recent 90–120 day efforts sat around **5:06/km**. With a null profile pace, the UI offered to _write_ that stale race fitness into the athlete profile.

Measured on the real database before this change:

| Signal              | Lifetime | ≤120 d | Profile |
| ------------------- | -------- | ------ | ------- |
| FTP (`estimateFtp`) | 207 W    | 207 W  | 210 W   |
| Run threshold pace  | 4:37/km  | ~5:06+ | null    |

FTP on this athlete was not the urgent bug (submaximal Zwift efforts at 59–67% max HR; a soft recency _weight_ crashed the estimate to 154 W and was rejected). Run pace was: the worst error direction (stale-high) on the sport where the lifetime PR dominates.

`bikeEfforts` / `runEfforts` in `RecordsPayload` also lacked dates, and persisted effort rows stamped `activityDate = now` at write time — so a window filter could not work until efforts carried the activity's real date.

---

## Decision

1. Threshold suggestions estimate **recent demonstrated capacity** inside a hard **120-day** window (`THRESHOLD_RECENCY_WINDOW_DAYS`), not the lifetime PR envelope.
2. Suggestions are **bidirectional**. A materiality gate must clear before proposing a change:
   - FTP: `|Δ| ≥ max(5 W, 3% of current)`
   - Pace: `|Δ| ≥ 5 s/km`
3. Suggestions remain **human-in-the-loop** via `previewThresholdApply` / apply endpoints — no automatic profile write.
4. Metric efforts persist and expose their source activity date; undated efforts are excluded from the threshold window (curve points and run bests already carry dates).

---

## Rationale

A hard window matches how coaches treat thresholds after a cut: capacity you have not shown recently is not the number you prescribe from. Soft exponential weighting of `FTP × recency` was measured and rejected — it preferred easy recent rides over older quality efforts and collapsed FTP by ~26%.

Materiality gates stop the UI from jittering on 1–2 W / 2–3 s/km noise while still allowing a real downward revision after detraining.

Keeping apply as an explicit athlete action preserves the calibration panel as the place of record and avoids silently rewriting zones mid-block.

---

## Alternatives Considered

### Alternative 1: Soft recency weighting (half-life 30–60 d)

**Description:** Score each candidate as `estimate × 0.5^(age/halfLife)` and take the max score.

**Pros:**

- Continuous; no cliff at day 120

**Cons:**

- On the production set, recent easy rides outranked quality efforts 50–100 days old and produced FTP ≈ 154 W

**Rejected because:** the score conflates recency with capacity; measured harm exceeds the cliff-edge cost of a hard window.

### Alternative 2: Bidirectional suggestions without a recency window

**Description:** Keep lifetime `Math.max` / best-pace but allow downward revisions.

**Pros:**

- Smallest code change

**Cons:**

- Still offers to set pace from a 520-day-old half marathon when the profile is empty
- After a cut, lifetime max remains the old peak, so downward never fires for FTP

**Rejected because:** it fixes the comparison direction but not the stale input.

### Alternative 3: Auto-apply when the gate clears

**Description:** Write the profile whenever a material windowed estimate differs.

**Pros:**

- Always current

**Cons:**

- Overwrites manual / Garmin calibration without consent
- Submaximal FTP estimates would silently understate after easy weeks

**Rejected because:** thresholds are athlete-owned; the product doctrine is suggestion, not silent mutation.

---

## Consequences

### Positive

- Empty or stale-high run threshold can no longer be filled from a multi-year race PR
- FTP and pace can revise downward after a cut, under an explicit materiality gate
- Calibration and analytics surfaces share one windowed estimator (`computeThresholdEstimates`)
- Effort rows stop lying about their `activityDate`

### Negative

- Athletes returning from a long break with no efforts in 120 days get no automatic suggestion until they train again (correct; manual / Garmin remain)
- Race-time projections (`predictRunRaces`) still use the lifetime envelope — intentional, separate from threshold prescription
- Persisted effort rows written before this ADR keep bogus dates until the next records recompute

### Scientific debt created

- Submaximal FTP efforts (low %maxHR) still carry the same visual authority as a true 60-minute test — epistemic honesty for intensity confidence remains P1
- Window length (120 d) is a product choice, not an individualised physiological constant

---

## Review Criteria

Revisit if:

- Multi-athlete data shows the 120-day cliff systematically underestimating returning athletes who race outside the window
- A validated intensity filter (e.g. require ≥85% maxHR or IF ≥ 0.9 on the driving effort) lands, at which point materiality and window may be re-tuned together
- Threshold snapshots gain a `maxHr` column and confidence metadata (schema gap noted alongside this work)
