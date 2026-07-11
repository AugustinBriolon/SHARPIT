# Environmental Context Engine — Phase 1 Architecture Review

> **Status:** Review document — Phase 1.5 implemented, contract frozen as `environment-v1`  
> **Date:** 2026-07-10  
> **Follow-up:** [`ENVIRONMENTAL_CONTEXT_ENGINE_PHASE1_CONTRACT_FREEZE.md`](./ENVIRONMENTAL_CONTEXT_ENGINE_PHASE1_CONTRACT_FREEZE.md)  
> **Scope:** `src/core/environment/`, `src/core/adapters/environment/`, `src/infrastructure/environment/`  
> **Related:** [`ENVIRONMENTAL_CONTEXT_ENGINE.md`](./ENVIRONMENTAL_CONTEXT_ENGINE.md), [`docs/domain/DOMAIN.md`](../domain/DOMAIN.md)

---

## Executive summary

Phase 1 establishes a credible foundation: provider abstraction, pure adapters, deterministic metric derivation with strict availability gates, and graceful provider degradation. The WBGT gate and `MetricValue<T>` pattern are aligned with SHARPIT's epistemic standards.

However, **the Phase 1 public contract should not be frozen as-is**. Several structural gaps will force breaking changes during Digital Twin integration if left unaddressed. The most critical are:

1. A single undifferentiated `EnvironmentalContext` that conflates past, present, and future temporal intent.
2. No immutability or versioning contract for persisted observations (reproducibility risk).
3. Evidence quality expressed as coarse `HIGH | MEDIUM | LOW` rather than explicit epistemic levels.
4. Provider orchestration that replaces rather than merges evidence.
5. No applicability model — outdoor weather can be applied to indoor activities.
6. A flat weather-only measurement model with no dimension decomposition.
7. No `EnvironmentalImpact` intermediate layer — `EnvironmentalFeatures` risks being consumed directly by physiological models.

**Recommendation:** Implement a **Phase 1.5 contract amendment** (types + ports + docs + tests only — no Twin integration) before Phase 2. Estimated scope: domain type evolution, orchestrator contract extension, no UI, no persistence migration yet (but persistence schema designed).

---

## Review methodology

Each topic is assessed against:

| Criterion     | Question                                                                  |
| ------------- | ------------------------------------------------------------------------- |
| Correctness   | Does the design match SHARPIT's observation → inference → state pipeline? |
| Scalability   | Will this survive 5+ providers and 3 product surfaces without rewrite?    |
| Epistemics    | Is uncertainty explicit and non-hideable?                                 |
| Reversibility | Can Phase 2 proceed incrementally if this is fixed now?                   |

---

## 1. Context types

### Current design

One aggregate type serves all use cases:

```typescript
type EnvironmentalContext = {
  referenceAt: Date;
  observations: EnvironmentalObservation[];
  features: EnvironmentalFeatures;
  confidence: number;
  // ...
};
```

`EnvironmentalTemporalScope` on observations (`POINT | INTERVAL | DAILY`) describes **how** a measurement was captured, not **why** the context was built.

`buildEnvironmentalContext()` accepts any observation set for any `referenceAt` with no temporal intent discriminator.

### Identified limitation

The engine cannot distinguish:

| Intent            | Example                                          | Epistemic status                                 |
| ----------------- | ------------------------------------------------ | ------------------------------------------------ |
| **Retrospective** | Activity environment during a completed session  | Historical evidence — must be frozen             |
| **Present**       | Today's environmental load influencing readiness | Current best estimate — may refresh              |
| **Predictive**    | Forecast for tomorrow's planned session          | Hypothesis — must never be stored as observation |

Mixing these in one type will cause:

- Forecast data accidentally persisted as historical evidence.
- Activity analysis re-run with different provider data producing different "history".
- Today snapshot refreshing semantics applied to activity post-mortems.

### Proposed change

Introduce a **discriminated context family** at the domain level:

