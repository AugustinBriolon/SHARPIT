# SHARPIT — Recovery Model v1

> **Status:** Design specification. No implementation yet.
> **Model ID:** `recovery-synthesis-v1`
> **Replaces:** `src/lib/recovery.ts` (legacy, non-modeled approximation)
> **Reference implementation for all SHARPIT inference models.**
> **Scientific methodology:** follows `knowledge/scientific-methodology.md`

---

## 0. How to Read This Document

This document is the single source of truth for the Recovery Model.
It is written for two audiences simultaneously:

- **Sports scientists** who need to understand the physiological reasoning,
  the evidence basis, and the model's limitations.
- **Engineers** who will implement the model and need an unambiguous
  algorithm specification.

Every design decision in this model has a scientific rationale and an evidence level.
Where the evidence is weak, this is stated explicitly.

The model is designed to be **replaced, not patched.** When sports science produces
better evidence, a new version (`recovery-synthesis-v2`) should supersede this document,
not annotate it. See Section 15 (Versioning).

---

## 1. Purpose

The Recovery Model estimates **how much biological capacity the athlete has recovered**
following prior training stress, and how prepared their organism is to absorb new stimulus.

Its primary output — the **Readiness Score** (0–100) — represents a synthesis of
four physiological dimensions into a single, confidence-weighted estimate.

The Recovery Model serves three downstream consumers:

1. **The Decision Engine** — to determine whether to recommend training, rest, or reduction.
2. **The Training Load Model** — to adjust TSS targets based on recovery state.
3. **The Digital Twin** — to update the `RecoveryState` dimension of `AthleteState`.

The model does NOT:

- Diagnose medical conditions (it detects patterns, not diseases).
- Replace clinical assessment for injury or overtraining syndrome.
- Predict performance with precision (that belongs to the Performance Forecast Model).
- Make nutritional or sleep recommendations directly (those belong to their respective models).

---

## 2. What "Recovery" Means in SHARPIT

Recovery is not the absence of fatigue. It is an active biological reconstruction process.

Following a training stimulus, the organism undergoes a predictable sequence:

```
Training Stress Applied
        │
        ▼
   Homeostasis Disrupted
   (cellular damage, glycogen depletion,
    HPA axis activation, ANS imbalance)
        │
        ▼
   Active Repair Phase
   (protein synthesis, glycogen resynthesis,
    parasympathetic tone restoration,
    inflammatory resolution)
        │
        ▼
   Supercompensation Window
   (temporary capacity above pre-stress baseline)
        │
        ▼
   Return to Baseline
   (if no further stimulus applied)
```

SHARPIT's Recovery Model attempts to estimate **where on this curve the athlete currently sits**.

This has important consequences:

- An athlete with `readinessScore: 90` may be in supercompensation — ideal for a peak effort.
- An athlete with `readinessScore: 40` is still in the repair phase — additional stress would
  compound, not stimulate.
- An athlete with `readinessScore: 15` may be experiencing non-functional overreaching —
  further stress is contraindicated.

Recovery is inherently **multi-dimensional**. The cardiovascular system, the neuromuscular
system, the neuroendocrine system, and the central nervous system recover at different rates
and respond to different stimuli. No single measurement captures all dimensions.

---

## 3. Physiological Mechanisms Estimated

The model estimates four physiological recovery dimensions:

### 3.1 Autonomic Nervous System Balance

**What it captures:** The balance between parasympathetic (rest/repair) and sympathetic
(fight/flight) tone. Recovery requires parasympathetic dominance. Training stress, illness,
sleep deprivation, and psychological stress all elevate sympathetic tone.

**Why it matters:** Autonomic imbalance is the earliest detectable signal of incomplete
recovery. It precedes subjective fatigue perception by 12–24 hours in well-trained athletes
(Buchheit 2014). This makes it the most sensitive dimension in the model.

**Observables available:** HRV (RMSSD), Resting Heart Rate.

**What cannot be observed:** absolute sympathovagal balance, vagal nerve firing rate,
norepinephrine/epinephrine levels (requires blood sampling).

---

### 3.2 Sleep-Mediated Restoration

**What it captures:** The quality and completeness of the sleep-dependent restoration
processes: growth hormone secretion (N3/SWS-gated), motor memory consolidation (REM-gated),
glycogen resynthesis (sleep-associated), and immune regulation.

**Why it matters:** Sleep is the primary recovery intervention. A single night of
severely truncated sleep impairs recovery from the same training load that 8 hours of
sleep would resolve (Walker 2017). Sleep debt accumulates non-linearly — three nights
of 6h produces a larger deficit than one night of 2h (Van Dongen et al. 2003).

**Observables available:** total sleep duration, deep sleep minutes, REM sleep minutes,
sleep efficiency (deep + REM / total), accumulated sleep debt.

**What cannot be observed:** actual GH pulse amplitude, true glycogen resynthesis rate,
true memory consolidation quality. Stage data from optical wearables has ±20% error
vs. polysomnography (Fullagar et al. 2015) — error is acknowledged in confidence model.

---

### 3.3 Subjective Recovery State

