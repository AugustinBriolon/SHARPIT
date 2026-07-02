# SHARPIT — Fatigue Model v1

> **Status:** Design specification. No implementation yet.
> **Model ID:** `fatigue-v1`
> **Complements:** `recovery-synthesis-v1`, `training-stress-v1`
> **Replaces:** No direct equivalent in the existing codebase.
> The ATL field in `computePmcSeries()` partially covers the Load dimension only.
> **Scientific methodology:** follows `knowledge/scientific-methodology.md`

---

## 0. How to Read This Document

This document follows the same structure as `docs/models/RECOVERY_MODEL.md` and
`docs/models/TRAINING_STRESS_MODEL.md`.

**The critical distinction this model addresses:**

The Training Stress Model answers: _How much stress was applied?_
The Recovery Model answers: _How much has been restored?_

Neither answers: _How much capacity has actually been lost — and of what kind?_

That is the Fatigue Model's question.

**A note on inter-model communication:** This model reads from the Digital Twin
(populated by peer models) and from the Feature Layer (populated from Observations).
It never calls peer models directly. Execution order is the responsibility of the
Inference Orchestrator, not of any model or the Feature Layer.

---

## 1. Purpose

The Fatigue Model produces SHARPIT's **multi-dimensional estimate of the current
reduction in the athlete's capacity to generate effort**, across five physiological
systems, integrated over recent training history and modulated by recovery quality.

Its primary output — the **Fatigue Index** (0–100, where 100 = maximum estimated impairment)
— represents how much of the athlete's functional capacity has been diminished by
accumulated training stress that has not yet been restored.

The Fatigue Model serves five downstream consumers:

1. **The Adaptation Model** — to determine whether current fatigue is functional
   (productive for adaptation) or non-functional (counterproductive).
2. **The Performance Forecast Model** — fatigue is the primary acute performance depressor.
3. **The Risk Model** — accumulated fatigue multiplies injury risk.
4. **The Decision Engine** — fatigue type determines what kind of session is appropriate.
5. **The Digital Twin** — updates the `FatigueState` dimension of `AthleteState`.

The model does NOT:

- Diagnose Overtraining Syndrome (clinical assessment is required — SHARPIT identifies
  patterns only).
- Prescribe nutrition for recovery (that belongs to the Nutrition Model, future).
- Replace the Recovery Model's `readinessScore` — readiness and fatigue measure
  different things (see Section 2).

---

## 2. What "Fatigue" Means in SHARPIT

### 2.1 The conceptual distinction

Fatigue is NOT the inverse of recovery. These are distinct physiological constructs
that can produce unintuitive combinations:

```
State A: High Fatigue + Good Recovery → "Training state"
  The athlete is carrying load (high ATL) but recovering well nightly.
  This is the intended state during a BUILD phase. The correct recommendation:
  continue training, monitor trajectory.

State B: Low Fatigue + Poor Recovery → "Acute stress state"
  The athlete has low training load but poor sleep, illness, or psychological stress.
  Readiness is low not because of training fatigue, but because of non-training stress.
  The correct recommendation: identify the non-training stressor.

State C: High Fatigue + Poor Recovery → "Overreaching risk"
  The accumulation of training stress with inadequate restoration. The most dangerous
  state for performance and injury. Correct recommendation: mandatory load reduction.

State D: Low Fatigue + Good Recovery → "Fresh / deloaded"
  The athlete is rested, low accumulated load. This may be race-ready, post-illness,
  or undertrained. Context (periodization phase) determines the interpretation.
```

No single model can produce the correct recommendation across all four states.
The Fatigue Model contributes the **first dimension** — how much capacity is reduced.
The Recovery Model contributes the **second** — how much is being restored.
The Decision Engine synthesizes both with load context.

### 2.2 Physiological definition

Fatigue is the **time-dependent, multi-mechanism reduction in maximal force-generating
or power-producing capacity** resulting from prior exercise.

It operates across multiple timescales simultaneously:

```
ACUTE peripheral fatigue        Minutes → 24h
  Localized metabolic byproducts: lactate, inorganic phosphate (Pi), reactive oxygen species
  Extracellular K+ accumulation disrupting membrane potential
  Impaired Ca²+ release from sarcoplasmic reticulum
  Glycogen depletion in recruited fibers

SUBACUTE systemic fatigue       Hours → 72h
  Inflammatory cascade from muscle damage (especially eccentric loading)
  Elevated cortisol: catabolic, immunosuppressive
  Disrupted neuromuscular junction efficiency
  CNS voluntary drive reduction (reduced motor unit recruitment)

ACCUMULATED fatigue             Days → weeks
  Ongoing inflammatory state without adequate clearance
  Hormonal imbalance: elevated cortisol / depressed testosterone ratio
  HRV and autonomic dysfunction
  Sleep architecture degradation (cortisol disrupts SWS)

FUNCTIONAL OVERREACHING         1–3 weeks to resolve
  Performance decrements despite maintaining training volume
  Multi-system suppression: immune, endocrine, autonomic, psychological
  Reversible with adequate rest

NON-FUNCTIONAL OVERREACHING     2–8 weeks to resolve
  Persistent performance decrements
  Mood disturbance, loss of motivation
  Cannot be self-treated without structured rest protocol

OVERTRAINING SYNDROME           Months to years
  Clinical condition — outside SHARPIT's detection scope
  Requires medical assessment and structured intervention
```

**SHARPIT can detect patterns consistent with the first four levels.**
It cannot distinguish non-functional overreaching from early OTS.
Its role is early warning at the accumulated fatigue level to prevent progression.

