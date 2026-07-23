# SHARPIT — Training Stress Model v1

> **Status:** Design specification. No implementation yet.
> **Model ID:** `training-stress-v1`
> **Replaces:** `src/lib/training-load.ts`, `src/lib/analytics.ts` (PMC computation),
> and TSS derivation logic scattered across `activity-analysis.ts`
> **Scientific methodology:** follows `knowledge/scientific-methodology.md`
> **Consults:** ADR-001 (PMC time constants), ADR-002 (cross-sport TSS)

---

## 0. How to Read This Document

This document follows the same structure as `docs/models/RECOVERY_MODEL.md`,
which is the reference implementation for all SHARPIT inference models.

The Training Stress Model answers two distinct questions:

1. **Session-level:** How much physiological stress did this specific session produce,
   and what kind of stress?
2. **Window-level:** Where does the athlete's fitness, fatigue, and injury risk stand
   today, given their recent training history?

These are conceptually related but algorithmically separate. The model handles both.

A critical design constraint: **this model is the primary data provider to all other
inference models.** Recovery, Adaptation, Risk, and Performance Forecast models all
consume outputs from Training Stress. Any error here propagates everywhere.

---

## 1. Purpose

The Training Stress Model produces SHARPIT's **canonical** quantification of training
stress at two time granularities:

**Per session:** the magnitude, type, and quality of physiological perturbation
caused by a single training session.

**Per training day (window):** the accumulated fitness load, acute fatigue burden,
chronic fitness base, and load trajectory over time — the inputs to all downstream
inference and decision-making.

Its outputs update the `FitnessState` and `LoadState` dimensions of the Athlete State
in the Digital Twin, and produce the Signals consumed by the Recovery Model,
Risk Model, and Decision Engine.

The model does NOT:

- Compute performance predictions (those belong to the Performance Forecast Model).
- Prescribe training targets (that belongs to the Decision Engine + Planning Model).
- Measure recovery from the stress it quantifies (that belongs to the Recovery Model).
- Diagnose overtraining syndrome (that requires clinical assessment — SHARPIT can
  only detect patterns consistent with overreaching trajectory).

---

## 2. What "Training Stress" Means in SHARPIT

Training stress is the **quantified magnitude of homeostatic disruption** caused by a
training stimulus. It has three properties that the model must capture:

**1. Magnitude** — how much total work was done
**2. Type** — which physiological systems were primarily stressed
**3. Distribution** — how the intensity was distributed across the session

The core scientific insight: **two sessions with identical magnitude may produce
completely different adaptation stimuli depending on their type and distribution.**

```
Session A: 90 minutes at 65% FTP (pure aerobic)
Session B: 40 minutes including 4×8 min at 105% FTP (threshold/VO2max)

Both may produce ~85 TSS. But:
  A → mitochondrial density, fat oxidation, cardiac stroke volume (aerobic base)
  B → VO2max improvement, lactate threshold elevation, neuromuscular recruitment

The Decision Engine cannot make intelligent load recommendations
from TSS alone. It needs type and distribution.
```

This is the primary design failure of the existing implementation: TSS is the only
output. The Training Stress Model v1 corrects this by producing a structured stress
profile for every session.

---

## 3. Physiological Mechanisms Estimated

### 3.1 Cardiovascular Stress

**What it captures:** the cardiac and circulatory demand of the session.
The heart's total work — cardiac output × session duration — expressed relative
to the athlete's current aerobic capacity.

**Primary measurable proxy:** time in HR zones, total cardiac work integral.

**Why it matters:** cardiovascular stress drives aerobic adaptations (stroke volume,
capillarization, mitochondrial density) but also cardiovascular fatigue that the
Recovery Model must account for.

---

### 3.2 Metabolic Stress

**What it captures:** the energy system demand — primarily the aerobic/anaerobic
ratio of substrate utilization. High metabolic stress above lactate threshold
depletes glycogen, generates lactate, and stimulates different adaptations than
sub-threshold aerobic work.

**Primary measurable proxies:** time above lactate threshold (Z3+), normalized
power relative to FTP, HR drift (as a marker of glycolytic-to-oxidative shift
within a session).

**Why it matters:** glycogen depletion is the primary acute limiting factor in
endurance performance and a major recovery variable the Recovery Model cannot
directly observe. The Training Stress Model provides the best available estimate
through accumulated metabolic stress.

---

### 3.3 Mechanical/Neuromuscular Stress

**What it captures:** the tissue loading and motor unit recruitment demands —
impact forces (running), resistance forces (strength, climbing), eccentric muscle
damage (downhill running, plyometrics).

**Primary measurable proxies:** sport type (running carries 3–7× more ground
reaction force per joule than cycling), elevation gain, session duration.

**Why it matters:** mechanical stress is the primary driver of running injuries
and strength adaptation. It is NOT correlated with cardiovascular TSS — a slow
30-km trail run may have low cardiovascular demand but catastrophic mechanical
stress if the athlete is undertrained for running volume. This is the primary
limitation of the single-PMC approach (ADR-002).

**Observable in v1:** sport type, elevation, duration, training frequency.
Ground reaction force and true eccentric loading are not observable without
dedicated force measurement hardware.

---

### 3.4 Neural Stress

**What it captures:** central nervous system fatigue from high-intensity, high-skill,
or high-coordination work. Sprint work, maximal efforts, and technical-skill
sessions (gymnastics, strength neuromuscular) generate disproportionate CNS demand
relative to their cardiovascular cost.

**Observable in v1:** indirectly, through session type classification.
True CNS fatigue requires performance testing (e.g., reaction time, jump height)
not available in consumer wearables.

---

## 4. The Fundamental TSS Problem

### 4.1 The FTP Dependency Loop

TSS requires FTP. FTP is a capability of the athlete, estimated by the Performance
Capability Model. The Performance Capability Model requires historical training data
to estimate FTP. This creates a circular dependency:

```
Training Stress Model needs FTP
  → FTP comes from Digital Twin (Performance Capability dimension)
  → Digital Twin.capabilities.aerobic.ftp is updated by Performance Capability Model
  → Performance Capability Model is not yet implemented
```

**Resolution for v1:**

The Digital Twin's `FTP` is seeded from:

1. **Athlete self-declaration** at onboarding (primary source for v1).
2. **Best-effort extraction** from power data (average power in long-effort sessions
   as a conservative lower-bound estimate).
3. **Population estimate** as cold-start: FTP ≈ 2.5 × (body weight in kg) watts
   (Friel 2009 — Level 5, ±30% accuracy). Used ONLY when no other source exists.

The Training Stress Model always reads FTP from `athleteState.capabilities.aerobic.ftp`.
When FTP is updated by the Performance Capability Model, the Training Stress Model
DOES NOT retroactively recompute historical TSS. Historical TSS is immutable once
computed. Only future sessions use the updated FTP. This is documented as scientific
debt (SD-011).

### 4.2 Source TSS vs. Canonical TSS

Source platforms (Garmin, Strava) provide their own TSS estimates stored as
`sourceProvidedStress` on Session Observations. SHARPIT's canonical TSS is
computed independently by this model.

**The canonical TSS is always preferred.** Source TSS is retained for cross-validation
and audit (to flag systematic divergence between SHARPIT and source estimates).

**Rationale:** Garmin's TSS uses their proprietary FTP estimate (which may differ
from the athlete's actual FTP) and their proprietary HR-to-TSS algorithm (opaque).
SHARPIT's canonical TSS uses the athlete's verified FTP and a published algorithm.

---

## 5. Algorithm Specification — Session-Level

### 5.1 TSS Computation Hierarchy

SHARPIT computes canonical TSS using the highest-confidence method available:

```
TIER 1 — Power-based (Coggan): when powerData.quality = 'MEASURED_DIRECT'
TIER 2 — TRIMP-based HR (Bangsbo): when hrData available, no MEASURED_DIRECT power
TIER 3 — Pace-based (Riegel-adjusted): when pace available, no HR, running/swimming only
TIER 4 — RPE-based: when only subjective RPE available for session
TIER 5 — Duration × sport factor: last resort when no other input
```

The method used is recorded in the Feature as part of `algorithmId`.
Each tier's confidence contribution is listed below.

---

#### Tier 1 — Power-based TSS (Coggan & Allen, 2006)

**Applicable when:** `session.powerData.quality = 'MEASURED_DIRECT'` (power meter)

```
NP  = session.powerData.normalizedPower
IF  = NP / athleteFTP
TSS = (durationSec × NP × IF) / (athleteFTP × 3600) × 100
```

If NP is not available (e.g., power meter without stream data):

```
IF  = session.powerData.avgWatts / athleteFTP
TSS = (durationSec × IF²) / 3600 × 100
```

**Reference:** Coggan & Allen (2006) — Level 5
**Confidence contribution:** 0.90
**Systematic bias:** NP formula was empirically derived; 4th-power exponent is not
physiologically derived. Errors typically < ±5% for steady-state; up to ±15% for
highly variable efforts (Coggan 2003).

---

#### Tier 2 — TRIMP-based HR approximation (Bangsbo, 1994)

**Applicable when:** `session.hrData` available, no MEASURED_DIRECT power

The continuous TRIMP formula requires HR stream data (5-min segment averages).
When only average HR is available, the single-segment approximation is used:

**With HR stream (5-min segments):**

```
For each segment i:
  ΔHR_ratio_i = (avgHR_i − HRrest) / (HRmax − HRrest)
  TRIMP_i     = 5 × ΔHR_ratio_i × e^(1.92 × ΔHR_ratio_i)

totalTRIMP = Σ TRIMP_i

// Normalize to TSS scale: 1h at LTHR ≈ 100 TSS
// At LTHR: ΔHR_ratio ≈ (LTHR - HRrest) / (HRmax - HRrest)
LTHR_ratio = (LTHR − HRrest) / (HRmax − HRrest)
normFactor = 60 × LTHR_ratio × e^(1.92 × LTHR_ratio)

TSS_trimp = (totalTRIMP / normFactor) × 100
```

**Where:**

- `HRrest = recovery.rhrAbsolute` (from Digital Twin, 14-day rolling average)
- `HRmax = athleteState.capabilities.cardiac.maxHr` (from athlete profile or estimated)
- `LTHR = HRmax × 0.90` (default approximation — Level 5, Friel 2009)

**With average HR only (no stream):**

```
ΔHR_ratio = (avgHR − HRrest) / (HRmax − HRrest)
TSS_hr    = (durationSec / 3600) × (ΔHR_ratio × e^(1.92 × ΔHR_ratio) / normFactor) × 100
```

**Reference:** Bangsbo J. (1994) — Level 5; Stagno et al. (2007) — Level 3
**Confidence contribution:** 0.70 (optical HR), 0.80 (chest strap HR)
**Systematic bias:** HR lag underestimates TRIMP at the start of intense intervals.
Cardiac drift overestimates TRIMP late in long aerobic sessions. Net error: ±20–25%.

---

#### Tier 3 — Pace-based estimation (running and swimming only)

**Applicable when:** `session.paceData` available, no HR, sportType ∈ {RUN, TRAIL_RUN, SWIM}

```
// Threshold pace from athlete profile (min/km or min/100m)
paceIF  = (thresholdPace / avgPace) ^ 1.06   // Riegel exponent
TSS_pace = (durationSec × paceIF²) / 3600 × 100
```

The Riegel exponent (1.06) accounts for the non-linearity of physiological cost
with speed — running faster than threshold is proportionally more costly than
the pace ratio alone suggests.

**Applicable only to run and swim.** Pace-TSS for cycling is not supported (cycling
pace is too dependent on terrain, wind, and drafting to be a reliable intensity proxy).

