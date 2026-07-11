# SHARPIT — Physiological Interaction Matrix

> **Status:** Canonical reference — cross-engine dependency map  
> **Version:** 1.0 (2026-07-10)  
> **Scope:** Recovery, Fatigue, Adaptation, Daily Strain, Physical Health, Environmental Context, Reasoning

This document is the **official reference** for how SHARPIT inference engines exchange domain objects. When wiring a new engine or debugging cross-model behavior, start here.

---

## Legend

| Column            | Meaning                                 |
| ----------------- | --------------------------------------- |
| **Producer**      | Engine or layer that creates the object |
| **Consumer**      | Engine or layer that reads the object   |
| **Domain object** | Typed contract exchanged                |
| **Direction**     | Data flow arrow                         |
| **Rationale**     | Why this coupling exists                |

**Direction notation:** `A → B` means A produces, B consumes.

---

## 1. Feature layer → Physiological models

| Producer       | Consumer         | Domain object                                       | Direction                     | Rationale                                                         |
| -------------- | ---------------- | --------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------- |
| Feature Engine | Recovery Model   | `DayFeatures` (recovery, load, sessions)            | Feature Engine → Recovery     | Recovery infers readiness from HRV, sleep, load — not from Twin   |
| Feature Engine | Fatigue Model    | `DayFeatures` (load, recovery, sessions, condition) | Feature Engine → Fatigue      | Fatigue dimensions need same-day training load and wellness       |
| Feature Engine | Adaptation Model | `DayFeatures` (load, recovery, sessions)            | Feature Engine → Adaptation   | Adaptation tracks load progression and efficiency from activities |
| Feature Engine | Daily Strain     | `DayFeatures.sessions` + legacy activities          | Feature Engine → Daily Strain | Effort ring is derived from completed session TSS                 |

**Invariant:** Physiological models read **Feature Repository**, not Twin, for primary inputs (ADR-004).

---

## 2. Environmental Context Engine

| Producer                       | Consumer               | Domain object                                     | Direction                 | Rationale                                          |
| ------------------------------ | ---------------------- | ------------------------------------------------- | ------------------------- | -------------------------------------------------- |
| Providers + Adapters           | Observation store      | `EnvironmentalObservationRecord`                  | Providers → DB            | Immutable evidence — source of truth               |
| Environment Engine             | Digital Twin           | `EnvironmentalTwinState` (stress + impact + meta) | Environment → Twin        | Cache of inferred athlete environmental experience |
| Environment Engine             | Decision Records       | `stateUpdate` (stress, impact)                    | Environment → Audit       | Replay and explainability                          |
| Digital Twin                   | Recovery Model         | `EnvironmentalImpact` (via context)               | Twin → Recovery           | Recovery demand overlay — no weather fields        |
| Digital Twin                   | Fatigue Model          | `EnvironmentalImpact` (via context)               | Twin → Fatigue            | Fatigue accumulation overlay                       |
| Digital Twin                   | Adaptation Model       | `EnvironmentalImpact` (via context)               | Twin → Adaptation         | Performance expectation overlay                    |
| Digital Twin                   | Reasoning Engine       | `EnvironmentalTwinState.impact`                   | Twin → Reasoning          | Cross-system findings when impact is significant   |
| Environment Engine             | Athlete Snapshot       | `EnvironmentalDecisionSnapshot`                   | Environment → Snapshot    | Decision-relevant summary only                     |
| _(future)_ Sensitivity Profile | Impact personalization | `EnvironmentalImpact`                             | Profile → Inference layer | Per-athlete scaling before downstream models       |

**Forbidden couplings:**

| Consumer                        | Must NOT read                                                           |
| ------------------------------- | ----------------------------------------------------------------------- |
| Recovery / Fatigue / Adaptation | `EnvironmentalStress`, `EnvironmentalObservationRecord`, weather fields |
| Snapshot                        | Provider payloads, raw stressor mechanics                               |
| Reasoning                       | `ActivityEnvironmentalCorrection` (Phase 3)                             |

---

## 3. Recovery Intelligence