---

## 3. Physiological Mechanisms Estimated

### 3.1 Load Fatigue (mathematical accumulation)

**What it captures:** the accumulated training impulse not yet decayed —
the ATL component of the PMC model.

**Observable:** fully captured by `athleteState.fitnessState.atl` (Training Stress Model).
**Limitation:** ATL is a single-dimension scalar that treats all TSS identically
regardless of session type. A week of Z2 cycling and a week of VO2max running
may produce identical ATL while generating completely different fatigue profiles.

This model augments ATL with type-specific dimensions.

---

### 3.2 Neuromuscular Fatigue

**What it captures:** the reduction in voluntary force production from both peripheral
(muscle fiber) and central (neural drive) mechanisms.

**Peripheral component:** muscle fiber damage, impaired Ca²+ kinetics, Pi accumulation.
Best correlated with: session mechanical stress, subjective soreness.

**Central component:** reduced supraspinal motor drive, decreased motor unit
recruitment threshold, impaired neuromuscular coordination.
Best correlated with: HRV suppression (autonomic correlate of CNS load), mood decline.

**Observable proxies:**

- `recovery.autonomicScore` (HRV-derived) — central component proxy
- `recovery.subjectiveWellnessIndex.perceivedSoreness` — peripheral proxy
- `session.mechanicalStressFactor` × recent `session.canonicalTss` — mechanical input

---

### 3.3 Metabolic Fatigue

**What it captures:** depletion of muscle and liver glycogen, lactate-induced
metabolic disruption, and reactive oxygen species accumulation from high-intensity work.

**Resolves fastest:** 12–48 hours with appropriate nutrition and rest.

**Key insight:** metabolic fatigue is **session-type specific**. A session at 80%
anaerobicLoadFactor produces proportionally more metabolic fatigue than a session
at 20% anaerobicLoadFactor with the same TSS.

**Observable proxies:**

- `session.anaerobicLoadFactor` × `session.canonicalTss` (last 48h)
- `session.hrDriftPercent` (within-session glycogen depletion signal)
- `recovery.subjectiveWellnessIndex.energyLevel` (subjective energy → glycogen proxy)

---

### 3.4 Psychological / Motivational Fatigue

**What it captures:** the reduction in intrinsic motivation, positive affect, and
willingness to exert. Distinct from physical fatigue — an athlete can be physically
recovered but psychologically depleted (common in over-motivated athletes who train
through illness or life stressors).

**Why it matters:** psychological fatigue impairs performance independently of
physical readiness. It also predicts training compliance failures and increases
dropout risk (Kenttä & Hassmén 1998).

**Observable proxies:**

- `recovery.subjectiveWellnessIndex.mood` (1–5 scale)
- `recovery.subjectiveWellnessIndex.energyLevel`
- `recovery.rpeVsTargetZone` (persistent RPE above expected → motivational override or fatigue)

---

### 3.5 Cumulative Trajectory

**What it captures:** the momentum of fatigue — whether it is resolving, stable,
or accelerating across time. Two athletes with the same FatigueIndex today are in
fundamentally different states if one has been declining for 10 days and the other
has been declining for 2 days.

**Observable proxies:**

- FatigueIndex history (last 7–14 days)
- Recovery Model's `sleepDebtMin` (accumulated sleep deficit impairs fatigue resolution)
- Recovery Model's `dissonanceDetected` (prolonged objective/subjective dissonance signals non-functional fatigue)

---

## 4. Algorithm Specification

### 4.1 Overview

```
FatigueIndex = weighted synthesis of five dimensions

Dimension 1: LoadFatigue           (weight: 0.30)
Dimension 2: NeuromuscularFatigue  (weight: 0.25)
Dimension 3: MetabolicFatigue      (weight: 0.20)
Dimension 4: CumulativeTrajectory  (weight: 0.15)
Dimension 5: PsychologicalFatigue  (weight: 0.10)

FatigueIndex ∈ [0, 100]
  0   = no detectable fatigue
  100 = maximum estimated capacity impairment
```

Weights reflect the relative magnitude and persistence of each mechanism,
loosely based on the ACWR evidence hierarchy and the REST-Q validation
studies (Kellmann & Kallus 2001). They are Level 5 approximations subject
to revision in v2 with individual calibration.

---

### 4.2 Dimension 1 — Load Fatigue

**Source:** Digital Twin (`athleteState.fitnessState.atl`, `.ctl`)

ATL represents the accumulated training impulse over 7 days.
The normalization reference is `CTL × 1.5` — the point at which ACWR = 2.0,
consistently associated with critical overload.

```
// Normalized ATL ratio
atlRatio = ATL / max(CTL, 1)  // guard against CTL = 0 cold-start division

// Map to 0-100 LoadFatigue
// ATL = 0            → 0     (no recent training)
// ATL = CTL          → 67    (normal high-load training)
// ATL = CTL × 1.5   → 100   (extreme overload)

LoadFatigue = clamp(atlRatio / 1.5 × 100, 0, 100)
```

**Monotony amplifier:**
High training monotony (low day-to-day variation) impairs metabolic and
neuromuscular recovery even at the same ATL (Foster et al. 1998):

```
If loadMonotony > 2.0:  LoadFatigue × 1.10  (monotony penalty)
If loadMonotony < 1.3:  LoadFatigue × 0.95  (good variation — recovery-promoting)
LoadFatigue = clamp(result, 0, 100)
```

**Fallback:** when Digital Twin `fitnessState` is unavailable (cold start):
`LoadFatigue = null` — dimension excluded from synthesis.

