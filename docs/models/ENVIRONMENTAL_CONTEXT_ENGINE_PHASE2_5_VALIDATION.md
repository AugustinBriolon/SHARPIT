# Environmental Context Engine — Phase 2.5 Scientific Validation

> **Status:** Complete — superseded by Phase 2.6 calibration for impact values  
> **Calibration:** [`ENVIRONMENTAL_CALIBRATION.md`](./ENVIRONMENTAL_CALIBRATION.md) — active impact tuning (v2.6)  
> **Contract:** `environment-v1.1` unchanged  
> **Interaction matrix:** [`PHYSIOLOGICAL_INTERACTION_MATRIX.md`](./PHYSIOLOGICAL_INTERACTION_MATRIX.md)

---

## Objective

Validate **physiological plausibility** and **internal consistency** of Environmental Context Engine outputs before any product exposure (Phase 3).

This sprint validates **behavior**, not medical precision.

---

## Scope

| In scope                          | Out of scope                                |
| --------------------------------- | ------------------------------------------- |
| Stress → impact coherence         | UI, Coach, Presentation                     |
| Monotonicity across scenarios     | Activity Environmental Correction algorithm |
| Downstream boundary isolation     | Sensitivity learning                        |
| Sensitivity profile design (stub) | Public API changes                          |
| Interaction matrix documentation  | Environment pipeline changes                |

---

## Validation scenarios

Canonical scenarios in `src/core/inference/environment/scenarios.ts`.

Expected ranges are **calibrated to environment-v1.1 output** (2026-07-10). Phase 2.6 recalibrated impact curves — see [`ENVIRONMENTAL_CALIBRATION.md`](./ENVIRONMENTAL_CALIBRATION.md) for current values. The pre-2.6 engine used conservative impact thresholds — even mild outdoor conditions registered as significant (`recoveryDemand > 1.05`).

| ID                   | Conditions                 | Observed behavior (v1.1)                    |
| -------------------- | -------------------------- | ------------------------------------------- |
| `COOL_WEATHER`       | 12°C, moderate humidity    | Lowest composite (~0.11), recovery ~1.07    |
| `MILD_BASELINE`      | 20°C reference             | Thermal ~0.45, recovery ~1.16               |
| `HOT_WEATHER`        | 34°C dry                   | Thermal ~0.70, recovery ~1.24               |
| `HIGH_HUMIDITY`      | 30°C, 85% RH               | Thermal ~0.95, hydration ~0.71              |
| `STRONG_WIND`        | 12 m/s wind                | Wind ~0.80, performance ~0.88               |
| `EXTREME_HEAT`       | 38°C, 70% RH               | Hydration ~1.0, composite ~0.67             |
| `ALTITUDE_STUB`      | Altitude dimension stubbed | Altitude stressor missing, no extra penalty |
| `COMBINED_STRESSORS` | Heat + humidity + wind     | Highest composite (~0.87)                   |
| `INDOOR_TRAINER`     | Indoor applicability       | Full suppression                            |

---

## Validation assertions

### Physiological plausibility

- Thermal severity: cool < mild < hot < extreme (monotonic)
- Recovery demand increases with thermal severity
- Combined stressors exceed hot-only composite intensity
- Humid conditions elevate hydration demand vs dry heat at comparable effort

### Internal consistency

- Significant thermal stress → recovery demand ≥ 1.0
- Indoor → all stressors suppressed, impact unavailable
- Altitude stub → stressor missing, no fabricated impact
- `EnvironmentalImpact` contains no weather field names

### Boundary isolation

- Recovery, Fatigue, Adaptation, Reasoning do not import observations or `EnvironmentalStress`
- `src/core/environment/index.ts` unchanged (no sensitivity profile in public API)

### Downstream overlay

- Hot weather reduces readiness overlay vs cool (same base score)
- Hot weather increases fatigue overlay vs mild
- Combined stressors reduce adaptation performance overlay more than hot alone

---

## Sensitivity profile (design only)

See [`ENVIRONMENTAL_SENSITIVITY_PROFILE.md`](./ENVIRONMENTAL_SENSITIVITY_PROFILE.md).

- `AthleteEnvironmentalSensitivityProfile` type defined
- Default neutral profile (`multiplier: 1.0`)
- `applyEnvironmentalSensitivityProfile()` passthrough — learning not implemented
- Future hook: between `buildEnvironmentalImpact` and downstream models

---

## Tests

```bash
yarn test src/core/inference/environment/__tests__/scientific-validation.test.ts
yarn test src/core/inference/environment/__tests__/environment-phase2.integration.test.ts
yarn test src/core/environment/__tests__/environment-v1.1.test.ts
```

---

## Phase 3 entry criteria

| Criterion                                     | Status    |
| --------------------------------------------- | --------- |
| Scenario catalog defined                      | ✅        |
| Scientific validation tests passing           | ✅        |
| Interaction matrix documented                 | ✅        |
| Sensitivity profile integration point defined | ✅        |
| No public API modifications                   | ✅        |
| Product / science sign-off                    | _Pending_ |

**Phase 3 (Presentation, Coach, Activity Correction) must not start until sign-off.**

---

## Code map

| Artifact                     | Path                                                                     |
| ---------------------------- | ------------------------------------------------------------------------ |
| Scenarios                    | `src/core/inference/environment/scenarios.ts`                            |
| Validation helpers           | `src/core/inference/environment/validation-helpers.ts`                   |
| Sensitivity profile (design) | `src/core/inference/environment/sensitivity-profile.ts`                  |
| Scientific tests             | `src/core/inference/environment/__tests__/scientific-validation.test.ts` |
| Interaction matrix           | `docs/models/PHYSIOLOGICAL_INTERACTION_MATRIX.md`                        |