**What it captures:** The athlete's perceived state of recovery across psychological,
motivational, and somatic domains. Perceived energy, mood, and soreness are independently
validated recovery markers (Saw et al. 2016) — not simply noise to be corrected for.

**Why it matters:** Subjective monitoring is at least as sensitive as objective monitoring
for detecting changes in recovery status (Saw et al. 2016). Psychological stress (work,
relationships, life events) impairs athletic recovery even when physiological markers
appear normal (Kellmann & Kallus 2001). Subjective signals capture this domain;
physiological sensors cannot.

**Observables available:** mood (1–5), energy (1–5), perceived soreness (0–10),
RPE vs. expected for recent sessions.

**What cannot be observed:** psychological motivation from external life stressors,
endocrine markers of psychological stress (cortisol), intrinsic motivation state.

---

### 3.4 Cumulative Training Stress Context

**What it captures:** The load history context that determines how much physiological
debt is currently outstanding from training. This is NOT a recovery measure — it is
a **modulating context** that adjusts the interpretation of the other three dimensions.

**Why it matters:** A `readinessScore: 70` during week 3 of a hard training block
means something different from `readinessScore: 70` after a complete rest week.
The load context anchors the score in the athlete's training reality.

**Observables available:** `load.acuteLoad` (TSS 7-day), `load.acwr`, `load.loadMonotony`.

**What cannot be observed:** true peripheral muscle fatigue, glycogen stores, true
neuromuscular impairment (requires Wingate test or similar).

---

## 4. Input Features

The Recovery Model consumes the following Features, all produced by the Feature
Extraction Layer. The model receives `AthleteFeatures` for the target `trainingDayId`.

### 4.1 Primary Inputs (recovery dimensions)

| Feature Name                       | Dimension  | Required  | Evidence Level |
| ---------------------------------- | ---------- | --------- | -------------- |
| `recovery.hrvDeltaFromBaseline`    | Autonomic  | Preferred | Level 3        |
| `recovery.rhrDeltaFromBaseline`    | Autonomic  | Optional  | Level 3-5      |
| `recovery.sleepEfficiencyPercent`  | Sleep      | Preferred | Level 2-3      |
| `recovery.sleepDebtMin`            | Sleep      | Preferred | Level 2        |
| `recovery.subjectiveWellnessIndex` | Subjective | Optional  | Level 3        |
| `recovery.rpeVsTargetZone`         | Subjective | Optional  | Level 3-5      |

### 4.2 Context Inputs (load dimension)

| Feature Name        | Dimension    | Required | Evidence Level |
| ------------------- | ------------ | -------- | -------------- |
| `load.acwr`         | Load Context | Optional | Level 1-3      |
| `load.acuteLoad`    | Load Context | Optional | Level 3-5      |
| `load.loadMonotony` | Load Context | Optional | Level 5        |

### 4.3 Reference Inputs (cross-validation, NOT primary)

| Feature Name                    | Use                         | Trust Level           |
| ------------------------------- | --------------------------- | --------------------- |
| `recovery.garminReadinessScore` | Cross-validation audit only | Level 6 — proprietary |
| `recovery.garminBatteryPeak`    | Cross-validation audit only | Level 6 — proprietary |

**Design invariant:** Garmin Readiness Score must NEVER be a primary input to any
recovery dimension score. It is retained for cross-validation and historical comparison
only. Its opacity disqualifies it as a first-class inference input.
(Reference: ADR-003 — Garmin Primary Source Decision)

**Soft corroboration (v1.1):** after dimension synthesis, Garmin daily stress and Body
Battery may apply a **bounded** readiness adjustment (±12 pts max down, +5 max up) via
`wearableEnergySignals` on `RecoveryModelContext`. This never feeds dimension scoring.
Overnight sleep stress (`avgStressDuringSleep`) may modify the Sleep dimension only —
it is an optical overnight measurement embedded in the Sleep observation, not Garmin's
proprietary readiness algorithm.

---

## 5. Algorithm Specification — v1

The model computes a `ReadinessScore ∈ [0, 100]` as a weighted synthesis of four
dimension scores, each also in `[0, 100]`.

### 5.1 Dimension 1 — Autonomic Score

**Primary signal:** `recovery.hrvDeltaFromBaseline` (percent deviation from 14-day baseline)

The HRV delta is mapped to an autonomic score using a piecewise linear function:

```
hrvDelta (%)     →   AutonomicRaw
─────────────────────────────────────
> +10%           →   100  (likely supercompensation or artifact — see failure modes)
+5% to +10%      →   90
0% to +5%        →   80
-5% to 0%        →   70   (within normal day-to-day variation, Plews et al. 2013)
-10% to -5%      →   55
-15% to -10%     →   40   (physiologically meaningful suppression, Buchheit 2014)
-25% to -15%     →   25
< -25%           →   10   (severe suppression — consider illness/overtraining risk)
```

**Rationale:** The ±5% zone is treated as noise (Plews et al. 2013 — day-to-day HRV
variation is ~8-12% CV even in healthy athletes). Physiologically meaningful deviations
begin at ±10-15% (Buchheit 2014).