**Reference:** Riegel (1977) — Level 5; Friel (2009) — Level 5
**Confidence contribution:** 0.55
**Systematic bias:** does not capture intensity distribution. A 10km at 6:00/km and
a 10km with 3km at 4:30/km + 7km at 6:30/km produce the same average pace but
very different physiological cost. Error: ±25–35%.

---

#### Tier 4 — RPE-based estimation

**Applicable when:** `session.rpe` available (from SubjectiveObservation linked to session)

Foster's session RPE method (Foster et al. 2001):

```
sessionRPE = rpe × durationMin    // "Training Load" in Foster's terminology
normFactor = 10 × 60              // reference: 1h at maximum effort = 600
TSS_rpe    = (sessionRPE / normFactor) × 100
```

**Implementation:** `computeRpeTss` / `fosterSessionLoad` in
`src/core/features/extractors/session-extractor.ts` (aligned with this formula).
`fosterSessionLoad` is always populated when RPE is present, even if a higher-tier
method wins the TSS cascade (external vs internal load).

**Reference:** Foster et al. (2001) — Level 3
**Confidence contribution:** 0.45
**Systematic bias:** subjective RPE is consistent within individuals but not
between them. RPE-TSS for the same athlete over time is more reliable than
cross-athlete comparison. Error: ±30%.

---

#### Tier 5 — Duration × sport factor (last resort)

**Applicable when:** no HR, no power, no pace, no RPE.

```
SPORT_FACTOR = {
  RUN:       1.00,   // Friel (2009) approximation
  TRAIL_RUN: 1.10,   // +10% for elevation and terrain penalty
  BIKE:      0.85,   // lower cardiovascular demand per minute than running
  SWIM:      0.80,   // upper body dominant; HR typically lower
  STRENGTH:  0.60,   // cardiovascular demand is intermittent
  MTB:       0.90,
  OPEN_WATER:0.80,
  TRIATHLON: 1.00,   // mix — default to run factor
  YOGA:      0.30,
  OTHER:     0.70
}

TSS_estimated = (durationSec / 60) × SPORT_FACTOR[sportType]
```

**Reference:** Friel (2009) — Level 5; values are approximate.
**Confidence contribution:** 0.25
**Systematic bias:** completely ignores intensity distribution. A 60-min Z2 run
and a 60-min anaerobic track session produce identical estimates. Error: ±40–50%.

---

### 5.2 Session Stress Profile

Beyond scalar TSS, the model produces a structured **Session Stress Profile** for
every session. This is the primary improvement over the existing implementation.

```typescript
type SessionStressProfile = {
  canonicalTss: number; // computed by tier hierarchy above
  tssComputationTier: 1 | 2 | 3 | 4 | 5;
  intensityFactor: number | null; // IF = NP / FTP (null if tier ≥ 3)
  sessionType: SessionType; // classification below
  stressDistribution: StressDistribution | null;
  mechanicalStressFactor: number; // 1.0 baseline; >1.0 for high-impact sports
  estimatedGlycolytic: number | null; // 0–1, fraction of anaerobic contribution
};

type SessionType =
  | 'RECOVERY' // IF < 0.75 or RPE < 4; minimal physiological disturbance
  | 'AEROBIC_BASE' // IF 0.75–0.90; sub-threshold aerobic work (Z1–Z2)
  | 'TEMPO' // IF 0.90–0.97; lactate threshold work (Z3)
  | 'THRESHOLD' // IF 0.97–1.03; at or near FTP (Z4)
  | 'VO2MAX' // IF 1.03–1.20; above threshold (Z4–Z5)
  | 'ANAEROBIC' // IF > 1.20; anaerobic capacity and sprint (Z5+)
  | 'NEUROMUSCULAR' // strength, power; not classifiable by IF
  | 'MIXED'; // time distribution across ≥3 zones without dominant zone

type StressDistribution = {
  z1MinPercent: number; // recovery zone fraction
  z2MinPercent: number; // endurance zone fraction
  z3MinPercent: number; // tempo/sweet-spot fraction
  z4MinPercent: number; // threshold fraction
  z5MinPercent: number; // VO2max/anaerobic fraction
  polarizationIndex: number; // (Z1+Z2+Z5) / totalMin — Seiler 80/20 reference
};
```

**SessionType classification algorithm:**
Priority order:

1. If `sportType = STRENGTH or YOGA`: → `NEUROMUSCULAR` or `RECOVERY` respectively
2. If `IF < 0.75` or `RPE < 4`: → `RECOVERY`
3. If stream data available: classify by dominant zone (>40% of session time)
4. If only average HR/IF: use IF bands above
5. If insufficient data for classification: → `MIXED`

**Mechanical Stress Factor:**

```
MECHANICAL_STRESS_FACTOR = {
  RUN:       1.40,  // running: ~7× ground reaction force vs cycling per joule
  TRAIL_RUN: 1.60,  // additional eccentric demand on descents
  BIKE:      1.00,  // baseline reference
  SWIM:      0.85,  // no impact loading; upper body primary
  STRENGTH:  1.30,  // eccentric muscle damage, joint loading
  MTB:       1.20,  // vibration, technical terrain, braking forces
  OPEN_WATER:0.85,
  TRIATHLON: 1.30,  // run leg dominates mechanical stress in triathlon
  YOGA:      0.80,
  OTHER:     1.00
}
```

**Rationale for mechanical stress factor:** The factor represents the ratio of
musculoskeletal stress to cardiovascular stress relative to cycling. Running
produces 3–7× higher ground reaction forces per unit of cardiovascular work
(Hreljac 2004 — Level 3). This factor is used only for sport-specific injury
risk computation — NOT for global TSS. It does not modify the canonical TSS.
(Preserves ADR-002 single-PMC decision while enabling sport-specific risk assessment.)

---

## 6. Algorithm Specification — Window-Level

### 6.1 Performance Management Chart (PMC)

**Reference:** ADR-001 (τ_ctl = 42, τ_atl = 7), Coggan (2003)

The PMC is recomputed after every new session TSS is produced.

