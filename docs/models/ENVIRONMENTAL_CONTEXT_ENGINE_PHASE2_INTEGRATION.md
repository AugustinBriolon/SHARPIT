# Environmental Context Engine — Phase 2 Integration

> **Status:** Complete  
> **Contract:** `environment-v1.1` (frozen — no public API changes in Phase 2)  
> **Prior:** [`ENVIRONMENTAL_CONTEXT_ENGINE_V1_1_CONTRACT_FREEZE.md`](./ENVIRONMENTAL_CONTEXT_ENGINE_V1_1_CONTRACT_FREEZE.md)

---

## Architecture

```
EnvironmentalObservationRecord (Prisma — source of truth)
        ↓
EnvironmentInferenceOrchestrator
        ↓
EnvironmentalTwinState (Digital Twin cache)
  ├─ environmentalStressState
  ├─ environmentalImpactState
  └─ environmentalStateMeta (rebuild metadata)
        ↓
Recovery / Fatigue / Adaptation (EnvironmentalImpact overlay only)
        ↓
Reasoning (reads impact via AthleteState.environmental)
        ↓
Athlete Snapshot (EnvironmentalDecisionSnapshot — decision layer only)
```

---

## Digital Twin

| Column                     | Type                     | Role                                               |
| -------------------------- | ------------------------ | -------------------------------------------------- |
| `environmentalStressState` | `EnvironmentalStress`    | What the athlete is experiencing (inferred)        |
| `environmentalImpactState` | `EnvironmentalImpact`    | Physiological adjustment overlay                   |
| `environmentalStateMeta`   | `EnvironmentalStateMeta` | `trainingDayId`, `observationRecordIds`, freshness |

Twin answers: **"What is the athlete currently experiencing?"** — not raw weather.

Deleting Twin environmental columns + re-running `rebuildFromObservations()` reproduces identical state.

---

## Snapshot boundary

`EnvironmentalDecisionSnapshot` on `AthleteSnapshot.environment`:

- `thermalStressLevel`
- `recoveryDemandAdjustment`
- `fatigueAdjustment`
- `performanceAdjustment`
- `trainingImpact`
- `confidence`, `computedAt`

No provider payloads, humidity, dew point, or internal stressor mechanics.

---

## Model integration rules (enforced)

| Model      | Consumes                            | Must NOT import                     |
| ---------- | ----------------------------------- | ----------------------------------- |
| Recovery   | `EnvironmentalImpact` via context   | `EnvironmentalStress`, observations |
| Fatigue    | `EnvironmentalImpact` via context   | `EnvironmentalStress`, observations |
| Adaptation | `EnvironmentalImpact` via context   | `EnvironmentalStress`, observations |
| Reasoning  | `athleteState.environmental.impact` | `ActivityEnvironmentalCorrection`   |

Environment runs **before** Recovery/Fatigue/Adaptation in `loadTodayState`.

---

## Code map

| Layer              | Path                                                                          |
| ------------------ | ----------------------------------------------------------------------------- |
| Orchestrator       | `src/core/inference/environment-orchestrator.ts`                              |
| Observation repo   | `src/infrastructure/environment/prisma-environment-observation-repository.ts` |
| Twin persistence   | `src/infrastructure/digital-twin/prisma-digital-twin-repository.ts`           |
| Impact application | `src/core/inference/environment/apply-impact.ts`                              |
| Snapshot mapper    | `src/core/inference/environment/snapshot.ts`                                  |
| Today pipeline     | `src/lib/today-state-server.ts`                                               |
| Engine singleton   | `src/lib/engines/environment-engine.ts`                                       |

---

## Tests

```bash
yarn test src/core/inference/environment/__tests__/environment-phase2.integration.test.ts
yarn test src/core/environment/__tests__/environment-v1.1.test.ts
```

---

## Phase 3 (in progress)

- `ActivityEnvironmentalCorrection` attribution algorithm — **implemented**
- Coach / Activity Detail / Today surfaces — **in progress**
- Presentation layer copy — **in progress**

See [`ENVIRONMENTAL_CONTEXT_ENGINE_PHASE3_PRESENTATION.md`](./ENVIRONMENTAL_CONTEXT_ENGINE_PHASE3_PRESENTATION.md).