**RHR modifier applied to AutonomicRaw:**

```
rhrDelta (bpm)      Modifier
─────────────────────────────
> +7                × 0.65
+5 to +7            × 0.75
+3 to +5            × 0.85
-2 to +3            × 1.00  (no change — within baseline noise, Noakes 1991)
-5 to -2            × 1.05
< -5                × 1.10  (improved — cap at 100)
```

**Rationale:** RHR is a less sensitive but more robust marker than HRV (Buchheit 2014).
It modulates the HRV-derived score rather than replacing it. The 5 bpm threshold follows
Noakes (1991) and Friel (2009) — practitioner consensus (Level 5).

**Final Autonomic Score:**

```
autonomicScore = clamp(AutonomicRaw × rhrModifier, 0, 100)
```

**Fallback when HRV unavailable:**
When `recovery.hrvDeltaFromBaseline` is `PENDING`:

- `autonomicScore = null`
- The dimension is excluded from synthesis (weight redistributed)
- A `SPARSE_DATA` flag is raised

---

### 5.2 Dimension 2 — Sleep Score

**Primary signals:** `recovery.sleepEfficiencyPercent`, `recovery.sleepDebtMin`

Sleep efficiency is `(deepMin + remMin) / totalMinutes × 100`.

**Efficiency → SleepEfficiencyRaw:**

```
efficiency (%)     SleepEfficiencyRaw
───────────────────────────────────────
≥ 85%              100  (excellent architecture)
75–85%              80  (good architecture)
65–75%              60  (adequate)
55–65%              40  (poor)
< 55%               20  (severely fragmented)
No data            PENDING
```

**Target sleep efficiency:** ≥ 80% is the approximate threshold in sleep research
(Walker 2017). Deep sleep target: 13–23% of total; REM target: 20–25% (AASM).

**Debt modifier:**

```
sleepDebtMin         Modifier
─────────────────────────────
≤ 30 min             × 1.00
30–60 min            × 0.90
60–120 min           × 0.80
120–240 min          × 0.65
> 240 min            × 0.50  (4h+ cumulative debt over 7 days is severely impairing)
```

**Rationale:** Van Dongen et al. (2003) demonstrated that cumulative sleep restriction
to 6h/night for 14 days produces cognitive impairment equivalent to 24h total sleep
deprivation. The debt modifier is linear within ranges for simplicity (v1 approximation).
Nonlinear modeling deferred to v2.

**Final Sleep Score:**

```
sleepScore = clamp(SleepEfficiencyRaw × debtModifier, 0, 100)
```

**Fallback when sleep data unavailable:**

- `sleepScore = null`
- Dimension excluded from synthesis
- `SPARSE_DATA` flag raised

---

### 5.3 Dimension 3 — Subjective Score

**Primary signal:** `recovery.subjectiveWellnessIndex` (composite, 0–10)

`subjectiveWellnessIndex` is the weighted composite of: `mood` (×0.30), `energyLevel` (×0.35),
`perceivedSoreness` inverted (×0.25), `stressLevel` inverted (×0.10).

```
wellnessIndex    SubjectiveRaw
──────────────────────────────
8.0–10.0         100  (excellent wellbeing)
6.5–8.0           80
5.0–6.5           60
3.5–5.0           40
2.0–3.5           20
< 2.0             10
No data          PENDING
```

**RPE modifier (when `recovery.rpeVsTargetZone` available):**

```
rpeVsTarget          Modifier
──────────────────────────────
< -1.5               × 1.05  (session felt easier than expected — good sign)
-1.5 to +1.5         × 1.00  (within expected range)
+1.5 to +3.0         × 0.90  (session harder than expected — fatigue signal)
> +3.0               × 0.75  (markedly harder than expected — significant fatigue)
```

**Rationale:** Saw et al. (2016) — subjective measures are as sensitive as objective
measures for recovery monitoring. RPE drift above expected is an early overreaching
indicator (Foster et al. 2001). Evidence level: Level 3.

**Fallback when subjective data unavailable:**

- `subjectiveScore = null`
- Dimension excluded from synthesis
- `SPARSE_DATA` flag raised
- Note: subjective data is athlete-entered and therefore more frequently missing

---

### 5.4 Dimension 4 — Load Context Score

**Primary signals:** `load.acwr`, `load.loadMonotony`

This dimension does not measure recovery — it measures the training stress burden
that recovery must overcome.

```
acwr              LoadContextRaw   Meaning
──────────────────────────────────────────
< 0.8              70             Undertrained — low stress but potentially deconditioned
0.8–1.0            85             Well-managed — low-moderate load
1.0–1.3           100             Optimal loading zone — recovery should be achievable
1.3–1.5            65             Elevated load — recovery under pressure
1.5–1.8            40             High load — recovery likely impaired
1.8–2.0            20             Dangerously high — overreaching territory
> 2.0               5             Critical — immediate reduction indicated
```

**Monotony modifier:**
High training monotony (low day-to-day variation) impairs recovery efficiency
(Foster et al. 1998 — Level 5). A monotony > 2.0 indicates every day looks the same,
depriving the athlete of polarized recovery-adaptation cycles.

