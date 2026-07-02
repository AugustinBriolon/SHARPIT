# ADR-002: Cross-Sport TSS Normalization (Single PMC)

**Status:** Accepted  
**Date:** 2024 (predates knowledge base creation)  
**Author:** Augustin Briolon  
**Supersedes:** N/A

---

## Context

SHARPIT tracks activities across multiple sports: cycling, running, swimming, strength training, and others. Training load for each session is quantified as a TSS-equivalent value. The PMC model combines all TSS values into a single CTL, ATL, and TSB.

This raises a fundamental question: **should SHARPIT maintain one PMC for all sports, or separate PMC instances per sport?**

The sports generate different types of fatigue and adaptation:

- Cycling: primarily cardiovascular + cycling-specific muscular
- Running: cardiovascular + impact-loading, musculoskeletal stress much higher per TSS unit
- Swimming: cardiovascular + upper body, almost no lower body musculoskeletal stress
- Strength: primarily neuromuscular, minimal cardiovascular

A single PMC treats 100 TSS from running as equivalent to 100 TSS from cycling, which is physiologically incorrect.

---

## Decision

Use a **single combined PMC** that aggregates TSS across all sports into one CTL/ATL/TSB series.

---

## Rationale

### Why single PMC

**Simplicity:** one PMC is immediately comprehensible. Athletes understand "your fitness is CTL=80" as a single number. Multiple PMCs (one per sport) multiply complexity and require explanation.

**Practical use:** athletes compete in one performance event (or prioritize one primary sport). A single readiness score is more actionable than three independent sport-specific scores.

**Industry standard:** TrainingPeaks, Intervals.icu, and Strava all use single-PMC approaches by default. Athletes familiar with these tools expect a unified view.

**ACWR integration:** injury risk (ACWR) is more meaningful as a global load change rate. Most overuse injuries in endurance athletes are driven by total training volume, not sport-specific volume in isolation.

**Partial mitigation:** the unit contamination problem is worst for triathlon athletes training across multiple sports. For athletes who primarily train in one sport with supplementary cross-training, the contamination effect is smaller.

---

## Alternatives Considered

### Alternative 1: Separate PMC per sport

**Description:** independent CTL_run, CTL_bike, CTL_swim, CTL_strength, each with their own ATL and TSB. Dashboard shows either a primary sport PMC or a view to select the sport.

**Pros:**

- More accurate for multi-sport athletes
- Running-specific CTL is a better predictor of running injury risk
- Triathlon planning could use sport-segregated freshness

**Cons:**

- 3-4 PMC charts instead of one
- Recommendation engine needs to aggregate across sport-specific TSBs
- Athletes with no primary sport have no useful summary
- Implementation complexity: 3-4× more state to manage and display

**Rejected for initial architecture.** Identified as a future improvement for triathlon athletes. See `triathlon.md#known-gaps` and `future-research.md`.

### Alternative 2: Weighted composite TSS by sport

**Description:** apply a sport-specific injury weight to TSS before combining into PMC. Running TSS × 1.2 (higher musculoskeletal stress), swimming TSS × 0.8.

**Pros:** retains single PMC while partially accounting for sport-specific stress differences.

**Cons:** the weighting factors would be empirically determined with no validated source. Adds complexity without solving the fundamental problem. Athletes couldn't compare their CTL with TrainingPeaks outputs.

**Rejected:** introduces pseudo-science without solving the problem.

---

## Consequences

### Positive

- Single, clean CTL number that athletes can understand and compare
- Consistent with industry tooling
- Simpler recommendation engine

### Negative

- CTL for triathletes has lower physiological meaning
- Running ACWR is underrepresented when run training forms a small fraction of total load
- Swimming TSS inaccuracy (see `strength-training.md` for similar issue) contaminates CTL

### Scientific debt created

- Cross-sport TSS normalization problem documented in `training-load.md#sport-normalization`
- Sport-segregated PMC listed as priority improvement in `future-research.md`
- Running injury risk may be underestimated for athletes who primarily swim/bike

---

## Review Criteria

This decision should be revisited if:

- A meaningful portion of SHARPIT users are triathletes training >10h/week across three sports
- Running injury rate in SHARPIT users is high despite "normal" ACWR (indicating the global ACWR is masking running-specific overload)
- The sport-segregated PMC feature is requested by multiple users
