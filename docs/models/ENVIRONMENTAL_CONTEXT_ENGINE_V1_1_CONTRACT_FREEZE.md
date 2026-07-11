# Environmental Context Engine — Contract Freeze Report (environment-v1.1)

> **Status:** FROZEN — permanent public boundary for Phase 2+  
> **Date:** 2026-07-10  
> **Version:** `environment-v1.1` (`ENVIRONMENTAL_CONTEXT_ENGINE_VERSION`)  
> **Prior version:** `environment-v1` (superseded for stress/impact public shape)  
> **Boundary review:** [`ENVIRONMENTAL_CONTEXT_ENGINE_PRE_PHASE2_BOUNDARY_REVIEW.md`](./ENVIRONMENTAL_CONTEXT_ENGINE_PRE_PHASE2_BOUNDARY_REVIEW.md) — Decision 4 approved

---

## Freeze decision

The Environmental Context Engine public contract is **frozen** as `environment-v1.1`.

This is the permanent boundary consumed by the Digital Twin, Athlete Snapshot, Recovery, Fatigue, Adaptation, and Reasoning Engine.

**No further structural changes to the public API during Phase 2.**

---

## Final contract review checklist

| #   | Topic                                     | Status | Evidence                                                                       |
| --- | ----------------------------------------- | ------ | ------------------------------------------------------------------------------ |
| 1   | Context types split                       | ✅     | `ActivityEnvironment`, `TodayEnvironment`, `ForecastEnvironment`               |
| 2   | Immutable observations                    | ✅     | `EnvironmentalObservationRecord`, `providerSnapshot.payloadHash`               |
| 3   | Explicit quality                          | ✅     | `EnvironmentalEvidenceQuality` + `FieldQuality` + `MetricValue.quality`        |
| 4   | Multi-provider merge                      | ✅     | `collectEnvironmentalObservationDrafts` + `mergeObservationDrafts`             |
| 5   | Applicability                             | ✅     | `EnvironmentalApplicability`, indoor suppression                               |
| 6   | Stress as stressor collection             | ✅     | `EnvironmentalStress.stressors[]`, extensible `EnvironmentalStressorId`        |
| 7   | Stressor contract                         | ✅     | intensity, confidence, supportingObservations, explanation per stressor        |
| 8   | Impact as physiological adjustments       | ✅     | Recovery, Fatigue, Performance, Hydration, HeatAcclimation — no weather fields |
| 9   | Correction explainability layer           | ✅     | `ActivityEnvironmentalCorrection`, `rawMetricsPreserved: true`, stub builder   |
| 10  | Environmental interpretation encapsulated | ✅     | Models consume `EnvironmentalImpact` only                                      |
| 11  | Adapters + tests                          | ✅     | 22 tests passing                                                               |
| 12  | No generic Context Engine abstraction     | ✅     | Convergent pattern documented, no shared base type                             |

---

## Frozen public surface

### Version

- `ENVIRONMENTAL_CONTEXT_ENGINE_VERSION` → `'environment-v1.1'`

### Types (exported from `@/core/environment`)

| Category   | Types                                                                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence   | `EnvironmentalObservationRecord`, `ActivityEnvironmentBinding`, `ProviderSnapshot`, `FieldQuality`                                        |
| Context    | `ActivityEnvironment`, `TodayEnvironment`, `ForecastEnvironment`, `EnvironmentalPrediction`                                               |
| Stress     | `EnvironmentalStress`, `EnvironmentalStressor`, `EnvironmentalStressorId`, `EnvironmentalStressObservationRef`                            |
| Impact     | `EnvironmentalImpact`, `RecoveryAdjustment`, `FatigueAdjustment`, `PerformanceAdjustment`, `HydrationAdjustment`, `HeatAcclimationDemand` |
| Correction | `ActivityEnvironmentalCorrection`, `ActivityEnvironmentalCorrectionFactor`, `EnvironmentalExplanation`                                    |
| Shared     | `MetricValue`, `EnvironmentalApplicability`, `EnvironmentalEvidenceQuality`, `EnvironmentalDimension`                                     |

### Builders (frozen signatures)

| Builder                                | Output                                                 |
| -------------------------------------- | ------------------------------------------------------ |
| `buildEnvironmentalStress`             | `EnvironmentalStress`                                  |
| `buildEnvironmentalImpact`             | `EnvironmentalImpact`                                  |
| `buildActivityEnvironmentalCorrection` | `ActivityEnvironmentalCorrection` (stub until Phase 3) |
| `buildActivityEnvironment`             | `ActivityEnvironment`                                  |
| `buildTodayEnvironment`                | `TodayEnvironment`                                     |
| `buildForecastEnvironment`             | `ForecastEnvironment`                                  |

### Helpers

| Helper                                 | Purpose                                                 |
| -------------------------------------- | ------------------------------------------------------- |
| `getEnvironmentalStressor(stress, id)` | Resolve stressor without assuming fixed object keys     |
| `listKnownEnvironmentalStressorIds()`  | Document known ids; consumers iterate `stressors` array |

### Internal (not exported)

- `EnvironmentalFeatures`
- `ThermalStressBand`
- Weather metric derivations (`computeHeatIndexC`, etc. exported for tests/adapters only)

---

## Architecture diagram (frozen)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                   ENVIRONMENTAL CONTEXT ENGINE (v1.1)                     │
├──────────────────────────────────────────────────────────────────────────┤
│  EnvironmentalObservationRecord  →  immutable evidence                    │
│  ActivityEnvironment | TodayEnvironment | ForecastEnvironment             │
│                                                                           │
│  EnvironmentalStress             →  stressor collection (Twin-persisted) │
│    └─ Thermal | Wind | Altitude | AirQuality | Hydration | [future…]     │
│                                                                           │
│  EnvironmentalImpact             →  physiological adjustments (Twin)      │
│    └─ Recovery | Fatigue | Performance | Hydration | HeatAcclimation   │
│                                                                           │
│  ActivityEnvironmentalCorrection →  explainability (Activity-bound)      │
└──────────────────────────────────────────────────────────────────────────┘
         │                              │                    │
         ▼                              ▼                    ▼
   Digital Twin                  Recovery / Fatigue /     Activity Detail /
   stress + impact               Adaptation / Reasoning   Coach (Phase 3)
```

---

## Phase 2 entry criteria

| Criterion                               | Status     |
| --------------------------------------- | ---------- |
| Boundary review approved (Decision 4)   | ✅         |
| `environment-v1.1` implemented          | ✅         |
| Tests passing                           | ✅ 22/22   |
| Contract freeze documented              | ✅         |
| Twin schema design                      | ⬜ Phase 2 |
| Recovery/Fatigue/Adaptation integration | ⬜ Phase 2 |
| Snapshot consumption                    | ⬜ Phase 2 |

**Phase 2 may begin.** Public API modifications during Phase 2 are prohibited.

---

## Verification

```bash
yarn test src/core/environment/__tests__/environment-v1.1.test.ts
yarn typecheck
```

---

## Approval

| Role                   | Decision                                 | Date       |
| ---------------------- | ---------------------------------------- | ---------- |
| Product / Architecture | Approved (Decision 4 + v1.1 refinements) | 2026-07-10 |
| Implementation         | Frozen                                   | 2026-07-10 |
