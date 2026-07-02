# Reasoning Engine v1

## 1. Purpose

The Reasoning Engine is the fourth cognitive layer in the SHARPIT Intelligence System. It does not perform physiological calculations — that is the responsibility of the three inference models (Recovery, Fatigue, Adaptation). It performs **physiological reasoning**: synthesizing the outputs of all three models into a coherent, actionable understanding of the athlete.

The distinction is fundamental:

| Layer            | Input                                 | Output                                       |
| ---------------- | ------------------------------------- | -------------------------------------------- |
| Inference Models | DayFeatures (raw extracted metrics)   | Model State (physiological dimension scores) |
| Reasoning Engine | AthleteState (all three model states) | ReasoningState (cross-system synthesis)      |

The Reasoning Engine answers questions that no single model can answer:

- What currently limits performance?
- Are the three model outputs consistent, or contradicting each other?
- Which physiological system requires immediate attention?
- What single action has the highest expected benefit today?
- Is the athlete in a rare high-opportunity window?

## 2. Architectural Position

```
Recovery Model  ──┐
Fatigue Model   ──┼──▶  Digital Twin (AthleteState)  ──▶  Reasoning Engine  ──▶  ReasoningState
Adaptation Model ──┘
```

**Invariant**: the Reasoning Engine never reads FeatureSets. It reads exclusively from the Digital Twin. This enforces a clean layering boundary: reasoning is second-order inference, not feature-level computation.

## 3. Inputs

```typescript
type ReasoningModelInput = {
  trainingDayId: string;
  athleteId: string;
  athleteState: AthleteState;
};
```

`AthleteState` contains:

- `recovery: RecoveryState | null`
- `fatigue: FatigueState | null`
- `adaptation: AdaptationState | null`

If fewer than two states are available, the Reasoning Engine returns `INSUFFICIENT_DATA`.

## 4. Output — ReasoningState

### 4.1 Overall Verdict

The single most important output. Safety-first priority ordering:

| Verdict             | Condition                                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `RECOVER`           | fatigue.trainingCapacity = REST_ONLY OR fatigue.fatigueLevel = OVERREACHING_RISK OR recovery.readinessCategory ∈ {LOW, VERY_LOW} |
| `CAUTION`           | adaptation.overreachingWithoutAdaptationDetected = true OR cross-model conflict detected                                         |
| `TRAIN_HARD`        | recovery OPTIMAL/ADEQUATE + fatigue FRESH/FUNCTIONAL_LOW + adaptation POSITIVELY_ADAPTING                                        |
| `RACE_READY`        | recovery OPTIMAL + fatigue FRESH + adaptation.estimatedAdaptationPeak ≤ 5 days                                                   |
| `TRAIN_SMART`       | recovery ADEQUATE + fatigue FUNCTIONAL_LOW; or any medium-green combination                                                      |
| `TRAIN_EASY`        | fatigue FUNCTIONAL_HIGH/ACCUMULATED OR recovery REDUCED                                                                          |
| `INSUFFICIENT_DATA` | fewer than 2 model states available                                                                                              |

### 4.2 Physiological Consistency

Measures how much the three models agree. Each model maps to a direction:

| Model      | TRAIN direction                  | EASY direction               | REST direction                         |
| ---------- | -------------------------------- | ---------------------------- | -------------------------------------- |
| Recovery   | OPTIMAL, ADEQUATE                | REDUCED                      | LOW, VERY_LOW                          |
| Fatigue    | FRESH, FUNCTIONAL_LOW            | FUNCTIONAL_HIGH, ACCUMULATED | NON_FUNCTIONAL_RISK, OVERREACHING_RISK |
| Adaptation | POSITIVELY_ADAPTING, MAINTAINING | PLATEAUING                   | MALADAPTING, DETRAINING                |

Consistency:

- **ALIGNED**: all available models agree (same direction)
- **PARTIALLY_ALIGNED**: majority agree (2/3 match)
- **CONFLICTING**: models point in opposing directions (e.g., recovery=TRAIN, fatigue=REST)
- **INSUFFICIENT_DATA**: fewer than 2 models have data

**Consistency score** (0–100): fraction of model pairs in agreement × 100.

### 4.3 Key Findings

Top 3–5 physiological observations, ordered by severity (CRITICAL → WARNING → INFO). Each finding belongs to one category:

- `RECOVERY` — autonomic, sleep, or readiness signal
- `FATIGUE` — load, neuromuscular, or accumulation signal
- `ADAPTATION` — fitness, plateau, or detraining signal
- `CROSS_SYSTEM` — observation that spans multiple models (highest clinical value)

### 4.4 Conflicts

