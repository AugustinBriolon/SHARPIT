# Environmental Context Engine — Phase 3 Presentation

> **Status:** In progress  
> **Engine:** Scientifically and architecturally stable (calibration frozen v2.6.1)  
> **Scope:** Product expression only — no engine or calibration changes

---

## Objective

Expose environmental intelligence to the athlete through Coach, Today, and Activity Detail — without leaking weather fields or modifying raw performance metrics.

---

## Surfaces

| Surface                        | Implementation                                                                   | Data source                              |
| ------------------------------ | -------------------------------------------------------------------------------- | ---------------------------------------- |
| **Today — Why block**          | `buildEnvironmentPresentationContext()` in `src/lib/presentation/environment.ts` | `AthleteSnapshot.environment`            |
| **Coach — Reasoning findings** | `appendEnvironmentalFindings()` + French copy                                    | `EnvironmentalImpact` (significant only) |
| **Activity Detail**            | `ActivityEnvironmentInsight` component                                           | `ActivityEnvironmentalCorrection`        |
| **Presentation VM**            | `TodayViewModel.environmentContext`                                              | Snapshot decision fields                 |

---

## Activity Environmental Correction (Phase 3 algorithm)

`buildActivityEnvironmentalCorrection({ activityId, stress, impact })`:

1. Suppressed applicability → unavailable correction
2. Neutral zone or non-significant impact → zero factors
3. Distributes performance penalty across THERMAL / WIND / HYDRATION stressors
4. Emits narrative codes for Coach / Detail rendering
5. `rawMetricsPreserved` always `true`

Code: `src/core/environment/correction.ts`

---

## What does NOT change

- `environment-v1.1` public types
- Calibration curves (`ENVIRONMENTAL_CALIBRATION.md` frozen)
- Recovery / Fatigue / Adaptation inference (consume `EnvironmentalImpact` only)
- Twin persistence schema

---

## Future: exposure duration (v2.7)

Duration-weighted stress is designed but not active. See [`ENVIRONMENTAL_EXPOSURE_MODEL.md`](./ENVIRONMENTAL_EXPOSURE_MODEL.md).

---

## Tests

```bash
yarn test src/core/environment/__tests__/environment-v1.1.test.ts
yarn test src/core/environment/__tests__/correction.test.ts
yarn test src/core/inference/environment/__tests__/scientific-validation.test.ts
yarn test src/lib/presentation/environment.test.ts
```

---

## Related documents

- [`ENVIRONMENTAL_CALIBRATION.md`](./ENVIRONMENTAL_CALIBRATION.md) — frozen
- [`ENVIRONMENTAL_CONTEXT_ENGINE_PHASE2_INTEGRATION.md`](./ENVIRONMENTAL_CONTEXT_ENGINE_PHASE2_INTEGRATION.md)