| Producer       | Consumer         | Domain object             | Direction           | Rationale                                                |
| -------------- | ---------------- | ------------------------- | ------------------- | -------------------------------------------------------- |
| Recovery Model | Digital Twin     | `RecoveryState`           | Recovery → Twin     | Persist readiness score, dimensions, confidence          |
| Recovery Model | Decision Records | `RecoveryModelOutput`     | Recovery → Audit    | Immutable inference trail                                |
| Digital Twin   | Fatigue Model    | `RecoveryState` (context) | Twin → Fatigue      | Neuromuscular and cumulative fatigue use autonomic state |
| Digital Twin   | Adaptation Model | `RecoveryState` (context) | Twin → Adaptation   | Recovery quality dimension                               |
| Digital Twin   | Reasoning Engine | `RecoveryState`           | Twin → Reasoning    | Verdict synthesis, limiting factor                       |
| Recovery Model | Athlete Snapshot | `RecoveryData`            | Recovery → Snapshot | Today UI and product surfaces                            |

---

## 4. Fatigue Intelligence

| Producer      | Consumer         | Domain object            | Direction          | Rationale                                   |
| ------------- | ---------------- | ------------------------ | ------------------ | ------------------------------------------- |
| Fatigue Model | Digital Twin     | `FatigueState`           | Fatigue → Twin     | Persist fatigue index, trajectory, capacity |
| Fatigue Model | Decision Records | `FatigueModelOutput`     | Fatigue → Audit    | Audit trail                                 |
| Digital Twin  | Adaptation Model | `FatigueState` (context) | Twin → Fatigue     | Overreaching detection, recovery quality    |
| Digital Twin  | Reasoning Engine | `FatigueState`           | Twin → Reasoning   | Safety-first verdict, conflicts             |
| Fatigue Model | Athlete Snapshot | `FatigueData`            | Fatigue → Snapshot | Product layer                               |

---

## 5. Adaptation Intelligence

| Producer         | Consumer         | Domain object           | Direction             | Rationale                                     |
| ---------------- | ---------------- | ----------------------- | --------------------- | --------------------------------------------- |
| Adaptation Model | Digital Twin     | `AdaptationState`       | Adaptation → Twin     | Persist adaptation index, trend, plateau risk |
| Adaptation Model | Decision Records | `AdaptationModelOutput` | Adaptation → Audit    | Audit trail                                   |
| Digital Twin     | Reasoning Engine | `AdaptationState`       | Twin → Reasoning      | Training stimulus vs recovery balance         |
| Adaptation Model | Athlete Snapshot | `AdaptationData`        | Adaptation → Snapshot | Product layer                                 |

---

## 6. Physical Health Engine

| Producer              | Consumer              | Domain object                          | Direction                  | Rationale                                                  |
| --------------------- | --------------------- | -------------------------------------- | -------------------------- | ---------------------------------------------------------- |
| Condition Repository  | Physical Health Model | `ConditionInferenceInput[]`            | DB → Physical Health       | Persistent injury/limitation memory                        |
| Physical Health Model | Digital Twin          | `PhysicalHealthState`                  | Physical Health → Twin     | Training capacity, active conditions                       |
| Physical Health Model | Condition rows        | `ConditionUpdate[]`                    | Physical Health → DB       | Inferred severity, status, trend                           |
| Physical Health Model | Decision Records      | `PhysicalHealthModelOutput`            | Physical Health → Audit    | Audit trail                                                |
| Digital Twin          | Fatigue Model         | `condition` features via `DayFeatures` | Features → Fatigue         | `trainingBlockedByCondition` gate                          |
| Physical Health Model | Athlete Snapshot      | `PhysicalHealthData`                   | Physical Health → Snapshot | Biology hub, limiting factors                              |
| Physical Health Model | Reasoning Engine      | _(indirect via presentation today)_    | —                          | Reasoning does not yet consume physical health in model.ts |

---

## 7. Daily Strain

| Producer                    | Consumer              | Domain object                    | Direction               | Rationale                                                             |
| --------------------------- | --------------------- | -------------------------------- | ----------------------- | --------------------------------------------------------------------- |
| Feature Engine + Activities | Daily Strain computer | Session features, health signals | Features → Daily Strain | TSS aggregation for today                                             |
| Daily Strain computer       | Athlete Snapshot      | `DailyStrainData`                | Daily Strain → Snapshot | Effort ring, strain score                                             |
| Daily Strain                | Reasoning Engine      | —                                | **No direct coupling**  | Strain informs product UI; reasoning uses Recovery/Fatigue/Adaptation |
| Environmental Context       | Daily Strain          | —                                | **No coupling**         | Environment does not modify raw session metrics                       |

