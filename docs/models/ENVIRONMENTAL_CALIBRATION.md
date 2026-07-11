# Environmental Impact Calibration

> **Status:** **FROZEN** — v2.6.1 (2026-07-10)  
> **Do not recalibrate** unless future scientific evidence requires it  
> **Exposure duration:** deferred to v2.7 — see [`ENVIRONMENTAL_EXPOSURE_MODEL.md`](./ENVIRONMENTAL_EXPOSURE_MODEL.md)

---

## Objective

Ensure `EnvironmentalImpact` remains **meaningful** and does not become **background noise**.

The engine should be **mostly invisible under normal conditions** and become **influential only when environmental stress is genuinely significant**.

`EnvironmentalStress` may still quantify mild conditions. `EnvironmentalImpact` must not continuously modify the Digital Twin in those cases.

---

## Calibration philosophy

| Principle          | Implementation                                                                     |
| ------------------ | ---------------------------------------------------------------------------------- |
| Stress ≠ Impact    | Stressors measure exposure; impact applies only above neutral zone                 |
| Progressive curves | Power-law activation above per-axis thresholds — no abrupt steps                   |
| Proportionality    | Small stress → small adjustment; large stress → larger adjustment                  |
| Composability      | Combined stressors aggregate calibrated intensities, not raw linear sums           |
| Recalibration here | Tune constants in `calibration.ts` and this document — not scattered magic numbers |

---

## Assumptions

1. **Outdoor applicability** is required for any environmental overlay. Indoor activities are fully suppressed.
2. **Composite intensity** (max of available stressor intensities) gates the global neutral zone.
3. **Per-axis activation** further dampens individual adjustments when a stressor is present but not physiologically demanding.
4. **Significance thresholds** (for Reasoning / Snapshot) are deliberately above identity multipliers to avoid flagging mild overlays.
5. Calibration targets **training-relevant** environmental stress, not clinical heat illness modeling.
6. Altitude remains stubbed — no fabricated penalty until provider data exists.

---

## Neutral zone

### Global gate

When `compositeIntensity < 0.35`, all impact multipliers return identity values:

| Adjustment               | Neutral value |
| ------------------------ | ------------- |
| Recovery demand          | 1.00          |
| Fatigue accumulation     | 1.00          |
| Performance output ratio | 1.00          |
| Hydration demand         | 1.00          |
| Heat acclimation benefit | 0.00          |

**Rationale:** Cool (12°C) and mild (20°C) outdoor scenarios produce composite ~0.11–0.22. Stress is recorded for observability; downstream models are unchanged.

### Scenarios in neutral zone (v2.6)

| Scenario        | Composite | Recovery | Significant |
| --------------- | --------- | -------- | ----------- |
| `COOL_WEATHER`  | 0.11      | 1.00     | No          |
| `MILD_BASELINE` | 0.22      | 1.00     | No          |
| `ALTITUDE_STUB` | 0.19      | 1.00     | No          |

---

## Stress thresholds (activation)

Above the neutral zone, each adjustment uses a **smooth activation curve**:

```
effective = ((raw - activation) / (1 - activation))^exponent   if raw > activation
effective = 0                                                  otherwise
```

| Curve                 | Activation | Max scale / penalty           | Exponent |
| --------------------- | ---------- | ----------------------------- | -------- |
| Recovery (thermal)    | 0.50       | +35% demand                   | 1.5      |
| Fatigue (thermal)     | 0.55       | —                             | 1.5      |
| Fatigue (wind)        | 0.35       | +30% accumulation (composite) | 1.5      |
| Performance (thermal) | 0.50       | −25% output (composite)       | 1.5      |
| Performance (wind)    | 0.35       | —                             | 1.5      |
| Hydration             | 0.45       | +45% demand                   | 1.2      |
| Heat acclimation      | 0.65       | benefit up to 1.0             | 1.3      |

**Composite weights:**

- Fatigue: 65% thermal + 35% wind (calibrated effective intensities)
- Performance: 60% thermal + 40% wind

---

## Impact curves

### Demand multiplier

```
multiplier = 1 + effective × maxScale
```

Rounded to 2 decimal places.

### Performance ratio

```
ratio = max(0.50, 1 - effective × maxPenalty)
```

