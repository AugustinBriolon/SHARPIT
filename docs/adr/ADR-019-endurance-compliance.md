# ADR-019: Endurance compliance is measured per step, on a segmentation derived from the streams

**Status:** Accepted  
**Date:** 2026-08-21  
**Author:** Augustin Briolon  
**Supersedes:** N/A

---

## Context

Since [ADR-017](ADR-017-endurance-prescription-authoring.md) a planned run, ride or swim carries a structure: ordered steps, repeat groups, and a target band per step resolved against the athlete's own references. All three authoring surfaces — the coach's chat tools, the plan generator, the session editor — write it, and the watch executes it.

Nothing reads it back. A session leaves with six one-kilometre blocks at threshold and returns as a duration, a load and an RPE. The prescription is a one-way instruction.

What exists on the realised side:

- `ActivityStream.data` holds 1 Hz resampled series — `time`, `distance`, `heartrate`, `watts`, `velocity`, `cadence`, `altitude` — for any activity with usable device data.
- **No laps are ingested**, from Garmin or Strava. The watch knows where each block started and ended, because it ran the workout; SHARPIT does not import that.
- `SessionAnalysis` is produced by the AI and carries `complianceScore`, `verdict`, `remarks`.

Strength already solved the same problem, and the shape of that solution matters here. `computeStrengthCompliance` compares prescribed and realised deterministically, weights exercise coverage 0.7 against volume 0.3, and the analysis prompt states that the AI's `complianceScore` **may not go below** the structural score ([`coach-analysis.ts:219`](../../src/lib/coach/plan/coach-analysis.ts)). Endurance has no equivalent, and instead has the opposite: [`coach-analysis.ts:94`](../../src/lib/coach/plan/coach-analysis.ts) scrapes `"3x15min à 85% FTP"` out of the free-text description with a regex, to hand the model a power target it could now read from the structure directly. ADR-017 recorded that scraper as retirable once the structure became authoritative. It has.

---

## Decision

Compute an endurance compliance deterministically, before the AI sees the session, and let it constrain the verdict.

1. **Segmentation is derived from the streams.** Walk the prescribed steps in order, advancing a cursor through the stream by the step's own end condition — elapsed seconds for a time step, cumulative metres for a distance step. Lap-ended steps consume the remainder of their block's expected share. No lap ingestion.
2. **The score is coverage × adherence.** _Coverage_ is how much of the structure was executed — six blocks out of six. _Adherence_ is how much of each executed step was spent inside its resolved band. Both are reported separately, and the composite follows the strength weighting: coverage 0.7, adherence 0.3.
3. **Steps with no resolvable target contribute to coverage only.** A warm-up with no band, a swim set with no CSS reference, a step whose target could not be resolved: they were still done or not done, and they are not judged on a band that never existed.
4. **The result is a floor on the AI verdict**, stated in the analysis prompt exactly as the strength one is.
5. **The scraper is retired** for sessions carrying a structure, and kept only as the fallback for sessions authored before ADR-017.

---

## Rationale

**Why derive the segmentation rather than ingest laps.** Laps are the truthful answer and the wrong first step. They exist only for sessions the watch executed as a workout, which excludes every session in the existing history and every session the athlete ran from memory — precisely the population where "did you actually do the six blocks" is worth asking. Deriving from the streams works on all of it, on Strava as on Garmin, with no new pipeline and no provider dependency. The cost is honest and bounded: the segmentation is a hypothesis about where the blocks were, not a measurement, and it degrades when the athlete improvises. Laps remain the natural upgrade once the structured-push path has enough history to be worth reading back, and the interface here does not prevent it — only the segmentation source would change.

**Why coverage and adherence are separate numbers.** They fail differently and the athlete acts on them differently. Four blocks out of six at the right pace is a session cut short; six out of six all slightly too fast is a session run wrong. A single number cannot distinguish them, and the distinction is the whole coaching content. Keeping the strength weighting is not a physiological claim — it is consistency, so a compliance score means the same thing across sports.

**Why coverage dominates.** Doing the work matters more than holding the band exactly. An athlete who completes the structure a few seconds per kilometre off target executed the session; one who stopped after two blocks did not, however perfect those two were.

**Why unresolvable targets count only for coverage.** Punishing adherence when there was no band would convert a missing threshold into a failed session — the athlete would be scored down for a reference the app did not have. That inverts responsibility, and it would push the score down exactly for the sports where guidance is weakest ([ADR-018](ADR-018-swim-css-threshold.md) leaves swimming without a band whenever CSS is unknown).

**Why a floor rather than an input.** The same reason it is a floor for strength: the deterministic part is the part that is actually known. The model reading a summary can talk itself into a lenient verdict on a session where a third of the work is missing; it cannot argue with a count of executed steps. Above the floor the model keeps everything it is good at — reading the athlete's comment, the RPE, the context of the week.