---

### 4.3 Dimension 2 — Neuromuscular Fatigue

**Source:** Digital Twin (`athleteState.recoveryState.autonomicScore`)

- Feature Layer (`session.mechanicalStressFactor`, `session.canonicalTss`,
  `recovery.subjectiveWellnessIndex.perceivedSoreness`)

**Component A — Central (HRV proxy):**

```
if autonomicScore available:
  centralComponent = 100 - autonomicScore   // invert: high recovery → low CNS fatigue
else:
  centralComponent = null
```

**Component B — Peripheral (mechanical + subjective soreness):**

```
// Mechanical load accumulated in last 72h (resolves more slowly than metabolic)
recentMechanicalLoad = Σ(session.canonicalTss[i] × session.mechanicalStressFactor[i])
                         for all sessions in last 72h

// Normalize: reference = 150 (a heavy 2h run = ~100 TSS × 1.4 mech. factor = 140)
mechanicalComponent = clamp(recentMechanicalLoad / 150 × 100, 0, 100)

// Subjective soreness (0-10 → 0-100)
if perceivedSoreness available:
  sorenessComponent = perceivedSoreness × 10
else:
  sorenessComponent = mechanicalComponent  // fallback: use mechanical proxy
```

**Synthesis:**

```
peripheralComponent = 0.55 × mechanicalComponent + 0.45 × sorenessComponent

NeuromuscularFatigue = weighted_mean_available([
  (centralComponent,   0.40),
  (peripheralComponent, 0.60)
])
```

---

### 4.4 Dimension 3 — Metabolic Fatigue

**Source:** Feature Layer (`session.anaerobicLoadFactor`, `session.canonicalTss`,
`session.hrDriftPercent`) for sessions in last 48h.

Metabolic fatigue resolves with a ~48h effective half-life.
A time-decay weight is applied to each session based on hours since completion.

```
For each session in last 48h:
  hoursAgo    = (now - session.timestamp) / 3600
  decayWeight = e^(-hoursAgo / 24)   // 24h decay constant
  metabolicContribution[i] = session.anaerobicLoadFactor[i]
                              × session.canonicalTss[i]
                              × decayWeight

totalMetabolicStress = Σ(metabolicContribution[i])

// Normalization: reference = one 60-TSS session at 100% anaerobicLoad
//               = 60 anabolic stress units → 60% MetabolicFatigue
MetabolicFatigue = clamp(totalMetabolicStress / 100 × 100, 0, 100)
```

**HR drift modifier:** within-session HR drift is a glycogen depletion marker.
When sessions show high `hrDriftPercent` (> 8%), metabolic fatigue is amplified:

```
If hrDriftPercent > 8%:  MetabolicFatigue × 1.15
If hrDriftPercent > 15%: MetabolicFatigue × 1.30
```

---

### 4.5 Dimension 4 — Cumulative Trajectory

**Source:** Fatigue Model's own historical FatigueIndex (last 7 days)

- Digital Twin (`athleteState.recoveryState.sleepDebtMin`, `dissonanceDetected`)

This dimension captures momentum — not the snapshot, but the trend.

```
// Count consecutive days with FatigueIndex > 55 (accumulated threshold)
consecutiveAccumulationDays = 0
for day in last 14 days descending:
  if FatigueIndex[day] > 55:
    consecutiveAccumulationDays += 1
  else:
    break

// Trajectory pressure from accumulated days
accumulationPressure = clamp(consecutiveAccumulationDays × 7, 0, 70)

// Sleep debt contribution: unresolved debt means fatigue cannot clear
sleepDebtContribution = clamp(sleepDebtMin / 480 × 30, 0, 30)
// 480 min debt (8h) → full 30 point contribution

// Dissonance contribution: prolonged objective/subjective split signals deep fatigue
dissonancePenalty = (dissonanceDetected AND consecutiveAccumulationDays > 3) ? 10 : 0

CumulativeTrajectory = clamp(accumulationPressure + sleepDebtContribution + dissonancePenalty, 0, 100)
```

**Trajectory direction (separate from the dimension score):**

```
FatigueTrajectory:
  RESOLVING     → mean(FatigueIndex last 3d) < mean(FatigueIndex 3-7d ago) - 5
  STABLE        → |mean last 3d - mean 3-7d ago| ≤ 5
  ACCUMULATING  → mean(FatigueIndex last 3d) > mean(FatigueIndex 3-7d ago) + 5
  ACCELERATING  → accumulating AND slope > +3 pts/day
```

---

### 4.6 Dimension 5 — Psychological Fatigue

**Source:** Feature Layer (`recovery.subjectiveWellnessIndex.mood`,
`recovery.subjectiveWellnessIndex.energyLevel`)

```
if mood available AND energyLevel available:
  PsychFatigue = 100 - (mood × 10 + energyLevel × 10) / 2
  // mood = 1 → 90 psychFatigue; mood = 5 → 50 psychFatigue
else if mood available:
  PsychFatigue = 100 - mood × 20
else if energyLevel available:
  PsychFatigue = 100 - energyLevel × 20
else:
  PsychFatigue = null
```

---

### 4.7 Synthesis — Weighted Fatigue Index

```
FatigueIndex = Σ(dimensionScore × redistributedWeight)
               for all available (non-null) dimensions

// Redistribution follows the same proportional rule as Recovery Model:
// unavailable dimensions' weights are redistributed proportionally to available ones.

// Minimum requirement: at least 2 dimensions must be available.
// If only 1 available: FatigueIndex = null, level = INSUFFICIENT_DATA

FatigueIndex = round(FatigueIndex)   // integer 0-100
```