```typescript
type EnvironmentalContextKind = 'ACTIVITY' | 'TODAY' | 'FORECAST';

type ActivityEnvironment = {
  kind: 'ACTIVITY';
  activityId: string;
  window: { start: Date; end: Date };
  applicability: EnvironmentalApplicability;
  observations: readonly EnvironmentalObservationRecord[];
  impact: EnvironmentalImpact;
  frozenAt: Date; // immutability anchor
};

type TodayEnvironment = {
  kind: 'TODAY';
  trainingDayId: string;
  referenceAt: Date;
  observations: readonly EnvironmentalObservationRecord[];
  impact: EnvironmentalImpact;
  computedAt: Date;
};

type ForecastEnvironment = {
  kind: 'FORECAST';
  targetWindow: { start: Date; end: Date };
  predictions: readonly EnvironmentalPrediction[]; // NOT observations
  projectedImpact: EnvironmentalImpact;
  computedAt: Date;
};

type EnvironmentalContext = ActivityEnvironment | TodayEnvironment | ForecastEnvironment;
```

`EnvironmentalPrediction` is a separate type — never assignable to `EnvironmentalObservation`.

Deprecate the current monolithic `EnvironmentalContext` or rename it `EnvironmentalContextDraft` for Phase 1 internal use only.

### Rationale

Temporal intent is a first-class domain concept, not a UI concern. Separating predictions from observations is essential for reproducibility and Coach explainability.

### Migration impact

| Area         | Impact                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------ |
| `types.ts`   | Add discriminated union; rename current type                                               |
| `context.ts` | Split into `buildActivityEnvironment`, `buildTodayEnvironment`, `buildForecastEnvironment` |
| Tests        | Add cases per kind; assert forecast ≠ observation                                          |
| Phase 2 Twin | Stores `ActivityEnvironment` snapshots per activity + rolling `TodayEnvironment`           |

### Timing

**Before Phase 2** — type definitions and builder signatures. Forecast builder can return `UNAVAILABLE` stub until a forecast provider exists.

---

## 2. Immutable observations

### Current design

```typescript
/**
 * Point-in-time environmental evidence.
 * Immutable once persisted (Phase 2+).
 */
type EnvironmentalObservation = { /* mutable in memory */ };
```

- Observations are created in-memory by adapters with empty `id` (filled later by `assignObservationIds`).
- No persistence layer.
- Re-fetching Open-Meteo for the same activity window may return revised archive values.
- No `providerPayloadHash`, `schemaVersion`, or `ingestedAt` immutability marker.
- No binding between an activity and a frozen observation set.

### Identified limitation

**Reproducibility is not guaranteed.** An activity analyzed in 2026 and re-analyzed in 2027 may receive different environmental evidence if:

- Open-Meteo revises historical reanalysis data.
- Provider priority order changes.
- Merge logic changes.

This violates SHARPIT's Decision Record philosophy (ADR-004): decisions must be explainable against evidence that was available at decision time.

### Proposed change

Introduce `EnvironmentalObservationRecord` as the **persisted, immutable** form:

```typescript
type EnvironmentalObservationRecord = EnvironmentalObservation & {
  readonly recordVersion: 1;
  readonly ingestedAt: Date;
  readonly providerSnapshot: {
    readonly providerId: EnvironmentalProviderId;
    readonly providerVersion: string | null;
    readonly payloadHash: string; // SHA-256 of normalized payload
    readonly fetchedAt: Date;
  };
  readonly supersededBy: string | null; // manual correction chain only
};

// Ingestion rule: after insert, record is NEVER updated.
// Corrections create a new record with supersededBy link.
```

For activities:

```typescript
type ActivityEnvironmentBinding = {
  activityId: string;
  observationRecordIds: readonly string[];
  boundAt: Date;
  contextKind: 'ACTIVITY';
};
```

Provider re-fetch policy:

| Context              | Policy                                                               |
| -------------------- | -------------------------------------------------------------------- |
| Activity (completed) | Use bound records only; never re-fetch unless explicitly "re-enrich" |
| Today                | May refresh within staleness TTL                                     |
| Forecast             | Always ephemeral; never persist as observation                       |

### Rationale

Environmental evidence for a completed session is historical fact **as SHARPIT captured it**, not as the provider retroactively reports it.

### Migration impact

| Area                | Impact                                                       |
| ------------------- | ------------------------------------------------------------ |
| Prisma (Phase 2)    | New `EnvironmentalObservationRecord` table                   |
| Orchestrator        | Returns records ready for persistence, not transient objects |
| Open-Meteo provider | Compute `payloadHash` at fetch time                          |
| Tests               | Assert immutability contract; re-ingest same hash → dedupe   |

### Timing

**Before Phase 2** — define types and ingestion contract in Phase 1.5. Persistence implementation is Phase 2 deliverable, but schema must be designed now.

---

## 3. Observation quality

### Current design

Two parallel systems:

```typescript
// Observation-level
type EnvironmentalObservationQuality = {
  overall: 'HIGH' | 'MEDIUM' | 'LOW';
  flags: ('STALE' | 'INTERPOLATED' | 'PARTIAL_FIELDS' | ...)[];
};

// Field-level
type MeasurementProvenance = 'MEASURED' | 'DERIVED';
```

Context-level scalar: `confidence: number` (0–1).

Derived metrics use `MetricValue<T>` with `quality: MeasurementProvenance` — good pattern, but not propagated to observation evidence quality.

### Identified limitation

| Problem                                       | Consequence                                                   |
| --------------------------------------------- | ------------------------------------------------------------- |
| `HIGH                                         | MEDIUM                                                        | LOW` is subjective | Coach cannot explain "why medium?" |
| `confidence` scalar collapses uncertainty     | Reasoning Engine treats 0.72 and 0.71 as equivalent precision |
| `INTERPOLATED` is a flag, not a quality level | Consumers must parse flags — easy to miss                     |
| No per-field `MISSING` state                  | Absent field vs null field indistinguishable in quality terms |

Coach and Reasoning need: _"Wind speed is INTERPOLATED between two hourly points; temperature is EXACT."_

### Proposed change

Replace observation quality with an explicit epistemic enum aligned to SHARPIT's observation engine:

```typescript
type EnvironmentalEvidenceQuality =
  | 'EXACT' // Direct provider value at observed time/location
  | 'INTERPOLATED' // Spatially or temporally interpolated
  | 'ESTIMATED' // Derived approximation (e.g. psychrometric wet-bulb)
  | 'MISSING'; // Required for this context but unavailable

type FieldQuality = {
  readonly quality: EnvironmentalEvidenceQuality;
  readonly method: string | null; // e.g. 'OPEN_METEO_HOURLY', 'LINEAR_TEMPORAL'
  readonly sourceProviderId: EnvironmentalProviderId | null;
};

type EnvironmentalObservationRecord = {
  // ...
  readonly fieldQuality: Partial<Record<MeasurementField, FieldQuality>>;
  readonly aggregateQuality: EnvironmentalEvidenceQuality; // worst-case or weighted
};
```

Rules:

- Never upgrade quality downstream (same invariant as `ObservationQuality` in observation engine).
- `confidence` on context becomes **derived from field quality distribution**, not an independent input.
- Remove `HIGH | MEDIUM | LOW` from public contract.

### Rationale

Explicit epistemic levels are machine-readable and Coach-explainable. Flags become supplementary metadata, not the primary quality signal.

### Migration impact

| Area               | Impact                                                                 |
| ------------------ | ---------------------------------------------------------------------- |
| Adapters           | Set `fieldQuality` per mapped field                                    |
| Open-Meteo adapter | Hourly rows → `EXACT` for provider fields; gap-filled → `INTERPOLATED` |
| `context.ts`       | Confidence computed from field quality, not `overall` enum             |
| Tests              | Assert quality never hidden when INTERPOLATED                          |