**Why retire the scraper now rather than delete it outright.** Sessions planned before ADR-017 have prose and no structure, and they are still being analysed. The scraper stops being an architecture and becomes what it always should have been: a legacy fallback, invoked only when no structure exists.

---

## Alternatives Considered

### Alternative 1: ingest Garmin laps and compare against them

**Description:** Add lap ingestion to the activity pipeline and align prescribed steps to real laps.

**Pros:**

- Exact boundaries: the watch pressed the lap, so there is no inference at all.
- Handles improvisation correctly, because the laps record what happened rather than what was planned.

**Cons:**

- Works only for sessions pushed as structured workouts and executed as such — nothing historical, nothing manual, nothing from Strava.
- A new persisted shape, a backfill question, and a provider dependency, for a population that is currently near zero.

**Rejected because:** it optimises fidelity for the sessions that need the analysis least, and delivers nothing for the ones that need it most.

### Alternative 2: aggregate comparison, no segmentation

**Description:** Compare totals — time in band across the whole session, total work, total distance.

**Pros:**

- Robust: no cursor, no drift, no alignment assumptions.
- Simple to implement and to explain.

**Cons:**

- Cannot say which block failed, which is the entire reason to hold a structure.
- Time-in-band across a whole session is dominated by warm-up and recovery, which are the longest parts and the least informative.

**Rejected because:** it measures the session as if it had no structure, which is the state ADR-016 was written to leave behind.

### Alternative 3: adherence only, on quality steps

**Description:** Score only the steps carrying a band; ignore warm-up, recovery, cooldown.

**Pros:**

- Closest to training intent — the quality work is what the session is for.
- No need to decide what a warm-up "not done" means.

**Cons:**

- A session abandoned after two of six blocks can score 100, which is the failure mode a compliance score exists to catch.

**Rejected because:** it cannot see the most consequential deviation there is — the work that never happened.

### Alternative 4: let the AI compare structure to streams directly

**Description:** Serialise the prescription and a stream summary into the prompt and let the model judge.

**Pros:**

- No segmentation code, and the model can reason about context a formula misses.

**Cons:**

- Non-reproducible: the same session can score differently on two runs, so trends across weeks become noise.
- The model cannot count reliably over long series, which is exactly what coverage requires.

**Rejected because:** compliance feeds adaptation decisions, and a metric that moves on its own corrupts everything downstream of it.

---

## Consequences

### Positive

- The prescription becomes a loop: what was asked is compared with what was done, per step, and the difference is nameable.
- The coach's remarks can cite a specific block rather than the session as a whole, and adaptation reasons from measured execution rather than declared effort.
- Compliance means the same thing for strength and endurance — same weighting, same floor semantics.
- The regex scraper stops being load-bearing, closing the debt ADR-017 recorded.

### Negative

- The segmentation is inferred and will misalign when the athlete departs from the plan — extra recovery, a shortened block, a stop at a traffic light. The score is then wrong in a way that looks precise, which is worse than being obviously approximate. Mitigation: report the derived boundaries alongside the score so a suspect alignment is visible, and treat large drift as low confidence rather than as failure.
- Sessions with no usable stream (`available: false` — manual entries, most pool swims) get no adherence at all, only coverage, so a pool session's compliance will be structurally thinner than a run's.
- One more deterministic score the AI prompt must respect, and one more place where a change in the intensity table changes historical numbers.

### Scientific debt created

- "Time inside the band" treats every second equally: thirty seconds far outside the band and thirty seconds just outside it cost the same. A tolerance-weighted measure would be defensible and is deliberately deferred.
- The 0.7 / 0.3 weighting is inherited from strength for consistency, not derived for endurance.
- Nothing here judges _pacing quality_ within a block — a step run hard-then-fading and a step held evenly can score identically.

---

## Review Criteria

Revisit this decision if:

- Derived boundaries drift beyond a usable margin on a material share of analysed sessions — the segmentation hypothesis does not hold, and lap ingestion becomes the answer rather than an upgrade.
- The AI verdict sits at the floor on most sessions — the floor is doing all the work and the model's contribution is decorative.
- Athletes routinely dispute the score on sessions they consider well executed — coverage and adherence are measuring something other than what "done right" means to them.
- Structured sessions pushed to the watch become the majority of realised endurance sessions, which changes the cost/benefit of Alternative 1.

---

## References

- [ADR-016](ADR-016-endurance-prescription-relative-targets.md) — relative targets, resolution at push time
- [ADR-017](ADR-017-endurance-prescription-authoring.md) — structured authoring; records the scraper as debt
- [ADR-018](ADR-018-swim-css-threshold.md) — swim targets, and the case where no band exists
- `src/lib/planned-session/strength/strength-compliance.ts` — the deterministic precedent and its weighting
- `src/lib/coach/plan/coach-analysis.ts` — analysis prompt, compliance floor, and the scraper this retires
- `src/lib/streams/streams.ts` — resampled series the segmentation walks
