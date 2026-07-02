# Adaptation Intelligence v1 — Model Specification

**Model ID**: `adaptation-v1`
**Version**: 1.0.0
**Status**: Production
**Last Updated**: 2026-07-02

---

## Table of Contents

1. [Purpose and Scope](#1-purpose-and-scope)
2. [Conceptual Distinction: Adaptation ≠ Fatigue ≠ Recovery](#2-conceptual-distinction)
3. [Physiological Mechanisms by Dimension](#3-physiological-mechanisms-by-dimension)
4. [Algorithm Specification](#4-algorithm-specification)
5. [Internal Signals (Ephemeral)](#5-internal-signals-ephemeral)
6. [Digital Twin Update — AdaptationState](#6-digital-twin-update--adaptationstate)
7. [Confidence Calculation](#7-confidence-calculation)
8. [Cold-Start Behaviour](#8-cold-start-behaviour)
9. [Failure Modes and Degenerate Cases](#9-failure-modes-and-degenerate-cases)
10. [Uncertainty and Epistemic Limits](#10-uncertainty-and-epistemic-limits)
11. [Inter-Model Interaction](#11-inter-model-interaction)
12. [Limitations and Scientific Debt](#12-limitations-and-scientific-debt)
13. [Versioning and Evolution](#13-versioning-and-evolution)
14. [Scientific References](#14-scientific-references)
15. [Required Features and Inputs](#15-required-features-and-inputs)
16. [Benchmark Scenarios](#16-benchmark-scenarios)

---

## 1. Purpose and Scope

Adaptation Intelligence v1 answers a single question:

> **Is this athlete actually adapting to their training, and in which direction should load move next?**

This is distinct from the day-to-day stress/recovery cycle captured by Fatigue Intelligence and Recovery Intelligence. Adaptation is the net positive physiological superimposition that accumulates across weeks and blocks of structured work — the actual fitness gain (or loss) produced by repeated training stimuli.

The model evaluates:

- Whether training load is progressing at a physiologically effective rate
- Whether neuromuscular and cardiovascular efficiency is improving
- Whether the autonomic nervous system is demonstrating chronic adaptation (HRV trend, resting HR trend)
- Whether recovery quality is sufficient to allow adaptive processes to complete

From these four dimensions, it produces an `AdaptationState` persisted in the Digital Twin, an ephemeral verdict driving a load prescription recommendation, and an immutable DecisionRecord for full auditability.

**In-scope**: load progression rate, neuromuscular efficiency trends, autonomic adaptation markers, recovery quality as an adaptation enabler.

**Out of scope**: acute performance prediction, event-day readiness, injury risk quantification, nutrition-based adaptation modulation (no dietary data), altitude/heat adaptation.

---

## 2. Conceptual Distinction

| Concept        | Timescale  | Signal                               | Question                                 |
| -------------- | ---------- | ------------------------------------ | ---------------------------------------- |
| **Fatigue**    | 24–72 h    | Neuromuscular / metabolic stress     | Can I train hard today?                  |
| **Recovery**   | 12–48 h    | Autonomic / subjective readiness     | How ready am I right now?                |
| **Adaptation** | 2–12 weeks | Long-term ANS, load-efficiency trend | Is the training block producing fitness? |

These three states are complementary. An athlete can be:

- Fatigued but adapting (normal accumulation week in a productive block)
- Recovered but not adapting (underloaded, maladaptive stimulus)
- Adapting but at risk of overreaching (excessive load, diminishing returns)

The inter-model interaction section (§11) details how FatigueState and RecoveryState feed into AdaptationState as first-class inputs.

### The Supercompensation Cycle

The physiological substrate of adaptation is supercompensation (Selye 1950, Zatsiorsky & Kraemer 2006): a training stimulus disrupts homeostasis → recovery restores it → the organism overcorrects above the prior baseline → a new, higher baseline is established. Repeated stimuli with adequate recovery progressively raise this baseline.

The model detects the net trend of this cycle over 2–12 weeks. A single training day is noise. The index is meaningful only with ≥ 14 days of cumulative signal.

---

## 3. Physiological Mechanisms by Dimension

### 3.1 Load Progression (`loadProgression`, weight 0.30)

**Mechanism**: Effective adaptation requires progressive overload (Helgerud et al. 2007) — a systematic increase in training volume, intensity, or both over time. Too little load produces no adaptive stimulus. Too rapid an increase causes maladaptation (injury risk, metabolic breakdown) before adaptation can consolidate.

**Primary feature**: `acuteChronicLoadTrend` — the slope of the 14-day linear regression of ACWR. A positive slope indicates the athlete is systematically building load. A negative slope indicates reduction or detraining.

**Boundaries**:

- ACWR < 0.8 → underloaded, detraining risk
- ACWR 0.8–1.3 → optimal adaptation zone (Hulin et al. 2016)
- ACWR 1.3–1.5 → high-risk zone, adaptation possible but injury risk elevated
- ACWR > 1.5 → maladaptation zone, stimulus exceeds adaptive capacity

**Why trend matters beyond single ACWR**: An ACWR of 1.1 today after 4 weeks of stable load provides no progressive overload signal. The slope (`acuteChronicLoadTrend`) distinguishes stagnation from genuine progression.

### 3.2 Neuromuscular Efficiency (`neuromuscularEfficiency`, weight 0.25)

**Mechanism**: As athletes adapt, they maintain the same power/speed output at a lower physiological cost (economy of movement, neural drive efficiency). HR drift during sustained effort is a proxy for this cost. A low drift (< 3%) at a given intensity indicates the athlete is handling that load efficiently — a hallmark of aerobic adaptation.

**Primary feature**: `hrDriftPercent` across recent sessions (7–14 days). Evaluated as the mean across all sessions where `hrDriftPercent` is available.

**Intensity factor bonus**: If mean `intensityFactor > 0.85` across sessions while drift remains low, the athlete is producing high-intensity work efficiently — a strong adaptation signal.

**Relationship to fatigue**: Short-term elevation of HR drift (1–3 days) is a fatigue signal. Persistent elevation across 7+ days at constant intensity suggests failure to adapt, not acute stress.

### 3.3 Autonomic Adaptation (`autonomicAdaptation`, weight 0.25)

**Mechanism**: Chronic aerobic training produces well-documented autonomic remodelling: elevated parasympathetic tone → higher resting HRV; lower sympathetic activity → reduced resting HR (Buchheit 2017). These changes unfold over 4–12 weeks and are reliable markers of true cardiovascular adaptation.

**Primary features**:

- `hrvDeltaFromBaseline`: today's HRV vs the athlete's own 14-day rolling baseline (percentage deviation). A chronic upward trend indicates adaptation.
- `rhrDeltaFromBaseline`: today's resting HR vs 14-day baseline. Chronic reduction indicates adaptation.

**Interpretation notes**:

- Day-to-day HRV variance is high. This dimension uses `hrvDeltaFromBaseline` (which already smooths against a personal baseline), not raw HRV.
- A sudden acute HRV suppression is fatigue. A chronically suppressed HRV (below baseline for 14+ days) is maladaptation.
- Absence of both features → dimension unavailable; confidence is capped.

### 3.4 Recovery Quality (`recoveryQuality`, weight 0.20)

**Mechanism**: Adaptation occurs during recovery, not during the training stimulus itself. If recovery quality is chronically poor (high accumulated fatigue, poor readiness scores), the remodelling processes (protein synthesis, mitochondrial biogenesis, neural adaptation) are interrupted. This dimension acts as an adaptation _enabler_ gate: excellent training load progression cannot produce adaptation if recovery is chronically insufficient.

**Primary inputs**:

- `RecoveryState.readinessScore`: the Recovery Intelligence output (0–100)
- `FatigueState.trainingCapacity`: the Fatigue Intelligence output
- `FatigueState.consecutiveAccumulationDays`: sustained fatigue accumulation suppresses this score

**Rationale for cross-model dependency**: These are the most reliable proxies available for recovery quality in SHARPIT v1. Using published Digital Twin outputs avoids duplicating inference logic and maintains the single-responsibility principle across models.

---

## 4. Algorithm Specification

### 4.1 Dimension Scoring

Each dimension returns a `DimensionScore`:

```typescript
type DimensionScore = {
  score: number | null; // 0–100, null when unavailable
  available: boolean;
  reason?: string; // debug label
};
```

#### 4.1.1 `scoreLoadProgression(load: LoadFeatureSet | 'PENDING'): DimensionScore`

| Condition                                              | Score                                               |
| ------------------------------------------------------ | --------------------------------------------------- |
| PENDING                                                | `null`, `available: false`                          |
| `acwr > 1.5`                                           | 0–30 (excessive load, no adaptive benefit expected) |
| `chronicLoad < 20` (TSS/week)                          | 0–20 (detraining territory)                         |
| `acuteChronicLoadTrend > 0.02` AND `acwr ∈ [0.8, 1.3]` | 75–100 (progressive overload confirmed)             |
| `acuteChronicLoadTrend` near 0 AND `acwr ∈ [0.7, 1.3]` | 50–70 (maintaining load)                            |
| `acuteChronicLoadTrend < -0.02` AND `acwr < 0.8`       | 5–30 (load declining)                               |
| Default                                                | 40                                                  |

Score within each band is linearly interpolated using the specific feature value.

#### 4.1.2 `scoreNeuromuscularEfficiency(sessions: readonly SessionFeatureSet[]): DimensionScore`

Sessions without `hrDriftPercent` are excluded from the mean. If no eligible sessions remain: `available: false`.

| Condition                   | Base Score |
| --------------------------- | ---------- |
| Mean `hrDriftPercent < 3%`  | 80–100     |
| Mean `hrDriftPercent` 3–8%  | 50–80      |
| Mean `hrDriftPercent` 8–10% | 40–50      |
| Mean `hrDriftPercent > 10%` | 0–40       |

**Bonus**: If mean `intensityFactor > 0.85`: `min(score + 10, 100)`.

#### 4.1.3 `scoreAutonomicAdaptation(recovery: RecoveryFeatureSet | 'PENDING'): DimensionScore`

| Condition                                                   | Score                                            |
| ----------------------------------------------------------- | ------------------------------------------------ |
| PENDING                                                     | `null`, `available: false`                       |
| `hrvDeltaFromBaseline > 5%` AND `rhrDeltaFromBaseline < -2` | 80–100                                           |
| `hrvDeltaFromBaseline` ∈ [-5%, +5%]                         | 50–70                                            |
| `hrvDeltaFromBaseline < -10%`                               | 0–30                                             |
| One of two features missing                                 | Score reduced by 20, `available: true` (partial) |
| Both features missing                                       | `null`, `available: false`                       |

#### 4.1.4 `scoreRecoveryQuality(recoveryState, fatigueState): DimensionScore`

| Condition                                                 | Score                                   |
| --------------------------------------------------------- | --------------------------------------- |
| Both null                                                 | `null`, `available: false`              |
| `readinessScore >= 75` AND `trainingCapacity = FULL`      | 80–100                                  |
| `readinessScore` 50–74 AND `trainingCapacity ≠ REST_ONLY` | 50–75                                   |
| `trainingCapacity = REST_ONLY`                            | 0–30                                    |
| `consecutiveAccumulationDays > 7`                         | `max(score - 20, 0)` applied as penalty |

### 4.2 Index Synthesis

```
adaptationIndex = Σ (dimension.score × weight)  for available dimensions only

weights = {
  loadProgression:        0.30
  neuromuscularEfficiency: 0.25
  autonomicAdaptation:    0.25
  recoveryQuality:        0.20
}
```

When dimensions are unavailable, their weight is redistributed proportionally across the available dimensions. If total available weight < 0.5, the index is set to `null` and `adaptationStatus = INSUFFICIENT_DATA`.

### 4.3 Status Classification

| Index Range | AdaptationStatus      |
| ----------- | --------------------- |
| null        | `INSUFFICIENT_DATA`   |
| 70–100      | `POSITIVELY_ADAPTING` |
| 50–69       | `MAINTAINING`         |
| 30–49       | `PLATEAUING`          |
| 15–29       | `MALADAPTING`         |
| 0–14        | `DETRAINING`          |

### 4.4 Trend Computation

`adaptationTrend` is derived from `recentAdaptationHistory` (up to 28 most recent `adaptationIndex` values from prior DecisionRecords):

- Fewer than 7 values → `STABLE` (insufficient trend data)
- Linear regression slope over available history:
  - slope > +1.0 per week → `IMPROVING`
  - slope < -1.0 per week → `DECLINING`
  - otherwise → `STABLE`

### 4.5 Flag Detection

**Plateau Risk** (`plateauRisk: boolean`):

```
loadProgression.score > 60
AND adaptationStatus = PLATEAUING
AND recentAdaptationHistory shows ≥ 14 consecutive records without upward movement (< +3 points)
```

Interpretation: load is being applied but the athlete is not progressing through the PLATEAUING zone. This distinguishes intentional maintenance from a true plateau requiring stimulus change.

**Overreaching Without Adaptation** (`overreachingWithoutAdaptationDetected: boolean`):

```
FatigueState.fatigueIndex > 70
AND autonomicAdaptation.score < 40
AND recoveryQuality.score < 40
```

Interpretation: the athlete is accumulating fatigue but showing no autonomic adaptation signal and poor recovery — a pattern consistent with non-functional overreaching (Le Meur et al. 2012).

### 4.6 Adaptation Peak Estimate

`estimatedAdaptationPeak` (days) is a rough heuristic based on status and trend:

| AdaptationStatus      | estimatedAdaptationPeak                  |
| --------------------- | ---------------------------------------- |
| `POSITIVELY_ADAPTING` | 7–14 days (supercompensation window)     |
| `MAINTAINING`         | null (stable, no taper benefit expected) |
| `PLATEAUING`          | null (stimulus change needed first)      |
| `MALADAPTING`         | null (recovery period needed first)      |
| `DETRAINING`          | null                                     |
| `INSUFFICIENT_DATA`   | null                                     |

When `adaptationTrend = IMPROVING`, peak estimate is at the lower bound. When `STABLE`, upper bound.

### 4.7 Decision (Verdict)

| Condition                                                        | Verdict                  |
| ---------------------------------------------------------------- | ------------------------ |
| `INSUFFICIENT_DATA`                                              | `INSUFFICIENT_DATA`      |
| `POSITIVELY_ADAPTING` AND `fatigueState.trainingCapacity = FULL` | `SUSTAIN`                |
| `POSITIVELY_ADAPTING` AND `fatigueState.trainingCapacity ≠ FULL` | `RECOVERY_PRIORITY`      |
| `MAINTAINING` AND `plateauRisk = false`                          | `SUSTAIN`                |
| `MAINTAINING` AND `plateauRisk = true`                           | `INCREASE_LOAD`          |
| `PLATEAUING`                                                     | `INCREASE_LOAD`          |
| `MALADAPTING`                                                    | `REDUCE_LOAD`            |
| `DETRAINING`                                                     | `INCREASE_LOAD`          |
| `overreachingWithoutAdaptationDetected = true` (any status)      | `REDUCE_LOAD` (override) |

### 4.8 Load Multiplier

The verdict maps to a `loadMultiplier` used by the AI Coach for next-session prescription:

| Verdict             | loadMultiplier |
| ------------------- | -------------- |
| `INCREASE_LOAD`     | 1.05–1.10      |
| `SUSTAIN`           | 1.0            |
| `CONSOLIDATE`       | 0.95           |
| `REDUCE_LOAD`       | 0.80–0.90      |
| `RECOVERY_PRIORITY` | 0.70           |
| `INSUFFICIENT_DATA` | 1.0 (neutral)  |

---

## 5. Internal Signals (Ephemeral)

Signals are produced during the inference pass and embedded in the DecisionRecord (`signals` field). They are **not** persisted independently (ADR-004).

```typescript
type AdaptationSignals = {
  readonly adaptationIndex: number | null;
  readonly adaptationStatus: AdaptationStatus;
  readonly adaptationTrend: AdaptationTrend;
  readonly dimensionScores: {
    readonly loadProgression: number | null;
    readonly neuromuscularEfficiency: number | null;
    readonly autonomicAdaptation: number | null;
    readonly recoveryQuality: number | null;
  };
  readonly plateauRisk: boolean;
  readonly overreachingWithoutAdaptationDetected: boolean;
  readonly availableDimensionCount: number;
  readonly totalAvailableWeight: number;
  readonly confidence: number;
  readonly historyLength: number;
};
```

---

## 6. Digital Twin Update — AdaptationState

After each successful inference pass, the following object is written to `DigitalTwin.adaptationState`:

```typescript
type AdaptationState = {
  readonly adaptationIndex: number | null;
  readonly adaptationStatus: AdaptationStatus;
  readonly adaptationTrend: AdaptationTrend;
  readonly dimensions: {
    readonly loadProgression: DimensionResult;
    readonly neuromuscularEfficiency: DimensionResult;
    readonly autonomicAdaptation: DimensionResult;
    readonly recoveryQuality: DimensionResult;
  };
  readonly limitingFactor:
    | 'loadProgression'
    | 'neuromuscularEfficiency'
    | 'autonomicAdaptation'
    | 'recoveryQuality'
    | null;
  readonly estimatedAdaptationPeak: number | null;
  readonly plateauRisk: boolean;
  readonly overreachingWithoutAdaptationDetected: boolean;
  readonly confidence: number;
  readonly dataCompleteness: DataCompleteness;
  readonly modelId: 'adaptation-v1';
  readonly computedAt: Date;
  readonly trainingDayId: string;
};
```

`limitingFactor`: the available dimension with the lowest absolute score (excluding unavailable dimensions).

`dataCompleteness`:

- `FULL`: all 4 dimensions available
- `PARTIAL`: 2–3 dimensions available
- `SPARSE`: 1 dimension available
- `INSUFFICIENT`: 0 dimensions available or total weight < 0.5

---

## 7. Confidence Calculation

```
baseConfidence = availableDimensionCount / 4

historyBonus = min(historyLength / 28, 1.0) × 0.15
// 28 records (≈ 4 weeks) gives maximum history confidence

confidence = min(baseConfidence + historyBonus, 1.0)
```

**Caps applied**:

- `overreachingWithoutAdaptationDetected = true` → confidence capped at 0.75 (borderline physiology, high uncertainty)
- `historyLength < 7` → confidence capped at 0.50
- `dataCompleteness = INSUFFICIENT` → confidence = 0.10

Confidence is exposed in the API response and embedded in the DecisionRecord. The AI Coach uses it to modulate the assertiveness of recommendations (low confidence → hedged language).

---

## 8. Cold-Start Behaviour

Adaptation Intelligence requires accumulated history to produce meaningful assessments.

| Phase               | Condition         | Behaviour                                                                                                           |
| ------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| **No data**         | 0 DecisionRecords | `adaptationStatus = INSUFFICIENT_DATA`, `adaptationIndex = null`, `confidence < 0.20`                               |
| **Early signal**    | 1–6 records       | Dimensions scored if features available, but `adaptationTrend = STABLE` (no trend basis), confidence capped at 0.50 |
| **Partial history** | 7–13 records      | Trend computed but low confidence; all statuses possible                                                            |
| **Mature**          | ≥ 14 records      | Full model; trend and plateau detection active                                                                      |
| **Maximum signal**  | ≥ 28 records      | `historyBonus` fully applied                                                                                        |

The 14-record threshold is the minimum for statistically meaningful linear regression slope estimation. Below this threshold, plateau risk detection is disabled (always `false`).

---

## 9. Failure Modes and Degenerate Cases

| Mode                                 | Trigger                                 | Behaviour                                                                                                 |
| ------------------------------------ | --------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **All features PENDING**             | Feature Engine returns no resolved data | All dimensions unavailable → `INSUFFICIENT_DATA`                                                          |
| **Sessions without HR data**         | `hrDriftPercent` absent in all sessions | `neuromuscularEfficiency` dimension unavailable                                                           |
| **HRV not synced**                   | Garmin/wearable sync gap                | `autonomicAdaptation` unavailable; confidence reduced                                                     |
| **Digital Twin missing**             | First run for athlete                   | `recoveryState = null`, `fatigueState = null` → `recoveryQuality` unavailable                             |
| **All DecisionRecord persists fail** | DB write error                          | Orchestrator logs warning, returns result without `decisionRecordId`, Digital Twin update still attempted |
| **Digital Twin update fails**        | DB write error                          | Orchestrator logs warning, result returned without `digitalTwinUpdated = true`                            |
| **Index exactly at boundary**        | e.g., `adaptationIndex = 70.0`          | Upper range takes precedence: `POSITIVELY_ADAPTING`                                                       |
| **ACWR infinite / NaN**              | No chronic load                         | Feature Engine handles upstream; load dimension scores 0                                                  |

All failure paths are non-fatal at the orchestrator level. The inference result is always returned even if persistence fails.

---

## 10. Uncertainty and Epistemic Limits

**Aggregation timescale ambiguity**: The 14-session window for neuromuscular efficiency mixes sessions from different mesocycle phases. A deliberate deload week within the window artificially lowers the score. The model does not yet distinguish planned from unplanned deloads.

**HRV daily variance**: Day-to-day HRV coefficient of variation can exceed 15% in well-trained athletes (Plews et al. 2013). `hrvDeltaFromBaseline` partially mitigates this by comparing against a personal 14-day baseline, but single-day anomalies still propagate.

**No periodization awareness**: The model does not know whether today is week 3 of a build phase or week 1 of a recovery phase. A deliberately low `loadProgression` score during a planned deload is not distinguished from genuine undertraining.

**Individual response variation**: Some athletes respond to higher ACWR; others plateau sooner. The thresholds in §4.1.1–4.1.4 are group-level heuristics, not personalised. See SD-026.

---

## 11. Inter-Model Interaction

```
RecoveryState ──────────────────────┐
  (readinessScore)                   │
                                     ▼
FatigueState ──────────────────► AdaptationModel
  (trainingCapacity,                 │
   fatigueIndex,                     │
   consecutiveAccumulationDays)      │
                                     ▼
LoadFeatureSet ─────────────────► AdaptationState
RecoveryFeatureSet                   │
SessionFeatureSet[]                  │
recentAdaptationHistory              ▼
                                 DecisionRecord
                                 ('adaptation-v1')
```

**Read dependencies** (consumed, never written by this model):

- `DigitalTwin.recoveryState` → `RecoveryState` (written by Recovery Intelligence)
- `DigitalTwin.fatigueState` → `FatigueState` (written by Fatigue Intelligence)

**Write outputs** (this model is the sole writer):

- `DigitalTwin.adaptationState`
- `DecisionRecord` with `modelId = 'adaptation-v1'`

**Run order recommendation**: For maximum accuracy, run in order: Recovery → Fatigue → Adaptation. The orchestrator does not enforce this; it reads whatever is currently in the Digital Twin. Running Adaptation before Fatigue will still produce a result, but `recoveryQuality` will use the Digital Twin's last-known FatigueState (which may be from a prior day).

---

## 12. Limitations and Scientific Debt

### SD-022 — No EWMA-based CTL/ATL

The `chronicLoad` and `acwr` inputs are derived from a 14-day rolling average, not the Banister impulse-response (PMC) model's exponential time constants (τ_fatigue = 7 days, τ_fitness = 42 days). PMC modelling would provide sharper fitness/form curves. Backlogged as a feature engine enhancement.

**Impact**: `loadProgression` may underweight recent training spikes and underweight deep chronic fitness. The 14-day slope heuristic is a reasonable approximation but not Banister-equivalent.

### SD-023 — No power-curve performance modelling

Without a maximal power curve (Peak Power Output across 5s–60min), we cannot detect whether VO2max or neuromuscular peak power is genuinely rising. `hrDriftPercent` proxies aerobic efficiency but does not capture neuromuscular speed-strength adaptation.

**Impact**: `neuromuscularEfficiency` is purely cardiovascular. Strength, sprint, and short-duration performance adaptation is not captured.

### SD-024 — No subjective wellness input

The model uses no RPE, sleep quality score, mood, or POMS-based psychological strain indicator. Perceived exertion and mood are validated adaptation-state markers (Uusitalo et al. 2004, Morgan et al. 1987).

**Impact**: `recoveryQuality` relies entirely on computed readiness and fatigue. High perceived strain with normal physiological markers (common in early overreaching) may not be detected.

### SD-025 — No periodization phase tagging

The model does not receive a periodization phase label (build, peak, deload, competition). This means a planned deload that correctly lowers ACWR will score as a maladaptation risk. Future integration with the Planning module will provide phase context.

### SD-026 — Group-level thresholds

ACWR, HRV delta, and HR drift thresholds are derived from population-level sports science literature. Individual response curves vary significantly. Future releases will personalise boundaries using the athlete's own historical distribution.

---

## 13. Versioning and Evolution

| Version | Change                                                                   |
| ------- | ------------------------------------------------------------------------ |
| `1.0.0` | Initial production release. Four-dimension model with heuristic scoring. |

**Backward compatibility**: `adaptationState` in the Digital Twin is nullable. Existing athletes without adaptation data will have `adaptationState = null` until the first `adaptation-v1` inference pass runs.

**Migration path**: When thresholds change in a future version, existing DecisionRecords retain their original `modelVersion` field. The Digital Twin will be overwritten on the next inference pass. Historical DecisionRecords are immutable and can be used to reconstruct prior-version scores.

**Model ID locking**: `'adaptation-v1'` is frozen. A materially different algorithm must use `'adaptation-v2'`. The version string inside a DecisionRecord must match the `modelId` suffix.

---

## 14. Scientific References

| ID     | Citation                                                                                                                                                                                                      | Evidence Level            | Used In                                                      |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------ |
| B1991  | Banister EW et al. (1991). "Modeling elite athletic performance." Physiology and Nutrition for Competitive Sport. Champaign, IL: Human Kinetics.                                                              | L2 (observational cohort) | PMC model rationale (SD-022)                                 |
| M1996  | Mujika I et al. (1996). "Modelled responses to training and taper in competitive swimmers." Medicine & Science in Sports & Exercise, 28(2), 251–258.                                                          | L2                        | Supercompensation taper model                                |
| LM2012 | Le Meur Y, Hausswirth C, Mujika I (2012). "Tapering for competition: A review." Science & Sports, 27(2), 77–87.                                                                                               | L1 (systematic review)    | Overreaching detection (§4.5), non-functional OTS definition |
| BU2017 | Buchheit M (2017). "Monitoring training status with HR measures: Do all roads lead to Rome?" Frontiers in Physiology, 5, 73.                                                                                  | L2                        | Autonomic adaptation dimension (§3.3)                        |
| HU2016 | Hulin BT et al. (2016). "The acute:chronic workload ratio predicts injury: high chronic workload may decrease injury risk in elite rugby league players." British Journal of Sports Medicine, 50(4), 231–236. | L2                        | ACWR optimal zone definition (§3.1)                          |
| HE2007 | Helgerud J et al. (2007). "Aerobic high-intensity intervals improve VO2max more than moderate training." Medicine & Science in Sports & Exercise, 39(4), 665–671.                                             | L1 (RCT)                  | Progressive overload principle (§3.1)                        |
| PL2013 | Plews DJ et al. (2013). "Heart rate variability in elite triathletes, is variation in variability the key to effective training? A case comparison." European Journal of Applied Physiology, 113, 3925–3935.  | L3 (case series)          | HRV daily variance caveat (§10)                              |
| ZK2006 | Zatsiorsky VM, Kraemer WJ (2006). Science and Practice of Strength Training (2nd ed.). Champaign, IL: Human Kinetics.                                                                                         | L4 (textbook)             | Supercompensation cycle (§2)                                 |
| UU2004 | Uusitalo AL et al. (2004). "Hormonal responses to endurance training and overtraining in female athletes." Clinical Journal of Sports Medicine, 14(5), 293–300.                                               | L2                        | Psychological strain caveat (SD-024)                         |

**Evidence levels**: L1 = systematic review/RCT; L2 = observational cohort/cross-sectional; L3 = case series/expert consensus; L4 = textbook; L5 = engineering heuristic.

---

## 15. Required Features and Inputs

### Feature Engine Inputs

| Feature                 | Source          | Set                  | Required                            |
| ----------------------- | --------------- | -------------------- | ----------------------------------- |
| `acwr`                  | Load Engine     | `LoadFeatureSet`     | Primary for loadProgression         |
| `chronicLoad`           | Load Engine     | `LoadFeatureSet`     | Primary for loadProgression         |
| `acuteChronicLoadTrend` | Load Engine     | `LoadFeatureSet`     | Primary for loadProgression         |
| `hrvDeltaFromBaseline`  | Garmin/Wearable | `RecoveryFeatureSet` | Primary for autonomicAdaptation     |
| `rhrDeltaFromBaseline`  | Garmin/Wearable | `RecoveryFeatureSet` | Supporting for autonomicAdaptation  |
| `hrDriftPercent`        | Session data    | `SessionFeatureSet`  | Primary for neuromuscularEfficiency |
| `intensityFactor`       | Session data    | `SessionFeatureSet`  | Bonus for neuromuscularEfficiency   |

### Digital Twin Context Inputs

| Input                                      | Source                | Used In                                 |
| ------------------------------------------ | --------------------- | --------------------------------------- |
| `RecoveryState.readinessScore`             | Recovery Intelligence | recoveryQuality dimension               |
| `FatigueState.trainingCapacity`            | Fatigue Intelligence  | recoveryQuality dimension + verdict     |
| `FatigueState.fatigueIndex`                | Fatigue Intelligence  | overreachingWithoutAdaptation detection |
| `FatigueState.consecutiveAccumulationDays` | Fatigue Intelligence  | recoveryQuality penalty                 |

### History Input

| Input                     | Source                                  | Used In                            |
| ------------------------- | --------------------------------------- | ---------------------------------- |
| `recentAdaptationHistory` | Last 28 `adaptation-v1` DecisionRecords | adaptationTrend, plateau detection |

---

## 16. Benchmark Scenarios

Five canonical scenarios define the expected model behaviour. All five are included in the CI regression suite (`src/core/benchmarks/__tests__/adaptation-benchmark.test.ts`).

---

### A01 — Progressive Overload Success

**Physiological phase**: Build block, weeks 3–4. Athlete has consistently increased load over 4 weeks. Excellent recovery and ANS adaptation.

**Key inputs**:

- `acuteChronicLoadTrend = 0.04` (clear positive slope)
- `acwr = 1.05` (optimal zone)
- `chronicLoad = 65` (well-trained baseline)
- `hrvDeltaFromBaseline = +8%` (ANS adapting)
- `rhrDeltaFromBaseline = -3` (resting HR decreasing)
- `hrDriftPercent = 2.5%` (mean across sessions — very efficient)
- `readinessScore = 82`, `trainingCapacity = FULL`

**Expected outputs**:

- `adaptationStatus = POSITIVELY_ADAPTING`
- `adaptationIndex ∈ [72, 90]`
- `adaptationTrend = IMPROVING`
- `verdict = SUSTAIN`
- `loadMultiplier = 1.0`
- `plateauRisk = false`
- `confidence ≥ 0.75`

---

### A02 — Adaptation Plateau

**Physiological phase**: 4-week maintenance block. Load stable for 4+ weeks. Index historically stagnant (14 prior records all in 40–55 range).

**Key inputs**:

- `acuteChronicLoadTrend = 0.001` (flat — no progression)
- `acwr = 1.0` (maintaining)
- `chronicLoad = 55`
- `hrvDeltaFromBaseline = +1%` (ANS neutral)
- `rhrDeltaFromBaseline = 0`
- `hrDriftPercent = 5.5%` (moderate)
- `readinessScore = 70`, `trainingCapacity = FULL`
- `recentAdaptationHistory`: 14 records in range 40–55

**Expected outputs**:

- `adaptationStatus = PLATEAUING`
- `adaptationIndex ∈ [30, 52]`
- `adaptationTrend = STABLE`
- `verdict = INCREASE_LOAD`
- `plateauRisk = true`
- `loadMultiplier ∈ [1.05, 1.10]`

---

### A03 — Excessive Load Without Adaptive Response

**Physiological phase**: Non-functional overreaching. 3-week excessive load block. HRV suppressed. High fatigue.

**Key inputs**:

- `acwr = 1.65` (exceeds safe zone)
- `acuteChronicLoadTrend = 0.06`
- `hrvDeltaFromBaseline = -15%` (HRV crushed — autonomic stress)
- `rhrDeltaFromBaseline = +5` (resting HR elevated)
- `hrDriftPercent = 13%` (high drift — struggling)
- `readinessScore = 38`
- `fatigueIndex = 82` (high fatigue)
- `trainingCapacity = LIGHT_ONLY`

**Expected outputs**:

- `adaptationStatus = MALADAPTING`
- `adaptationIndex ∈ [10, 32]`
- `overreachingWithoutAdaptationDetected = true`
- `verdict = REDUCE_LOAD`
- `loadMultiplier ∈ [0.80, 0.90]`
- `confidence ≤ 0.75` (cap applied due to overreaching flag)

---

### A04 — Detraining After Inactivity

**Physiological phase**: Return to training after 3-week injury/illness break. Very low recent load. Trend negative.

**Key inputs**:

- `acwr = 0.45` (far below threshold)
- `chronicLoad = 8` (near zero)
- `acuteChronicLoadTrend = -0.05` (clear decline)
- `hrDriftPercent = 7%` (lost efficiency)
- `hrvDeltaFromBaseline = -5%`
- `readinessScore = 65`, `trainingCapacity = REDUCED`

**Expected outputs**:

- `adaptationStatus = DETRAINING`
- `adaptationIndex ∈ [0, 18]`
- `adaptationTrend = DECLINING`
- `verdict = INCREASE_LOAD`
- `loadMultiplier ∈ [1.05, 1.10]`

---

### A05 — Elite Athlete Maintaining Season Fitness

**Physiological phase**: Competition period. High absolute chronic load but intentionally flat. World-class fitness baseline. Near-perfect ANS markers.

**Key inputs**:

- `acwr = 1.0` (stable — zero trend by design)
- `chronicLoad = 120` (elite level)
- `acuteChronicLoadTrend = 0.0` (deliberate maintenance)
- `hrDriftPercent = 1.5%` (elite efficiency)
- `intensityFactor = 0.88` (high quality sessions)
- `hrvDeltaFromBaseline = +2%` (neutral/slightly positive)
- `rhrDeltaFromBaseline = -1`
- `readinessScore = 80`, `trainingCapacity = FULL`

**Expected outputs**:

- `adaptationStatus = MAINTAINING`
- `adaptationIndex ∈ [52, 72]`
- `adaptationTrend = STABLE`
- `verdict = SUSTAIN`
- `plateauRisk = false` (load is high; flat trend is appropriate at this phase)
- `confidence ≥ 0.70`

---

_Document generated by the SHARPIT Engineering team. Scientific claims are model-level approximations, not individualised medical advice._
