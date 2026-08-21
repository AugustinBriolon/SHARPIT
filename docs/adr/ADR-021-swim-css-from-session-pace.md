# ADR-021: Swim CSS is estimated from session pace, trimmed — the column ADR-018 read is never written

**Status:** Accepted  
**Date:** 2026-08-21  
**Author:** Augustin Briolon  
**Supersedes:** N/A — corrects the derivation in [ADR-018](ADR-018-swim-css-threshold.md)

---

## Context

[ADR-018](ADR-018-swim-css-threshold.md) anchored swim pace targets on an athlete-level CSS derived as the median of `SwimMetrics.cssSecPer100m` across qualifying pool sessions. Its stated premise was that "Garmin computes critical swim speed on each pool session", so the estimate had only to read a value already stored.

That premise is false in this codebase. Checked against the database:

```
SwimMetrics total: 42 | avec cssSecPer100m: 0
```

No sync path writes the column. It is read by one display helper and accepted by the manual-activity validator, and is empty for every one of the forty-two recorded swims. The derivation therefore returned `null` in every case, and every swim step would have shipped unguided — the exact outcome ADR-018 set out to remove. The error was asserted rather than verified, and no test caught it because the tests fed the estimator samples the database never produces.

Inspecting the data that _is_ recorded surfaced a second problem. `avgPaceSecPer100m` is populated for all forty-two sessions, but taking the fastest one gives 1:31/100 m for this athlete — twenty seconds per 100 m clear of the next four, which cluster tightly at 1:49–1:50. One anomalous record would have set the threshold, and in the direction that prescribes every set too fast.

---

## Decision

Estimate CSS from `SwimMetrics.avgPaceSecPer100m` rather than the unwritten `cssSecPer100m`, and take the **second-fastest** qualifying session in the window rather than the fastest or the median. Below three qualifying sessions there is nothing to trim against, and the fastest is used.

The distance floor (800 m) and the recency window from ADR-018 are unchanged.

---

## Rationale

**Why session pace at all.** It is the only swim speed the database actually holds. Properly, CSS comes from two time trials — `(400 − 200) / (T400 − T200)` — and nothing recorded is a time trial. The estimate is therefore a proxy, and the code says so rather than borrowing the authority of the real measurement.

**Why not the median, as ADR-018 had it.** That reasoning applied to a per-session CSS: a value already corrected for warm-up and rest, where the season's best is a peak. A session _average_ is a different input. It includes warm-up, drills and rest, so it reads systematically slower than the pace the athlete can hold, and a median of such averages would compound the bias — prescribing every set far too easy.

**Why not the fastest either.** The bias correction argues for an extremum, but an extremum is exactly what a single bad record captures: a mis-recorded duration, a short-course swim, a set with fins. This athlete's history shows the failure concretely, with one session sitting far outside an otherwise tight cluster.

**Why the second-fastest.** It keeps most of the correction while requiring two sessions to agree before the reference moves. It is one line, it needs no outlier model, and its failure mode is a threshold slightly too slow — which prescribes sets that are easier than intended, and is the recoverable direction. Prescribing too fast is not.

---

## Alternatives Considered

### Alternative 1: populate `cssSecPer100m` during sync

Fix the premise rather than the derivation: compute or fetch a real CSS per session and write it.

The right answer if Garmin exposed a per-session CSS, and it would restore ADR-018 unchanged. Rejected because Garmin's activity payload carries no such field — CSS is a coaching construct derived from time trials, not a per-session metric — so "populating it" would mean computing a proxy anyway and storing it under a name that claims more than it measures.

### Alternative 2: manual entry only

Drop the estimate; the athlete types their CSS into the profile field that already exists.

Zero inference and zero risk of a wrong number, and it works today. Rejected as the sole mechanism because it makes swimming the one sport whose reference never moves on its own, while running and cycling update themselves — and a stale swim threshold is silently wrong in the same way an unwritten column was. Manual entry remains available and overrides the estimate.

### Alternative 3: reject outliers statistically

Discard samples more than some multiple of the interquartile range from the median, then take the fastest survivor.

More principled, and it would scale to histories where two bad records coincide. Rejected for now as machinery ahead of its evidence: with a dozen qualifying sessions the trimmed extremum and the outlier model give the same answer, and the simpler rule is the one that can be explained to the athlete in a sentence.

---

## Consequences

### Positive

- Swim targets resolve at all, which they could not before: this athlete's estimate lands at 1:49/100 m, inside the observed cluster.
- A single mis-recorded or fin-assisted session can no longer set the threshold.
- The estimator's inputs now exist for every recorded swim, so the reference updates as the athlete swims.

### Negative

- The estimate reads slow by an unquantified amount, because a session average includes rest. Sets will be prescribed slightly easy until the athlete corrects the value by hand.
- It is a proxy wearing the name CSS. The field, the label and the ADR say so, but the prescription that comes out of it does not.
- Open-water swims are not excluded — nothing on the activity distinguishes them from pool sessions — and their pace is not comparable. They read slower here, so they do not currently affect a fastest-based estimate, but that is luck rather than design.
- Two sessions must agree before the reference moves, so a genuine step change in form takes one extra session to register.

### Neutral

- `MIN_SAMPLES_TO_TRIM` and `SWIM_CSS_MIN_DISTANCE_M` are single constants, tunable once the athlete has swum against the prescription.
- The swim anchor table from ADR-018 is unaffected: only what feeds it changed.

---

## References

- [ADR-018](ADR-018-swim-css-threshold.md) — the derivation this corrects
- [ADR-012](ADR-012-bidirectional-threshold-recency.md) — recency window
- `src/lib/threshold/swim-css.ts` — estimator
- `src/lib/threshold/threshold-service.ts` — sample loading