```
CTL(t) = CTL(t-1) + [TSS(t) − CTL(t-1)] / 42
ATL(t) = ATL(t-1) + [TSS(t) − ATL(t-1)] / 7
TSB(t) = CTL(t) − ATL(t)
```

Where `TSS(t) = 0` for rest days.

**Implementation notes:**

- CTL and ATL are computed as continuous time series, one value per day.
- The series is initialized at `CTL = 0, ATL = 0` for new athletes (cold-start
  problem — see Section 10).
- When a historical session is backfilled, the entire PMC series is recomputed
  from the first session date. This is expensive but necessary for consistency.
- PMC is computed over the canonical TSS. Not over source-provided TSS.

---

### 6.2 Acute:Chronic Workload Ratio (ACWR)

**Reference:** Gabbett (2016), Carey et al. (2017) — Level 3; ADR-001

The rolling average ACWR (current implementation) is retained for v1.
The EWMA variant (Malone et al. 2017) is scheduled for v2 (SD-012).

```
acuteLoad  = Σ(TSS over last 7 days)                // daily sum
chronicLoad = Σ(TSS over last 42 days) / 6           // average weekly load
acwr       = acuteLoad / chronicLoad
```

**Deload artifact correction (v1 approximation):**
ACWR produces systematic false positives after planned deload weeks: the first
training week following a deload spikes ACWR even at normal absolute load.

Detection: if the preceding 7 days' load drops below 50% of CTL × 7, a
`PLANNED_DELOAD` flag is set. When this flag is active:

- ACWR alert thresholds are raised by +0.2 (1.5 → 1.7 for warning, 1.8 → 2.0 for danger).
- The `InjuryRiskByLoad` signal severity is downgraded by one level.

**Cross-sport load isolation (injury risk only):**
Per ADR-002, the global ACWR uses combined TSS. However, for sport-specific
injury risk computation, per-sport ACWRs are computed in parallel:

```
ACWR_run  = Σ(runTss last 7d) / (Σ(runTss last 42d) / 6)
ACWR_bike = Σ(bikeTss last 7d) / (Σ(bikeTss last 42d) / 6)
```

These per-sport ACWRs are used ONLY for the `SportSpecificInjuryRisk` signal.
The global ACWR is used for all other purposes.

**The ACWR controversy (Impellizzeri et al. 2019):**
A critical review by Impellizzeri et al. (2019 — Level 3) challenged ACWR's
validity, arguing that the ratio form introduces mathematical artifacts (the
ratio is not independent of its components). The EWMA variant partially addresses
this. The fundamental concern about ratio artifacts is documented as SD-013.
SHARPIT retains ACWR as a screening tool while acknowledging this limitation.

---

### 6.3 Load Monotony and Load Strain

**Reference:** Foster et al. (1998) — Level 5

```
dailyLoads     = [TSS(d-6), TSS(d-5), ..., TSS(d)]  // 7-day window
loadMonotony   = mean(dailyLoads) / stdDev(dailyLoads)
loadStrain     = acuteLoad × loadMonotony
```

**Interpretation:** high monotony (low day-to-day variation) impairs adaptation
(Foster et al. 1998). A monotony > 2.0 with high acute load is a recovery impairment
signal. This feeds into the Recovery Model's Load Context dimension.

**Known limitation:** monotony is undefined when stdDev = 0 (all training days
identical load). Guard: if stdDev < 0.1, monotony = mean(dailyLoads) / 0.1.

---

### 6.4 Periodization Phase Detection

The model classifies the athlete's current training phase based on CTL trajectory
and TSB pattern. This is used by the Decision Engine to contextualize recommendations.

```
PeriodizationPhase:
  BASE        → CTL increasing steadily (> +0.5 CTL/week); TSB negative; ACWR 0.9–1.2
  BUILD       → CTL increasing rapidly (> +1.0 CTL/week); TSB deeply negative; ACWR 1.2–1.5
  PEAK        → CTL stable or slight decline; TSB near zero or slightly positive
  TAPER       → CTL declining deliberately; TSB rapidly improving (> +3/day)
  DELOAD      → Sharp TSS reduction (< 60% of previous week); TSB recovering
  TRANSITION  → CTL declining without taper structure; likely seasonal break
  UNSTRUCTURED → insufficient session data to classify
```

**Algorithm:**

```
ctlTrend  = (CTL_today − CTL_14dAgo) / 14          // CTL/day
tsbTrend  = (TSB_today − TSB_7dAgo) / 7             // TSB/day
loadRatio = acuteLoad / (CTL × 7)                   // current week vs fitness

Phase detection priority (first match wins):
  1. loadRatio < 0.60 AND TSB improving → DELOAD
  2. ctlTrend > +0.07 AND TSB < -20 AND acwr > 1.20 → BUILD
  3. ctlTrend > +0.04 AND TSB < -10 → BASE
  4. ctlTrend < -0.04 AND tsbTrend > +0.40 → TAPER
  5. ctlTrend between -0.04 and +0.04 AND TSB near 0 → PEAK
  6. ctlTrend < -0.04 AND TSB not improving → TRANSITION
  7. → UNSTRUCTURED
```

**Evidence level:** Level 5 — practitioner consensus (Friel 2009, Bompa & Haff 2009).
Phase thresholds are indicative, not precise.

---

## 7. Internal Signals (Ephemeral)

The Training Stress Model produces the following Signals during the inference pass.
Per ADR-004: NOT persisted independently — embedded verbatim in Decision Records.

```typescript
type TrainingStressSignals = {
  // Session-level
  sessionType: SessionType; // classification of completed session
  newFatigueContribution: 'MINIMAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';

  // Window-level fitness and fatigue
  fitnessTrajectory: 'BUILDING' | 'STABLE' | 'DECLINING' | 'LOST';
  fatigueLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' | 'CRITICAL';
  formState: 'PEAKED' | 'TRAINING' | 'FRESH' | 'OVERLOADED';

  // Injury risk
  injuryRiskByLoad: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  sportSpecificRisk: Partial<Record<SportType, 'LOW' | 'ELEVATED' | 'HIGH'>>;

  // Structural patterns
  overreachingWarning: boolean; // CTL declining + ATL high + autonomic suppression
  undertrainingWarning: boolean; // CTL declining for ≥14 days without planned deload
  loadMonotonyWarning: boolean; // monotony > 2.0 for ≥5 consecutive days
  periodizationPhase: PeriodizationPhase;
};
```