```
loadMonotony         Modifier
──────────────────────────────
< 1.5               × 1.05  (good variation)
1.5–2.0             × 1.00  (acceptable)
2.0–2.5             × 0.90
> 2.5               × 0.80
```

**Final Load Context Score:**

```
loadContextScore = clamp(LoadContextRaw × monotonyModifier, 0, 100)
```

---

### 5.5 Synthesis — Weighted Recovery Composite

**Default weights (evidence-based, v1):**

| Dimension    | Default Weight | Rationale                                     |
| ------------ | -------------- | --------------------------------------------- |
| Autonomic    | 0.35           | Most sensitive objective recovery marker (L3) |
| Sleep        | 0.30           | Primary physical restoration mechanism (L2-3) |
| Subjective   | 0.25           | Equivalent sensitivity to objective (L3)      |
| Load Context | 0.10           | Context modifier, not a recovery measure      |

**Total:** 1.00

**Dynamic weight redistribution when dimensions are PENDING:**

The model MUST redistribute weights across available dimensions rather than returning
a score from incomplete inputs. The redistribution rule:

```
For each PENDING dimension:
  - Remove its weight from the total pool
  - Redistribute proportionally to available dimensions
  - The Load Context dimension receives no redistribution bonus (it is context, not recovery)

Example: HRV unavailable (autonomic weight = 0.35 removed)
  → Sleep gets:      0.30 / 0.65 = 0.462
  → Subjective gets: 0.25 / 0.65 = 0.385
  → Load context:    0.10 / 0.65 = 0.154
```

**If fewer than 2 dimensions are available:**
The model must NOT produce a composite score.
`readinessScore = null`, `readinessCategory = 'INSUFFICIENT_DATA'`.
A `BASELINE_PENDING` flag is raised.

**Final Readiness Score:**

```
readinessScore = Σ(dimensionScore × redistributedWeight)
              for all available (non-PENDING) dimensions

readinessScore = round(readinessScore)  // integer 0–100
```

**Score to Category mapping:**

```
readinessScore    readinessCategory    Canonical meaning
──────────────────────────────────────────────────────────────────────
85–100            OPTIMAL              Full recovery — high-intensity ready
70–84             ADEQUATE             Good recovery — normal training indicated
50–69             REDUCED              Partial recovery — moderate-intensity preferred
30–49             LOW                  Incomplete recovery — easy training only
< 30              VERY_LOW             Insufficient recovery — rest indicated
```

---

## 6. Internal Signals (Ephemeral)

The Recovery Model produces the following Signals during the inference pass.
These are strongly-typed TypeScript values. They are NOT persisted independently.
Their interpretation at decision time is embedded verbatim into the Decision Record.

```typescript
type RecoverySignals = {
  // Per-dimension status
  autonomicBalance:
    'ENHANCED' | 'NORMAL' | 'MILDLY_SUPPRESSED' | 'SUPPRESSED' | 'CRITICALLY_SUPPRESSED';
  sleepAdequacy: 'EXCELLENT' | 'ADEQUATE' | 'INSUFFICIENT' | 'SEVERELY_INSUFFICIENT';
  subjectiveWellness: 'HIGH' | 'NORMAL' | 'LOW' | 'VERY_LOW';
  loadStressContext: 'UNDERTRAINED' | 'OPTIMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';

  // Cross-dimensional signals
  overreachingRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  illnessRisk: 'LOW' | 'ELEVATED' | 'HIGH';
  dissonanceDetected: boolean; // subjective/objective disagreement (see Section 9)
};
```

### Signal definitions

**`AutonomicBalance: CRITICALLY_SUPPRESSED`**
Triggered when `autonomicScore < 20`. Composed of `hrvDelta < -25%` or `hrv_drop_3day > 30%`.
Generates the `illnessRisk` secondary signal (see Section 9 — Failure Modes).

**`OverreachingRisk`**
Cross-dimensional signal. Emerges when multiple dimensions simultaneously score low:

```
CRITICAL  : ≥ 3 dimensions < 30  (OTS territory — Meeusen et al. 2013)
HIGH      : autonomicScore < 30 AND sleepScore < 40 for ≥ 3 consecutive days
MODERATE  : any two primary dimensions < 45
LOW       : all other cases
```

**`IllnessRisk`**
Triggered by acute HRV suppression WITHOUT a corresponding training load explanation:

```
HIGH      : hrvDelta < -30% AND acuteLoad < chronicLoad × 0.7 (resting week or no training)
ELEVATED  : hrvDelta < -20% AND no session in last 2 days
LOW       : all other cases
```

**Important caveat:** SHARPIT cannot diagnose illness. This signal indicates a physiological
pattern consistent with immune activation. The athlete must be informed and clinical
consultation is appropriate for `HIGH` level.

---

## 7. Digital Twin Updates

The Recovery Model updates the `RecoveryState` sub-dimension of `AthleteState`:

