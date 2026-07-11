# Environmental Context Engine — v1 → v1.1 Migration

> **From:** `environment-v1`  
> **To:** `environment-v1.1`  
> **Trigger:** Pre-Phase 2 boundary review (Decision 4 approved)

---

## Breaking changes

| environment-v1                                         | environment-v1.1                                                            |
| ------------------------------------------------------ | --------------------------------------------------------------------------- |
| `EnvironmentalImpact` (flat stress fields)             | Split into `EnvironmentalStress` + reframed `EnvironmentalImpact`           |
| `ActivityEnvironment.impact` only                      | `stress` + `impact` + `correction`                                          |
| `TodayEnvironment.impact` only                         | `stress` + `impact`                                                         |
| `ForecastEnvironment.projectedImpact` only             | `projectedStress` + `projectedImpact`                                       |
| `buildEnvironmentalImpact({ applicability, weather })` | `buildEnvironmentalStress(...)` then `buildEnvironmentalImpact({ stress })` |
| `ThermalStressBand` exported                           | Internal only (via `EnvironmentalFeatures`)                                 |

## Unchanged (still frozen)

- `EnvironmentalObservationRecord` semantics (only `recordVersion` metadata bumps)
- Context family intent (`Activity` / `Today` / `Forecast`)
- `EnvironmentalEvidenceQuality`, quality-confidence separation
- Provider collect + merge architecture
- `EnvironmentalApplicability`
- Dimension decomposition at observation layer

## Consumer migration

```typescript
// Before (environment-v1)
import { buildEnvironmentalImpact } from '@/core/environment';

const impact = buildEnvironmentalImpact({ applicability: 'OUTDOOR', weather });
const thermal = impact.thermalStress;

// After (environment-v1.1)
import {
  buildEnvironmentalStress,
  buildEnvironmentalImpact,
  getEnvironmentalStressor,
} from '@/core/environment';

const stress = buildEnvironmentalStress({ applicability: 'OUTDOOR', weather, records });
const thermal = getEnvironmentalStressor(stress, 'THERMAL');
const impact = buildEnvironmentalImpact({ stress });

// Physiological models consume impact only:
const recoveryDemand = impact.recovery.demandMultiplier;
```

## Twin column mapping (Phase 2)

| Twin column                | Type                         |
| -------------------------- | ---------------------------- |
| `environmentalStressState` | `EnvironmentalStress`        |
| `environmentalImpactState` | `EnvironmentalImpact`        |
| Activity binding           | `ActivityEnvironmentBinding` |

`ActivityEnvironmentalCorrection` is **not** a Twin column.

## Verification

```bash
yarn test src/core/environment/__tests__/environment-v1.1.test.ts
yarn typecheck
```
