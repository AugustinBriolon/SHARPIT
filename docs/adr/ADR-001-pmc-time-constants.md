# ADR-001: PMC Time Constants (τ_ctl=42, τ_atl=7)

**Status:** Accepted  
**Date:** 2024 (exact date unknown, predates knowledge base creation)  
**Author:** Augustin Briolon  
**Supersedes:** N/A

---

## Context

SHARPIT uses the Performance Management Chart (PMC) model to compute Chronic Training Load (CTL), Acute Training Load (ATL), and Training Stress Balance (TSB). The PMC is an exponentially weighted moving average model requiring two time constants:

- **τ_ctl**: the decay constant for CTL (fitness). Larger = slower response, longer memory.
- **τ_atl**: the decay constant for ATL (fatigue). Smaller = faster response, shorter memory.

The choice of time constants determines how quickly fitness and fatigue respond to training, and therefore how SHARPIT interprets training load relative to historical data.

---

## Decision

Use the Coggan/TrainingPeaks standard time constants:

- **τ_ctl = 42 days**
- **τ_atl = 7 days**

---

## Rationale

### Why τ_ctl = 42

The 42-day constant was established by Andrew Coggan and popularized by TrainingPeaks (Coggan 2003). It represents the time window over which aerobic fitness adaptations accumulate and decay. Practical interpretation: a complete training stimulus decay takes approximately 3×τ = ~126 days without training.

This constant is used by:

- TrainingPeaks WKO5
- Intervals.icu
- Golden Cheetah
- Virtually every professional endurance training analytics platform

The near-universal adoption makes this a de facto standard. Individual optimization is possible (see future improvements) but would deviate from the platform athletes use for coaching context.

### Why τ_atl = 7

The 7-day constant represents acute fatigue accumulation and recovery. It was established alongside τ_ctl by Coggan (2003). Practical interpretation: a hard week of training produces ATL that decays substantially within 1-2 weeks of rest. This matches the observed time course of training-induced fatigue and perceived exertion recovery.

The 7-day constant produces TSB values that intuitively align with athlete experience: after one week of rest, most athletes feel significantly fresher. After 42 days of no training, CTL has decayed to meaningfully lower levels.

---

## Alternatives Considered

### Alternative 1: Banister's original fitted constants

**Description:** Banister (1975) proposed fitting τ_p (performance/fitness) and τ_f (fatigue) for each athlete from performance tests. This produces individual constants rather than population averages.

**Rejected because:**

- Requires dedicated performance testing before SHARPIT can provide meaningful outputs
- New users would receive no PMC for weeks until tests complete
- Test methodology is not standardized for all sports

**Future improvement:** individual τ calibration after sufficient longitudinal data (see `future-research.md#sd-003`).

### Alternative 2: Shorter τ_ctl (28 days)

**Description:** some practitioners use τ_ctl = 28 for athletes with faster adaptation rates (younger athletes, highly trained).

**Rejected because:**

- Produces CTL that changes too rapidly; less stable fitness representation
- Deviates from the established standard without strong evidence for the SHARPIT user population

### Alternative 3: Multi-component model (Busso 2003)

**Description:** nonlinear model with separate fitness and fatigue components plus cross-interaction terms.

**Rejected because:**

- Requires individual parameter fitting
- Significantly more complex to explain to athletes
- Adds computational complexity without validated benefit for recreational athletes

---

## Consequences

### Positive

- Consistent with TrainingPeaks/Intervals.icu — athletes can compare SHARPIT CTL with coaching tools
- Population-validated time constants; appropriate for typical endurance athletes
- Simple, transparent computation

### Negative

- τ_ctl = 42 underestimates fitness adaptation for young athletes and overestimates decay for masters athletes
- Single time constant for all sports; cross-sport TSS contamination affects CTL meaningfulness (see ADR-002)
- Cold start: new users initialize at CTL=0, which underrepresents actual fitness for returning athletes

### Scientific debt created

- **SD-003** in `future-research.md`: individual τ calibration not implemented

---

## Review Criteria

This decision should be revisited if:

- Individual τ calibration methodology becomes practical at scale
- A multi-component model shows validated superiority in recreational/amateur endurance athletes
- User feedback consistently indicates CTL/ATL values do not match perceived fitness/fatigue