### 4.8 Taxonomy Classification

```
FatigueIndex    FatigueLevel              Canonical meaning
──────────────────────────────────────────────────────────────────────────────
0–20            FRESH                     No detectable fatigue; race or peak
21–40           FUNCTIONAL_LOW            Normal training fatigue; fully adaptable
41–60           FUNCTIONAL_HIGH           Productive load state; monitor closely
61–75           ACCUMULATED               Fatigue accumulating beyond normal;
                                          recovery quality critical
76–88           NON_FUNCTIONAL_RISK       Performance likely impaired;
                                          load reduction indicated
89–100          OVERREACHING_RISK         Probable capacity impairment;
                                          mandatory extended rest
```

---

## 5. Internal Signals (Ephemeral)

Per ADR-004: not persisted independently. Embedded in Decision Records at decision time.

```typescript
type FatigueSignals = {
  // Current state
  fatigueLevel: FatigueLevel;
  fatigueType: FatigueType;
  fatigueTrajectory: 'RESOLVING' | 'STABLE' | 'ACCUMULATING' | 'ACCELERATING';

  // Per-dimension dominant signal
  dominantFatigueDimension: 'LOAD' | 'NEUROMUSCULAR' | 'METABOLIC' | 'CUMULATIVE' | 'PSYCHOLOGICAL';
  primaryLimitingFactor: string; // human-readable: "Insufficient sleep clearance",
  // "Elevated mechanical stress", etc.

  // Derived risk signals
  functionalOverreachingRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  estimatedTimeToFresh: number | null; // days; null if FRESH or OVERREACHING_RISK
  performanceImpairmentEstimate: number; // 0-1; estimated % of maximal capacity lost
  trainingCapacity: 'FULL' | 'REDUCED' | 'LIGHT_ONLY' | 'REST_ONLY';

  // For cross-model use
  isAccumulating: boolean; // convenience flag for Decision Engine
  consecutiveAccumulationDays: number;
};

type FatigueType =
  | 'LOAD_DOMINANT' // ATL-driven; typical of hard training block
  | 'NEUROMUSCULAR_DOMINANT' // HRV + soreness; typical of high-impact sessions
  | 'METABOLIC_DOMINANT' // intensity-driven; typical of interval weeks
  | 'PSYCHOLOGICAL_DOMINANT' // wellness-driven; often non-training origin
  | 'CUMULATIVE_MULTI_SYSTEM' // all dimensions elevated simultaneously (worst case)
  | 'MIXED';
```

### Signal computation rules

**`FatigueType` classification:**
Find the dimension with the highest score above 55. If multiple are within 10 points
of each other → `MIXED`. If all dimensions > 70 → `CUMULATIVE_MULTI_SYSTEM`.

**`FunctionalOverreachingRisk`:**
Cross-model signal requiring inputs from Training Stress and Recovery Models:

```
CRITICAL:
  FatigueIndex > 80 AND
  Recovery.readinessCategory ∈ {LOW, VERY_LOW} for ≥5 consecutive days AND
  TrainingStress.fitnessTrajectory = DECLINING

HIGH:
  FatigueIndex > 65 AND
  fatigueTrajectory = ACCUMULATING for ≥7 days AND
  Recovery.autonomicBalance ∈ {SUPPRESSED, CRITICALLY_SUPPRESSED}

MODERATE:
  FatigueIndex > 55 AND
  fatigueTrajectory = ACCUMULATING for ≥4 days

LOW: all other cases
```

**`EstimatedTimeToFresh` (rough approximation):**

```
// Per-dimension resolution time estimates (days to halve)
loadDays         = (LoadFatigue / 100) × 5.0    // τ_atl / ln(2) ≈ 4.9 days
neuroMusDays     = (NeuromuscularFatigue / 100) × 2.5
metabolicDays    = (MetabolicFatigue / 100) × 1.0
cumulativeDays   = (CumulativeTrajectory / 100) × 7.0   // slowest to resolve
psychDays        = (PsychologicalFatigue / 100) × 2.0

// Conservative estimate
estimatedDays = max(loadDays, neuroMusDays, metabolicDays, cumulativeDays, psychDays)

// If OVERREACHING_RISK: flag as ≥14 days (beyond estimation accuracy)
// If FRESH: null (already resolved)
```

**`PerformanceImpairmentEstimate`:**
Based on St Clair Gibson et al. (2003) and the Central Governor model:
perceived fatigue moderates performance output at a system level. Approximation:

```
// Very rough linear approximation
performanceImpairment = FatigueIndex / 100 × 0.25
// 0% impairment when FatigueIndex = 0
// ~25% impairment when FatigueIndex = 100
// Note: maximal actual performance impairment from fatigue is ~15-30% (L3-5 evidence)
```

**`TrainingCapacity`:**

```
FRESH        → fatigueLevel = FRESH
FULL         → fatigueLevel = FUNCTIONAL_LOW
REDUCED      → fatigueLevel = FUNCTIONAL_HIGH (reduce intensity, not volume)
LIGHT_ONLY   → fatigueLevel = ACCUMULATED (Z2 only, no intervals)
REST_ONLY    → fatigueLevel ∈ {NON_FUNCTIONAL_RISK, OVERREACHING_RISK}
```

---

## 6. Digital Twin Updates