### Timing

**Before Phase 2** — amend Phase 1 types and adapters.

---

## 4. Multi-provider merging

### Current design

`fetchEnvironmentalObservations()` in `orchestrator.ts`:

1. Sort providers by priority.
2. Try sequentially.
3. **Stop at first provider returning any observation.**

```typescript
if (adapted.length > 0) {
  break; // no further providers consulted
}
```

### Identified limitation

| Scenario                                    | Current behavior           | Desired behavior                                       |
| ------------------------------------------- | -------------------------- | ------------------------------------------------------ |
| Garmin activity weather + Open-Meteo hourly | Only highest-priority wins | Merge: Garmin for activity window, Open-Meteo for gaps |
| Manual correction + provider data           | Provider wins if first     | Manual overrides specific fields                       |
| Race dataset + forecast                     | Single source              | Race metadata + weather forecast combined              |

Replacement semantics lose information and prevent athlete-specific corrections.

### Proposed change

Split orchestration into two phases:

```typescript
// Phase A: Collect (no early exit)
type ProviderCollectionOutcome = {
  readonly bundles: readonly {
    providerId: EnvironmentalProviderId;
    observations: EnvironmentalObservation[];
    priority: number;
  }[];
  readonly attempts: ProviderAttempt[];
};

// Phase B: Merge
type MergePolicy = {
  readonly fieldPriority: Partial<Record<MeasurementField, EnvironmentalProviderId[]>>;
  readonly manualOverrides: boolean; // manual always wins on conflict
  readonly temporalResolution: 'POINT' | 'INTERVAL' | 'DAILY';
};

function mergeEnvironmentalObservations(
  bundles: ProviderCollectionOutcome['bundles'],
  policy: MergePolicy,
  window: { from: Date; to: Date },
): EnvironmentalObservation[];
```

Default field priority (illustrative):

1. `manual` — athlete correction
2. `garmin-weather` — activity-local
3. `race-dataset` — event-specific
4. `open-meteo` — gridded reanalysis
5. `openweather` — forecast / current

Keep fallback for **total failure** (all providers unavailable → empty set).

### Rationale

Environmental evidence is multi-source by nature. Merging is compositional; replacement is a degenerate case (single provider).

### Migration impact

| Area              | Impact                                                                          |
| ----------------- | ------------------------------------------------------------------------------- |
| `orchestrator.ts` | Refactor: `collectEnvironmentalObservations` + `mergeEnvironmentalObservations` |
| `provider.ts`     | Add `MergePolicy` type                                                          |
| Tests             | Multi-provider merge scenarios; manual override wins                            |
| Phase 2           | Persist per-provider bundles for audit before merge                             |

### Timing

**Before Phase 2** — define merge types and `collect` API. Full merge implementation in Phase 1.5 or early Phase 2. Keep current fallback as `mergePolicy: 'FIRST_PROVIDER_WINS'` for backward compatibility during transition.

---

## 5. Environment applicability

### Current design

```typescript
type EnvironmentalSetting = 'OUTDOOR' | 'INDOOR' | 'UNKNOWN';
```

Set per observation. `EnvironmentalFetchRequest` optionally includes `setting`.

No link to activity type, sport, or location semantics. `buildEnvironmentalContext()` does not filter observations by applicability.

### Identified limitation

Outdoor weather applied to:

- Indoor cycling (trainer)
- Treadmill running
- Pool swimming
- Gym strength sessions

…would produce **false contextual explanations** in Phase 2 ("elevated HR due to heat" on a trainer session).

### Proposed change

Separate **where evidence was measured** from **whether it applies to a target**:

```typescript
type ExposureSetting = 'OUTDOOR' | 'INDOOR' | 'UNKNOWN'; // on observation

type EnvironmentalApplicability =
  | 'FULLY_APPLICABLE' // outdoor run — weather applies
  | 'PARTIALLY_EXPOSED' // open-water swim, trail with tree cover
  | 'NOT_APPLICABLE' // indoor trainer, pool, gym
  | 'UNKNOWN'; // insufficient activity metadata

function resolveEnvironmentalApplicability(input: {
  sportType: SportType;
  indoorFlag: boolean | null;
  locationType: 'TRACK' | 'ROAD' | 'TRAIL' | 'POOL' | 'GYM' | 'UNKNOWN' | null;
  athleteDeclaredSetting: ExposureSetting | null;
}): EnvironmentalApplicability;
```

`ActivityEnvironment` must carry `applicability`. When `NOT_APPLICABLE`:

- `EnvironmentalImpact` fields are `UNAVAILABLE` with reason `NOT_APPLICABLE`.
- Physiological models receive explicit "environment ignored" signal — not missing data silently.

### Rationale

Applicability is a domain rule, not a presentation filter. Phase 2 must not consume outdoor weather for indoor activities.

### Migration impact

| Area                   | Impact                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `types.ts`             | Rename `EnvironmentalSetting` → `ExposureSetting`; add `EnvironmentalApplicability` |
| New `applicability.ts` | Pure resolver from activity metadata                                                |
| `context.ts`           | Short-circuit when `NOT_APPLICABLE`                                                 |
| Tests                  | Trainer ride → NOT_APPLICABLE; outdoor run → FULLY_APPLICABLE                       |

### Timing

**Before Phase 2** — types + resolver. Activity metadata integration in Phase 2.

---

## 6. Domain separation

### Current design

Single flat structure:

```typescript
type EnvironmentalMeasurements = {
  airTemperatureC?: number;
  windSpeedMps?: number;
  // ... all weather-shaped
};
```

Altitude appears only as `GeoLocation.altitudeM`. No terrain, no air quality.

### Identified limitation

Environmental context is treated as synonymous with weather. Future dimensions will either:

- Pollute `EnvironmentalMeasurements` with unrelated fields, or
- Force breaking changes when terrain/AQI are added.

Coupling also makes provider adapters responsible for dimensions they don't supply.

### Proposed change

Decompose by **environmental dimension**:

```typescript
type EnvironmentalDimension = 'WEATHER' | 'TERRAIN' | 'ALTITUDE' | 'AIR_QUALITY';

type WeatherMeasurements = { /* current fields */ };
type TerrainContext = {
  surfaceType: 'ROAD' | 'TRAIL' | 'TRACK' | 'MIXED' | 'UNKNOWN' | null;
  elevationGainM: number | null;
  technicalDifficulty: 'LOW' | 'MODERATE' | 'HIGH' | null;
};
type AltitudeContext = {
  elevationM: number | null;
  elevationGainM: number | null;
  oxygenAvailabilityIndex: MetricValue<number>; // only if elevation known
};
type AirQualityMeasurements = {
  aqi: number | null;
  pm25UgM3: number | null;
  // ...
};

type EnvironmentalObservationRecord = {
  dimension: EnvironmentalDimension;
  measurements:
    | { dimension: 'WEATHER'; data: WeatherMeasurements }
    | { dimension: 'TERRAIN'; data: TerrainContext }
    | { dimension: 'ALTITUDE'; data: AltitudeContext }
    | { dimension: 'AIR_QUALITY'; data: AirQualityMeasurements };
};
```

Phase 1.5 implements `WEATHER` only. Other dimensions are typed stubs returning `MISSING`.

### Rationale

Independent dimensions evolve independently. Terrain from activity GPS ≠ weather from Open-Meteo ≠ AQI from a future provider.

### Migration impact

| Area       | Impact                                                   |
| ---------- | -------------------------------------------------------- |
| `types.ts` | Discriminated measurement union                          |
| Adapters   | Tag `dimension: 'WEATHER'`                               |
| Metrics    | `buildWeatherFeatures()` scoped to weather dimension     |
| Phase 3    | Activity detail can explain terrain separately from heat |

