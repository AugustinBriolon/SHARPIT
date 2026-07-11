# Environmental Context Engine — Contract Freeze Report (environment-v1)

> **Status:** Superseded by [`ENVIRONMENTAL_CONTEXT_ENGINE_V1_1_CONTRACT_FREEZE.md`](./ENVIRONMENTAL_CONTEXT_ENGINE_V1_1_CONTRACT_FREEZE.md)  
> **Version:** `environment-v1` (historical)  
> **Phase 2:** Use `environment-v1.1` — see boundary review and v1.1 freeze report

---

## Post-freeze boundary review (2026-07-10)

`environment-v1` remains frozen for **evidence, contexts, merge, and providers**.

The public `EnvironmentalImpact` shape is **not** the final Twin boundary. Pre-Phase 2 review recommends splitting into `EnvironmentalStress` + reframed `EnvironmentalImpact` + `ActivityEnvironmentalCorrection` (`environment-v1.1`). See boundary review document.

**Twin / Recovery / Fatigue / Adaptation wiring remains blocked.**

---

## Freeze decision

The Environmental Context Engine public contract is **frozen** as `environment-v1`.

All architectural weaknesses identified in [`ENVIRONMENTAL_CONTEXT_ENGINE_PHASE1_ARCHITECTURE_REVIEW.md`](./ENVIRONMENTAL_CONTEXT_ENGINE_PHASE1_ARCHITECTURE_REVIEW.md) have been addressed at the **type and port level**. Phase 2 may integrate without breaking the public API.

---

## Review checklist (post-1.5)

| #   | Topic                    | Status | Evidence                                                                                       |
| --- | ------------------------ | ------ | ---------------------------------------------------------------------------------------------- |
| 1   | Context types split      | ✅     | `ActivityEnvironment`, `TodayEnvironment`, `ForecastEnvironment`                               |
| 2   | Immutable observations   | ✅     | `EnvironmentalObservationRecord`, `providerSnapshot.payloadHash`, `supersedeObservationRecord` |
| 3   | Explicit quality         | ✅     | `EnvironmentalEvidenceQuality` + per-field `FieldQuality` + `MetricValue.quality`              |
| 4   | Multi-provider merge     | ✅     | `collectEnvironmentalObservationDrafts` + `mergeObservationDrafts`                             |
| 5   | Applicability            | ✅     | `EnvironmentalApplicability`, `resolveEnvironmentalApplicability`, impact suppression          |
| 6   | Domain decomposition     | ✅     | `EnvironmentalDimension`, `DimensionPayload` (weather impl, others stubbed)                    |
| 7   | Environmental Impact     | ✅     | `EnvironmentalImpact` public; `EnvironmentalFeatures` internal                                 |
| 8   | Adapters + tests         | ✅     | Open-Meteo + Manual adapters; 16 tests passing                                                 |
| 9   | No deprecated public API | ✅     | Phase 1 draft exports removed                                                                  |

---

## Frozen public surface

Import only from `@/core/environment` (`src/core/environment/index.ts`).

### Constants

- `ENVIRONMENTAL_CONTEXT_ENGINE_VERSION` → `'environment-v1'`

### Types (frozen)

- Evidence: `EnvironmentalObservationRecord`, `ProviderSnapshot`, `FieldQuality`, `EnvironmentalEvidenceQuality`
- Dimensions: `EnvironmentalDimension`, `DimensionPayload`, `WeatherMeasurements`, `TerrainContext`, `AltitudeContext`, `AirQualityMeasurements`
- Contexts: `ActivityEnvironment`, `TodayEnvironment`, `ForecastEnvironment`, `EnvironmentalContext`, `EnvironmentalPrediction`, `ActivityEnvironmentBinding`
- Impact: `EnvironmentalImpact`, `MetricValue`, `AvailableMetric`, `UnavailableMetric`, `ThermalStressBand`
- Applicability: `EnvironmentalApplicability`, `ExposureSetting`
- Providers: `EnvironmentalProvider`, `EnvironmentalProviderAdapter`, `EnvironmentalFetchRequest`, `EnvironmentalIngestOutcome`, `MergePolicy`

### Functions (frozen)

| Function                                | Role                                       |
| --------------------------------------- | ------------------------------------------ |
| `fetchAndIngestEnvironmentalRecords`    | Collect → merge → ingest immutable records |
| `collectEnvironmentalObservationDrafts` | Multi-provider collection (no early exit)  |
| `mergeObservationDrafts`                | Field-level provider merge                 |
| `ingestObservationRecord`               | Freeze single record                       |
| `buildActivityEnvironment`              | Retrospective activity context             |
| `buildTodayEnvironment`                 | Current-day context                        |
| `buildForecastEnvironment`              | Future predictions (not observations)      |
| `buildEnvironmentalImpact`              | Canonical physiological input              |
| `resolveEnvironmentalApplicability`     | Activity applicability rules               |
| `computeProviderPayloadHash`            | Reproducibility / dedupe                   |

### Adapters (frozen interfaces)

- `openMeteoEnvironmentalAdapter` (`src/core/adapters/environment/`)
- `manualEnvironmentalAdapter`

---

## Internal (NOT public — may evolve)

| Module                          | Reason                                            |
| ------------------------------- | ------------------------------------------------- |
| `metrics/weather-features.ts`   | Engine derivation internals                       |
| `EnvironmentalFeatures` type    | Superseded by `EnvironmentalImpact` for consumers |
| `DEFAULT_MERGE_POLICY` defaults | Tunable without contract break                    |
| Dimension stubs (terrain, AQI)  | Implementation pending providers                  |

These are **not** exported from `index.ts`.

---

## Explicit non-goals (still out of scope)

- Digital Twin persistence
- Athlete Snapshot integration
- Coach / Presentation surfaces
- Personalized environmental hypotheses (Phase 4)
- Prisma schema (designed, not implemented)

---

## Validation commands

```bash
yarn test src/core/environment/__tests__/environment-v1.test.ts
yarn typecheck
```

**Result at freeze:** 16/16 tests passing.

---

## Phase 2 entry criteria

Phase 2 may begin when:

1. This freeze report is approved ✅
2. Prisma schema for `EnvironmentalObservationRecord` is reviewed
3. Twin column design uses `EnvironmentalImpact` + `ActivityEnvironmentBinding` only

**Phase 2 must not rename or remove any frozen export without a `environment-v2` ADR.**
