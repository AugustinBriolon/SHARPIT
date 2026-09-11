# Environmental Context Engine — Phase 1 → 1.5 Migration Notes

> **Audience:** contributors implementing Phase 2 (Twin integration)  
> **Contract version:** `environment-v1`

---

## Breaking changes from Phase 1 draft

Phase 1 was an internal draft. Phase 1.5 **replaces** the public contract entirely. There is no backward compatibility layer.

| Phase 1 (removed)                                     | Phase 1.5 (`environment-v1`)                                                                              |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `EnvironmentalObservation`                            | `EnvironmentalObservationRecord` (immutable, versioned)                                                   |
| `EnvironmentalContext` (monolithic)                   | `ActivityEnvironment` \| `TodayEnvironment` \| `ForecastEnvironment`                                      |
| `EnvironmentalFeatures` (public)                      | **Internal** — use `EnvironmentalImpact`                                                                  |
| `EnvironmentalObservationQuality` (`HIGH/MEDIUM/LOW`) | `EnvironmentalEvidenceQuality` (`EXACT/INTERPOLATED/ESTIMATED/MISSING`)                                   |
| `EnvironmentalSetting`                                | `ExposureSetting` (on records) + `EnvironmentalApplicability` (on targets)                                |
| `EnvironmentalMeasurements`                           | `WeatherMeasurements` inside `DimensionPayload`                                                           |
| `fetchEnvironmentalObservations` (first-wins)         | `collectEnvironmentalObservationDrafts` + `mergeObservationDrafts` + `fetchAndIngestEnvironmentalRecords` |
| `buildEnvironmentalContext`                           | `buildActivityEnvironment` / `buildTodayEnvironment` / `buildForecastEnvironment`                         |
| `confidence` only                                     | `quality` **and** `confidence` on every `MetricValue`                                                     |

---

## Import migration

```typescript
// Before (Phase 1 draft — do not use)
import {
  buildEnvironmentalContext,
  fetchEnvironmentalObservations,
  type EnvironmentalContext,
  type EnvironmentalObservation,
} from '@/core/environment';

// After (environment-v1)
import {
  ENVIRONMENTAL_CONTEXT_ENGINE_VERSION,
  buildActivityEnvironment,
  buildTodayEnvironment,
  buildForecastEnvironment,
  fetchAndIngestEnvironmentalRecords,
  buildEnvironmentalImpact,
  type ActivityEnvironment,
  type EnvironmentalObservationRecord,
  type EnvironmentalImpact,
} from '@/core/environment';
```

---

## Activity enrichment pattern (Phase 2 preview)

```typescript
const { records } = await fetchAndIngestEnvironmentalRecords(registry, {
  athleteId,
  location: activityLocation,
  from: activityStart,
  to: activityEnd,
  trainingDayId,
});

const activityEnv = buildActivityEnvironment({
  activityId,
  athleteId,
  window: { start: activityStart, end: activityEnd },
  location: activityLocation,
  records, // frozen at ingest — bind ids, never re-fetch for completed activities
  applicability: {
    sportType: activity.type,
    indoorFlag: activity.indoor ?? null,
    locationType: null,
  },
  boundAt: new Date(),
});

// Phase 2: persist activityEnv.binding.recordIds — never mutate records
```

---

## Immutability rules

1. Call `ingestObservationRecord` / `fetchAndIngestEnvironmentalRecords` once at capture time.
2. Store `providerSnapshot.payloadHash` — dedupe re-ingestion.
3. Corrections use `supersedeObservationRecord` → new record, old record gets `supersededBy`.
4. Completed activities read **bound record ids** only — no live provider re-fetch.

---

## What Phase 2 should import

| Layer             | Import                                                             |
| ----------------- | ------------------------------------------------------------------ |
| Twin column type  | `EnvironmentalImpact`, `ActivityEnvironmentBinding`                |
| Reasoning / Coach | `EnvironmentalImpact`, `EnvironmentalApplicability`, `MetricValue` |
| Persistence       | `EnvironmentalObservationRecord`, `ProviderSnapshot`               |

**Do not import** `EnvironmentalFeatures` or internal metric builders in Twin models.

---

## Tests

```bash
yarn test src/core/environment/__tests__/environment-v1.test.ts
```
