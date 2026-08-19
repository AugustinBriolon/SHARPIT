# ADR-015: Strength sessions — never drop an exercise on watch push, never score them on duration

**Status:** Accepted  
**Date:** 2026-08-19  
**Author:** Augustin Briolon  
**Supersedes:** N/A

---

## Context

A planned prehab session of six exercises (soft-tissue work, nerve glide, banded glute bridge, eccentric clamshell, straight-leg deadlift, hollow-body plank) reached the Garmin watch as two steps. Three mechanisms combined:

1. `matchGarminTaxonomy` scored a label against the 1531-entry Connect catalog with a symmetric token ratio. French prescriptions carry grammar words, equipment and execution qualifiers ("avec élastique", "(Excentrique)", "brique entre les genoux"), which pushed the ratio below the acceptance floor even when the catalog held a precise match (`BANDED_EXERCISES_GLUTE_BRIDGE`, `DUMBBELL_STRAIGHT_LEG_DEADLIFT`, `PLANK_PLANK`).
2. `buildStrengthWorkoutPayload` skipped any exercise that stayed unmapped, so the athlete discovered the loss on the watch, mid-session.
3. Session analysis received, for a strength session, only planned duration, recorded duration and TSS — never the prescription, never the realized sets. Execution speed became the only measurable variable, and the compliance score fell for a session whose entire content had been performed.

Constraints: the Connect `createWorkout` endpoint rejects `UNKNOWN` categories and bare parent enums, so an unmapped exercise cannot be sent verbatim; strength pace is athlete-driven (rest length, set-up, watch start/stop) and is not a prescribable quantity the way running pace or cycling power is.

---

## Decision

Push every prescribed exercise to the watch, using an approximate Garmin exercise when no precise match exists; and evaluate strength compliance on work content only, with duration and TSS withheld from the analysis prompt entirely.

---

## Rationale

**Watch fidelity.** A step named approximately still shows the athlete the movement, its sets, its reps and its rest, and the SHARPIT label rides along in the step description. A missing step shows nothing. The failure modes are not symmetric: an approximate name costs a moment of interpretation, a dropped exercise costs the exercise. The matcher was first strengthened (concept canonicalisation across FR/EN, stopword and qualifier demotion, IDF weighting with body targets favoured) so the fallback stays a last resort rather than a habit — on the session above, four of six now resolve to specific catalog entries.

**Scoring.** Compliance answers "did the athlete do the prescribed work?". For endurance that question is legitimately answered with duration and intensity, because both are prescribed. For strength the prescription is exercises × sets × reps × load; time is an emergent property of rest choices and set-up. Scoring it penalises a variable the athlete was never asked to control. The prescription and the realized `StrengthSet` rows were already persisted — they simply were not being read — so the correct evidence was available all along.

A prose instruction telling the model to ignore duration had been in the analysis prompt for months and did not hold, because duration was the only strength-related number in the prompt. Withholding the number is enforceable where an instruction was not, and a deterministic coverage score gives the model an authoritative figure to anchor on.

---

## Alternatives Considered

### Alternative 1: keep skipping unmapped exercises, warn louder in the UI

**Description:** Leave the payload builder as is; surface the skipped list more prominently before the push.

**Pros:**

- The watch never displays a name that differs from the prescription.
- No risk of an athlete performing the wrong movement from a generic label.

**Cons:**

- The athlete must repair every prescription by hand before each push.
- The warning arrives before the session; the loss is felt during it.
- Mobility and prehab work — precisely the vocabulary the catalog covers worst — is the most affected.

**Rejected because:** it moves the failure earlier without removing it, and it penalises exactly the sessions this work exists to support.

### Alternative 2: extend the manual alias table instead of reworking the matcher

**Description:** Keep symmetric scoring, add aliases for each label that fails.

**Pros:**

- Trivial, precise, no scoring regression risk.

**Cons:**

- Unbounded maintenance: every new coach-generated wording needs an entry.
- Aliases fix labels already seen; the coach invents new ones each session.

**Rejected because:** the failure is systemic in the scoring, not a set of missing entries — the catalog already held the right answers.

### Alternative 3: compute strength compliance entirely deterministically, without the model

**Description:** Drop the LLM from strength analysis and report the coverage score alone.

**Pros:**

- Fully predictable, cheap, no prompt to maintain.

**Cons:**

- Loses the qualitative reading of athlete notes ("stopped set 3, glute pain"), which is often the important part of a prehab session.
- Realized sets are sometimes absent or coarsely named, and the deterministic score then measures nothing.

**Rejected because:** the model adds judgement the numbers cannot; the deterministic score is better used as a floor under it.

---

## Consequences

### Positive

- Every prescribed exercise reaches the watch; the pushed workout matches the plan step for step.
- The push reports the exact watch label per exercise, so the mismatch is visible before the session rather than during it.
- Strength compliance reflects executed work; a slow session no longer costs the athlete points.
- Mobility steps are held for a duration instead of ending after a single rep.

### Negative

- Some exercises appear on the watch under a family name (a nerve glide shows as a piriformis stretch). Athletes must read the step description for the exact prescription.
- The fallback silently absorbs genuinely nonsensical labels rather than surfacing them as errors.
- Two scoring paths now exist — endurance (duration and intensity valid) and strength (content only) — which must stay consistent as the analysis prompt evolves.

### Scientific debt created

- The exercise-count-per-minute budget (~4 min per exercise) is an empirical planning assumption, not a measured value; it should be re-derived from the athlete's own realized strength sessions once enough are logged.
- The coverage/volume weighting (70/30) in the deterministic score is a judgement call with no outcome data behind it.

---

## Review Criteria

Revisit when:

- Garmin exposes a workout API accepting free-text exercise names, which would remove the need for family fallbacks entirely.
- The share of exercises resolving through `fallback` rather than a catalog match exceeds ~20% of pushed steps, indicating the matcher or the coach vocabulary has drifted.
- Realized strength sets become reliably detailed enough (per-set reps and loads from the watch) to justify a richer compliance model than coverage × volume.