---

## 8. Reasoning Engine

| Producer        | Consumer         | Domain object                                                 | Direction            | Rationale                                    |
| --------------- | ---------------- | ------------------------------------------------------------- | -------------------- | -------------------------------------------- |
| Digital Twin    | Reasoning Model  | `AthleteState` (recovery, fatigue, adaptation, environmental) | Twin → Reasoning     | Meta-layer over physiological models         |
| Reasoning Model | Digital Twin     | `ReasoningState`                                              | Reasoning → Twin     | Verdict, limiting factor, attention priority |
| Reasoning Model | Decision Records | `ReasoningModelOutput`                                        | Reasoning → Audit    | Audit trail                                  |
| Reasoning Model | Athlete Snapshot | `ReasoningData`                                               | Reasoning → Snapshot | Today's decision, top action                 |

**Reasoning never recomputes physiological scores.** It arbitrates model outputs.

---

## 9. Athlete Snapshot (assembly)

| Producer              | Consumer                | Domain object              | Direction                 | Rationale                                      |
| --------------------- | ----------------------- | -------------------------- | ------------------------- | ---------------------------------------------- |
| All inference engines | Snapshot Builder        | `TodayState`               | Models → Snapshot Builder | Single assembly point                          |
| Freshness Service     | Snapshot Builder        | `AthleteFreshnessSnapshot` | Freshness → Snapshot      | Domain degradation messages                    |
| Snapshot Builder      | Snapshot Record         | `AthleteSnapshot`          | Builder → DB              | Immutable daily snapshot                       |
| Snapshot Record       | Presentation / Today UI | `AthleteSnapshot`          | Snapshot → UI             | Product reads snapshot only — never recomputes |

---

## 10. Pipeline execution order (Today)

```
1. Physical Health
2. Environmental Context        ← must complete before physiological overlays
3. Recovery ∥ Fatigue ∥ Adaptation ∥ Daily Strain   (parallel)
4. Reasoning                    ← after sub-models; checks staleness
5. Athlete Snapshot regeneration
```

---

## 11. Dependency diagram

```
                    ┌─────────────────────┐
                    │   Feature Engine    │
                    └─────────┬───────────┘
                              │ DayFeatures
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
   │  Recovery   │    │   Fatigue   │    │ Adaptation  │
   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
          │                  │                  │
          │    EnvironmentalImpact (overlay)    │
          │◄─────────────────┼──────────────────┤
          │                  │                  │
          ▼                  ▼                  ▼
   ┌─────────────────────────────────────────────────┐
   │              Digital Twin (AthleteState)         │
   └──────────────────────┬──────────────────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │  Reasoning  │
                   └──────┬──────┘
                          │
                          ▼
                   ┌─────────────┐
                   │  Snapshot   │
                   └─────────────┘

   EnvironmentalObservationRecord ──► Environment Engine ──► Twin
   Condition / Observation ────────► Physical Health ────► Twin
```

---

## 12. Change protocol

When adding a new cross-engine coupling:

1. Update this matrix.
2. Verify producer does not leak forbidden fields (see Environmental forbidden couplings).
3. Add interaction test or scientific validation scenario.
4. Update `docs/models/` engine doc if behavior is user-visible.

---

## Related documents

- [`ENVIRONMENTAL_CONTEXT_ENGINE.md`](./ENVIRONMENTAL_CONTEXT_ENGINE.md)
- [`ENVIRONMENTAL_CONTEXT_ENGINE_PHASE2_5_VALIDATION.md`](./ENVIRONMENTAL_CONTEXT_ENGINE_PHASE2_5_VALIDATION.md)
- [`ENVIRONMENTAL_SENSITIVITY_PROFILE.md`](./ENVIRONMENTAL_SENSITIVITY_PROFILE.md)
- [`ATHLETE_SNAPSHOT.md`](../ATHLETE_SNAPSHOT.md)
- [`DOMAIN.md`](../domain/DOMAIN.md)
