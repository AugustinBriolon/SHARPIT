# ADR-045: Biological age — a training estimate from VO₂max, adjusted, never a diagnosis

**Status:** Accepted (2026-09-27) — the « Method proposal v1 » below is what ships; the adjustments of the original decision wait for a v2
**Date:** 2026-09-24
**Author:** Augustin Briolon (with Claude Code)
**Supersedes:** N/A

---

## Context

The Corps tab reserves a « âge biologique » slot. `GET /api/v1/body/overview` serves
`biologicalAge: null` until this method is accepted. Withings already reports `bodyAge` and
`vascularAgeYears`. Those are the scale's own estimates: they are served as separate, attributed
metrics (`bodyAgeScale`, `vascularAge`) and never blended into ours.

---

## Original decision (superseded for v1 by the method below)

1. **Core: fitness age from VO₂max.** Use the model of Nes et al. (HUNT Fitness Study, 2013), with
   the athlete's `vo2maxRunning`, else `vo2maxCycling`, and their sex. The fitness age is the age
   at which the athlete's VO₂max would be the population average.
2. **Bounded adjustments, each shown as an input.** Only apply one when its data is current (last
   30 days):
   - resting HR (7-day mean) against the age and sex norm;
   - HRV (7-day mean) against the age norm;
   - body-fat % against the age and sex norm.

   Each adjustment is capped (± 2 years) and the total is capped (± 5 years), so that VO₂max
   stays the core.

3. **Payload:** `{ years, chronologicalYears, method: 'fitness-age-nes-2013-v1', confidence,
inputs: [keys used], computedAt }`.
   - `confidence` drops when VO₂max is old or missing.
   - Without VO₂max, `biologicalAge` stays null.
4. **Wording:** « estimation d'entraînement, pas un diagnostic ». This is the same disclaimer as
   the health consent. It is never framed as a medical age.
5. **Requirements:** birth date and sex (`AthleteProfile.sex`, now collected).

---

## Rationale

- VO₂max is the strongest single predictor in the fitness-age literature, and SHARPIT already
  reads it from Garmin.
- Additive, bounded adjustments keep the estimate explainable. Every year can be traced to an
  input the athlete can see in Corps.

---

## Open points before acceptance

- The exact norm tables (resting HR, HRV, body fat by age and sex) and their sources.
- Whether a Garmin « fitness age », when present, is shown alongside as a third attributed
  reading.
- The minimum data window.

## Method v1 (accepted 2026-09-27)

The NTNU fitness calculator (Nes et al.) does not publish its fitness-age algorithm, so v1 uses
the published reference data it rests on instead:

- **Reference:** mean VO₂max by sex and decade in healthy adults, HUNT3 Fitness Study — Loe H,
  Rognmo Ø, Saltin B, Wisløff U. _Aerobic Capacity Reference Data in 3816 Healthy Men and Women
  20–90 Years._ PLoS ONE 2013;8(5):e64319.

  | Age   | Women (mL·kg⁻¹·min⁻¹) | Men |
  | ----- | --------------------- | --- |
  | 20–29 | 43                    | 54  |
  | 30–39 | 40                    | 49  |
  | 40–49 | 38                    | 47  |
  | 50–59 | 34                    | 42  |
  | 60–69 | 31                    | 39  |
  | 70+   | 27                    | 34  |

- **Fitness age:** the age at which the reference mean equals the athlete's VO₂max, by linear
  interpolation between decade midpoints (25, 35, … 75), clamped to 20–80. Method key
  `fitness-age-hunt3-loe-2013-v1`.
- **No adjustment in v1.** Resting HR, HRV and body-fat norms have no source chosen yet; each
  would add a table to justify. They come in a v2 with their own sources, still capped.
- **Confidence:** 0.9 when VO₂max is under 30 days old, 0.6 under 90; older, no estimate.
- Garmin's own « fitness age », when present, is shown as a separate attributed reading, never
  blended — like the Withings `bodyAgeScale`.

Implemented in `packages/server/src/lib/body/biological-age.ts` and served by `GET /api/v1/body/overview`
as `{ years, chronologicalYears, method, confidence (0.9 or 0.6), inputs, computedAt }`, null without
the data it needs. The app hides the slot when it is null.