Cross-model contradictions. v1 detects three types:

| Type                | Condition                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `CAPACITY_CONFLICT` | recovery.readinessCategory ≥ ADEQUATE but fatigue.trainingCapacity = REST_ONLY            |
| `TIMING_CONFLICT`   | adaptation.plateauRisk = true but fatigue.trainingCapacity = REST_ONLY                    |
| `SIGNAL_CONFLICT`   | fatigue.overreachingRisk = CRITICAL but adaptation.adaptationStatus = POSITIVELY_ADAPTING |

When a conflict exists, the Reasoning Engine provides a resolution strategy — which model to trust and why.

### 4.5 Opportunities

Positive physiological windows. v1 detects five types:

| Type              | Condition                                                                 |
| ----------------- | ------------------------------------------------------------------------- |
| `LOAD_INCREASE`   | recovery ADEQUATE+ + fatigue FRESH/FUNCTIONAL_LOW + adaptation PLATEAUING |
| `QUALITY_SESSION` | recovery OPTIMAL + fatigue FRESH, no plateau                              |
| `DELOAD`          | fatigue.consecutiveAccumulationDays ≥ 5 + trajectory ACCUMULATING         |
| `RACE_READINESS`  | adaptation.estimatedAdaptationPeak ≤ 7 days + recovery ADEQUATE+          |
| `RECOVERY_WINDOW` | recovery LOW/VERY_LOW — protect the recovery period                       |

### 4.6 Limiting Factor

The single most important physiological constraint on performance today. Synthesized from all three model limiting factors, selected by severity × confidence.

### 4.7 Top Action

One concrete recommendation the athlete can execute today. Expressed as a verb + focus + rationale:

```typescript
{ verb: "Train", focus: "aerobic base", rationale: "...", expectedBenefit: 85 }
```

### 4.8 Evidence Graph

Shows how much each model contributed to the final verdict:

```typescript
{ recoveryContribution: 0.4, fatigueContribution: 0.5, adaptationContribution: 0.1 }
```

When fatigue triggered `RECOVER` (overreaching risk), `fatigueContribution` will be dominant. When all models agreed on `TRAIN_HARD`, contributions will be roughly equal.

## 5. Confidence and Data Completeness

| Scenario                           | Confidence ceiling |
| ---------------------------------- | ------------------ |
| All 3 models present, FULL data    | 0.95               |
| All 3 models present, PARTIAL data | 0.80               |
| 2 models present                   | 0.65               |
| 1 model present                    | INSUFFICIENT_DATA  |
| Models in conflict                 | −0.15 penalty      |
| Models aligned                     | +0.10 bonus        |

## 6. Cold Start

Requires at least 2 of the 3 model states to produce output. Returns `INSUFFICIENT_DATA` with `confidence < 0.3` before that threshold.

## 7. Limitations

- v1 does not incorporate athlete goals or race calendar constraints — those are v2.
- v1 does not model periodization phase (base / build / peak / taper) — that is the Planning Engine (future).
- v1 does not use subjective athlete input (wellness, mood, motivation) as a direct input — it inherits these via RecoveryState.
- v1 does not access FeatureSets — all reasoning is over already-computed states. Raw signal access is a v2 capability.

## 8. Scientific References

- Meeusen R. et al. (2013) — Prevention, diagnosis and treatment of the overtraining syndrome. _EJSS_ 13(1): 1–24.
- Buchheit M. (2014) — Monitoring training status with HR measures. _Front Physiol_ 5:73.
- Halson S.L. (2014) — Monitoring training load to understand fatigue in athletes. _Sports Med_ 44(S2): 139–147.
- Le Meur Y. et al. (2012) — Physiological determinants of tapering. _IJSPP_ 7(3): 218–227.
- Plews D.J. et al. (2013) — Training adaptation and HRV indices. _Int J Sports Physiol Perf_ 8(5): 554–560.

## 9. Benchmark Scenarios

Five canonical scenarios (see `src/core/benchmarks/reasoning-scenarios.ts`):

| ID   | Name                | Consistency       | Expected Verdict                        |
| ---- | ------------------- | ----------------- | --------------------------------------- |
| RE01 | All Systems Green   | ALIGNED           | TRAIN_HARD                              |
| RE02 | Overreaching Crisis | ALIGNED (REST)    | RECOVER                                 |
| RE03 | Adaptive Plateau    | PARTIALLY_ALIGNED | TRAIN_SMART + LOAD_INCREASE opportunity |
| RE04 | Race Peak           | ALIGNED           | RACE_READY                              |
| RE05 | Capacity Paradox    | CONFLICTING       | CAUTION + CAPACITY_CONFLICT             |