### Timing

**Before Phase 2** — type decomposition. Implementation remains weather-only.

---

## 7. Environmental impact

### Current design

```typescript
type EnvironmentalFeatures = {
  heatIndexC: MetricValue<number>;
  wbgtC: MetricValue<number>;
  thermalStressBand: MetricValue<ThermalStressBand>;
  windChillC: MetricValue<number>;
  hydrationDemandIndex: MetricValue<number>;
};
```

`EnvironmentalContext.features` is directly attached to context. Phase 2 risk: Recovery/Fatigue import `EnvironmentalFeatures` and re-interpret raw thermal metrics.

### Identified limitation

`EnvironmentalFeatures` sits at the wrong abstraction level:

| Layer        | What it is                                   | Who consumes    |
| ------------ | -------------------------------------------- | --------------- |
| Observations | Evidence                                     | Engine only     |
| Features     | Deterministic derivations (heat index, WBGT) | Engine only     |
| **Impact**   | Physiological relevance given applicability  | Twin models     |
| Decisions    | Coaching output                              | Snapshot, Coach |

Without `EnvironmentalImpact`, each physiological model will embed its own heat/wind interpretation — duplicated logic, inconsistent explanations.

### Proposed change

Introduce explicit layering:

```
EnvironmentalObservationRecord[]
        ↓
EnvironmentalFeatures (deterministic, dimension-scoped)
        ↓
EnvironmentalImpact (applicability-aware, interpretive)
        ↓
Twin models (Recovery, Fatigue, Adaptation, Daily Strain, Reasoning)
```

```typescript
type EnvironmentalImpact = {
  readonly applicability: EnvironmentalApplicability;
  readonly thermalStress: MetricValue<ThermalStressBand>;
  readonly thermalLoad: MetricValue<number>; // 0–1 normalized
  readonly windExposure: MetricValue<number>; // 0–1
  readonly altitudeStress: MetricValue<number>;
  readonly airQualityStress: MetricValue<number>;
  readonly hydrationStress: MetricValue<number>;
  readonly environmentalDifficulty: MetricValue<number>; // composite, explainable
  readonly suppressionReason: string | null; // set when NOT_APPLICABLE
};
```

`EnvironmentalFeatures` remains internal to the engine. **Public contract exports `EnvironmentalImpact`, not `EnvironmentalFeatures`.**

### Rationale

Physiological models consume **impact**, not weather. This preserves separation of concerns and gives Coach a stable vocabulary ("thermal stress was HIGH during this activity").

### Migration impact

| Area                 | Impact                                                                   |
| -------------------- | ------------------------------------------------------------------------ |
| New `impact.ts`      | `buildEnvironmentalImpact(features, applicability)`                      |
| `types.ts`           | Add `EnvironmentalImpact`; demote `EnvironmentalFeatures` to `@internal` |
| Phase 2 orchestrator | Outputs impact to Twin column                                            |
| Tests                | NOT_APPLICABLE → all impact fields unavailable with suppression reason   |

### Timing

**Before Phase 2** — define `EnvironmentalImpact` type and builder signature. Implementation alongside Phase 2 engine.

---

## Public API freeze assessment

### Current exports (`src/core/environment/index.ts`)

```
types, provider, context, orchestrator, metrics (heat-index, wet-bulb, wbgt, thermal)
```

### Freeze verdict: **NOT YET — conditional freeze after Phase 1.5**

| Criterion                         | Status                                        |
| --------------------------------- | --------------------------------------------- |
| Provider abstraction              | ✅ Stable — minor extension for collect/merge |
| Adapter pattern                   | ✅ Stable                                     |
| Metric availability gates         | ✅ Stable — keep `MetricValue<T>`             |
| `EnvironmentalContext`            | ❌ Will break — needs discriminated union     |
| `EnvironmentalObservation`        | ❌ Will break — needs `Record` + quality enum |
| Orchestrator                      | ❌ Will break — collect + merge               |
| `EnvironmentalFeatures` as public | ❌ Should become internal                     |
| `EnvironmentalImpact`             | ❌ Missing — must add                         |