```typescript
type FatigueState = {
  fatigueIndex: number | null; // 0-100, null if INSUFFICIENT_DATA
  fatigueLevel: FatigueLevel;
  fatigueType: FatigueType;

  dimensions: {
    load: DimensionResult; // LoadFatigue (0-100)
    neuromuscular: DimensionResult; // NeuromuscularFatigue (0-100)
    metabolic: DimensionResult; // MetabolicFatigue (0-100)
    cumulative: DimensionResult; // CumulativeTrajectory (0-100)
    psychological: DimensionResult; // PsychologicalFatigue (0-100)
  };

  trajectory: FatigueTrajectory;
  consecutiveAccumulationDays: number;
  dominantDimension: string;
  primaryLimitingFactor: string | null;

  functionalOverreachingRisk: OverreachingRisk;
  estimatedTimeToFresh: number | null;
  performanceImpairmentEstimate: number;
  trainingCapacity: TrainingCapacity;

  confidence: number;
  dataCompleteness: DataCompleteness;
  modelId: 'fatigue-v1';
  computedAt: Date;
};
```

---

## 7. Confidence Calculation

The Fatigue Model's confidence is computed per dimension and synthesized.

### 7.1 Per-dimension quality factors

```
LoadFatigue confidence:
  FitnessState.confidence from Training Stress Model  (inherited)

NeuromuscularFatigue confidence:
  Central component: Recovery Model autonomic confidence × 0.90
  Peripheral (soreness, manual): 0.75
  Peripheral (mechanical proxy only): 0.55

MetabolicFatigue confidence:
  Based on session Tier used for TSS:
    Tier 1 (power): 0.85
    Tier 2 (HR-TRIMP): 0.65
    Tier 3 (pace): 0.50
    Tier 4 (RPE): 0.40
    Tier 5 (duration): 0.25

CumulativeTrajectory confidence:
  Requires ≥7 days of Fatigue Model history:
    < 3 days: 0.30
    3–6 days: 0.60
    ≥7 days:  0.85

PsychologicalFatigue confidence:
  Subjective data entered: 0.80
  No data: null (dimension excluded)
```

### 7.2 Synthesis

```
confidence = Σ(dimensionConfidence × redistributedWeight)
             for available dimensions

// Same maturity modifier as Recovery Model:
// < 7 days total Fatigue Model history: confidence × 0.60
// 7-14 days: × 0.80
// 14+ days:  × 1.00
```

---

## 8. Cold Start Behavior

The Fatigue Model's cold start mirrors the Training Stress Model:

### Phase 1 — No history (0–6 days / 0–3 sessions)

```
LoadFatigue:        null (ATL = 0, CTL = 0 — ratio undefined)
MetabolicFatigue:   computed from any available sessions
NeuromuscularFatigue: computed if HRV + soreness available
CumulativeTrajectory: null (no history)
PsychologicalFatigue: computed if subjective data available

FatigueIndex:       partial (missing load and cumulative dimensions)
FatigueLevel:       INSUFFICIENT_DATA
confidence:         0.20–0.35
```

### Phase 2 — Partial history (1–5 weeks)

LoadFatigue becomes increasingly meaningful as ATL builds.
CumulativeTrajectory begins after 7 days of FatigueIndex history.

### Phase 3 — Full operation (5+ weeks, 20+ sessions)

All five dimensions operational. Confidence determined by data quality.

### Phase 4 — Calibration (90+ days)

Individual weight calibration becomes possible:

- Athletes with high neuromuscular sensitivity (soreness correlates strongly with
  future performance decrements) → upweight NeuromuscularFatigue.
- Athletes whose fatigue manifests primarily as psychological decline → upweight
  PsychologicalFatigue.

This is out of scope for v1 (SD-017).

---

## 9. Failure Modes

### 9.1 Counterintuitive high fatigue after deload

**Pattern:** an athlete completing a planned deload week sees their ATL drop
dramatically. `LoadFatigue` drops. But HRV may temporarily increase (supercompensation)
while `perceivedSoreness` may remain elevated for 2–4 days as previous damage resolves.
`FatigueIndex` may appear paradoxically high or inconsistent.

**Model behavior:** the `PLANNED_DELOAD` flag from the Training Stress Model
suppresses the `FunctionalOverreachingRisk` signal during deload periods.
`CumulativeTrajectory` uses a 7-day lookback — recent deload days naturally reduce
`consecutiveAccumulationDays`.

### 9.2 Psychological fatigue from non-training origin

**Pattern:** an athlete with low training load shows high `PsychologicalFatigue`
(low mood, low energy). The model flags `PSYCHOLOGICAL_DOMINANT` fatigue type and
`trainingCapacity = REDUCED`.

**Correct interpretation:** this is NOT training fatigue. The Decision Engine should
communicate that fatigue appears to be non-training in origin and recommend identifying
the external stressor rather than reducing training load.

**Model limitation:** the Fatigue Model cannot distinguish training-origin psychological
fatigue from life-origin psychological fatigue. This distinction requires context
the model cannot observe. The Decision Engine must handle this nuance.

### 9.3 Acute illness pattern

**Pattern:** sudden spike in NeuromuscularFatigue (HRV suppression) without
corresponding training load. MetabolicFatigue is low (no recent high-intensity sessions).

**This pattern is handled by the Recovery Model** (`IllnessRisk = HIGH`).
The Fatigue Model will reflect the dimension spike but should NOT independently
classify as `FunctionalOverreachingRisk` in this scenario.

**Guard:** when `Recovery.illnessRisk = HIGH`, the `FunctionalOverreachingRisk`
signal is suppressed regardless of FatigueIndex. Illness-driven fatigue has a
different resolution timeline than training fatigue.

### 9.4 Subjective override — motivated athlete

