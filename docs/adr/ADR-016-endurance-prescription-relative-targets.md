# ADR-016: Endurance prescriptions carry relative targets, resolved against current thresholds at push time

**Status:** Accepted  
**Date:** 2026-08-20  
**Author:** Augustin Briolon  
**Supersedes:** N/A

---

## Context

Structured strength sessions have reached the watch since [ADR-015](ADR-015-strength-watch-fidelity-and-scoring.md): `PlannedSession.strengthPrescription` holds sets and reps, a payload builder turns them into a Garmin Connect workout, and the push receipt (`garminWorkoutId`, `garminWorkoutScheduledDate`, `garminWorkoutPushedAt`) blocks duplicates.

Endurance sessions had no equivalent. A planned run carried a free-text `description`, a `durationMin`, and a `SessionIntensity` enum — a word, not a number. Two consequences followed:

1. **Nothing could be pushed.** The watch renders guidance from a step target expressed as a numeric range; an intensity label cannot be sent. The athlete had to translate the session mentally and run it unguided, which is exactly the step where a prescription leaks.
2. **The structure was being reconstructed by regex.** `parsePrescriptionTargets` in `bike-work-blocks.ts` scrapes `"3x15min à 85% FTP"` out of the description to evaluate a ride, with an explicit disclaimer that it "never claims a full workout AST". The structure existed in the athlete's head and in prose, and the code mined it back out.

A third force shaped the design. Athlete thresholds are not static: `AthleteProfile.runThresholdPaceSecPerKm`, `ftpW` and `lthr` are resynchronised from Garmin (`thresholdsSyncedAt`) and snapshotted in `AthleteThresholdSnapshot`. A session planned three weeks before it is run will, by the time it is run, have been written against stale references.

Constraint: SHARPIT reaches Connect through `@flow-js/garmin-connect`, an unofficial wrapper. Its `WorkoutBuilder` has no repeat step type and a flat `addStep`, so interval sessions cannot be expressed through it — but `createWorkout` accepts a raw payload, which the strength builder already exploits.

---

## Decision

Store endurance targets **relative** to athlete references (percent of threshold speed, FTP or LTHR) in a new `PlannedSession.endurancePrescription`, and resolve them into absolute values **at push time** against the thresholds in force that day. Persist the thresholds used with the push receipt (`garminWorkoutThresholds`) so a session already on the watch can be detected as out of date when its references move.

An absolute override (`absEasy` / `absHard`) is available per step and wins over the relative band.

---

## Rationale

**Why relative.** The Digital Twin owns the athlete's current state. A session that leaves for the watch carrying numbers derived from a superseded threshold is the Twin contradicting itself — the app would be asserting a threshold pace it no longer believes. Resolving at push time makes the prescription an intention that stays true, rather than a snapshot that silently rots.

**Why the thresholds are stored with the receipt.** Relative targets create a failure mode absolute ones do not: a session pushed on Monday and run on Saturday may no longer match the athlete. `garminPushClearOnSessionChange` cannot see this, because _the session did not change_ — the athlete did. Storing the thresholds used lets `garminPushStaleness` compare then against now and surface "already sent, thresholds moved, resend". Comparing thresholds rather than resolved targets also keeps the signal narrow: `thresholdKeysUsedBy` walks the prescription so an FTP update never flags a running session, and a step pinned to an absolute override contributes no dependency at all.

**Why percentages are expressed on speed, not pace.** Pace inverts — a faster pace is a smaller number of seconds. Expressing every band on an ascending easier-to-harder scale (speed, watts, bpm) means one direction convention across all three metrics, and the single inversion happens in one tested function rather than at every call site. Garmin itself stores a pace target as a speed range in m/s, so the conversion lands where it is needed anyway.

**Why easy sessions get a cap instead of a band.** On a recovery run, going slower than prescribed is not an error. A two-sided band makes the watch alert on it, and an alert that fires when nothing is wrong is what makes an athlete turn guidance off — losing the guidance on the quality sessions where it matters. Connect requires both bounds, so the floor is set at 40 % of reference: present in the payload, unreachable in practice.

---

## Alternatives Considered

### Alternative 1: resolve targets to absolute values at generation time

Store `"3:54–4:06/km"` directly when the session is planned.