```typescript
type RecoveryState = {
  readinessScore: number | null; // 0–100, null if INSUFFICIENT_DATA
  readinessCategory: ReadinessCategory; // OPTIMAL | ADEQUATE | REDUCED | LOW | VERY_LOW | INSUFFICIENT_DATA

  dimensions: {
    autonomic: DimensionResult;
    sleep: DimensionResult;
    subjective: DimensionResult;
    loadContext: DimensionResult;
  };

  primaryLimitingFactor: string | null; // which dimension is lowest
  estimatedTimeToFullRecovery: number | null; // days (see Section 10)
  overreachingRisk: OverreachingRisk;
  illnessRisk: IllnessRisk;
  dissonanceDetected: boolean;

  confidence: number; // 0.0–1.0
  dataCompleteness: DataCompleteness; // FULL | PARTIAL | SPARSE | INSUFFICIENT
  modelId: 'recovery-synthesis-v1';
  computedAt: Date;
};

type DimensionResult = {
  score: number | null;
  status: string; // the Signal-level classification
  available: boolean; // false when PENDING
};
```

This snapshot is persisted as part of the `AthleteStateSnapshot` (per ADR-004).

---

## 8. Confidence Calculation

Confidence represents how much trust to place in the `readinessScore`.
It is distinct from the score itself — a high-confidence score of 40 is more actionable
than a low-confidence score of 70.

Confidence is computed from three factors:

### 8.1 Measurement Quality Factor

Each available dimension contributes a quality factor:

| Input Quality         | Autonomic | Sleep | Subjective |
| --------------------- | --------- | ----- | ---------- |
| MEASURED_DIRECT       | 0.95      | N/A   | N/A        |
| MEASURED_OPTICAL      | 0.70      | 0.65  | N/A        |
| MANUAL                | N/A       | N/A   | 0.80       |
| ESTIMATED             | 0.50      | 0.50  | 0.60       |
| PROPRIETARY_MODEL     | 0.30      | 0.30  | N/A        |
| PENDING / unavailable | 0.00      | 0.00  | 0.00       |

`measurementQualityFactor = Σ(dimensionQuality × redistributedWeight)`

### 8.2 Baseline Maturity Factor

HRV delta from baseline requires an established baseline. Confidence scales with
baseline history length:

```
Days of baseline data    BaselineMaturityFactor
─────────────────────────────────────────────
< 7 days                 0.40  (insufficient baseline — score unreliable)
7–13 days                0.65  (partial baseline)
14–27 days               0.80  (adequate baseline)
28+ days                 0.95  (mature baseline — individual patterns emerging)
90+ days                 1.00  (full individual calibration possible)
```

### 8.3 Signal Consistency Factor

When objective and subjective dimensions agree within 20 points:
`signalConsistencyFactor = 1.00`

When they diverge by 20–40 points:
`signalConsistencyFactor = 0.85` (and `dissonanceDetected = true`)

When they diverge by > 40 points:
`signalConsistencyFactor = 0.70` (significant dissonance — see Section 9)

### 8.4 Final Confidence

```
confidence = measurementQualityFactor × baselineMaturityFactor × signalConsistencyFactor
confidence = round(confidence × 100) / 100   // two decimal precision
```

**Confidence to human-readable label:**

```
≥ 0.80   HIGH     "Estimate based on complete, high-quality data"
0.60–0.79 MODERATE "Estimate may vary — some data unavailable or low quality"
0.40–0.59 LOW      "Estimate is tentative — insufficient data for reliable assessment"
< 0.40   VERY_LOW  "Insufficient data to estimate recovery reliably"
```

**Recommendation rule:** at `VERY_LOW` confidence, the Decision Engine must not produce
a specific training recommendation. It should output a conservative default with an
explanation of the missing data.

---

## 9. Failure Modes

### 9.1 Subjective/Objective Dissonance

**Pattern:** objective signals (HRV, sleep) indicate good recovery; subjective signals
indicate poor recovery — or vice versa.

**Scientific interpretation:** This pattern is diagnostically significant.

- **Objective good, subjective poor:** Often indicates non-training life stressors
  (psychological stress, relationship conflict, work pressure) or early illness
  before physiological markers are affected. Subjective signals should be weighted
  MORE heavily in this scenario. Defer to the athlete's perception.

- **Objective poor, subjective good:** Often indicates motivational override of fatigue
  signals (the athlete "feels ready" despite physiological indicators of incomplete
  recovery). This is a risk pattern — athletes with high motivation may override
  fatigue perception (Morgan 1985, POMS data in overtraining). Apply conservative bias.

**Model behavior:** When `dissonanceDetected = true`, the model applies conservative bias:
the readinessScore is decreased by 10% for the "objective poor / subjective good" pattern,
and the Decision Engine is flagged to defer to subjective state for "objective good / subjective poor."

### 9.2 HRV Spike After Rest Period

**Pattern:** After a planned deload or rest week, HRV rises dramatically (> +20% from baseline).

**Risk:** This is physiologically normal (parasympathetic recovery) but may trigger a
false-positive CRITICALLY_SUPPRESSED alert in reverse (the next training session sees
a relative drop from an artificially elevated peak).

