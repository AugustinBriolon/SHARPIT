# SHARPIT — Decision Engine (decision-v1)

> **Status:** Active — canonical orchestration layer  
> **Code:** `src/core/decision/`  
> **Version:** `decision-v1`  
> **Supersedes:** ad-hoc cross-model synthesis in Reasoning scoring (Reasoning is now a projection)

---

## Philosophy

Every specialized engine answers **one physiological question**.

The Decision Engine answers **one product question**:

> _What is the single most important thing the athlete should understand right now?_

It **never performs physiological inference**. It **arbitrates** stable outputs from existing engines.

Design principles:

| Principle                   | Rule                                             |
| --------------------------- | ------------------------------------------------ |
| Reduce cognitive load       | One primary decision, max 3 explanation items    |
| Safety first                | Physical Health and Fatigue override performance |
| Confidence over speculation | Low confidence gates advice                      |
| Single arbitration point    | No other layer may prioritize across models      |
| Deterministic               | Same inputs → same DecisionState                 |

---

## Boundaries

### Consumes (stable engine outputs only)

| Input                                                   | Source                       |
| ------------------------------------------------------- | ---------------------------- |
| `RecoveryState`                                         | Recovery Engine              |
| `FatigueState`                                          | Fatigue Engine               |
| `AdaptationState`                                       | Adaptation Engine            |
| `PhysicalHealthState`                                   | Physical Health Engine       |
| `EnvironmentalDecisionSnapshot` + `EnvironmentalImpact` | Environmental Context Engine |
| `freshnessConfidence` (optional)                        | Athlete Freshness            |

### Never consumes

- Raw observations (Garmin streams, weather records, HRV samples)
- Feature vectors
- Unprocessed model internals

### Produces

`DecisionState` — the **single source of truth** for:

- Today / Morning Experience
- Coach prompts and findings
- Notifications and widgets (future)
- Athlete Snapshot product fields

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    INDEPENDENT INFERENCE ENGINES                 │
│  Recovery │ Fatigue │ Adaptation │ Physical Health │ Environment │
└────────────────────────────┬────────────────────────────────────┘
                             │ stable states (Digital Twin)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DECISION ENGINE (decision-v1)                │
│  priority.ts → arbitration.ts → conflict-resolution.ts           │
│              → evidence-ranking.ts → decision-engine.ts          │
└────────────────────────────┬────────────────────────────────────┘
                             │ DecisionState
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              PROJECTION LAYER (backward compatible)              │
│  ReasoningState │ AthleteSnapshot │ TodayViewModel │ Coach       │
└─────────────────────────────────────────────────────────────────┘
```

### Module responsibilities

| Module                   | Role                                                    |
| ------------------------ | ------------------------------------------------------- |
| `decision-state.ts`      | Canonical types (`DecisionState`, `PrimaryDecision`, …) |
| `priority.ts`            | Domain safety ordering, confidence tiers                |
| `arbitration.ts`         | Verdict synthesis, limiting factor, primary decision    |
| `conflict-resolution.ts` | Cross-model conflict detection and resolution           |
| `evidence-ranking.ts`    | Rank findings, suppress redundancy                      |
| `decision-engine.ts`     | `runDecisionEngine()` entry point                       |
| `adapters.ts`            | `decisionStateToReasoningState()` for legacy consumers  |

---

## DecisionState

```typescript
DecisionState {
  primaryDecision        // single headline + action codes
  limitingFactor         // dominant constraint with domain + priority
  supportingEvidence     // ranked, max 5
  suppressedEvidence     // redundant / below cutoff
  confidence             // gated by freshness
  confidenceTier         // HIGH | MEDIUM | LOW | INSUFFICIENT
  conflicts              // resolved cross-model conflicts
  priority               // attention domain + safety override flags
  explanationOrder       // max 3 ids for progressive disclosure
  overallVerdict         // canonical daily verdict (OverallVerdict)
  topAction              // null when confidence-gated
  …
}
```

---

## Arbitration rules (safety-first)

Evaluated top-down:

1. **Physical Health block** → `RECOVER` (training blocked by condition)
2. **Physical Health REST_ONLY** → `RECOVER`
3. **Fatigue OVERREACHING_RISK** → `RECOVER`
4. **Fatigue REST_ONLY** → `RECOVER`
5. **Recovery LOW / VERY_LOW** → `RECOVER`
6. **Adaptation overreaching without adaptation** → `CAUTION`
7. Core R+F+A synthesis (existing safety-first rules)
8. **Physical Health REDUCED** caps `TRAIN_HARD` → `TRAIN_EASY`
9. **Environment SIGNIFICANT** moderates aggressive verdicts

### Domain priority (limiting factor)

```
PHYSICAL_HEALTH > FATIGUE > RECOVERY > ENVIRONMENT > ADAPTATION > …
```

---

## Confidence policy

| Tier         | Threshold                        | Effect                              |
| ------------ | -------------------------------- | ----------------------------------- |
| HIGH         | ≥ 0.75                           | Full advice                         |
| MEDIUM       | ≥ 0.60                           | Advice with standard gating         |
| LOW          | > 0                              | Reduced confidence label            |
| INSUFFICIENT | 0 or verdict `INSUFFICIENT_DATA` | `topAction = null`, advice withheld |

Freshness confidence multiplies model confidence when provided.

---

## Conflict resolution

Conflicts detected between model directions (e.g. Recovery TRAIN vs Fatigue REST).

Resolution rule: **lowest domain priority index wins** (safety-first ordering).

Physical Health capacity conflicts are resolved in favor of **PHYSICAL_HEALTH**.

---

## Evidence ranking

1. Sort by severity (CRITICAL → WARNING → INFO)
2. Then by domain safety priority
3. Then by confidence
4. Suppress redundant same-domain lower-severity items
5. Cap supporting evidence at 5; remainder → `suppressedEvidence`
6. `explanationOrder` = top 3 ids (cognitive load cap)

Environmental findings appended when impact is significant.

---

## Integration

### Entry point

```typescript
import { runDecisionEngine } from '@/core/decision';