**Pattern:** an athlete consistently rates low `perceivedSoreness` and high `mood`
despite high ATL and suppressed HRV. The model underestimates fatigue.

**This is a known failure mode of all subjective monitoring.** Morgan (1985) documented
the "iceberg profile" — athletes who suppress fatigue perception through motivation.
They appear well but deteriorate without warning.

**Guard:** when `Recovery.dissonanceDetected = true` (objective poor, subjective good)
for ≥3 consecutive days, the `PsychologicalFatigue` weight is reduced to 0.05 and
the `NeuromuscularFatigue` and `LoadFatigue` weights receive the redistributed share.
The model applies conservative bias when evidence suggests subjective override.

### 9.5 Strength-only athletes

**Pattern:** an athlete who only performs strength training has low PMC-based ATL
(strength TSS underestimated by 40-60%) but potentially high actual fatigue from
neuromuscular damage.

**Model behavior:** `LoadFatigue` is systematically underestimated. `NeuromuscularFatigue`
(mechanical stress component) is more reliable for these athletes.

**Known limitation:** strength training load quantification is scientific debt (SD-014
from Training Stress Model). Until resolved, FatigueIndex for strength-primary athletes
should be communicated with explicit uncertainty disclosure.

---

## 10. Uncertainty Sources

| Source                                       | Affected Dimensions        | Magnitude                   | Mitigation in v1                                                   |
| -------------------------------------------- | -------------------------- | --------------------------- | ------------------------------------------------------------------ |
| ATL underestimates neuromuscular fatigue     | Load                       | ±25% for high-mech sessions | MechanicalFatigue dimension adds partial correction                |
| HRV optical measurement error (±15%)         | Neuromuscular (central)    | ±15 pts                     | Confidence factor 0.70 applied                                     |
| Perceived soreness subjectivity              | Neuromuscular (peripheral) | ±20 pts                     | Confidence factor 0.75; dissonance guard                           |
| No direct glycogen measurement               | Metabolic                  | ±30%                        | Metabolic stress proxy via intensity distribution                  |
| No testosterone/cortisol measure             | Cumulative                 | Unquantifiable              | Trajectory dimension as indirect proxy                             |
| Psychological fatigue origin ambiguity       | Psychological              | ±30 pts                     | FatigueType classification; Decision Engine handles interpretation |
| Individual response heterogeneity            | All dimensions             | ±20 pts                     | Population weights in v1; calibration in v2                        |
| Inter-model latency (Digital Twin staleness) | Load, Neuromuscular        | Varies                      | FeatureEngine ensures execution order                              |

---

## 11. Interaction With Other Models

### 11.1 ← Training Stress Model (upstream)

**Reads from Digital Twin:**

- `fitnessState.atl` → LoadFatigue primary input
- `fitnessState.ctl` → normalization reference for ATL ratio
- `fitnessState.loadMonotony` → LoadFatigue amplifier
- `fitnessState.periodizationPhase` → context for FunctionalOverreachingRisk thresholds
  (same FatigueIndex in DELOAD vs. BUILD phase has different implications)

**Execution dependency:** Training Stress Model must complete before Fatigue Model runs.
This is an Inference Orchestrator responsibility.

### 11.2 ← Recovery Model (upstream)

**Reads from Digital Twin:**

- `recoveryState.autonomicScore` → NeuromuscularFatigue central component
- `recoveryState.sleepScore` → CumulativeTrajectory (sleep debt contribution)
- `recoveryState.dissonanceDetected` → subjective override guard trigger
- `recoveryState.illnessRisk` → FunctionalOverreachingRisk suppression guard

**Execution dependency:** Recovery Model must complete before Fatigue Model runs.

### 11.3 → Adaptation Model (downstream, future)

**Provides:**

- `fatigueLevel` → determines whether accumulated fatigue is in the functional
  adaptation window or beyond it.
- `fatigueTrajectory` → is the athlete recovering between sessions?
- `fatigueType` → what system is being stressed (determines adaptation target)

**The Adaptation Model's core question is:** "Is this fatigue producing adaptation,
or just damage?" The Fatigue Model provides the fatigue characterization;
the Adaptation Model provides the adaptation interpretation.

### 11.4 → Performance Forecast Model (downstream, future)

**Provides:**

- `fatigueIndex` → primary acute performance depressor in the Banister model
- `performanceImpairmentEstimate` → direct input to predicted performance
- `estimatedTimeToFresh` → used to forecast when performance will peak
  (critical for race planning and tapering)

### 11.5 → Risk Model (downstream, future)

**Provides:**

- `fatigueLevel` and `fatigueType` → accumulated fatigue multiplies injury risk
  independently of ACWR
- `functionalOverreachingRisk` → the highest-confidence injury risk signal SHARPIT
  can produce
- `consecutiveAccumulationDays` → duration of elevated fatigue matters for tissue
  damage risk

### 11.6 → Decision Engine (downstream)

**Provides:**

- `trainingCapacity` → primary training permission gate
- `fatigueType` → determines what KIND of session is appropriate
  (e.g., `METABOLIC_DOMINANT` → avoid intervals; `NEUROMUSCULAR_DOMINANT` → avoid
  high-impact; `PSYCHOLOGICAL_DOMINANT` → short enjoyable session rather than rest)
- `isAccumulating` → convenience flag for conditional recommendation logic

---

## 12. Known Limitations and Scientific Debt

### SD-017: Individual dimension weighting not implemented

**Debt:** the 0.30/0.25/0.20/0.15/0.10 weight distribution is population-derived
and applies identically to all athletes. Some athletes have much stronger neuromuscular
fatigue responses (soreness-dominant); others are primarily load-sensitive.

