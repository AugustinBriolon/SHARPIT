# ADR-018: Swim pace targets anchor on a derived CSS threshold, read straight from realised sessions

**Status:** Accepted  
**Date:** 2026-08-20  
**Author:** Augustin Briolon  
**Supersedes:** N/A

---

## Context

[ADR-016](ADR-016-endurance-prescription-relative-targets.md) established that endurance targets are stored relative to an athlete reference and resolved at push time. Running anchors on `runThresholdPaceSecPerKm`, cycling on `ftpW`. Swimming had no reference at all, so it shipped with no target table: a pool session reached the watch as structure only, deliberately, rather than carrying invented numbers.

The reference existed in the data but in the wrong place. `SwimMetrics.cssSecPer100m` is populated per realised activity — Garmin computes critical swim speed on each pool session. That is a measurement of one swim, not a threshold to prescribe against, and `AthleteProfile` carried nothing equivalent to threshold pace or FTP for the water.

Two further constraints shaped the design. Heart rate is unusable for in-water guidance on most watches, so swimming is pace or nothing — there is no fallback metric the way running falls back from pace to heart rate. And pace itself reads per 100 m in a pool, not per kilometre, while Connect still wants a speed range in m/s.

---

## Decision

Derive an athlete-level `swimCssSecPer100m` as the **median CSS of pool sessions of at least 800 m within the standard threshold recency window**, store it on `AthleteProfile` with a snapshot for history, and anchor swim pace targets on it. The estimate reads `SwimMetrics` directly rather than passing through the records pipeline, and pace resolution becomes unit-aware so the same code path serves both `/km` and `/100m`.

---

## Rationale

**Why read `SwimMetrics` directly.** The records pipeline exists to rank performances and fit efforts into curves — power curves for FTP, distance-time bests for threshold pace. CSS needs neither: Garmin has already done the computation on each session. Routing it through `PerformanceRecord` rows would mean a new persisted group, a backfill path for existing rows, and an effort-reconstruction step, all to carry a number that is already stored one join away. The indirection would buy consistency of shape at the cost of machinery with no function.

**Why the median.** The best swim of a season is a peak, not a sustainable reference; anchoring on it prescribes every set too fast, and every set thereafter reinforces the error because the athlete cannot hold it. The mean is dragged the other way by technique sessions, where CSS reflects drills and rest rather than speed. The median is the value the athlete actually swims around.

**Why an 800 m floor.** Below that, a session is warm-up fragments or technique work. Its CSS is a real number computed on unrepresentative swimming, which is worse than a missing one — it looks trustworthy.

**Why the existing 120-day window.** A shorter window was considered, on the grounds that swim form moves faster than the estimate would track. It was rejected for consistency: `THRESHOLD_RECENCY_WINDOW_DAYS` is the project's answer to "recent demonstrated capacity" ([ADR-012](ADR-012-bidirectional-threshold-recency.md)), and a second, sport-specific window would need its own justification and its own maintenance. Swimming does not obviously warrant one.

**Why the swim anchors are compressed.** A runner's easy pace sits roughly 30 % below threshold speed; a swimmer's sits closer to 10 %. Water punishes the range — drag rises with the square of speed, so the usable spread between easy and threshold is much narrower. Applying the running percentages to swimming would prescribe recovery sets the athlete physically cannot swim slowly enough to hit.

---

## Alternatives Considered

### Alternative 1: use each session's CSS at push time, with no profile reference

Read the most recent qualifying `SwimMetrics.cssSecPer100m` when the workout is built.

No migration, no estimate, no snapshot. Rejected because it makes the prescription depend on whichever swim happened last: one technique session and every subsequent target shifts. It also leaves nothing for the athlete to see, override, or correct — the reference would be invisible, and a wrong one would be undebuggable.

### Alternative 2: carry swim efforts through the records pipeline

Add a `swim-effort` group to `PerformanceRecord` and derive CSS the way FTP and threshold pace are derived.

Consistent with how the other two thresholds are produced, and it would put swim data where the records UI could rank it. Rejected as machinery without a job: there is no curve to fit and no ranking to compute, so the pipeline would serve only as a transport layer for a value already computed and already persisted.

### Alternative 3: keep swimming target-free

Leave the structure-only behaviour shipped alongside the pool-length work.

Zero risk of prescribing a wrong pace. Rejected because the reference was derivable from data already in the database, and structure-only guidance leaves the athlete pacing a threshold set by feel while the watch stays silent about it.

---

## Consequences

### Positive

- Swim sets reach the watch with a pace band, guided and alerted like running and cycling.
- The reference updates itself as the athlete's swimming moves, and is snapshotted, so a pushed session going stale is detected by the same mechanism as the other sports.
- Pace resolution is unit-aware in one place: `/km` on land, `/100m` in the water, with the m/s conversion for Connect derived from the unit rather than duplicated.
- The athlete can see the derived value, override it, and watch it change — none of which a per-session lookup would allow.

### Negative

- The swim anchors (RECOVERY 85 %, ENDURANCE 90 %, TEMPO 96 %, THRESHOLD 100 %, VO2MAX 105 % of CSS speed) are reasoned from the physiology of swimming, not validated against this athlete's sessions. They are a starting point to correct, not a settled table.
- CSS quality is only as good as Garmin's per-session computation, which SHARPIT does not audit. A systematically wrong device figure produces a systematically wrong threshold, and the median hides rather than surfaces that.
- The 120-day window may lag genuine swim-form changes more than it does on land. Reused for consistency, to be revisited with evidence rather than pre-emptively.
- Swimming has no fallback metric. When CSS is unknown the session still ships, but with no guidance at all — where running would drop to heart rate.

### Neutral

- `ThresholdEstimates`, its preview and its apply path now carry three references instead of two; the existing "apply estimates" UI surfaces the swim change with no further work.
- Stroke type per step is still the Connect default: every step goes out as unspecified stroke, so drill sets read as plain swimming on the watch.

---

## References

- [ADR-016](ADR-016-endurance-prescription-relative-targets.md) — relative targets resolved at push time
- [ADR-012](ADR-012-bidirectional-threshold-recency.md) — threshold recency window
- `src/lib/threshold/swim-css.ts` — derivation
- `src/lib/planned-session/endurance/endurance-targets.ts` — swim anchors and unit-aware pace resolution