### Signal computation rules

**`FitnessTrajectory`:**

```
BUILDING  → ctlTrend > +0.04 CTL/day (sustained over 7 days)
STABLE    → ctlTrend ∈ [-0.02, +0.04]
DECLINING → ctlTrend < -0.02 for ≥7 days (unplanned decline)
LOST      → ctlTrend < -0.05 for ≥21 days (detraining territory)
```

**`FatigueLevel`:**

```
CRITICAL  → TSB < -40 (Coggan Level 5 consensus)
VERY_HIGH → TSB -30 to -40
HIGH      → TSB -20 to -30
MODERATE  → TSB -10 to -20
LOW       → TSB > -10
```

**`FormState`:**

```
PEAKED    → TSB > +15 (tapered, race-ready)
FRESH     → TSB 0 to +15
TRAINING  → TSB -10 to 0 (optimal training zone)
OVERLOADED → TSB < -10 (significant fatigue accumulation)
```

**`InjuryRiskByLoad` (global ACWR):**

```
CRITICAL  → ACWR > 2.0
HIGH      → ACWR 1.8–2.0
ELEVATED  → ACWR 1.5–1.8
MODERATE  → ACWR 1.3–1.5
LOW       → ACWR < 1.3
```

**`OverreachingWarning`:**
Triggered when ALL three conditions are met simultaneously:

- `fitnessTrajectory = DECLINING` for ≥7 days
- `fatigueLevel ∈ {HIGH, VERY_HIGH, CRITICAL}`
- Recovery Model reports `autonomicBalance ∈ {SUPPRESSED, CRITICALLY_SUPPRESSED}`

This cross-model dependency represents the convergence signal for early
non-functional overreaching detection (Meeusen et al. 2013).

---

## 8. Digital Twin Updates

The Training Stress Model updates two dimensions of `AthleteState`:

### 8.1 FitnessState

```typescript
type FitnessState = {
  ctl: number; // Chronic Training Load (fitness)
  atl: number; // Acute Training Load (fatigue)
  tsb: number; // Training Stress Balance (form)
  acwr: number; // global ACWR
  acwr_run: number | null;
  acwr_bike: number | null;
  loadMonotony: number; // 7-day monotony coefficient
  loadStrain: number; // weeklyLoad × monotony
  periodizationPhase: PeriodizationPhase;
  ctlTrend: number; // CTL/day, 14-day rolling
  peakCtl: number; // highest CTL ever recorded (lifetime)
  currentCtlVsPeak: number; // ctl / peakCtl (0–1; 1.0 = personal best fitness)
  fitnessTrajectory: FitnessTrajectory;
  formState: FormState;
  fatigueLevel: FatigueLevel;
  confidence: number;
  modelId: 'training-stress-v1';
  computedAt: Date;
};
```

### 8.2 SessionStressRecord (appended, not replaced)

For each session, a `SessionStressRecord` is appended to the Digital Twin's
training history:

```typescript
type SessionStressRecord = {
  sessionObsId: string; // reference to source Observation
  trainingDayId: string;
  canonicalTss: number;
  tssComputationTier: 1 | 2 | 3 | 4 | 5;
  sessionType: SessionType;
  mechanicalStressFactor: number;
  sportType: SportType;
  durationSec: number;
  intensityFactor: number | null;
  stressDistribution: StressDistribution | null;
  confidence: number;
};
```

This record is the basis for all window computations. It is immutable once written.

---

## 9. Confidence Calculation

### 9.1 Session-level confidence

```
confidence = tssMethodConfidence × hrDataQualityModifier × ftpMaturityModifier

tssMethodConfidence:
  Tier 1 (power direct):   0.90
  Tier 2 (TRIMP HR):       0.70 (optical) / 0.80 (chest strap)
  Tier 3 (pace):           0.55
  Tier 4 (RPE):            0.45
  Tier 5 (duration):       0.25

hrDataQualityModifier:
  POST_EXERCISE_CONTAMINATION flag: × 0.70
  ESTIMATED_FROM_HR flag:           × 0.85
  No HR data at all:               × 1.00 (tier determined separately)

ftpMaturityModifier:
  FTP from self-declaration (verified < 6 months): × 1.00
  FTP from self-declaration (> 6 months old):      × 0.85
  FTP from population estimate:                    × 0.60
```

### 9.2 Window-level confidence

```
windowConfidence = mean(sessionConfidences in window) × completenessModifier

completenessModifier:
  All days in window have data:   × 1.00
  <10% missing days:              × 0.90
  10–25% missing days:            × 0.75
  25–50% missing days:            × 0.60
  >50% missing days:              × 0.40
```

---

## 10. Cold Start Behavior

### Phase 1 — No history (0 sessions)

```
ctl = 0, atl = 0, tsb = 0
fitnessTrajectory = 'UNSTRUCTURED'
formState = 'FRESH'   // technically accurate — but misleading for returning athletes
confidence = 0.00     // PMC is meaningless at zero history
```

**The returning athlete problem:** an athlete returning after injury or seasonal break
has real fitness that the model initializes at zero. CTL = 0 significantly overstates
freshness (TSB = 0 looks like "no accumulated fatigue") and ACWR will spike dangerously
on the first training week.

**v1 mitigation:** at onboarding, the athlete can declare:

- `returningFromBreak: boolean`
- `priorFitnessEstimate: number` (estimated CTL before break)
- `breakDurationWeeks: number`

If declared, CTL is initialized at:

```
ctlEstimated = priorFitnessEstimate × e^(-breakDurationWeeks × 7 / 42)
```

(Exponential decay using τ_ctl — the fitness decay follows the same constant as accumulation.)