**Target:** v2 — individual weight calibration after 90+ days of labeled training data.

### SD-018: No direct glycogen state measurement

**Debt:** muscle glycogen is the primary fuel for training above LT1 and the primary
acute recovery target. It is not directly observable with consumer wearables.
The `MetabolicFatigue` dimension uses an indirect proxy (session intensity distribution).

**Impact:** athletes who train in a glycogen-depleted state (intentional metabolic
training) will see inflated MetabolicFatigue readings. Athletes who carbohydrate-load
effectively will see underestimated fatigue clearance.

**Target:** v3 — optional nutrition data integration (carbohydrate intake logging)
to modify MetabolicFatigue resolution rate.

### SD-019: No distinction between peripheral and central neuromuscular fatigue

**Debt:** peripheral (muscle-level) and central (neural-drive) components of
neuromuscular fatigue have different resolution timelines and different training
implications. Peripheral resolves with protein synthesis and inflammation clearance
(24–72h). Central resolves with neural rest, which may be impaired by sustained
psychological stress even during physical rest.

**Impact:** the model merges both into a single NeuromuscularFatigue dimension.
This is a simplification that may misclassify the limiting factor in some athletes.

**Target:** v2 — separate CNS Fatigue sub-dimension (HRV-derived) from Peripheral
Fatigue sub-dimension (mechanical + soreness), with independent reporting.

### SD-020: Fatigue resolution rates are theoretical

**Debt:** the resolution timelines used in `estimatedTimeToFresh` are derived from
general physiological principles and practitioner consensus (Level 5), not from
validated empirical studies in amateur endurance athletes.

**Impact:** estimated days to fresh may be systematically off for individual athletes.

**Target:** v2 — calibrate resolution rates using actual fatigue trajectory history
per athlete (track actual vs. predicted time to FRESH transition).

### SD-021: No sleep architecture quality in Metabolic resolution rate

**Debt:** glycogen resynthesis during sleep is preferentially associated with
deep sleep (SWS/N3) via GH secretion (Van Cauter et al. 2000). The model's
MetabolicFatigue resolution assumes adequate sleep architecture but does not
modulate resolution rate based on deep sleep percentage.

**Target:** v1.1 — apply a resolution rate modifier based on `recovery.sleepEfficiencyPercent`.
If deep sleep is < 13% of total sleep, glycogen resynthesis is impaired; extend
MetabolicFatigue resolution timeline.

---

## 13. Versioning Strategy

```
fatigue-vN.M.P

  N = Major (new physiological dimension added, core algorithm replaced)
  M = Minor (weight updates, new signal, threshold adjustment)
  P = Patch (bug fix, edge case)
```

**Planned versions:**

**v1.1.0:**

