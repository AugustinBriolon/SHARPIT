# SHARPIT — Environmental Context Engine (environment-v1.1)

> **Status:** Phase 1.5 complete — public contract **FROZEN** (`environment-v1.1`)  
> **Version:** `environment-v1.1`  
> **Code:** `src/core/environment/`, `src/core/adapters/environment/`, `src/infrastructure/environment/`  
> **Freeze report:** [`ENVIRONMENTAL_CONTEXT_ENGINE_V1_1_CONTRACT_FREEZE.md`](./ENVIRONMENTAL_CONTEXT_ENGINE_V1_1_CONTRACT_FREEZE.md)  
> **Boundary review:** [`ENVIRONMENTAL_CONTEXT_ENGINE_PRE_PHASE2_BOUNDARY_REVIEW.md`](./ENVIRONMENTAL_CONTEXT_ENGINE_PRE_PHASE2_BOUNDARY_REVIEW.md)  
> **Migration from v1:** [`ENVIRONMENTAL_CONTEXT_ENGINE_V1_1_MIGRATION.md`](./ENVIRONMENTAL_CONTEXT_ENGINE_V1_1_MIGRATION.md)  
> **Prior freeze:** [`ENVIRONMENTAL_CONTEXT_ENGINE_PHASE1_CONTRACT_FREEZE.md`](./ENVIRONMENTAL_CONTEXT_ENGINE_PHASE1_CONTRACT_FREEZE.md)

---

## Pipeline

```
Provider → Adapter → EnvironmentalObservationRecord (immutable)
                          ↓
              ActivityEnvironment | TodayEnvironment | ForecastEnvironment
                          ↓
              EnvironmentalStress (stressor collection)
                          ↓
              EnvironmentalImpact (physiological adjustments)
                          ↓
         Digital Twin → Snapshot → Coach   [Phase 2+]

ActivityEnvironment also carries:
              ActivityEnvironmentalCorrection (explainability — Phase 3 algo)
```

**Phase 1.5 + v1.1 deliver everything up to the frozen public boundary.** No Twin, Snapshot, or physiological model wiring yet.

---

## Public contract summary

### Context family (never mix past / present / future)

| Type                  | Purpose                                                     |
| --------------------- | ----------------------------------------------------------- |
| `ActivityEnvironment` | Frozen retrospective context + stress + impact + correction |
| `TodayEnvironment`    | Current-day environmental state + stress + impact           |
| `ForecastEnvironment` | Predictions + `projectedStress` + `projectedImpact`         |

### Immutable evidence

`EnvironmentalObservationRecord` — frozen at `ingestObservationRecord` with `providerSnapshot.payloadHash`. Corrections via `supersedeObservationRecord`.

### Quality ≠ confidence

- **Quality:** `EXACT | INTERPOLATED | ESTIMATED | MISSING`
- **Confidence:** `0–1` per field and per `MetricValue`

### Multi-provider

`collectEnvironmentalObservationDrafts` → `mergeObservationDrafts` → `fetchAndIngestEnvironmentalRecords`

### Applicability

`EnvironmentalApplicability`: `OUTDOOR | INDOOR | PARTIALLY_EXPOSED | UNKNOWN`  
Indoor activities receive suppressed stress and unavailable impact adjustments.

### Dimensions (observation layer only)

`WEATHER` (implemented), `TERRAIN | ALTITUDE | AIR_QUALITY` (typed stubs).  
Dimensions feed stressors — they are **not** exposed on `EnvironmentalImpact`.

---

## EnvironmentalStress

First-class domain object — **not** a flat field bag.

```typescript
EnvironmentalStress {
  applicability
  stressors: EnvironmentalStressor[]   // extensible collection
  compositeIntensity
  suppressionReason
}

EnvironmentalStressor {
  id: 'THERMAL' | 'WIND' | 'ALTITUDE' | 'AIR_QUALITY' | 'HYDRATION' | …
  intensity: MetricValue<number>        // 0–1
  confidence: number
  supportingObservations: EnvironmentalStressObservationRef[]
  explanation: string
}
```

Consumers iterate `stress.stressors` and resolve by `id` via `getEnvironmentalStressor()`. New stressors append to the collection without breaking existing consumers.

`EnvironmentalFeatures` remains **internal** to the engine.

---

## EnvironmentalImpact

Physiological adjustments only — **no weather or environmental field names**.

| Adjustment                                  | Consumed by           |
| ------------------------------------------- | --------------------- |
| `RecoveryAdjustment.demandMultiplier`       | Recovery              |
| `FatigueAdjustment.accumulationMultiplier`  | Fatigue               |
| `PerformanceAdjustment.expectedOutputRatio` | Adaptation, Reasoning |
| `HydrationAdjustment.demandMultiplier`      | Hydration guidance    |
| `HeatAcclimationDemand.exposureBenefit`     | Training planning     |

Recovery, Fatigue, and Adaptation **never import weather**. They consume `EnvironmentalImpact` as an optional overlay.

---

## ActivityEnvironmentalCorrection

Explainability layer for completed activities. Does **not** modify observations or raw performance metrics.

`rawMetricsPreserved` is always `true`. Full attribution algorithm ships in Phase 3; type and invariants are frozen now.

---

## Tests

```bash
yarn test src/core/environment/__tests__/environment-v1.1.test.ts
```

---

**Phase 2 complete** — see [`ENVIRONMENTAL_CONTEXT_ENGINE_PHASE2_INTEGRATION.md`](./ENVIRONMENTAL_CONTEXT_ENGINE_PHASE2_INTEGRATION.md).

**Phase 2.6 complete** — calibration frozen — see [`ENVIRONMENTAL_CALIBRATION.md`](./ENVIRONMENTAL_CALIBRATION.md).

**Phase 3 in progress** — presentation — see [`ENVIRONMENTAL_CONTEXT_ENGINE_PHASE3_PRESENTATION.md`](./ENVIRONMENTAL_CONTEXT_ENGINE_PHASE3_PRESENTATION.md).

Cross-engine dependencies: [`PHYSIOLOGICAL_INTERACTION_MATRIX.md`](./PHYSIOLOGICAL_INTERACTION_MATRIX.md).

Twin persistence, Snapshot integration, Recovery/Fatigue/Adaptation/Reasoning consumption via `EnvironmentalImpact` only.

**The Environment public API remains frozen. Calibration is frozen at v2.6.1.**