**Model behavior:** The 14-day rolling baseline smooths this pattern but does not
eliminate it. A `DELOAD_FOLLOWING_PERIOD` flag should be set by the Training Load
Model and communicated to the Recovery Model to suppress extreme baseline deviation
alerts for 3 days following a deload week.

### 9.3 Measurement Contamination

**Pattern:** HRV or RHR recorded too soon after exercise (POST_EXERCISE_CONTAMINATION flag
on the Observation).

**Model behavior:** If the HRV Observation carries `POST_EXERCISE_CONTAMINATION` flag:

- Measurement quality factor reduced to 0.40.
- A warning is raised.
- If multiple consecutive observations are contaminated, the autonomic dimension reverts to PENDING.

### 9.4 Illness Pattern

**Pattern:** Acute HRV suppression (> 30% drop) WITHOUT corresponding training load
explanation (no hard session in last 48h).

**Model behavior:**

- `illnessRisk = HIGH`
- `readinessCategory` overridden to `VERY_LOW` regardless of composite score
- The Decision Engine receives a mandatory REST recommendation
- A note is embedded in the Decision Record: "Physiological pattern consistent with
  immune activation. Clinical consultation appropriate if symptoms present."
- **Important:** SHARPIT cannot diagnose illness. This is a pattern flag, not a diagnosis.

### 9.5 Data Starvation

**Pattern:** No HRV, no sleep data, no subjective data available for the day.

**Model behavior:**

- Only `loadContextScore` is available.
- With a single dimension, `readinessScore = null`, `readinessCategory = INSUFFICIENT_DATA`.
- Decision Engine receives: "Insufficient recovery data. Conservative training recommendation applies."
- The model MUST NOT invent a score from load context alone.

---

## 10. Cold Start Behavior

A new athlete has no baseline. The model degrades gracefully through three phases:

### Phase 1: Baseline Accumulation (Days 1–6)

```
readinessScore    = null
readinessCategory = 'BASELINE_PENDING'
confidence        = 0.00
```

No recovery inference is made. Sleep and load context scores are computed independently
but NOT combined into a composite. This phase collects data without misleading the athlete
with an unreliable estimate.

Athlete communication: "SHARPIT is learning your baseline. Recovery assessment begins
after 7 days of consistent measurement."

### Phase 2: Partial Baseline (Days 7–13)

```
confidence = 0.40–0.65 range (baseline maturity factor = 0.65)
```

A composite score is produced but prominently flagged as tentative. The baseline
is computed from the available days (minimum 7). HRV delta comparisons use a shorter
window than the target 14-day baseline.

Athlete communication: "Recovery estimate based on [N] days of data. Accuracy improves
with more data."

### Phase 3: Full Operation (Day 14+)

Full baseline available. Confidence reflects measurement quality only.

### Phase 4: Individual Calibration (Day 90+)

After 90 days, individual calibration begins (see Section 15 — future versions):
the model can start fitting athlete-specific HRV baseline patterns, optimal sleep
duration, and RHR sensitivity. This is out of scope for v1 but is the primary
improvement target for v2.

---

## 11. Incremental Update Strategy

The Recovery Model is triggered once per training day, after all observations
for that day have been received and features extracted.

**Trigger conditions:**

- A new `SLEEP` observation is ingested for the target day.
- A new `HRV` observation is ingested for the target day.
- A new `SUBJECTIVE` observation is ingested for the target day.
- A new `SESSION` observation modifies `load.acwr` for the day window.

**Re-computation rule:**
When the model is triggered, it produces a new `AthleteStateSnapshot` with `version: N+1`.
The previous snapshot is retained (per ADR-004 — immutable audit trail).

The Decision Engine always reads from the latest snapshot. If the Recovery Model
has not yet run for the current day, the Decision Engine uses the previous day's
snapshot with a `STALE_DATA` flag.

**Ordering constraint:**
The Recovery Model must run AFTER the Feature Extraction Layer has completed
for the target `trainingDayId`. It must NOT run on raw Observations.

---

## 12. Uncertainty Sources

| Source                                      | Impact                   | Mitigation in v1                                        |
| ------------------------------------------- | ------------------------ | ------------------------------------------------------- |
| Optical HRV (±15% vs. ECG)                  | Autonomic ±15 pts        | Measurement quality factor (0.70) applied               |
| Sleep stage detection accuracy (±20%)       | Sleep ±10 pts            | Measurement quality factor (0.65) applied               |
| Individual baseline variability             | Entire score             | 14-day rolling baseline; maturity factor                |
| Non-training life stress (unmeasured)       | Subjective ±20 pts       | Dissonance detection; defer to subjective on divergence |
| Illness vs. overtraining vs. normal fatigue | Signal misclassification | Conservative bias; SHARPIT cannot distinguish           |
| Glycogen status (unobservable)              | True readiness           | Accepted gap — no consumer wearable measures this       |
| Muscle damage level (unobservable)          | True readiness           | Accepted gap — neuromuscular proxy via session features |
| Cortisol/testosterone ratio (unobservable)  | Hormonal recovery        | Accepted gap — future integration with lab data (v3+)   |
| Individual response variation               | All dimensions           | Population parameters in v1; calibration in v2          |