const { decisionState } = runDecisionEngine({
  trainingDayId,
  athleteId,
  recovery,
  fatigue,
  adaptation,
  physicalHealth,
  environment,
  environmentalImpact,
});
```

### Reasoning Engine (narrative projection only)

`runReasoningModel()` delegates to `runDecisionEngine()` and projects to `ReasoningState` for Twin backward compatibility.

**Rule:** `ReasoningState` must never gate product advice, verdicts, or recommendations. Use projection helpers in `src/lib/decision/projection.ts`.

### Canonical client APIs (post-P2)

| Surface                         | Endpoint                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------- |
| Athlete snapshot (client cache) | `GET /api/athlete-state/snapshot`                                               |
| Today ViewModel                 | `GET /api/presentation/today`                                                   |
| Drill-down ViewModels           | `GET /api/presentation/{recovery,sleep,effort,adaptation,body,physical-health}` |

**Removed in P2:** `/api/reasoning`, `/api/today`, `/api/recovery`, `/api/fatigue`, `/api/adaptation`.

### Today pipeline

```
loadTodayState:
  1. Physical Health + Environment
  2. Recovery + Fatigue + Adaptation + Daily Strain (parallel)
  3. Decision / Reasoning (sequential — after sub-models)
```

### Athlete Snapshot

```typescript
snapshot.decision; // canonical DecisionState (serialized)
snapshot.todaysDecision; // decision.primaryDecision.verdict
```

---

## Rule for all future surfaces

> **No Presentation component, Coach prompt, notification, or widget may directly combine multiple physiological engines.**

Everything must consume `DecisionState` (directly or via AthleteSnapshot projection).

---

## Tests

```bash
yarn test src/core/decision/__tests__/decision-engine.test.ts
yarn test src/core/inference/reasoning/__tests__/model.test.ts
```

---

## Related documents

- [`REASONING_ENGINE.md`](./REASONING_ENGINE.md) — legacy synthesis spec (superseded for arbitration)
- [`PHYSIOLOGICAL_INTERACTION_MATRIX.md`](./PHYSIOLOGICAL_INTERACTION_MATRIX.md) — cross-engine coupling
- [`ATHLETE_SNAPSHOT.md`](../ATHLETE_SNAPSHOT.md) — snapshot contract