### Heat acclimation benefit

```
benefit = effective × maxBenefit
```

---

## Significance thresholds

Impact is declared **significant** when any axis exceeds:

| Axis                 | Threshold |
| -------------------- | --------- |
| Recovery demand      | ≥ 1.08    |
| Fatigue accumulation | ≥ 1.06    |
| Performance ratio    | ≤ 0.94    |
| Hydration demand     | ≥ 1.10    |

**Rationale:** Hot dry (34°C) produces recovery ~1.07 — above identity but below significance. High humidity and extreme heat cross the threshold.

---

## Calibrated scenario reference (v2.6)

| Scenario             | Composite | Recovery | Fatigue | Performance | Significant     |
| -------------------- | --------- | -------- | ------- | ----------- | --------------- |
| `COOL_WEATHER`       | 0.11      | 1.00     | 1.00    | 1.00        | No              |
| `MILD_BASELINE`      | 0.22      | 1.00     | 1.00    | 1.00        | No              |
| `HOT_WEATHER`        | 0.45      | 1.09     | 1.04    | 0.96        | **Yes**         |
| `HIGH_HUMIDITY`      | 0.60      | 1.29     | 1.16    | 0.87        | Yes             |
| `STRONG_WIND`        | 0.42      | 1.00     | 1.06    | 0.94        | Yes             |
| `EXTREME_HEAT`       | 0.67      | 1.29     | 1.16    | 0.87        | Yes             |
| `COMBINED_STRESSORS` | 0.87      | 1.29     | 1.20    | 0.84        | Yes             |
| `INDOOR_TRAINER`     | —         | —        | —       | —           | No (suppressed) |

Stress intensities are unchanged from v1.1. Only impact mapping differs.

---

## Regression guards

Tests in:

- `src/core/environment/__tests__/calibration.test.ts`
- `src/core/inference/environment/__tests__/scientific-validation.test.ts`

Assertions:

1. Neutral environments → identity multipliers
2. Impact magnitude increases monotonically across thermal severity tiers
3. Combined stressors > isolated hot weather
4. Indoor activities fully suppressed
5. Monotonicity preserved on stress and impact axes
6. No weather fields on `EnvironmentalImpact`

---

## Known limitations

1. **No personalization** — sensitivity profile remains neutral passthrough (Phase 2.5 design).
2. **Altitude stub** — typed but not fed; no hypoxic penalty.
3. **Single composite gate** — global neutral zone uses max stressor intensity, not weighted sum.
4. **Hot dry recognition (v2.6.1)** — 34°C dry heat crosses significance (~1.09 recovery) without dramatic demand increase.
5. **Wind-only scenarios** — performance penalty may trigger significance before fatigue accumulation crosses threshold.
6. **No activity-type modulation** — running vs cycling wind exposure not differentiated at impact layer.
7. **No exposure duration** — see exposure model doc; 15 min vs 2h30 at same temperature treated identically until v2.7.

---

## Recalibration procedure

1. Update constants in `src/core/environment/calibration.ts`
2. Mirror changes in this document (neutral zone, activations, significance)
3. Run scenario dump or update `scenarios.ts` expected ranges
4. Run test suite:
   ```bash
   yarn test src/core/environment/__tests__/calibration.test.ts
   yarn test src/core/inference/environment/__tests__/scientific-validation.test.ts
   yarn test src/core/environment/__tests__/environment-v1.1.test.ts
   yarn test src/core/inference/environment/__tests__/environment-phase2.integration.test.ts
   ```
5. Verify monotonicity and neutral-zone invariants before merging

---

## Related documents

- [`ENVIRONMENTAL_CONTEXT_ENGINE.md`](./ENVIRONMENTAL_CONTEXT_ENGINE.md) — engine reference
- [`ENVIRONMENTAL_CONTEXT_ENGINE_PHASE2_5_VALIDATION.md`](./ENVIRONMENTAL_CONTEXT_ENGINE_PHASE2_5_VALIDATION.md) — pre-calibration validation
- [`PHYSIOLOGICAL_INTERACTION_MATRIX.md`](./PHYSIOLOGICAL_INTERACTION_MATRIX.md) — cross-engine interactions