---

## 13. Interaction With Other Models

The Recovery Model is the first inference model in the SHARPIT pipeline. It produces
outputs consumed by downstream models and consumes outputs from peer models.

### 13.1 → Training Load Model

**Direction:** Recovery Model informs Training Load Model.
The Training Load Model uses `readinessCategory` to modulate TSS targets:

```
OPTIMAL    → TSS target: +5–15% above planned
ADEQUATE   → TSS target: ±0% (execute planned)
REDUCED    → TSS target: −10–20% below planned (zone shift toward Z2)
LOW        → TSS target: −30–50% (easy session or active recovery only)
VERY_LOW   → TSS target: 0 (rest indicated)
```

### 13.2 ← Sleep Model (future)

**Direction:** Sleep Model will produce a `SleepFeatures` set that feeds the
Recovery Model's Sleep dimension with higher fidelity than the current Feature
Extraction approximations. When the Sleep Model is implemented (v2+), the
Recovery Model's Sleep dimension should switch to consuming `sleep.restorationScore`
rather than deriving it from raw architecture features.

### 13.3 ← Training Stress Model (future)

**Direction:** The Training Stress Model will produce a canonical `tssScore` for
each session that supersedes the feature-level approximation. When available,
the Recovery Model's Load Context dimension should consume `model.trainingStress.acuteLoad`
rather than `load.acuteLoad` (Feature Layer approximation).

### 13.4 → Decision Engine

**Direction:** Recovery Model produces the `RecoveryState` that is the primary input
to the Decision Engine's daily recommendation logic.

**Priority hierarchy in the Decision Engine (from recovery.md):**

1. Active PHYSICAL_CONDITION (severity ≥ 6) → overrides all recovery state
2. `overreachingRisk = CRITICAL` → mandatory rest, override all other signals
3. `illnessRisk = HIGH` → mandatory rest recommendation
4. `readinessCategory` → primary decision input
5. Load context (ACWR) → secondary constraint

### 13.5 ← Nutrition Model (future, v3+)

The Nutrition Model would provide a `glycogenEstimate` and `hydrationStatus` that
could modulate the Recovery Model's Load Context score. Currently, this is an accepted
gap — glycogen is unobservable at consumer level.

### 13.6 ← Psychological Stress Model (future, v2+)

Non-training psychological stress (work, relationships, life events) is the most significant
unmeasured variable in the current model. A dedicated Psychological Stress dimension —
fed by self-reported stress levels, HRV pattern analysis, and potentially calendar data
(high-travel weeks, competition weeks) — would materially improve recovery estimation.
This is deferred to v2 as it requires a dedicated subjective input protocol.

---

## 14. Known Limitations and Scientific Debt

### SD-006: Individual parameter calibration not implemented

**Debt:** v1 uses population-derived weights (0.35/0.30/0.25/0.10) and population-derived
HRV response curves. Evidence (Plews et al. 2013, Buchheit 2014) indicates that individual
calibration produces significantly better sensitivity than population norms.

**Impact:** Athletes with atypical autonomic profiles (e.g., high-HRV athletes whose
HRV suppresses more during recovery, athletes with chronically elevated RHR) may receive
inaccurate dimension scores.

**Target:** v2 — individual calibration after 90 days of data.

### SD-007: Glycogen status is not modeled

**Debt:** Muscle glycogen depletion is a primary fatigue mechanism in endurance sports
(Bergstrom et al. 1967) and a key recovery target. It is not directly observable with
consumer wearables. v1 uses training load features as an indirect proxy.

**Impact:** After very high-carbohydrate sessions (long rides/runs at Z2), the recovery
model may underestimate glycogen-related fatigue. After low-carbohydrate sessions
(short/intense), it may overestimate it.

**Target:** v3+ — integration with nutrition tracking if available.

### SD-008: HRV baseline window (14d) may be suboptimal

**Debt:** SHARPIT uses 14 days as the HRV baseline window. Plews et al. (2013) evaluated
7-day windows; Buchheit (2014) recommends 7–28 days. The optimal window is individual
and sport-dependent.

**Impact:** Baseline may be too responsive to acute changes (14d closer to 7d) or
too slow to adapt to fitness changes.

**Target:** v2 — evaluate athlete-specific window optimization.

### SD-009: Sleep stage accuracy not validated

**Debt:** The Sleep dimension uses Garmin-reported sleep stages (deep, REM, light).
Optical wearable sleep staging has ±20% accuracy vs. polysomnography (Fullagar et al. 2015).
SHARPIT cannot verify stage accuracy.

**Impact:** Sleep dimension score may systematically over- or underestimate sleep
quality for athletes with atypical sleep architecture.

**Mitigation in v1:** Measurement quality factor (0.65) reflects this uncertainty.

### SD-010: Psychological stress is not modeled

**Debt:** Kellmann & Kallus (2001) demonstrated that non-training psychological stress
significantly impairs recovery. SHARPIT v1 captures only the subjective wellness index
(which partially reflects psychological state) but has no dedicated psychological
stress input.