Simpler: no resolution step, no threshold snapshot, and what the athlete reads in the app is exactly what the watch receives — no divergence to explain. But the numbers age. A session planned during a build block and run after a threshold test carries the old references, and nothing in the system knows. Rejected because it makes staleness invisible rather than manageable; the divergence still exists, it just stops being detectable.

### Alternative 2: relative targets, no threshold snapshot on the receipt

Resolve at push time but store nothing about what was used.

Cheaper by one column, and the app can always recompute what a session _would_ send today. But it cannot know what it _did_ send, so a session sitting on the watch with outdated numbers is indistinguishable from a current one. The athlete would have to re-push blindly, or discover the mismatch mid-session. Rejected: the receipt is the only place the past resolution survives.

### Alternative 3: express targets as Garmin zone indices

Connect accepts `zoneNumber` for heart rate and power, letting the watch resolve the zone itself.

Removes the resolution problem entirely and follows the athlete's own device configuration. Rejected because it moves the physiological authority into Garmin Connect: the zone boundaries would be whatever the athlete's Connect profile holds, which need not match the Twin's model of them. SHARPIT would be prescribing against numbers it does not own and cannot audit. Explicit bpm and watts keep the model authoritative.

### Alternative 4: keep parsing the free-text description

Extend `parsePrescriptionTargets` to cover running and swimming and build the payload from what it extracts.

No schema change, no editor, no migration. Rejected: a regex over prose is unbounded in failure modes and silent when it fails — a session that does not match the pattern loses its targets with no signal. The existing parser already carries a disclaimer to that effect. Building the structure once, upstream, removes the need for the parser rather than growing it.

---

## Consequences

### Positive

- Running sessions reach the watch with a pace band, and Garmin's native out-of-range alerting works with no further implementation — the guidance is a property of the step target.
- Targets sent are always derived from the athlete's current thresholds, whatever the planning horizon.
- A session already on the watch whose references moved is detectable and reportable, instead of silently wrong.
- The shared Connect protocol enums (`garmin-workout-enums.ts`) and push lifecycle (`garmin-workout-push.ts`) are extracted, so strength and endurance no longer duplicate token refresh, calendar scheduling, duplicate-push blocking or step-order allocation.
- Sessions with no structured prescription still push, as a single timed step derived from `durationMin` and `intensity`, flagged as derived rather than prescribed.

### Negative

- What the app displays and what the watch holds can diverge between push and execution. This is mitigated by staleness detection, not eliminated: the athlete must act on the badge.
- The intensity-to-percentage table is a physiological commitment. The centres (RECOVERY 68 %, ENDURANCE 80 %, TEMPO 90 %, THRESHOLD 100 %, VO2MAX 107 % of threshold speed) and the ±2.5 % half-band are validated for running only; bike and swim tables are deliberately absent and those sports resolve to no target until they are.
- `RACE` cannot be derived. `Goal` carries `raceFormat` and `targetPerformance` as free text, with no structured race distance or target pace, so a race-intensity session falls back to the threshold band and warns. Deriving it properly needs a structured field on `Goal` — parsing the text would reintroduce exactly the mechanism this ADR removes.
- One more nullable JSON column on `PlannedSession`, and a second prescription shape to keep in sync with validators, coach tooling and the UI.

### Neutral

- `endurancePrescription` and `strengthPrescription` are mutually exclusive, enforced in the validators by sport, mirroring the existing strength rule.
- Swim carries `poolLengthM` in the schema and the payload builder emits it, but no swim target table exists yet — the field is in place for phase 3, unused until then.
- The unofficial-wrapper risk is unchanged: this decision adds sports to a push path already in production, it does not add a new dependency or a new class of credential exposure.

---

## References

- [ADR-015](ADR-015-strength-watch-fidelity-and-scoring.md) — strength watch push, the pipeline this extends
- [ADR-012](ADR-012-bidirectional-threshold-recency.md) — threshold recency, why references move
- `src/lib/planned-session/endurance-prescription.ts` — schema
- `src/lib/planned-session/endurance-targets.ts` — intensity table and resolution
- `src/lib/integrations/garmin-endurance-workout-payload.ts` — Connect payload
- `src/lib/integrations/garmin-workout-push-state.ts` — staleness detection
