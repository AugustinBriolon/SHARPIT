# Athlete Environmental Sensitivity Profile — Design (Phase 2.5)

> **Status:** Design only — not applied in inference  
> **Code:** `src/core/inference/environment/sensitivity-profile.ts`  
> **Contract:** Does not modify `environment-v1.1` public API

---

## Purpose

Future personalization layer that scales `EnvironmentalImpact` per athlete based on months of training history.

**Phase 2.5 delivers the integration point only.** Default profile is neutral (multiplier `1.0` on all axes).

---

## Profile shape

```typescript
AthleteEnvironmentalSensitivityProfile {
  version: 1
  athleteId
  thermal:   { multiplier, confidence, sampleCount, lastUpdatedAt }
  humidity:  { multiplier, confidence, sampleCount, lastUpdatedAt }
  altitude:  { multiplier, confidence, sampleCount, lastUpdatedAt }
  wind:      { multiplier, confidence, sampleCount, lastUpdatedAt }
  isDefault: boolean
  computedAt: string | null
}
```

| Axis       | Meaning                                   |
| ---------- | ----------------------------------------- |
| `thermal`  | Heat tolerance / heat sensitivity         |
| `humidity` | Humidity-specific thermoregulatory strain |
| `altitude` | Altitude response (when dimension is fed) |
| `wind`     | Wind exposure tolerance                   |

---

## Default behavior

`createNeutralEnvironmentalSensitivityProfile(athleteId)` returns all axes at `multiplier: 1.0`, `isDefault: true`.

`applyEnvironmentalSensitivityProfile({ baseImpact, profile })` is a **passthrough** until learning is implemented.

---

## Future integration point (Phase 4+)

```
buildEnvironmentalImpact({ stress })
        ↓
applyEnvironmentalSensitivityProfile(baseImpact, athleteProfile)   ← future
        ↓
Recovery / Fatigue / Adaptation context.environmentalImpact
```

| Rule                                                   | Rationale                                                           |
| ------------------------------------------------------ | ------------------------------------------------------------------- |
| Profile lives outside `src/core/environment/`          | Frozen public contract untouched                                    |
| Profile persisted separately from Twin cache           | Observations + stress remain canonical; profile is athlete metadata |
| Learning reads activity outcomes + environmental state | Months of paired (environment, performance, RPE) history            |
| Never learn from a single session                      | Avoid overfitting weather noise                                     |

---

## Learning inputs (future — not implemented)

| Signal                                | Use                  |
| ------------------------------------- | -------------------- |
| Performance delta vs baseline in heat | Thermal sensitivity  |
| RPE elevation in humidity             | Humidity sensitivity |
| Power/pace degradation in wind        | Wind sensitivity     |
| Altitude session outcomes             | Altitude sensitivity |

---

## Repository port

`AthleteEnvironmentalSensitivityProfileRepository.findByAthleteId()` — stub interface defined; Prisma implementation deferred.

---

## Validation

Neutral profile passthrough is tested in `scientific-validation.test.ts`.

```bash
yarn test src/core/inference/environment/__tests__/scientific-validation.test.ts
```