- Sleep architecture modifier for MetabolicFatigue resolution rate (SD-021)
- `ILLNESS_RETURN_ARTIFACT` guard (suppress FunctionalOverreachingRisk during
  illness recovery period — coordinate with Recovery Model's `illnessRisk`)

**v2.0.0:**

- Individual dimension weight calibration (SD-017)
- Separate CNS vs. peripheral neuromuscular sub-dimensions (SD-019)
- Calibrated resolution rates per athlete (SD-020)
- Dedicated Psychological Stress Model integration (replaces wellness-index proxy)

**v3.0.0:**

- Nutrition integration for glycogen-aware MetabolicFatigue (SD-018)
- Blood marker integration if available (cortisol, CK as inflammation marker)

---

## 14. Scientific References

| Reference                                                                                                                                      | Evidence Level | Used For                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------- |
| Meeusen, R. et al. (2013). "Prevention, diagnosis, and treatment of the overtraining syndrome." _Med Sci Sports Exerc_, 45(1), 186–205.        | Level 1        | Fatigue taxonomy (overreaching classification)                        |
| Kellmann, M. & Kallus, K.W. (2001). _Recovery-Stress Questionnaire for Athletes._ Human Kinetics.                                              | Level 3–5      | Multi-dimensional fatigue framework; psychological dimension          |
| Morgan, W.P. et al. (1985). "Psychological monitoring of overtraining and staleness." _British Journal of Sports Medicine_, 21(3), 107–114.    | Level 3        | Subjective override (iceberg profile); motivated athlete failure mode |
| Foster, C. et al. (1998). "Monitoring training in athletes with reference to overtraining syndrome." _Med Sci Sports Exerc_, 30(7), 1164–1168. | Level 5        | Training monotony penalty; load monotony and fatigue                  |
| Kenttä, G. & Hassmén, P. (1998). "Overtraining and recovery: a conceptual model." _Sports Medicine_, 26(1), 1–16.                              | Level 3–5      | Functional vs. non-functional overreaching framework                  |
| St Clair Gibson, A. et al. (2003). "The conscious perception of the sensation of fatigue." _Sports Medicine_, 33(3), 167–176.                  | Level 3        | Central Governor model; performance impairment estimate               |
| Saw, A.E. et al. (2016). "Monitoring the athlete training response." _BJSM_, 50(5), 281–291.                                                   | Level 3        | Subjective monitoring validity; psychological fatigue dimension       |
| Bangsbo, J. (1994). _Fitness Training in Football._ HO & Storm.                                                                                | Level 5        | TRIMP metabolic fatigue proxy                                         |
| Van Cauter, E. et al. (2000). "Age-related changes in slow wave sleep and REM sleep." _JAMA_, 284(7), 861–868.                                 | Level 2        | GH secretion and SWS; metabolic fatigue resolution                    |
| Fullagar, H.H.K. et al. (2015). "Sleep and athletic performance." _Sports Medicine_, 45(2), 161–186.                                           | Level 3–4      | Sleep deprivation as performance impairment; fatigue amplifier        |
| Hreljac, A. (2004). "Impact and overuse injuries in runners." _Med Sci Sports Exerc_, 36(5), 845–849.                                          | Level 3        | Mechanical stress factor basis                                        |
| Coggan, A.R. & Allen, H. (2006). _Training and Racing with a Power Meter._ VeloPress.                                                          | Level 5        | ATL as fatigue proxy; PMC fundamentals                                |

---

## 15. Required Features

> Progressive Feature Catalog — features consumed directly from the Feature Layer
> (not via Digital Twin). Digital Twin reads are listed separately in Section 11.

### Session Features consumed (direct from Feature Layer)

| Feature Name                     | Window      | Type             | Purpose                                        |
| -------------------------------- | ----------- | ---------------- | ---------------------------------------------- |
| `session.canonicalTss`           | last 48–72h | `number`         | Metabolic and neuromuscular stress computation |
| `session.mechanicalStressFactor` | last 72h    | `number`         | Peripheral neuromuscular fatigue               |
| `session.anaerobicLoadFactor`    | last 48h    | `number (0–1)`   | MetabolicFatigue primary input                 |
| `session.hrDriftPercent`         | last 48h    | `number \| null` | Glycogen depletion modifier                    |
| `session.sportType`              | last 72h    | `SportType`      | Mechanical stress factor lookup                |
| `session.durationSec`            | last 72h    | `number`         | Time-decay weight computation                  |
| `session.timestamp`              | last 72h    | `Date`           | Hours-ago for exponential decay                |

### Recovery Features consumed (direct from Feature Layer)

| Feature Name                                         | Type             | Purpose                            |
| ---------------------------------------------------- | ---------------- | ---------------------------------- |
| `recovery.sleepDebtMin`                              | `number`         | Cumulative trajectory contribution |
| `recovery.subjectiveWellnessIndex`                   | `number (0–10)`  | PsychologicalFatigue               |
| `recovery.subjectiveWellnessIndex.mood`              | `number (1–5)`   | PsychologicalFatigue               |
| `recovery.subjectiveWellnessIndex.energyLevel`       | `number (1–5)`   | PsychologicalFatigue               |
| `recovery.subjectiveWellnessIndex.perceivedSoreness` | `number (0–10)`  | Peripheral neuromuscular           |
| `recovery.rpeVsTargetZone`                           | `number \| null` | Psychological override detection   |

### Condition Features consumed

| Feature Name                           | Type            | Purpose                           |
| -------------------------------------- | --------------- | --------------------------------- |
| `condition.maxActiveSeverity`          | `number (0–10)` | Cumulative trajectory modifier    |
| `condition.trainingBlockedByCondition` | `boolean`       | Override training capacity signal |

### Digital Twin reads (not Feature Layer — noted for dependency clarity)

| Source                       | Field                                                                   | Purpose                      |
| ---------------------------- | ----------------------------------------------------------------------- | ---------------------------- |
| `athleteState.fitnessState`  | `.atl`, `.ctl`, `.loadMonotony`, `.periodizationPhase`                  | LoadFatigue; context         |
| `athleteState.recoveryState` | `.autonomicScore`, `.sleepScore`, `.dissonanceDetected`, `.illnessRisk` | NeuromuscularFatigue; guards |
| `athleteState.fatigueState`  | Previous FatigueIndex (last 7–14 days)                                  | CumulativeTrajectory         |

---

## 16. Dependencies

### Upstream — this model depends on

```
Training Stress Model  →  provides FitnessState to Digital Twin
                          MUST complete before Fatigue Model runs

Recovery Model         →  provides RecoveryState to Digital Twin
                          MUST complete before Fatigue Model runs

Feature Extraction     →  provides session and recovery features
                          MUST complete before Fatigue Model runs

Digital Twin           →  provides previous FatigueState (self-reference)
                          for CumulativeTrajectory dimension
```

### Downstream — these models depend on Fatigue Model

```
Adaptation Model       → reads FatigueState to determine if training is adaptive
                         CANNOT run before Fatigue Model completes

Performance Forecast   → reads FatigueIndex as performance depressor
                         CANNOT run before Fatigue Model completes

Risk Model             → reads FatigueLevel + FatigueType for injury risk scoring
                         CANNOT run before Fatigue Model completes

Decision Engine        → reads TrainingCapacity + FatigueType + FunctionalOverreachingRisk
                         CANNOT run before Fatigue Model completes
```

### Dependency Graph (current state)

```
                    Feature Extraction Layer
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 │
  Training Stress    Recovery Model          │
       Model               │                │
         │                 │                │
         └────────┬────────┘                │
                  ▼                         │
           Fatigue Model ◄──────────────────┘
                  │
       ┌──────────┼──────────┬──────────┐
       ▼          ▼          ▼          ▼
  Adaptation  Performance  Risk     Decision
    Model      Forecast   Model     Engine
               Model
```

**Execution order enforced by the Inference Orchestrator (not by any model or the Feature Layer):**

```
Round 1 (parallel): Training Stress Model, Recovery Model
Round 2 (sequential): Fatigue Model (depends on Round 1 outputs in Digital Twin)
Round 3 (parallel): Adaptation Model, Performance Forecast Model, Risk Model
Round 4 (sequential): Decision Engine (depends on all Round 3 outputs)
```