### Phase 2 — Sparse history (1–6 sessions)

PMC series begins. CTL and ATL are computed but confidence is very low.
ACWR is unreliable (chronic window is nearly empty).

```
confidence ≈ 0.20–0.40
ACWR flagged: 'COLD_START_ACWR_UNRELIABLE'
```

### Phase 3 — Partial history (1–5 weeks, 5–20 sessions)

PMC begins to stabilize. ACWR becomes partially meaningful (chronic window
still shorter than τ_ctl = 42 days). Confidence improves as window fills.

### Phase 4 — Full operation (≥6 weeks, ≥24 sessions)

CTL and ATL windows are fully populated. All signals operational.
Confidence determined by data quality, not data absence.

---

## 11. Failure Modes

### 11.1 FTP Staleness

An athlete's FTP changes over a training season (+10–30% improvement from base
to peak). If FTP is not updated, all TSS values become systematically biased.

**Detection:** if a Tier-1 power session produces an IF consistently > 1.10 or
consistently < 0.80 (indicating the athlete is regularly above or below FTP by >10%),
a `FTP_POSSIBLY_STALE` flag is raised and communicated to the athlete.

**v1 mitigation:** flag only. Automatic FTP estimation deferred to Performance
Capability Model (v2).

### 11.2 Session Splitting

A triathlete completes a 4-hour brick workout (bike + run). GPS may record it
as one session or two depending on the platform. A single 4-hour session
underestimates the mechanical stress of the run leg. Split sessions accurately
represent the sport-specific stress.

**v1 behavior:** no automatic session splitting. If source provides split activities,
each is processed independently. If one combined activity is provided, mechanical
stress factor defaults to `TRIATHLON` (intermediate approximation).

### 11.3 Strength Training Load Quantification

Strength TSS is the most poorly estimated category in v1. Duration × 0.60
completely ignores:

- Intensity (% of 1RM)
- Volume (sets × reps)
- Eccentric vs. concentric emphasis
- Rest interval duration

This is documented as SD-014. For v1, strength training load is deliberately
underweighted in PMC to avoid polluting the aerobic fitness signal. The
`mechanicalStressFactor` for STRENGTH remains available for injury risk purposes.

### 11.4 ACWR After Illness or Forced Rest

An athlete who rests 10–14 days due to illness returns with low ATL and zero
recent TSS. The first training week will spike ACWR dramatically.

**Detection:** if `illnessRisk = HIGH` was active in the preceding 14 days
AND current ACWR > 1.5, the `InjuryRiskByLoad` signal is flagged as
`ILLNESS_RETURN_ARTIFACT` and thresholds are raised +0.3.

---

## 12. Uncertainty Sources

| Source                                  | Impact                        | Mitigation in v1                                  |
| --------------------------------------- | ----------------------------- | ------------------------------------------------- |
| FTP accuracy (±5–15% typical)           | TSS ±10–25%                   | FTP staleness detection; source cross-validation  |
| HR-based TSS (TRIMP approximation)      | TSS ±20–25%                   | Tier 2 confidence 0.70; optical HR flag           |
| Cross-sport TSS inaccuracy              | PMC ±10–30% for multisport    | Per-sport ACWR; mechanical stress factor          |
| Population time constants (τ)           | CTL/ATL response curve        | ADR-001 accepted; individual calibration in v2    |
| Deload artifact in ACWR                 | False positive rate ↑         | PLANNED_DELOAD detection; threshold adjustment    |
| ACWR ratio artifact (Impellizzeri 2019) | Systematic bias in ratio form | SD-013; EWMA planned for v2                       |
| Cold start CTL = 0                      | TSB inflated; ACWR volatile   | Returning athlete declaration; CTL initialization |
| Training block transitions              | Phase detection lag           | 7–14 day detection lag is inherent                |
| Glycogen state (unobservable)           | True recovery capacity        | Accepted gap — metabolic stress estimated only    |

---

## 13. Interaction With Other Models

### 13.1 → Recovery Model

**Data provided:** `load.acwr`, `load.loadMonotony`, `load.acuteLoad`, `periodizationPhase`

The Recovery Model's Load Context dimension is entirely sourced from this model.
When `FatigueLevel = CRITICAL`, the Recovery Model reduces `readinessScore` proportionally.

**Cross-model signal:** `OverreachingWarning` requires simultaneous input from the
Training Stress Model (fitness declining + fatigue high) AND the Recovery Model
(autonomic suppression). Neither model can detect overreaching alone.

### 13.2 → Decision Engine

**Data provided:** `formState`, `fitnessTrajectory`, `injuryRiskByLoad`,
`periodizationPhase`, `overreachingWarning`

The Decision Engine uses `formState` as the primary training-readiness signal from
the load perspective. `injuryRiskByLoad` can override training recommendations
regardless of recovery state.

### 13.3 → Performance Forecast Model (future)

**Data provided:** CTL, ATL, TSB series history; session type distribution;
peak CTL; CTL trend.

The Performance Forecast Model will use CTL trajectory and TSB to predict
performance peaks and estimate optimal race timing (tapering simulations).

### 13.4 → Adaptation Model (future)

**Data provided:** session type distribution over rolling windows.

The Adaptation Model will assess whether the training stress distribution
(aerobic base vs. threshold vs. VO2max work) aligns with the athlete's
sport and goal requirements. It requires knowing the TYPES of stress
the athlete is accumulating — hence the importance of the `sessionType`
and `stressDistribution` outputs.

### 13.5 ← Performance Capability Model (future, bidirectional)

**Receives:** updated `athleteFTP`, `maxHr`, `lactateThresholdHR`.

When the Performance Capability Model updates FTP, the Training Stress Model
must flag that future session TSS will be computed with the new FTP. Historical
TSS is NOT retroactively recalculated (SD-011).

---

## 14. Known Limitations and Scientific Debt

### SD-011: Historical TSS not retroactively recalculated on FTP update

