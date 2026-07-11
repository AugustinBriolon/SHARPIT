# Environmental Exposure Duration Model (Future — v2.7+)

> **Status:** Design only — not active  
> **Current behavior:** Unchanged (instantaneous stress only)  
> **Integration point:** `src/core/environment/exposure.ts`

---

## Objective

Environmental stress should eventually depend on **both**:

1. **Intensity** — how demanding the conditions are (current v2.6 behavior)
2. **Exposure duration** — how long the athlete was subjected to those conditions

Examples:

| Exposure       | Expected relative cost                  |
| -------------- | --------------------------------------- |
| 15 min at 34°C | Lower environmental cost                |
| 2h30 at 34°C   | Significantly higher environmental cost |

---

## Pipeline entry point (future)

```
Activity window / session duration
        ↓
EnvironmentalExposureContext  ← NEW (durationMinutes, startAt, endAt)
        ↓
buildEnvironmentalStress({ ..., exposure })   ← optional input (already typed)
        ↓
resolveExposureDurationFactor(exposure)     ← currently returns 1.0 (passthrough)
        ↓
Stressor intensity modulation (future)
        ↓
EnvironmentalImpact (unchanged consumer contract)
```

### Where duration is sourced

| Context               | Duration source                                          |
| --------------------- | -------------------------------------------------------- |
| `ActivityEnvironment` | `window.end - window.start` or activity `duration` field |
| `TodayEnvironment`    | Planned session duration or rolling day exposure (TBD)   |
| `ForecastEnvironment` | Planned workout window (TBD)                             |

### Where duration must NOT enter

- `EnvironmentalImpact` public shape — duration affects stress, not adjustment types
- Recovery / Fatigue / Adaptation models directly — they consume impact only
- `ActivityEnvironmentalCorrection` raw metrics — correction explains, never mutates

---

## Implementation stub

```typescript
// src/core/environment/exposure.ts
export type EnvironmentalExposureContext = {
  readonly durationMinutes: number | null;
  readonly startAt?: Date;
  readonly endAt?: Date;
};

export function resolveExposureDurationFactor(
  exposure: EnvironmentalExposureContext | undefined,
): number {
  void exposure;
  return 1; // passthrough until v2.7 calibration
}
```

`buildEnvironmentalStress` accepts optional `exposure` but ignores it until calibration is complete.

---

## Calibration dependency

Duration weighting must be recalibrated alongside:

- Neutral zone ceiling
- Significance thresholds
- Per-axis activation curves

See [`ENVIRONMENTAL_CALIBRATION.md`](./ENVIRONMENTAL_CALIBRATION.md) — **frozen at v2.6.1**. Exposure duration requires a new calibration sprint (v2.7), not a silent code change.

---

## Related documents

- [`ENVIRONMENTAL_CALIBRATION.md`](./ENVIRONMENTAL_CALIBRATION.md) — frozen impact curves
- [`ENVIRONMENTAL_CONTEXT_ENGINE.md`](./ENVIRONMENTAL_CONTEXT_ENGINE.md) — engine reference
