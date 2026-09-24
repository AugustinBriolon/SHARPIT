# ADR-045: Biological age — a training estimate from VO₂max, adjusted, never a diagnosis

**Status:** Proposed — method to validate before any computation ships
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

## Decision (proposed)

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

Until this ADR is accepted, the server returns `biologicalAge: null` and the app hides the slot.