**Debt:** when FTP changes, all historical TSS values computed with the old FTP
are technically incorrect. CTL/ATL computed from mixed-FTP TSS series is
systematically biased.

**Impact:** potentially significant for athletes who improve FTP by >15% over a season.
Historical CTL overstates fitness relative to new FTP.

**Target:** v2 — optional full historical TSS recalculation when FTP is updated,
with athlete consent (expensive computation — may require background job).

### SD-012: Rolling ACWR instead of EWMA ACWR

**Debt:** Malone et al. (2017) demonstrated EWMA-based ACWR is more stable and
produces fewer false positives after deload weeks than rolling average ACWR.

**Impact:** moderate false-positive rate during normal periodization transitions.

**Target:** v1.1 — implement EWMA ACWR alongside rolling ACWR for comparison.
Replace rolling with EWMA when validation confirms equivalence.

### SD-013: ACWR ratio artifact (Impellizzeri et al. 2019)

**Debt:** Impellizzeri et al. (2019) demonstrated that the ACWR ratio form
introduces mathematical artifacts — the ratio is algebraically constrained by
its components in ways that produce spurious correlations with injury.

**Impact:** ACWR's predictive validity may be lower than the original studies suggested.

**Target:** v2 — evaluate alternative formulations (differential load, load index
approaches). SHARPIT continues using ACWR for now as it remains the most
widely validated and communicable load screening tool, despite the controversy.

### SD-014: Strength training load quantification

**Debt:** duration × 0.60 is a gross approximation for strength sessions.
Volume-load (sets × reps × weight) is a validated strength training load measure
but requires data not currently captured in observations.

**Impact:** strength training load is significantly underestimated in PMC,
particularly for athletes with high-volume strength programs.

**Target:** v2 — capture `sets`, `reps`, `weightKg` in strength observations and
implement RPE-based session load (Foster et al. 2001) as Tier 4 equivalent
for strength.

### SD-015: No per-sport PMC

**Debt:** ADR-002 accepted a single combined PMC. For triathlon athletes (or any
multisport athlete), sport-specific fitness tracking would be more accurate.

**Impact:** triathlon athletes may receive incorrect injury risk assessments
when run training forms only 20% of total load but running ACWR spikes.

**Target:** v2 — implement parallel per-sport PMC. Expose to UI as optional
"Sport-Specific Fitness" view.

### SD-016: No cadence-based neuromuscular fatigue estimation

**Debt:** cycling cadence decline during a session is a validated neuromuscular
fatigue indicator (Abbiss & Laursen 2005). Running stride length decline similarly
indicates neuromuscular fatigue. Neither is currently extracted.

**Target:** v2 — extract cadence and stride data from activity streams when available.

---

## 15. Versioning Strategy

Following the same versioning taxonomy as the Recovery Model:

```
training-stress-vN.M.P
  N = Major (algorithm replacement, new physiological mechanisms)
  M = Minor (parameter updates, new tier added)
  P = Patch (bug fixes, edge case handling)
```

**Planned versions:**

**v1.1.0:**

- EWMA ACWR implementation (alongside rolling — comparison period)
- `ILLNESS_RETURN_ARTIFACT` detection for ACWR post-illness
- `PLANNED_DELOAD` detection for ACWR false positives

**v2.0.0:**

- Individual time constant calibration (τ_ctl, τ_atl per athlete after 180 days data)
- EWMA ACWR replaces rolling ACWR (after validation period)
- Per-sport parallel PMC
- Strength session load: volume-load + RPE integration

**v3.0.0:**

- Banister individual parameter fitting (requires dedicated testing protocol)
- Non-linear PMC variant (Busso 2003) for highly trained athletes
- Neuromuscular fatigue index from cadence/stride streams

---

## 16. Scientific References

| Reference                                                                                                                                  | Evidence Level | Used For                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------ | -------------- | ------------------------------------------------ |
| Coggan, A.R. (2003). TrainingPeaks technical documentation.                                                                                | Level 5        | PMC time constants, TSS normalization            |
| Allen, H. & Coggan, A.R. (2006). _Training and Racing with a Power Meter._ VeloPress.                                                      | Level 5        | Power-based TSS, NP, IF formulas                 |
| Bangsbo, J. (1994). _Fitness Training in Football._ HO & Storm.                                                                            | Level 5        | TRIMP formula (continuous exponential)           |
| Stagno, K.M., Thatcher, R., & van Someren, K.A. (2007). "A modified TRIMP to quantify load." _Journal of Sports Sciences_, 25(6), 629–635. | Level 3        | TRIMP validation in team sports                  |
| Gabbett, T.J. (2016). "The training—injury prevention paradox." _BJSM_, 50(5), 273–280.                                                    | Level 3–4      | ACWR zones and injury risk thresholds            |
| Carey, D.L. et al. (2017). "Training loads and injury risk." _BJSM_, 51(16), 1215–1220.                                                    | Level 3        | ACWR high-risk threshold (>1.5)                  |
| Malone, S. et al. (2017). "The acute:chronic workload ratio." _JSMM_, 20(6), 561–565.                                                      | Level 3        | EWMA ACWR superiority over rolling               |
| Impellizzeri, F.M. et al. (2019). "Acute to chronic workload ratio: conceptual issues." _BJSM_, 53(16), 993–994.                           | Level 3        | ACWR ratio artifact and validity concerns        |
| Foster, C. et al. (1998). "Monitoring training in athletes." _Med Sci Sports Exerc_, 30(7), 1164–1168.                                     | Level 5        | Training monotony, load strain, RPE session load |
| Foster, C. et al. (2001). "A new approach to monitoring exercise training." _J Strength Cond Res_, 15(1), 109–115.                         | Level 3        | Session RPE as load measure (Tier 4)             |
| Meeusen, R. et al. (2013). "Prevention, diagnosis, and treatment of overtraining." _Med Sci Sports Exerc_, 45(1), 186–205.                 | Level 1        | Overreaching taxonomy; cross-model detection     |
| Riegel, P.S. (1977). "Athletic records and human endurance." _American Scientist_, 65(3), 285–290.                                         | Level 5        | Pace scaling exponent 1.06 (Tier 3)              |
| Hreljac, A. (2004). "Impact and overuse injuries in runners." _Med Sci Sports Exerc_, 36(5), 845–849.                                      | Level 3        | Running mechanical stress vs. cycling            |
| Seiler, K.S. & Tønnessen, E. (2009). "Intervals, thresholds, and long slow distance." _NSCA Coach_, 13(1), 32–53.                          | Level 5        | Polarization index reference (80/20)             |
| Friel, J. (2009). _The Triathlete's Training Bible._ 3rd ed. VeloPress.                                                                    | Level 5        | LTHR estimate, hrTSS, periodization phases       |
| Bompa, T. & Haff, G. (2009). _Periodization: Theory and Methodology of Training._ 5th ed.                                                  | Level 5        | Phase classification thresholds                  |