**Impact:** Athletes under high work/life stress may show better-than-accurate recovery
estimates when HRV and sleep are maintained.

---

## 15. Versioning Strategy

### Why versioning matters for this model

The Recovery Model is a scientific construct. As sports science evolves, better
evidence will replace current approximations. The model must be upgradeable without
disrupting historical audit trails (per ADR-004).

### Version taxonomy

```
recovery-synthesis-vN.M.P

  N = Major version (new physiological mechanisms added, or primary algorithm replaced)
      → Requires Decision Record migration review
      → May change score scale or category boundaries
      → Requires athlete communication

  M = Minor version (parameter updates, weight adjustments, threshold changes)
      → New Decision Records use new version
      → Historical records unchanged
      → Validation period recommended

  P = Patch (bug fixes, edge case handling, failure mode corrections)
      → Transparent update, no scientific implications
```

### Planned future versions

**v1.1.0** (near-term)

- Implement `DELOAD_FOLLOWING_PERIOD` flag from Training Load Model to suppress
  post-deload baseline anomalies (Failure Mode 9.2).
- Refine sleep efficiency calculation using non-linear debt function.

**v2.0.0** (after 90-day data threshold)

- Individual weight calibration (athlete-specific autonomic/sleep sensitivity ratio).
- Individual HRV baseline window optimization.
- Dedicated Psychological Stress dimension (requires new subjective input protocol).
- Non-linear sleep debt function (exponential degradation, Van Dongen 2003).

**v3.0.0** (long-term, requires new data sources)

- Optional integration with blood marker lab data (ferritin, CRP, testosterone/cortisol).
- Optional integration with nutrition tracking for glycogen estimation.
- Machine learning layer for individual response pattern detection (requires N≥365 days
  of labeled athlete data — out of scope until data volume justifies).

### Migration protocol when upgrading

1. Implement new version alongside old version.
2. Run both on same athlete data for a validation window (minimum 14 days).
3. Compare outputs — document systematic differences in an ADR.
4. At cutover: new Decision Records use new `modelId`.
5. Old Decision Records remain verbatim — they accurately represent what the old model believed.
6. Athlete-facing communication if score scale changes.

---

## 16. Scientific References

All references follow `knowledge/scientific-methodology.md` citation standards.

| Reference                                                                                                                                                                                                                      | Evidence Level | Used For                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- | ----------------------------------------------------- |
| Plews, D.J. et al. (2013). "Training adaptation and HRV in elite endurance athletes." _Sports Medicine_, 43(9), 773–781.                                                                                                       | Level 3        | 14-day HRV baseline, ±5% noise zone                   |
| Buchheit, M. (2014). "Monitoring training status with HR measures." _Frontiers in Physiology_, 5, 73.                                                                                                                          | Level 3–4      | 10–15% deviation threshold, RHR as modulator          |
| Saw, A.E., Main, L.C., & Gastin, P.B. (2016). "Monitoring the athlete training response: subjective self-reported measures outperform commonly used objective measures." _British Journal of Sports Medicine_, 50(5), 281–291. | Level 3        | Subjective monitoring weight justification            |
| Meeusen, R. et al. (2013). "Prevention, diagnosis, and treatment of the overtraining syndrome: ECSS/ACSM joint consensus statement." _Medicine & Science in Sports & Exercise_, 45(1), 186–205.                                | Level 1        | Overreaching risk classification                      |
| Kellmann, M. & Kallus, K.W. (2001). _Recovery-Stress Questionnaire for Athletes._ Human Kinetics.                                                                                                                              | Level 3–5      | Psychological stress dimension; subjective monitoring |
| Walker, M. (2017). _Why We Sleep._ Scribner.                                                                                                                                                                                   | Level 5        | Sleep architecture targets (SWS/REM percentages)      |
| Van Dongen, H.P.A. et al. (2003). "The cumulative cost of additional wakefulness." _Sleep_, 26(2), 117–126.                                                                                                                    | Level 2        | Sleep debt thresholds; non-linear impairment          |
| Foster, C. et al. (1998). "Monitoring training in athletes with reference to overtraining syndrome." _Medicine & Science in Sports & Exercise_, 30(7), 1164–1168.                                                              | Level 5        | Training monotony, load strain                        |
| Noakes, T. (1991). _Lore of Running._ 3rd ed.                                                                                                                                                                                  | Level 5        | RHR +5 bpm threshold                                  |
| Fullagar, H.H.K. et al. (2015). "Sleep and athletic performance: the effects of sleep loss on exercise performance." _Sports Medicine_, 45(2), 161–186.                                                                        | Level 3–4      | Sleep stage accuracy from optical sensors             |
| Jarchi, D. et al. (2017). "A review on accelerometry-based gait analysis." _IEEE Reviews in Biomedical Engineering_, 11, 177–194.                                                                                              | Level 2–3      | Wrist PPG vs ECG HRV correlation                      |
| AASM (2015). "Recommended amount of sleep for a healthy adult." _Journal of Clinical Sleep Medicine_, 11(6), 591–592.                                                                                                          | Level 1        | Sleep duration target                                 |
