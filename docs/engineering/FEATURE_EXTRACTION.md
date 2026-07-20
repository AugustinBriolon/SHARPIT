# SHARPIT — Feature Extraction Layer

> **Status:** Design document. No production code exists yet.
> **Source of truth:** `docs/DOMAIN_CONCEPTS.md`, `docs/SYSTEM_FLOW.md`
> **Author:** Principal Architect
> **Decision:** Introduces a new first-class architectural layer between the Observation Engine and the Signal Engine.

---

## Why This Layer Exists

The Observation Engine produces validated, normalized observations.
The Signal Engine will produce interpreted, contextualized signals.

Between these two layers, something is missing.

Observations describe **what happened**:

> "A Garmin activity was recorded at 07:00. Duration: 3600s. Avg HR: 155 bpm."

Signals describe **what it means**:

> "Cardiovascular fatigue is increasing. Confidence: 0.71."

But signals cannot be derived directly from raw observations without intermediate computation. To determine that fatigue is increasing, the Signal Engine needs:

- The HR drift during the session (not just average HR)
- The session's training stress (not just duration)
- Where this load sits in the athlete's recent history
- How today's HRV compares to the personal baseline

These intermediate values are **Features**. They are still facts. They contain no interpretation. But they are computable, reproducible, and domain-independent characteristics extracted from one or more observations.

The pipeline with this layer is:

```
Sources
  │
  ▼  [Adapters]
Observations (raw facts)
  │
  ▼  [Validation + Normalization — Observation Engine]
Observations (validated, normalized, persisted)
  │
  ▼  [Feature Extraction Layer]        ← this document
Features (computable characteristics)
  │
  ▼  [Signal Engine]
Signals (interpreted meanings)
  │
  ▼  [Inference Models]
Athlete State
  │
  ▼  [Decision Engine]
Recommendations · Predictions · Alerts
```

---

## The Three-Layer Distinction

This is the most important conceptual boundary in SHARPIT.

| Concept     | Question answered                   | Example                                          | Context-sensitive? |
| ----------- | ----------------------------------- | ------------------------------------------------ | ------------------ |
| Observation | What was measured?                  | `avgBpm = 155`, `totalSleepMin = 450`            | No                 |
| **Feature** | **What can be computed?**           | `hrDriftPercent = +8.2`, `sleepEfficiency = 78%` | No                 |
| Signal      | What does it mean for this athlete? | `CardiovascularFatigue: INCREASING`              | Yes                |

The critical rule:

> **Features are context-free. Signals are context-dependent.**

A Feature like `hrDriftPercent = +8.2%` is the same computation for any athlete.
A Signal like `CardiovascularFatigue: ELEVATED` requires knowing this athlete's baseline,
their current training block, and their personal thresholds.

This separation is the architectural invariant that allows:

- Feature extractors to evolve without touching inference logic.
- Inference models to be swapped without re-extracting features.
- Multiple models to share the same feature set.
- Features to be audited, replayed, and tested independently.

---

## What is a Feature?

A Feature is a **derived, reproducible, domain-independent measurable characteristic** computed from one or more normalized Observations.

A Feature:

- Is always traceable to its source Observation(s).
- Has its own confidence level (inherited from the weakest input Observation).
- Is computed at a point in time (carries a `computedAt` timestamp).
- Is immutable once computed (a new computation produces a new Feature version).
- Knows which computation algorithm produced it (for audit and replay).
- Is **not** an interpretation. It contains no language like "good", "elevated", "increasing".
- Is **not** a raw observation field. It always requires at least minimal derivation.

### A Feature is NOT:

- A raw field copy-pasted from an observation (that is the observation itself).
- An inference (that is the Signal Engine's job).
- A score (scores carry subjective weighting — they belong to models).
- A recommendation (that belongs to the Decision Engine).

---

## Feature Lifecycle

```
PENDING
  │  (source observations arrive and are validated)
  ▼
COMPUTING
  │  (extractor runs; may fail if inputs are incomplete)
  ▼
COMPUTED
  │  (result persisted with computedAt, algorithm version)
  │  (a new observation in the input window arrives)
  ▼
INVALIDATED
  │  (re-extraction is scheduled)
  ▼
RECOMPUTING
  │
  ▼
COMPUTED  (new version replaces old)
```

**Key invariant:** A Feature in `PENDING` state is not zero. It is explicitly absent.
Downstream layers (Signal Engine, Models) must handle `PENDING` features as `UNKNOWN`
rather than treating them as zero-value.

**Key invariant:** Features are never deleted. They are versioned.
The latest version is the canonical value. Older versions are retained for audit.

---

## Feature Categories

Features are organized into five categories. Each category maps to one or more source Observation types.

### 1. Session Features

**Source:** `SESSION` observation
**Scope:** per-session (one Feature set per session)

| Feature Name           | Unit            | Source                        | Derivation                                            |
| ---------------------- | --------------- | ----------------------------- | ----------------------------------------------------- |
| `tssScore`             | score (0–∞)     | power or HR + duration        | TSS = IF² × durationHr × 100 (power path preferred)   |
| `intensityFactor`      | ratio           | NP / athlete FTP              | IF = NP ÷ FTP                                         |
| `hrDriftPercent`       | %               | HR in first/second half       | (avgHR_2ndHalf − avgHR_1stHalf) / avgHR_1stHalf × 100 |
| `efficiencyFactor`     | pace/HR or W/HR | pace + HR or NP + HR          | pace (m/s) ÷ avgHR or NP ÷ avgHR                      |
| `aerobicLoadFactor`    | ratio 0–1       | time in Z1+Z2 / totalDuration | fraction of effort in aerobic zones                   |
| `anaerobicLoadFactor`  | ratio 0–1       | time in Z4+Z5 / totalDuration | fraction of effort above threshold                    |
| `timeInZones`          | minutes[5]      | HR or power streams           | duration spent in each of 5 zones                     |
| `paceVariabilityIndex` | ratio           | pace stream                   | stdDev(pace) / avgPace                                |
| `elevationStressScore` | score           | elevation + sport type        | elevation gain × sport-specific factor                |
| `mechanicalLoad`       | kJ              | power stream                  | ∫ power dt                                            |

**What `tssScore` is NOT:**
The source-provided TSS (Garmin, Strava) is stored on the `Observation` as `sourceProvidedStress`.
SHARPIT's canonical `tssScore` Feature is computed independently by the extractor using the
athlete's known FTP and power or HR data. The source-provided value is retained for cross-validation only.

---

### 2. Load Features

**Source:** window of `SESSION` observations
**Scope:** per-training-day (rolling window, not per session)

Load features require a time window. They are computed fresh each time a new SESSION observation
is ingested within the relevant window.

| Feature Name            | Unit          | Window    | Derivation                                       |
| ----------------------- | ------------- | --------- | ------------------------------------------------ |
| `acuteLoad`             | TSS           | 7 days    | Rolling sum of daily tssScore                    |
| `chronicLoad`           | TSS/week      | 42 days   | Rolling sum ÷ 6 (expressed as weekly equivalent) |
| `acwr`                  | ratio         | 7/42 days | acuteLoad ÷ chronicLoad                          |
| `weeklyLoad`            | TSS           | 7 days    | acuteLoad (alias for readability)                |
| `loadMonotony`          | ratio         | 7 days    | avgDailyLoad ÷ stdDev(dailyLoad)                 |
| `loadStrain`            | score         | 7 days    | weeklyLoad × loadMonotony                        |
| `trainingFrequency`     | sessions/week | 7 days    | count of sessions in window                      |
| `restDayCount`          | days          | 7 days    | days with zero training load                     |
| `acuteChronicLoadTrend` | ratio delta   | 14 days   | Δ(acwr) over 14 days — rate of change            |

**Design note on ACWR:** ACWR is retained as a feature because it is a widely-used, computable ratio.
It is NOT a signal. Whether an ACWR of 1.4 is dangerous for THIS athlete is determined by the Signal Engine
using this athlete's historical injury risk context. The feature layer makes no such judgment.

---

### 3. Recovery Features

**Source:** `SLEEP`, `HRV`, `RESTING_HR` observations
**Scope:** per-training-day

| Feature Name                | Unit           | Source               | Derivation                                          |
| --------------------------- | -------------- | -------------------- | --------------------------------------------------- |
| `sleepEfficiencyPercent`    | %              | SLEEP                | (deepMin + remMin) / totalMinutes × 100             |
| `sleepDebtMin`              | minutes        | SLEEP × 7 days       | targetSleepMin × 7 − sum(actualSleepMin)            |
| `sleepOnsetConsistencyMin`  | minutes σ      | SLEEP × 14 days      | stdDev of bedtime-from-midnight across 14 nights    |
| `sleepDurationTrend`        | min/day        | SLEEP × 7 days       | linear regression slope of totalMinutes             |
| `hrvAbsolute`               | ms RMSSD       | HRV                  | Direct from observation (method-normalized)         |
| `hrvDeltaFromBaseline`      | %              | HRV + 14-day window  | (todayHRV − rollingAvg14d) / rollingAvg14d × 100    |
| `hrvCoefficientOfVariation` | %              | HRV × 7 days         | stdDev(hrv7d) / avg(hrv7d) × 100                    |
| `rhrAbsolute`               | bpm            | RESTING_HR           | Direct from observation                             |
| `rhrDeltaFromBaseline`      | bpm            | RHR + 14-day window  | todayRHR − rollingAvg14d                            |
| `subjectiveWellnessIndex`   | 0–10 composite | SUBJECTIVE           | weighted(mood, energy, soreness) normalized to 0–10 |
| `rpeVsTargetZone`           | delta          | SUBJECTIVE + SESSION | rpe − targetRpe derived from session zone           |

**Why 14-day windows for HRV baseline:**
Research (Plews et al., Buchheit 2014) establishes that a 14-day rolling average best captures
the individual HRV baseline while remaining sensitive to acute changes. This is a scientific
constant, not an arbitrary choice.

---

### 4. Body Composition Features

**Source:** `BODY_COMPOSITION` observations
**Scope:** per-observation + rolling trend

| Feature Name           | Unit   | Source                  | Derivation                                      |
| ---------------------- | ------ | ----------------------- | ----------------------------------------------- |
| `weightKg`             | kg     | BODY_COMPOSITION        | Direct (bioimpedance is accepted at face value) |
| `fatMassKg`            | kg     | BODY_COMPOSITION        | weightKg × (fatPercent / 100)                   |
| `leanMassKg`           | kg     | BODY_COMPOSITION        | weightKg × (1 − fatPercent / 100)               |
| `weightTrend7d`        | kg/day | BODY_COMPOSITION × 7d   | Linear regression slope                         |
| `fatPercentTrend7d`    | %/day  | BODY_COMPOSITION × 7d   | Linear regression slope                         |
| `weightRelativeToGoal` | %      | BODY_COMPOSITION + Goal | (current − goal) / goal × 100                   |

---

### 5. Condition Features

**Source:** `PHYSICAL_CONDITION` observations
**Scope:** per-condition, rolling

| Feature Name                 | Unit    | Source                      | Derivation                                             |
| ---------------------------- | ------- | --------------------------- | ------------------------------------------------------ |
| `activeConditionCount`       | count   | PHYSICAL_CONDITION (recent) | count of open conditions by severity threshold         |
| `maxActiveSeverity`          | 0–10    | PHYSICAL_CONDITION          | max(severity) among open conditions                    |
| `conditionTrend`             | delta   | PHYSICAL_CONDITION × time   | Δ severity over last 3 check-ins                       |
| `trainingBlockedByCondition` | boolean | PHYSICAL_CONDITION          | any condition with affectsTraining=true and severity≥7 |

---

## Naming Conventions

```
{category}.{name}
```

- `session.tssScore`
- `session.hrDriftPercent`
- `load.acwr`
- `load.acuteLoad`
- `recovery.sleepEfficiencyPercent`
- `recovery.hrvDeltaFromBaseline`
- `body.weightTrend7d`
- `condition.maxActiveSeverity`

**Rules:**

1. Names are camelCase.
2. Category is lowercase dot-prefixed.
3. If a feature depends on a specific window, the window is part of the name: `7d`, `14d`, `42d`.
4. Names are stable. Changing a name breaks the audit trail — prefer versioning the algorithm instead.
5. No negatives in names. `sleepDebtMin` not `missSleepMin`. Positive framing.
6. Units are explicit in the name when not obvious: `Percent`, `Min`, `Kg`, `Bpm`, `Sec`.

---

## Persistence Strategy

### Rationale for persisting features

Features could, in principle, be re-computed on demand. This would be acceptable for fast
single-observation features (e.g., `session.efficiencyFactor`). But window features like
`load.acwr` require iterating over 42 days of sessions. Re-computing this on every Signal
Engine run would be prohibitively slow at scale.

Features are therefore **persisted** but **invalidatable**.

### Schema concept

```
Feature {
  id              : UUID (stable across versions)
  athleteId       : String
  name            : String           // "load.acwr"
  version         : Int              // monotonically increasing, starts at 1
  trainingDayId   : String?          // YYYY-MM-DD, or null for session-scoped features
  sessionId       : String?          // Observation ID, for session-scoped features
  status          : FeatureStatus    // PENDING | COMPUTING | COMPUTED | INVALIDATED
  value           : JSON             // type-safe value for this feature name
  confidence      : Float            // 0.0–1.0, inherited from weakest input
  computedAt      : DateTime
  algorithmId     : String           // "tss-v1", "acwr-v2" — for audit/replay
  sourceObsIds    : String[]         // IDs of Observations that produced this Feature
  windowDays      : Int?             // null for session-scoped, 7/14/42 for window features
}
```

### Persistence rules

1. **Session-scoped features** (tssScore, hrDrift, efficiencyFactor):
   - Computed immediately when a SESSION observation is accepted.
   - Invalidated only if the source observation is updated (rare).

2. **Day-scoped features** (load.acwr, recovery.sleepEfficiency):
   - Computed after all observations for a training day are received.
   - Invalidated when any observation within the relevant window changes.
   - A new SESSION arriving 3 weeks ago invalidates all window features
     whose window includes that date.

3. **Trend features** (weightTrend7d, hrvDeltaFromBaseline):
   - Computed daily, using a rolling window.
   - Invalidated when any observation within the window changes.

### Invalidation is additive, not destructive

When a Feature is invalidated:

- Its status changes to `INVALIDATED`.
- A background job re-computes it.
- The new computation creates `version: N+1`.
- The old version is retained (audit trail, Signal Engine replay).

The Signal Engine always reads the latest non-invalidated version.
When all available versions are invalidated, the Signal Engine receives `PENDING`.

---

## Ownership

```
src/core/
  features/
    types.ts               // Feature, FeatureStatus, FeatureCategory, all value types
    extractors/
      session-extractor.ts // SESSION → SessionFeatures
      load-extractor.ts    // SESSION[] (window) → LoadFeatures
      recovery-extractor.ts // SLEEP + HRV + RHR → RecoveryFeatures
      body-extractor.ts    // BODY_COMPOSITION → BodyFeatures
      condition-extractor.ts // PHYSICAL_CONDITION → ConditionFeatures
    repository.ts          // Port (interface) — pure, no Prisma
    engine.ts              // FeatureEngine — orchestrates extraction + invalidation
    index.ts               // Public API
```

**Rules:**

- Each extractor is a **pure function module**: `(observations: Observation[], context: ExtractionContext) => Feature[]`
- Extractors have no side effects. They receive observations in, return features out.
- The `FeatureEngine` handles orchestration, persistence calls, and invalidation logic.
- `ExtractionContext` carries athlete-specific constants (FTP, timezone, sleep goal) — not domain state.

---

## Public API

```typescript
interface FeatureEngine {
  /**
   * Triggered by the ObservationEngine after every successful ingestion.
   * Determines which features are affected and schedules re-computation.
   */
  onObservationIngested(observation: Observation): Promise<void>;

  /**
   * Returns all current (latest non-invalidated) features for an athlete.
   * Window features are computed for the given reference date.
   */
  getFeatures(athleteId: string, trainingDayId: string): Promise<AthleteFeatures>;

  /**
   * Returns features for a specific session.
   */
  getSessionFeatures(athleteId: string, sessionObsId: string): Promise<SessionFeatureSet>;

  /**
   * Returns the feature history for audit/replay.
   * Includes all versions.
   */
  getFeatureHistory(athleteId: string, featureName: string, since: Date): Promise<Feature[]>;
}
```

```typescript
// AthleteFeatures: the complete feature snapshot for a given training day
type AthleteFeatures = {
  trainingDayId: string;
  computedAt: Date;
  load: LoadFeatureSet | 'PENDING';
  recovery: RecoveryFeatureSet | 'PENDING';
  body: BodyFeatureSet | 'PENDING';
  condition: ConditionFeatureSet | 'PENDING';
  sessions: SessionFeatureSet[];
};
```

**Key design decision:** `'PENDING'` is a first-class value, not `null` or `undefined`.
This distinction matters: `null` would mean "the value is zero". `'PENDING'` means
"the value cannot yet be determined." The Signal Engine must treat them differently.

---

## Update Strategy

### Trigger model

Feature extraction is **event-driven**, not scheduled.

Every time the ObservationEngine emits an `ObservationIngested` event:

1. The FeatureEngine determines which feature names are affected.
2. It marks affected features as `INVALIDATED`.
3. It immediately computes session-scoped features synchronously.
4. It enqueues window-feature computation asynchronously (background job).

This ensures:

- Session features are available almost immediately (< 200ms).
- Load/recovery window features are available within seconds.
- The Signal Engine is never blocked waiting for feature computation.

### Backfill

When the athlete first connects a source (Garmin sync imports 90 days of history),
the FeatureEngine runs a full backfill:

1. Session features for all historical sessions.
2. Window features starting from day 7 (insufficient data before that → `PENDING`).

### Algorithm versioning

When a feature algorithm is updated (e.g., `tss-v1` → `tss-v2`):

1. A migration job recomputes all features using the new algorithm.
2. Old versions with `algorithmId: 'tss-v1'` are retained.
3. The Signal Engine begins consuming `tss-v2` features.
4. A flag period allows rollback by reverting the Signal Engine's algorithm preference.

---

## Invariants

These are non-negotiable rules enforced by the FeatureEngine. Any violation must be a hard error, not a warning.

1. **Source traceability:** Every Feature must reference the Observation IDs that produced it. A Feature without source references is invalid.

2. **Confidence ceiling:** A Feature's confidence can never exceed the quality-derived confidence of its weakest input Observation. PROPRIETARY_MODEL observations cap their derived features at confidence ≤ 0.40.

3. **Monotonic versioning:** Feature version numbers always increase. No version can be deleted.

4. **No interpretation in features:** A Feature value must never be a string that implies judgment: `"good"`, `"elevated"`, `"dangerous"`. Feature values are always numeric, boolean, or structured numeric objects.

5. **Pending is explicit:** Missing or insufficient input data must result in `PENDING` status — never a default numeric value (e.g., `acwr: 0`).

6. **Algorithm identity:** Every Feature must record which algorithm version produced it. An anonymous Feature is invalid.

7. **Window completeness:** A window Feature whose source window is incomplete (< 3 data points) must carry a `SPARSE_DATA` confidence penalty: `confidence × 0.5`.

---

## Dependencies

The Feature Extraction Layer depends only on:

- `src/core/observation/` — to read normalized Observations (read-only)
- `src/core/features/` — internal (types, extractors, repository port)

The Feature Extraction Layer must NOT depend on:

- Any Signal Engine concept
- Any Model or Athlete State concept
- Any UI or framework layer
- Any database adapter (repository port is an interface)

The Signal Engine will depend on the Feature Layer — not the reverse.

---

## Extensibility

### Adding a new Feature

1. Define its name and value type in `types.ts` following naming conventions.
2. Add it to the appropriate `FeatureSet` type.
3. Implement its computation in the relevant extractor (pure function).
4. Write unit tests (pure functions → zero mocks needed).
5. No other file needs to change.

### Adding a new Feature Category

1. Create a new extractor in `extractors/`.
2. Add a new `FeatureSet` type in `types.ts`.
3. Add it to `AthleteFeatures`.
4. Register the new observation trigger in `FeatureEngine.onObservationIngested`.
5. The Signal Engine can then consume it immediately.

### Replacing a computation algorithm

1. Implement new algorithm alongside old one (`tss-v1.ts`, `tss-v2.ts`).
2. Run A/B comparison on historical data.
3. Update `algorithmId` reference in the extractor.
4. Run migration job. Old versions retained.

---

## Concrete Examples

### Example 1 — Garmin Run Session

**Observation ingested:**

```
SessionObservation {
  type: 'SESSION', source: 'GARMIN',
  sportType: 'RUN',
  durationSec: 3550,          // moving duration
  hrData: { avgBpm: 155, maxBpm: 178, quality: 'MEASURED_OPTICAL' },
  paceData: { avgMinPerKm: 5.97, distanceM: 9870 },
  elevationM: 120,
  sourceProvidedStress: { value: 65, quality: 'ESTIMATED' }
}
```

**Features extracted:**

```
session.tssScore             = 68.4  (computed from HR: TRIMP method, IF from avgHR/maxHR)
session.intensityFactor      = null  (no power data → N/A)
session.hrDriftPercent       = +6.2% (estimated from HR stream, or null if no stream)
session.efficiencyFactor     = 0.174 (pace in m/s ÷ avgHR)
session.aerobicLoadFactor    = 0.87  (87% time in Z1+Z2 based on HR zones)
session.anaerobicLoadFactor  = 0.04  (4% time in Z4+Z5)
session.elevationStressScore = 12.0  (120m × 0.1 run factor)
```

**Confidence:** 0.65 (inherited from `MEASURED_OPTICAL` HR quality)
**AlgorithmId:** `session-tss-trimp-v1`

---

### Example 2 — Garmin Health Day

**Observations ingested:**

```
HrvObservation:        valueMsRmssd = 48, method: OVERNIGHT_AVERAGE
RestingHrObservation:  valueBpm = 52
SleepObservation:      totalMinutes = 390, deepMin = 60, remMin = 85
```

**Features extracted:**

```
recovery.hrv14dBaseline          = 61.3   (rolling 14-day avg: prior 14 nights)
recovery.hrvDeltaFromBaseline    = −21.5% (48 vs 61.3: significant drop)
recovery.hrvCoefficientOfVariation = 14.2% (HRV variability this week)
recovery.rhrAbsolute             = 52
recovery.rhrDeltaFromBaseline    = +4     (52 vs 48.0 rolling avg: elevated)
recovery.sleepEfficiencyPercent  = 37.2%  ((60+85)/390 × 100: poor)
recovery.sleepDebtMin            = +270   (7-day deficit vs 7h goal)
```

**Confidence:** 0.70 (MEASURED_OPTICAL quality for HRV)
**Note:** The Signal Engine will later interpret this feature set as a `RecoverySignal: CRITICAL`.
The Feature Layer makes no such judgment — it only computes the numbers.

---

### Example 3 — Strava Cycling Session (no power meter)

**Observation ingested:**

```
SessionObservation {
  type: 'SESSION', source: 'STRAVA',
  sportType: 'BIKE',
  durationSec: 5400,
  hrData: { avgBpm: 148, quality: 'MEASURED_OPTICAL' },
  paceData: { avgMinPerKm: null, distanceM: 52000 }
  sourceProvidedStress: { value: 94, quality: 'ESTIMATED' }
}
```

**Features extracted:**

```
session.tssScore             = 87.3  (HR-based TRIMP, athlete FTP: 280W)
session.intensityFactor      = null  (no power)
session.hrDriftPercent       = null  (no HR stream available)
session.efficiencyFactor     = null  (no pace for cycling without power)
session.aerobicLoadFactor    = 0.62  (estimated from avgHR relative to zones)
```

**Confidence:** 0.55 (MEASURED_OPTICAL HR, no direct power → TSS has higher uncertainty)
**QualityFlag:** `ESTIMATED_FROM_HR` carried forward from Observation

---

### Example 4 — Renpho Body Composition

**Observation ingested:**

```
BodyCompositionObservation {
  weightKg: 71.8, fatPercent: 17.2, musclePercent: 43.1
}
```

**Features extracted (with 7-day history):**

```
body.weightKg              = 71.8
body.fatMassKg             = 12.35   (71.8 × 0.172)
body.leanMassKg            = 59.45   (71.8 × 0.828)
body.weightTrend7d         = −0.08   (kg/day: slowly decreasing — linear regression)
body.fatPercentTrend7d     = −0.03   (%/day: slowly decreasing)
body.weightRelativeToGoal  = −1.6%   (goal: 73 kg)
```

**Confidence:** 0.55 (bio-impedance accuracy is ±2% for fat percentage; hydration-sensitive)
**Note:** Bio-impedance accuracy limitation is a known systemic bias. It affects confidence
but does not prevent feature computation.

---

## Migration Strategy from Current Implementation

### Current state

The current codebase computes the equivalent of some features inline inside `src/lib/`:

- `src/lib/training-load.ts` → computes `acuteLoad`, `chronicLoad`, `acwr` on request
- `src/lib/recovery.ts` → computes `buildReadinessView`, `buildFormView` on request
- `src/lib/sleep.ts` → computes `analyzeSleep` on request
- ~~`src/lib/dashboard.ts`~~ (removed) → ACWR zones live in `src/lib/effort/load-reading.ts`; daily verdict in `src/core/decision/`

These are functionally equivalent to a subset of Load Features and Recovery Features.
However, they:

- Mix computation with UI concerns (`buildReadinessView` returns UI-ready strings)
- Are computed on-demand (no caching, no versioning, no invalidation)
- Are not traceable to source Observations
- Cannot be audited or replayed

### Migration approach — Strangler Fig

This mirrors the approach used for the Observation Engine.

**Phase 1: Extract and formalize**
Identify the computation logic inside `src/lib/training-load.ts`, `recovery.ts`, `sleep.ts`.
Rewrite these computations as pure Feature extractors in `src/core/features/extractors/`.
Validate equivalence with unit tests comparing old and new outputs on the same inputs.

**Phase 2: Dual write**
When Observations are ingested:

- Existing `src/lib/` computations continue to serve the UI (no regression).
- The FeatureEngine also computes and persists features in parallel.
- Both paths coexist.

**Phase 3: Read migration**
Once features are trusted (validated by tests and production data):

- The Signal Engine reads from `FeatureEngine.getFeatures()` instead of `src/lib/`.
- UI components that directly call `src/lib/` functions are migrated to consume features
  via the Signal Engine.

**Phase 4: Deprecation**

- `src/lib/training-load.ts`, `recovery.ts`, `sleep.ts` computation logic is removed.
- Only their test suites are retained temporarily for regression comparison.

### Files affected

| File                       | Status             | Action                                                      |
| -------------------------- | ------------------ | ----------------------------------------------------------- |
| `src/lib/training-load.ts` | Partially replaced | Extract ACWR/load logic → `load-extractor.ts`               |
| `src/lib/recovery.ts`      | Partially replaced | Extract HRV/RHR logic → `recovery-extractor.ts`             |
| `src/lib/sleep.ts`         | Partially replaced | Extract sleep efficiency → `recovery-extractor.ts`          |
| ~~`src/lib/dashboard.ts`~~ | Removed            | Zones → `effort/load-reading.ts`; verdict → Decision Engine |
| ~~`src/lib/alerts.ts`~~    | Removed            | Decision Engine + Athlete Snapshot / Today                  |

### What does NOT change

- The Observation Engine. It remains the sole entry point for raw data.
- The existing Prisma `Activity`, `DailyHealth`, `BodyCompositionMeasurement` tables.
  Features are derived from `Observation` records — the legacy tables continue to serve
  the existing UI until the read path is migrated.
- The sync mechanisms (`garmin-sync.ts`, `strava-sync.ts`, etc.). They already feed
  the Observation Engine.

---

## Open Questions for Validation

Before implementation begins, the following design decisions require explicit sign-off:

**Q1 — TSS algorithm**
Should the canonical `session.tssScore` use:

- TRIMP (HR-based, works for all sports)
- Coggan TSS (power-based, cycling/running only, more precise)
- A hybrid (power when available, HR-based fallback)?
  → Recommendation: hybrid. Power path when `powerData.quality = 'MEASURED_DIRECT'`. HR-based TRIMP fallback.

**Q2 — Window Feature timing**
Should window features be computed synchronously on observation ingestion (simple, higher latency)
or asynchronously via background job (complex, lower latency for API responses)?
→ Recommendation: session-scoped features synchronous (< 50ms). Window features asynchronous.

**Q3 — Feature storage**
Should features be stored in a dedicated `Feature` table (structured, queryable) or as
JSONB blobs in the existing schema?
→ Recommendation: dedicated table with `name`, `version`, `value` (JSONB), `status`, `confidence`.
This enables efficient queries by feature name without deserializing all JSONB.

**Q4 — Signal Engine trigger**
Should the Signal Engine be triggered:

- After each Feature computation completes (event-driven, real-time)?
- On a schedule (simpler, acceptable latency for a non-real-time system)?
  → To be decided in the Signal Engine design document.