---

## 17. Required Features

> This section is part of the **progressive Feature Catalog** being built by
> specifying all inference models before designing the Feature Extraction Layer.
> All Feature names follow `knowledge/{category}.{name}` conventions from
> `docs/FEATURE_EXTRACTION.md`.

### Per-Session Features consumed

| Feature Name                           | Type                 | Source Observation        | Computation Tier                 |
| -------------------------------------- | -------------------- | ------------------------- | -------------------------------- |
| `session.powerData.normalizedPower`    | `number \| null`     | SESSION (MEASURED_DIRECT) | Tier 1                           |
| `session.powerData.avgWatts`           | `number \| null`     | SESSION                   | Tier 1 fallback                  |
| `session.powerData.quality`            | `ObservationQuality` | SESSION                   | Tier selection                   |
| `session.powerData.sourceComputedTss`  | `number \| null`     | SESSION                   | Cross-validation only            |
| `session.hrData.avgBpm`                | `number \| null`     | SESSION                   | Tier 2                           |
| `session.hrData.maxBpm`                | `number \| null`     | SESSION                   | HRmax validation                 |
| `session.hrData.quality`               | `ObservationQuality` | SESSION                   | Tier 2 confidence                |
| `session.durationSec`                  | `number`             | SESSION                   | All tiers                        |
| `session.sportType`                    | `SportType`          | SESSION                   | Sport factor, mech. stress       |
| `session.paceData.avgMinPerKm`         | `number \| null`     | SESSION                   | Tier 3                           |
| `session.paceData.distanceM`           | `number \| null`     | SESSION                   | Tier 3                           |
| `session.elevationM`                   | `number \| null`     | SESSION                   | Elevation stress                 |
| `session.timeInZones`                  | `number[5] \| null`  | SESSION (stream)          | Session type, distribution       |
| `session.aerobicLoadFactor`            | `number \| null`     | SESSION                   | Session type classification      |
| `session.anaerobicLoadFactor`          | `number \| null`     | SESSION                   | Session type classification      |
| `session.hrDriftPercent`               | `number \| null`     | SESSION                   | Glycolytic contribution estimate |
| `session.intensityFactor`              | `number \| null`     | SESSION                   | Session type, TSS Tier 1         |
| `session.sourceProvidedStress.value`   | `number \| null`     | SESSION                   | Cross-validation                 |
| `session.sourceProvidedStress.quality` | `string \| null`     | SESSION                   | Cross-validation trust           |

### Per-Session Subjective Features consumed

| Feature Name            | Type             | Source Observation             |
| ----------------------- | ---------------- | ------------------------------ |
| `session.subjectiveRpe` | `number \| null` | SUBJECTIVE (linked to session) |

### Window Features consumed (produced by Feature Extraction from sessions)

> Note: these window features are computed by the Feature Extraction Layer
> using the canonical TSS values previously produced by this model — a two-pass
> relationship. The model outputs TSS per session; the Feature Layer
> aggregates those into window features; those window features feed back
> into this model's window-level pass. This ordering must be enforced by the FeatureEngine.

| Feature Name             | Window    | Notes                                  |
| ------------------------ | --------- | -------------------------------------- |
| `load.acuteLoad`         | 7 days    | Σ(daily TSS)                           |
| `load.chronicLoad`       | 42 days   | Σ(daily TSS) / 6                       |
| `load.acwr`              | 7/42 days | acuteLoad / chronicLoad                |
| `load.loadMonotony`      | 7 days    | mean / stdDev                          |
| `load.loadStrain`        | 7 days    | acuteLoad × monotony                   |
| `load.trainingFrequency` | 7 days    | count of sessions                      |
| `load.restDayCount`      | 7 days    | days with TSS = 0                      |
| `load.acuteLoadRun`      | 7 days    | run-only TSS (for sport-specific ACWR) |
| `load.acuteLoadBike`     | 7 days    | bike-only TSS                          |
| `load.chronicLoadRun`    | 42 days   | run-only                               |
| `load.chronicLoadBike`   | 42 days   | bike-only                              |

### Athlete Capability Features consumed (from Digital Twin, not Feature Layer)

> These are not "Features" in the Feature Layer sense — they are capabilities
> stored in the Digital Twin and passed via `ExtractionContext`. Listed here
> for completeness of the model's dependency catalog.

| Capability             | Source                                                             | Notes                            |
| ---------------------- | ------------------------------------------------------------------ | -------------------------------- |
| `athleteFtp`           | Digital Twin (athlete declaration or Performance Capability Model) | Required for Tier 1, 2 TSS       |
| `athleteMaxHr`         | Digital Twin (athlete declaration or derived from sessions)        | Required for TRIMP normalization |
| `athleteRestingHr`     | Digital Twin (14-day rolling from recovery.rhrAbsolute)            | Required for TRIMP ΔHR_ratio     |
| `athleteLthr`          | Digital Twin (declared or estimated as HRmax × 0.90)               | TRIMP normalization reference    |
| `athleteThresholdPace` | Digital Twin (per sport — declared or derived)                     | Required for Tier 3              |