### Proposed freeze scope (Phase 1.5 → `environment-v1`)

Once Phase 1.5 amendments land, freeze these as **stable public contract**:

| Export                                                   | Stability |
| -------------------------------------------------------- | --------- |
| `EnvironmentalObservationRecord`                         | Frozen    |
| `EnvironmentalContext` (discriminated)                   | Frozen    |
| `EnvironmentalImpact`                                    | Frozen    |
| `EnvironmentalProvider` / `EnvironmentalProviderAdapter` | Frozen    |
| `collectEnvironmentalObservations`                       | Frozen    |
| `mergeEnvironmentalObservations`                         | Frozen    |
| `resolveEnvironmentalApplicability`                      | Frozen    |
| `MetricValue<T>` / `isMetricAvailable`                   | Frozen    |
| `EnvironmentalEvidenceQuality`                           | Frozen    |

**Internal (not public):** `EnvironmentalFeatures`, metric computation functions, merge policy defaults.

Version marker:

```typescript
export const ENVIRONMENTAL_CONTEXT_ENGINE_VERSION = 'environment-v1' as const;
```

---

## Recommended Phase 1.5 backlog (pre-Phase 2)

| #   | Item                                                                    | Effort | Blocks Phase 2? |
| --- | ----------------------------------------------------------------------- | ------ | --------------- |
| 1   | Discriminated context types (`Activity`, `Today`, `Forecast`)           | S      | Yes             |
| 2   | `EnvironmentalObservationRecord` + immutability contract                | S      | Yes             |
| 3   | `EnvironmentalEvidenceQuality` enum + per-field quality                 | S      | Yes             |
| 4   | `EnvironmentalImpact` type + builder stub                               | S      | Yes             |
| 5   | `EnvironmentalApplicability` + resolver                                 | S      | Yes             |
| 6   | Dimension decomposition (weather implemented, others stubbed)           | M      | Yes             |
| 7   | Orchestrator split: collect + merge (keep first-wins as default policy) | M      | Partially       |
| 8   | Update adapters + tests for new quality/context types                   | M      | Yes             |
| 9   | Update `ENVIRONMENTAL_CONTEXT_ENGINE.md` as frozen contract doc         | S      | Yes             |

**Do not start Phase 2 Twin integration until items 1–6 and 8–9 are complete.**

Item 7 (full merge) can ship in early Phase 2 if first-wins policy is documented as transitional.

---

## Postponed (acceptable after Phase 2 starts)

| Item                                  | Rationale                                    |
| ------------------------------------- | -------------------------------------------- |
| Prisma persistence + migration        | Phase 2 deliverable — schema designed in 1.5 |
| Forecast provider implementation      | No product need until planning surfaces      |
| Terrain / air quality providers       | Typed stubs sufficient                       |
| Personalized environmental hypotheses | Phase 4                                      |
| UI surfaces                           | Phase 3                                      |

---

## Conclusion

Phase 1 proves the engine can be deterministic, provider-agnostic, and honest about missing data. The WBGT gate and graceful degradation are production-quality patterns worth preserving.

The domain contract, however, is **not yet stable enough** for Digital Twin integration. The seven review topics reveal a common theme: Phase 1 optimized for getting weather observations into a single context object, but SHARPIT needs **typed temporal intent, immutable evidence, explicit quality, multi-source merge, applicability gating, dimensional decomposition, and an impact layer**.

**Action:** Execute Phase 1.5 contract amendments. Re-run this review checklist. Upon approval, freeze `environment-v1` and begin Phase 2.

**Phase 2 remains blocked until this document is approved.**
