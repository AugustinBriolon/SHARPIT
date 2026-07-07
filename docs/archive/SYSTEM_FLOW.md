# SHARPIT — System Flow

> Source of truth: `docs/DOMAIN_CONCEPTS.md`
>
> This document describes the conceptual lifecycle of data inside SHARPIT: how raw observations become decisions.
> It does not discuss implementation, databases, APIs, or UI. It describes what the system conceptually does at
> every stage and why.
>
> Every transition is explained. Every assumption is challenged.

---

## Philosophy: SHARPIT as an Event-Driven Inference Machine

SHARPIT is not a reporting system. It does not compute metrics on request.

It is a **continuously running inference machine** driven by events. Every time an Observation enters the system,
a cascade of updates flows through the pipeline. The Digital Twin is always in motion. The Athlete State is always
the best current estimate of reality, not a snapshot computed at page load.

This has a fundamental consequence: **the quality of every output is proportional to the recency and completeness
of the input observations.** A stale pipeline produces stale understanding. A missing observation produces
degraded Confidence, not a wrong answer — degraded but honest.

The second philosophical principle: **meaning is not contained in data.** A heart rate of 148 bpm is not meaningful
on its own. Its meaning depends on this Athlete's threshold, the duration of the effort, the time in the training
cycle, and what happened the night before. The pipeline exists to produce meaning — progressively and explicitly —
from meaningless raw measurements.

---

## The Complete Pipeline

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    SHARPIT DATA LIFECYCLE                                          │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘

STAGE         LAYER              CONCEPT                    TRANSITION
─────────────────────────────────────────────────────────────────────────────────────────────────────
              ┌────────────┐
INPUTS        │  SOURCES   │  Garmin · Strava · Manual      Event arrives
              │            │  Renpho · Calendar             (webhook / sync / form submit)
              └─────┬──────┘
                    │
                    ▼  [INGESTION]
              ┌────────────┐
I.            │OBSERVATION │  Raw facts about the Athlete   Stored as immutable record
              │ (raw)      │  Typed · Timestamped ·         Carries source + initial quality flag
              └─────┬──────┘  Sourced
                    │
                    ▼  [VALIDATION]
              ┌────────────┐
II.           │OBSERVATION │  Biologically plausible        Rejected / Accepted / Flagged
              │ (validated)│  Temporally consistent         Quality classification assigned
              └─────┬──────┘  Conflict-resolved
                    │
                    ▼  [NORMALIZATION]
              ┌────────────┐
III.          │OBSERVATION │  Unified units · Local time    Comparable across sources
              │(normalized)│  Day-boundary aligned          Training-day semantic applied
              └─────┬──────┘  Source-ranked
                    │
                    ▼  [FEATURE EXTRACTION]
              ┌────────────┐
IV.           │  SIGNAL    │  Contextualized meaning        Observation relative to baseline
              │            │  Baseline-anchored ·           Typed (Recovery / Load / Sleep /
              └─────┬──────┘  Severity-classified           Performance / Risk)
                    │         Quality-rated
                    ▼  [MODEL EXECUTION]
              ┌────────────┐
V.            │   MODEL    │  Fitness-Fatigue Model         Signal(s) in → State estimate out
              │ EXECUTION  │  Recovery Synthesis Model      Each Model has: evidence level +
              └─────┬──────┘  Capability Estimation Model   assumptions + known error
                    │         Risk / ACWR Model
                    │         Sleep Quality Model
                    ▼  [STATE UPDATE]
              ┌────────────┐
VI.           │  ATHLETE   │  Physiological State           Multi-dimensional update
              │   STATE    │  Recovery State                Each dimension = latest Model output
              └─────┬──────┘  Performance State             State transitions emit Events
                    │         Goal State
                    │
                    ▼  [SYNTHESIS]
              ┌────────────┐
VII.          │  DIGITAL   │  Aggregate model of Athlete    Persistent history + current state
              │   TWIN     │  All observations + states     The totality — not any one dimension
              └─────┬──────┘  All Model outputs
                    │
          ┌─────────┤
          │         │
          ▼         ▼  [DECISION ENGINE]
    PREDICTION    ┌────────────┐
    GENERATION    │  DECISION  │  Safety check                Sequential deterministic rules
          │       │  ENGINE    │  Recovery check              Priority hierarchy enforced
          │       └─────┬──────┘  Load check                 Same state → same output, always
          │             │         Goal context
          │             ▼  [VERDICT + ALERTS]
          │       ┌────────────┐
          │       │  VERDICT   │  Daily synthesis             Tone + headline + signal summary
          │       │  + ALERTS  │  Deterministic · Typed       Alerts are additive, not competing
          │       └─────┬──────┘
          │             │
          └─────┬───────┘
                │
                ▼  [RECOMMENDATION GENERATION]
          ┌────────────┐
VIII.     │RECOMMENDA- │  Typed: Session · Load ·           Grounded in Verdict + Athlete State
          │  TION      │  Recovery · Sleep · Test ·         Always specific and actionable
          └─────┬──────┘  Planning
                │
                ▼  [EXPLANATION GENERATION]
          ┌────────────┐
IX.       │  EVIDENCE  │  Causal chain: Obs → Signal        Backwards trace from output to input
          │            │  → Model → State → Rule →          Human-readable + technical forms
          └─────┬──────┘  Output
                │
                ▼  [COACHING INTELLIGENCE]
          ┌────────────┐
X.        │  COACHING  │  Natural language synthesis        Verdict + Evidence + Context →
          │INTELLIGENCE│  Contextual narrative              Personalized daily briefing
          └─────┬──────┘  Conversational layer
                │
                ▼
          ┌────────────┐
          │  ATHLETE   │  Reads · Decides · Acts            Final decision-maker
          │  RESPONSE  │  Follows or overrides              System defers to the Athlete
          └─────┬──────┘
                │
                ▼  [FEEDBACK LOOP]
          ┌────────────┐
XI.       │  FEEDBACK  │  Compliance observation            Closes the loop → next cycle
          │   LOOP     │  Subjective delta signal
          └────────────┘  Baseline refinement
```

---

## Stage I — Observation Ingestion

### What happens

Raw data enters the system from external sources. At this stage, SHARPIT does nothing except receive and record.

An Observation is created for each incoming data point with:

- `type` — the physiological dimension it touches (SLEEP, HRV, SESSION, SUBJECTIVE_FEEDBACK, PHYSICAL_CONDITION, BODY_COMPOSITION, HEART_RATE)
- `value` — the raw measurement
- `timestamp` — when the measurement occurred (NOT when it was received)
- `source` — where it came from (GARMIN, STRAVA, MANUAL, RENPHO, ...)
- `quality_class` — initial quality flag based on source (MEASURED, ESTIMATED, MANUAL)

The ingestion layer makes **no interpretation**. It does not compute. It does not flag concerns. It records.

### The event that triggers the pipeline

Every ingestion event is a **domain event**: `ObservationReceived`. This event carries the new Observation and
triggers the validation stage. The pipeline downstream does not poll — it reacts.

```
Source sends data
       │
       ▼
ObservationReceived event emitted
       │
       ├── Store raw Observation (immutable from this point)
       │
       └── Trigger STAGE II — Validation
```

### Sources and their observation types

```
GARMIN ──────────────────────────────────────────────────────────────────────────
  └── Sleep Analysis           → Observation(SLEEP, duration/architecture/score)
  └── HRV during sleep         → Observation(HRV, avg_overnight_ms)
  └── Resting Heart Rate       → Observation(RHR, bpm)
  └── Readiness Score          → Observation(GARMIN_READINESS, 0-100)  [⚠ see challenge]
  └── Completed activity       → Observation(SESSION, raw metrics bundle)
  └── Body Battery             → Observation(BODY_BATTERY, 0-100)

STRAVA ──────────────────────────────────────────────────────────────────────────
  └── Completed activity       → Observation(SESSION, raw metrics bundle)

MANUAL (Athlete input) ──────────────────────────────────────────────────────────
  └── RPE / feeling / mood     → Observation(SUBJECTIVE_FEEDBACK, composite)
  └── Physical condition       → Observation(PHYSICAL_CONDITION, structured report)
  └── Session without device   → Observation(SESSION, partial)
  └── FTP test result          → Observation(PERFORMANCE_TEST, value + method)

RENPHO ──────────────────────────────────────────────────────────────────────────
  └── Body weight, fat %       → Observation(BODY_COMPOSITION, composite)
```

### Challenge: ingestion is not passive

The assumption that ingestion is purely passive is wrong. **The moment an Observation is received, its timestamp
determines its position in the Athlete's training calendar.** That positioning is itself an interpretation:

- A Garmin activity at 06:00 local time — does it belong to "today" or does it complete "yesterday's" training
  day (for athletes who train before midnight but the training day runs differently)?
- A sleep observation that starts at 23:45 — does it belong to the training day that started that morning,
  or the next one?

The ingestion layer must apply **training-day semantics** before recording. This is NOT implementation detail —
it is a domain decision: SHARPIT's training day is an entity that must be explicitly defined per Athlete.

---

## Stage II — Validation

### What happens

A validated Observation is one that SHARPIT can trust as a legitimate data point. Validation catches four categories
of problems:

**1. Biological plausibility**
Every Observation type has physiologically bounded ranges. Outside these ranges, the measurement is either
equipment error or an anomaly requiring human review.

```
Observation type    Plausible range         Rejection threshold
─────────────────────────────────────────────────────────────────
HRV (overnight)     18 – 150 ms             < 10 or > 200 ms
Resting HR          25 – 100 bpm            < 20 or > 120 bpm
Sleep duration      0 – 16 hours            > 18 hours
Power output        10 – 1500 W             > 2000 W
Session TSS         0 – 600                 > 700 (single session)
RPE                 1 – 10                  outside this range
Body weight         30 – 200 kg             outside this range
```

**2. Temporal consistency**
Observations from the same Athlete cannot violate physical time constraints:

- A sleep observation and a session observation cannot overlap
- Two sleep observations on the same night (from different devices) are a conflict
- An HRV observation timestamped after a session in the same morning is suspicious (HRV should be pre-activity)

**3. Source conflict resolution**
When two sources report the same metric for the same time window, SHARPIT must decide which to trust:

```
Conflict: Garmin session + Strava session for same activity
Resolution hierarchy:
  1. Prefer the source with power data (most accurate TSS)
  2. Prefer Garmin if both have HR (native device)
  3. Flag as duplicate, retain primary, mark secondary as SUPERSEDED
```

**4. Completeness check**
Some Observations are structurally required to have certain fields. An activity with duration but no session type
cannot be processed. A sleep observation with no architecture data is incomplete.

### Validation outcomes

```
ACCEPTED          → Observation is valid. Proceed to normalization.

ACCEPTED_FLAGGED  → Observation is valid but has quality concerns.
                    Examples: optical HRV (vs. chest strap), estimated TSS (vs. power-based),
                              incomplete sleep architecture, manual entry with no device data.
                    Flagged observations carry reduced quality in downstream Signals.

REJECTED          → Observation fails plausibility check. Not stored.
                    The Athlete is NOT notified of rejections (noisy). Only patterns of
                    rejections (same sensor, recurring dates) trigger attention.

DEFERRED          → Observation requires resolution of a conflict.
                    Example: two activities at overlapping timestamps from different sources.
                    System stores both, marks conflict, waits for resolution or auto-resolves
                    by source priority.
```

### What the validation stage does NOT do

Validation does not determine whether an Observation is concerning. An HRV of 42 ms is not "bad" — it is
within plausible range. Whether it is concerning depends on THIS Athlete's baseline. That question belongs
to Feature Extraction. Validation only asks: "Is this measurement a legitimate observation of reality?"

---

## Stage III — Normalization

### What happens

Validated Observations from different sources have incompatible representations. Normalization makes them
comparable.

**Unit normalization**

```
Power:     W (watts) — always
Pace:      min/km — always (converted from mph, min/mile, km/h)
HR:        bpm — always
HRV:       ms (rmssd) — always (converted from ln(rmssd) or other encodings)
Duration:  seconds internally (displayed as HH:MM)
Distance:  km — always
TSS:       dimensionless score (0-600 typical range)
```

**Temporal normalization**
All timestamps are normalized to:

- UTC storage (source of truth for ordering)
- Athlete-local time (for display and training-day assignment)
- Training-day ID (a training day is not always midnight-to-midnight — this is Athlete-configurable)

**Source normalization**
Different platforms encode the same physiological concept differently:

```
Garmin readiness score: 0-100   →  standardized as GARMIN_READINESS_SIGNAL
Garmin body battery:    0-100   →  standardized as ENERGY_RESERVE_SIGNAL
Strava relative effort: 1-200+  →  mapped to TSS equivalent (with degraded confidence)
```

**Baseline anchoring preparation**
Some Observations are only meaningful relative to personal baseline. Normalization attaches the current
baseline snapshot to the Observation record, so that Feature Extraction always has the context it needs:

```
HRV = 58 ms
  └── attached: {
        athlete_30d_baseline: 70 ms,
        baseline_stability: "established" (day 34),
        baseline_confidence: "high"
      }
```

### Critical transition: Normalization does not produce meaning

The normalized Observation is still a raw fact. HRV = 58 ms with baseline = 70 ms is still not meaningful.
Normalization prepares the Observation for interpretation — it does not interpret.

This boundary matters for the architecture: normalization is a pure transformation (input → output with no
reasoning). Feature extraction is where judgment begins.

---

## Stage IV — Feature Extraction and Signal Generation

### What happens

This is the most important stage in the pipeline. It is where data becomes intelligence.

Feature Extraction takes normalized Observations and produces **Signals** — typed, baseline-anchored,
severity-classified facts about the Athlete's current state.

The output of this stage is what the Models consume. **Models never read raw Observations.** This boundary
is the key to model replaceability: a new Model for recovery can be introduced without changing how
Observations are collected or normalized.

### The feature extraction process (per Observation type)

```
For each normalized Observation:

  1. Load personal context:
       - Athlete's personal baseline for this metric
       - Baseline stability score (how many days of history?)
       - Current Training Plan Phase (BASE / BUILD / PEAK / TAPER)
       - Days to next A-race
       - Recent load history (7d, 42d)

  2. Compute deviation:
       deviation = (observed_value - baseline_value) / baseline_value × 100

  3. Apply classification thresholds:
       Classify the deviation into a severity band:
       EXCELLENT | GOOD | NORMAL | CONCERNING | SUPPRESSED | CRITICAL

  4. Compute Signal quality:
       Quality is a function of:
       - Source reliability (chest strap > optical > estimated)
       - Baseline stability (more history = more reliable baseline)
       - Temporal freshness (today's observation > yesterday's)
       - Contextual consistency (multiple signals in same direction = higher quality)

  5. Emit Signal with:
       - type (RECOVERY | LOAD | SLEEP | PERFORMANCE | RISK)
       - dimension (HRV | SLEEP_DURATION | ACWR | FTP_TREND | ...)
       - raw_value
       - deviation_from_baseline (%)
       - classification (EXCELLENT / GOOD / NORMAL / CONCERNING / SUPPRESSED / CRITICAL)
       - quality (HIGH | MODERATE | LOW | BASELINE_PENDING)
       - context_snapshot (phase, days_to_race, recent_load)
       - source_observation_id
```

### Signal taxonomy

```
RECOVERY SIGNALS
  ├── HRV Signal          HRV deviation from 30-day baseline
  ├── RHR Signal          Resting HR deviation from 30-day baseline
  ├── Sleep Signal        Sleep quality composite (duration + architecture + regularity)
  └── Garmin Readiness    Garmin's readiness score as cross-reference signal [⚠ see challenge]

LOAD SIGNALS
  ├── Training Stress     Session TSS with source quality flag
  ├── ACWR Signal         Acute:Chronic ratio with risk classification
  └── Weekly Volume       Current week TSS vs. Phase target

PERFORMANCE SIGNALS
  ├── Power Curve         New personal bests in duration bands (1s to 2h)
  ├── Pace Curve          New personal bests in running duration/distance bands
  └── Threshold Signal    HRF or pace at threshold (from recent sessions)

SLEEP SIGNALS
  ├── Duration Signal     Total sleep vs. personal target
  ├── Deep Sleep Signal   Deep sleep % vs. reference range (13-23%)
  ├── REM Signal          REM % vs. reference range (20-25%)
  └── Regularity Signal   Bedtime standard deviation (consistency)

PHYSICAL CONDITION SIGNAL
  └── Severity Signal     Condition category + severity + trajectory (improving/stable/worsening)
```

### The cold start problem

If the Athlete has fewer than 21 days of observations, personal baselines are not yet stable. Feature
Extraction cannot produce reliable Signals.

The response is not to fabricate confidence — it is to **degrade honestly**:

```
Days of data    Baseline status    Signal quality    Confidence impact
────────────────────────────────────────────────────────────────────
1-7             Not established    BASELINE_PENDING  Very Low
8-14            Forming            LOW               Low
15-21           Provisional        MODERATE          Moderate
22-42           Established        HIGH              High
> 42            Stable             HIGH              High (personalized)
```

During cold start:

- Signals are still generated using population norms as interim baselines
- All Signals carry `quality: BASELINE_PENDING`
- All downstream Model outputs carry `confidence: LOW`
- Coaching Intelligence explicitly communicates this to the Athlete

### What does NOT happen here

Feature Extraction does not decide what to do. It does not produce Recommendations or Verdicts.
It produces typed, contextualized facts:

"HRV is 17% below baseline and classified as significant suppression, quality HIGH."

What that means for today's training is the Decision Engine's question.

---

## Stage V — Model Execution

### What happens

Models take the available Signals and produce **Athlete State dimension estimates**. Each Model has:

- A defined set of input Signals (minimum requirements for execution)
- A defined output (the Athlete State dimension it estimates)
- A documented evidence level
- Known limitations and sources of error

### Model execution trigger patterns

Models are not run on a schedule. They are triggered **reactively** when new Signals arrive that they need:

```
New Sleep Observation arrives
  └── Stage I-IV runs → Sleep Signal produced
        └── Triggers: Sleep Quality Model → sleep quality estimate
              └── New Recovery Input Signal produced
                    └── Triggers: Recovery Synthesis Model → Readiness updated

New Completed Session arrives
  └── Stage I-IV runs → Training Stress Signal + Power Curve Signal
        ├── Triggers: Fitness-Fatigue Model → ATL/CTL/TSB updated
        │     └── Triggers: Risk/ACWR Model (uses new ATL/CTL) → Risk level updated
        └── If new power/pace personal best:
              └── Triggers: Capability Estimation Model → FTP/performance capability updated

New HRV Observation arrives
  └── Stage I-IV runs → HRV Signal
        └── Triggers: Recovery Synthesis Model → Readiness updated (partial update, without new sleep)

New Physical Condition entry
  └── Stage I-IV runs → Physical Condition Signal
        └── Triggers: Decision Engine safety check immediately (severity threshold check)
```

### The Fitness-Fatigue Model (PMC)

```
INPUT SIGNALS
  └── Daily Training Stress values (series over 180+ days)

COMPUTATION
  ATL_today = ATL_yesterday × e^(-1/7)  + TSS_today × (1 - e^(-1/7))
  CTL_today = CTL_yesterday × e^(-1/42) + TSS_today × (1 - e^(-1/42))
  TSB_today = CTL_yesterday - ATL_yesterday   (prior day)

OUTPUT
  ├── Fatigue (ATL): 0 – ~150 typical range
  ├── Fitness (CTL): 0 – ~150 typical range
  └── Form (TSB): ~ −60 to +40 typical range

EVIDENCE LEVEL: Level 5 (practitioner consensus, Coggan/Allen)
KNOWN LIMITATIONS:
  - Single decay constants (τ = 7, 42) are population-level estimates
  - TSS conflates all stress types into one dimension
  - Model assumes linearity — real physiology is non-linear
  - Does not capture neuromuscular, mechanical, or cognitive load
```

### The Recovery Synthesis Model

```
INPUT SIGNALS (in priority order)
  1. HRV Signal (primary physiological signal)
  2. Resting HR Signal (secondary autonomic signal)
  3. Sleep Quality Signal (recovery enabler)
  4. Garmin Readiness Signal (cross-reference)
  5. Form/TSB (load-derived baseline)

COMPUTATION (sequential priority, not simple averaging)
  Step 1: If any Physical Condition severity ≥ 6 → readiness capped at 40
  Step 2: If HRV Signal = SUPPRESSED → base readiness = 45-60
  Step 3: Sleep Signal modifies: deficit → −5 to −15, excellent → +5 to +15
  Step 4: RHR Signal modifies: elevated → −5, normal → 0
  Step 5: Form/TSB modifies: very negative → −10, fresh → +5
  Step 6: Clamp to [0, 100]

OUTPUT
  └── Recovery State → Readiness (0-100 with classification: LOW / MODERATE / GOOD / EXCELLENT)

EVIDENCE LEVEL: Level 3-4 (observational, Buchheit 2014, HRV4Training studies)
KNOWN LIMITATIONS: [⚠ see challenge section]
```

### The Capability Estimation Model

```
INPUT SIGNALS
  ├── Power Curve Signals (new best efforts at various durations: 5s, 30s, 1min, 5min, 20min, 60min)
  ├── Pace Curve Signals (new best efforts at various distances/durations)
  └── Performance Test Signals (explicit test results: FTP test, time trial, Cooper test)

COMPUTATION
  FTP estimation:
    If 20-min power available: FTP = best_20min × 0.95
    If 60-min power available: FTP = best_60min (direct)
    If only race data: FTP estimated from normalized power at threshold HR

  Threshold pace estimation:
    From best race performance at distances 5K-21K
    Using Riegel model to project to 60-min effort equivalent

  VO2max estimation:
    From maximal effort performance (race data or Cooper test)

OUTPUT
  └── Performance State → Performance Capability (FTP, LTHR, threshold pace, VO2max estimate)

EVIDENCE LEVEL: Level 4-5 (Coggan FTP methodology, Riegel 1977)
KNOWN LIMITATIONS:
  - FTP × 0.95 is a population average correction factor; error ±5-10% individually
  - Capability estimates degrade during detraining periods (historical bests become stale)
  - No neuromuscular or strength component captured
```

### The ACWR Model

```
INPUT SIGNALS
  └── Daily Training Stress values (7-day and 42-day windows)

COMPUTATION
  ACWR = ATL / CTL  (acute load / chronic load)

  Risk classification:
    ACWR < 0.8  → UNDERTRAINED (risk of detraining)
    ACWR 0.8–1.3 → OPTIMAL
    ACWR 1.3–1.5 → ELEVATED RISK (caution)
    ACWR 1.5–1.8 → HIGH RISK (warning)
    ACWR > 1.8  → DANGER (mandatory load reduction)

OUTPUT
  └── Risk level + ACWR ratio

EVIDENCE LEVEL: Level 3 (Gabbett 2016, Carey 2017 — primarily team sports)
KNOWN LIMITATIONS: [⚠ major challenge — see challenge section]
```

### What happens when Signals are missing

A Model runs with whatever Signals are available, but degrades gracefully:

```
Recovery Synthesis Model: no HRV Signal available (device not worn)
  ├── Model continues with remaining Signals (sleep, RHR, Form)
  ├── Output carries: confidence degraded from HIGH to MODERATE
  ├── Reasoning exposed: "HRV unavailable — recovery estimate based on sleep quality and load only"
  └── Output still produced — not suppressed

Recovery Synthesis Model: no Signals available (no sync, rest day, device not charged)
  ├── Output from previous day carried forward with time-decay penalty
  ├── Output carries: confidence = LOW, data_staleness_flag = true
  └── If staleness > 48h: Coaching Intelligence flags missing sync in Daily Briefing
```

---

## Stage VI — Digital Twin Update and State Transitions

### What happens

When a Model produces a new output, the Digital Twin updates the relevant dimension of Athlete State. This is
not merely overwriting a number — it is a versioned state transition.

The Digital Twin maintains:

- The current Athlete State (all dimensions, latest values)
- A timestamped history of each dimension (how Fatigue evolved over 12 months)
- The complete Observation history (immutable)
- The evidence lineage (which Observations produced which Signals, which Models produced which State estimates)

### State transition semantics

A state transition is more than a value change. Some value changes are **events** — they represent threshold
crossings that have domain significance and trigger downstream consequences.

```
                STATE TRANSITION MAP

PHYSIOLOGICAL STATE
  Form (TSB) transitions:
    > +25       → PEAK FORM (alert if during TAPER: expected)
    +10 to +25  → FRESH (good for quality training or race)
    -15 to +10  → PRODUCTIVE ZONE (normal hard training)
    -30 to -15  → ACCUMULATING FATIGUE (monitor)
    < -30       → OVERREACH ZONE (action required)
    < -45       → DANGER ZONE (mandatory load reduction)

  ATL (Fatigue) transitions:
    > 1.8 × CTL → ACWR danger (same as ACWR model output, cross-validated)

  CTL (Fitness) transitions:
    CTL peak (new maximum) → ADAPTATION EVENT (positive signal, track progression)
    CTL drop > 10% in 14d → SIGNIFICANT DETRAINING (flag to Coaching Intelligence)

RECOVERY STATE
  Readiness transitions:
    < 40        → LOW RECOVERY (session replacement recommended)
    40-65       → MODERATE RECOVERY (intensity reduction recommended)
    65-80       → GOOD RECOVERY (normal training)
    > 80        → EXCELLENT RECOVERY (intensity available)

RISK
  ACWR transitions:
    ≥ 1.5       → ELEVATED RISK EVENT → triggers WARNING Alert
    ≥ 1.8       → DANGER EVENT → triggers DANGER Alert + mandatory rest Recommendation
    Returns < 1.5 → RISK RESOLVED EVENT

PHYSICAL CONDITION
  Severity transitions:
    0 → 1+      → NEW CONDITION EVENT → active tracking begins
    ≥ 6         → SAFETY CRITICAL EVENT → immediate DANGER Alert, unconditional
    Worsening trend → DETERIORATION EVENT → Coaching Intelligence notified
    Improving trend → IMPROVING EVENT → monitoring relaxed
    0           → RESOLVED EVENT → active tracking ends
```

### State transitions emit domain events

Every threshold crossing emits a **domain event** that the Decision Engine listens to. This is the mechanism
by which the pipeline is event-driven rather than polling-based:

```
ACWR crosses 1.5 → AcwrElevatedEvent emitted
    └── Decision Engine receives event
          └── Immediately activates WARNING Alert
                └── If currently in pipeline: Verdict is marked dirty (needs regeneration)
                      └── Next request for Verdict returns updated Verdict
```

### The versioning principle

Every update to Athlete State creates a time-stamped snapshot entry:

```
Fatigue history:
  2026-07-01 08:15  ATL = 82.3   (source: Session completed 2026-06-30)
  2026-07-02 06:45  ATL = 84.1   (source: Session completed 2026-07-01)
  2026-07-02 18:20  ATL = 88.7   (source: Session completed 2026-07-02)
```

This history enables: trend analysis, Prediction computation, and retroactive debugging ("why did SHARPIT
recommend rest on July 2? The Fatigue history shows why.").

---

## Stage VII — Prediction Generation

### What happens

Predictions are **forward-looking estimates** produced by applying Performance Prediction Models to the current
Athlete State. They answer: "If current trajectory continues, what will happen?"

Predictions are not generated on every observation. They are generated:

- On demand (Athlete or Coaching Intelligence requests them)
- When the Athlete State changes significantly enough to affect prior predictions
- At the start of each week (trajectory review)

### Types of Predictions and their generation process

```
PERFORMANCE FORECAST
  Input:    Performance Capability (current FTP, threshold pace, VO2max estimate)
  Model:    Riegel fatigue law (running), power-based extrapolation (cycling)
  Output:   Predicted race time at target distance, with confidence interval
  Formula:  T2 = T1 × (D2/D1)^b  where b = 1.06 for running (Riegel exponent)
  Example:  Best 10K: 44:15 → Predicted HM: 1:36:40 ± 4%

ADAPTATION FORECAST
  Input:    Current CTL, ATL, TSB + Training Plan weekly loads for next N weeks
  Model:    Fitness-Fatigue Model run forward in time using planned Training Stress
  Output:   Projected CTL, ATL, TSB at race date
  Horizon:  Confidence degrades beyond 4 weeks (adherence uncertainty)
  Example:  "If you follow the current plan, CTL at race week = 91 ± 6"

RECOVERY FORECAST
  Input:    Current ATL, CTL, trend of Recovery State
  Model:    ATL decay curve + readiness recovery pattern
  Output:   Estimated time to Readiness > 70 after hard block
  Example:  "Given current ATL of 94, expect Readiness > 70 in approximately 4-5 days
             assuming no hard sessions"

RISK FORECAST
  Input:    Current ACWR, training plan load for next 2 weeks
  Model:    ACWR trajectory projection
  Output:   Projected ACWR at end of next training block
  Example:  "With current plan, your ACWR will reach 1.6 in week 9 (elevated risk zone)"
```

### Prediction uncertainty model

Every Prediction carries structured uncertainty:

```
Prediction
  ├── point_estimate: 1:36:40
  ├── confidence_interval: ±4% (1:32:50 – 1:40:30)
  ├── horizon_confidence: HIGH (current capabilities), MODERATE (4-week projection)
  ├── key_assumptions:
  │     "Similar terrain and conditions"
  │     "No significant detraining between now and race"
  │     "Pacing strategy consistent with training pace distribution"
  ├── model: "Riegel fatigue law (1977), b = 1.06"
  ├── evidence_level: Level 4
  └── stale_at: recalculate if CTL changes > 5 or FTP estimate changes
```

### What Predictions do NOT do

Predictions are not guarantees. They are not commitments. They are not advice. A Prediction is an estimate
with explicit uncertainty — the Athlete uses them as one input to their decision-making.

The Prediction does not become a Recommendation. The Recommendation generation stage (Stage VIII) may USE
Predictions as context, but the Prediction itself is a separate output.

---

## Stage VIII — Decision Generation

### What happens

The Decision Engine takes the current Athlete State (from the Digital Twin) and applies its priority hierarchy
to produce the Verdict and any active Alerts.

This is the most important boundary in the system: **the Decision Engine is purely deterministic**.
The same Athlete State always produces the same Verdict. There is no AI reasoning in this stage.
Coaching Intelligence comes later.

### The Decision Engine execution sequence

```
STEP 1 — SAFETY CHECK (unconditional)
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │ IF any Physical Condition severity ≥ 6:                                     │
  │   → Emit DANGER Alert                                                       │
  │   → Set Verdict.tone = DANGER                                               │
  │   → Set Verdict.headline = "Repos obligatoire — condition physique critique"│
  │   → STOP. Do not continue. No training recommendation possible.             │
  │                                                                             │
  │ IF ACWR ≥ 1.8:                                                              │
  │   → Emit DANGER Alert                                                       │
  │   → Set Verdict.tone = DANGER                                               │
  │   → Set Verdict.headline = "Risque élevé — repos obligatoire"               │
  │   → STOP. Do not continue.                                                  │
  └─────────────────────────────────────────────────────────────────────────────┘
  These rules are behavioral invariants. They CANNOT be overridden.
  Not by positive Readiness. Not by high Confidence. Not by Coaching Intelligence.

STEP 2 — RISK CHECK
  IF ACWR 1.5–1.8:
    → Emit WARNING Alert
    → Add risk modifier to Verdict: "load reduction required"

STEP 3 — RECOVERY CHECK
  Based on Readiness:
    Readiness < 40        → Verdict.recovery_zone = LOW
    Readiness 40-65       → Verdict.recovery_zone = MODERATE
    Readiness 65-80       → Verdict.recovery_zone = GOOD
    Readiness > 80        → Verdict.recovery_zone = EXCELLENT

STEP 4 — LOAD CHECK
  Based on Form (TSB), adjusted by Recovery zone:
    TSB < -30 AND Recovery = LOW  → Verdict.action = MANDATORY_REST
    TSB < -30 AND Recovery = MOD  → Verdict.action = ACTIVE_RECOVERY_ONLY
    TSB -30 to -15                → Verdict.action = AEROBIC_OR_EASY
    TSB -15 to +10                → Verdict.action = NORMAL_TRAINING
    TSB > +10 AND Recovery ≥ GOOD → Verdict.action = INTENSITY_AVAILABLE
    TSB > +25 AND Race within 14d → Verdict.action = RACE_READY

STEP 5 — GOAL CONTEXT
  Apply urgency modifier based on days_to_next_a_race:
    < 7 days   → RACE_WEEK modifier (minimal training, rest priority)
    7-14 days  → TAPER modifier
    14-30 days → PEAK modifier context
    > 30 days  → Standard Phase guidance

STEP 6 — WEEKLY CONTEXT
  Apply day-of-week guidance:
    Session already done today → "deuxième séance" context
    Day off in Training Plan   → rest day confirmation
    Hard session planned       → confirm or downgrade based on above

STEP 7 — VERDICT ASSEMBLY
  Combine: recovery_zone + action + risk_modifier + goal_context + weekly_context
  → Verdict.tone (GREEN / AMBER / RED / DANGER)
  → Verdict.headline (one-line summary in French)
  → Verdict.signals (list: key signals that produced this verdict)
  → Verdict.timestamp
```

### Alert generation (parallel to Verdict)

Alerts fire independently of the Verdict. They are additive:

```
Active Alert conditions (always checked, not sequential):
  ┌──────────────────────────────────────────────────────────────────────────┐
  │ DANGER Alerts (always visible, override everything):                     │
  │   • Physical Condition severity ≥ 6 (any active condition)               │
  │   • ACWR ≥ 1.8                                                           │
  │                                                                          │
  │ WARNING Alerts (visible, serious):                                       │
  │   • ACWR 1.5–1.8                                                         │
  │   • HRV trend: 3-day average > 15% below baseline                       │
  │   • Sleep 7-night average < 6h30                                         │
  │   • Form < -30 (TSB)                                                     │
  │                                                                          │
  │ INFO Alerts (informational):                                             │
  │   • HRV trend: 3-day average 10-15% below baseline                      │
  │   • Sleep 7-night average 6h30-7h00                                      │
  │   • Form < -20 (entering overreach zone)                                 │
  │   • Physical Condition severity 3-5 (monitoring)                        │
  │   • FTP estimate not updated in > 8 weeks                                │
  │   • ACWR 1.3–1.5                                                         │
  └──────────────────────────────────────────────────────────────────────────┘
```

---

## Stage IX — Recommendation Generation

### What happens

The Verdict provides the "what zone are you in" assessment. Recommendations convert that assessment into
specific, typed, actionable guidance.

Recommendations are generated in layers, ordered by priority:

```
LAYER 1 — SAFETY RECOMMENDATIONS (from Decision Engine, unconditional)
  Source: safety check outcomes
  Examples:
    "Repos — condition physique critique (sévérité 7, genou droit)"
    "Réduction de charge obligatoire — ACWR 1.82"

LAYER 2 — SESSION RECOMMENDATIONS (from Verdict + Training Plan)
  Source: Verdict.action + current Training Plan Phase + planned sessions
  Logic:
    If Verdict = INTENSITY_AVAILABLE AND planned session type matches zone:
      → "Exécute la séance planifiée : {session_details}"
    If Verdict = MODERATE AND planned = THRESHOLD:
      → "Remplace la séance threshold par Z2 — {duration} min"
    If Verdict = LOW AND any session planned:
      → "Repos actif ou récupération seulement — {easy_option}"
    If no session planned AND Verdict = EXCELLENT:
      → "Opportunité de séance qualitative — contexte favorable"

LAYER 3 — LOAD RECOMMENDATIONS (from Adaptation Forecast)
  Source: Comparison of current weekly load trajectory vs. Phase target
  Examples:
    "Ta charge hebdomadaire dépasse l'objectif de phase de 18% — réduis le volume cette semaine"
    "CTL en retard sur le plan de 6 points — envisage une session supplémentaire cette semaine"

LAYER 4 — RECOVERY RECOMMENDATIONS (from Recovery State signals)
  Source: Sleep Signal + HRV Signal + Recovery State
  Examples:
    "Déficit de sommeil cumulé : −1h15m/nuit sur 7 jours. Vise une heure de coucher avant 22h30."
    "HRV en baisse sur 3 jours consécutifs. Priorise la récupération ce soir : pas d'écrans,
     pas d'alcool, température chambre ≤ 18°C."

LAYER 5 — CAPABILITY TEST RECOMMENDATIONS (from Performance State)
  Source: Age of last FTP estimate + recent training block completion
  Examples:
    "Ton estimation de FTP date de 10 semaines. Après ton bloc BUILD, une réévaluation confirmerait
     ou corrigerait la progression. Propose: test 20min en sortie dédiée."
    "Nouvelle période de courses à venir : recalibre ta VMA avec un test Cooper ou piste 3000m."
```

### Recommendation quality gate

A Recommendation is only generated if:

1. It is actionable (not just descriptive)
2. It is specific (not generic advice)
3. It is supported by Evidence (traceable to Signals and Models)
4. Its Confidence is sufficient (LOW confidence → qualified language, not suppressed output)

A Recommendation with LOW Confidence is still output — but its language must reflect the uncertainty:
"Basé sur des données limitées, je pense que..." rather than "Je recommande de..."

---

## Stage X — Explanation Generation (Evidence + Coaching Intelligence)

### Two distinct outputs

This stage produces two distinct things that are often confused:

1. **Evidence** — the structured causal chain (machine-readable + human-readable)
2. **Daily Briefing** — the personalized narrative (human-only, via Coaching Intelligence)

They are not the same. Evidence is the logical justification. The Daily Briefing is the explanation the
Athlete actually reads. Coaching Intelligence produces the Briefing USING the Evidence as source material.

### Evidence generation: backwards tracing

For every significant output (Verdict, Alert, Recommendation, Prediction), Evidence is generated by
tracing backwards through the pipeline:

```
Recommendation: "Remplace la séance threshold par Z2 demain"
        │
        ▼ What produced this?
Decision Engine Rule: "Verdict = MODERATE → downgrade planned intensity"
        │
        ▼ What produced the MODERATE Verdict?
Recovery State: Readiness = 58 (MODERATE zone)
        │
        ▼ What produced Readiness = 58?
Recovery Synthesis Model (v1.2):
  Input 1: HRV Signal — 10% below baseline (CONCERNING), quality HIGH
  Input 2: Sleep Signal — duration 6h42m (deficit 78min), quality HIGH
  Input 3: Form (TSB) = -14 (normal training load), quality HIGH
  Computation: base 65 (HRV mod) - 8 (sleep deficit) = 57 → rounded to 58
        │
        ▼ What produced the HRV Signal?
Feature Extraction on HRV Observation:
  Raw Observation: HRV = 63 ms (source: Garmin overnight optical, 04:15 AM)
  Athlete baseline: 70 ms (30-day avg, stability: HIGH, day 47)
  Deviation: -10%
  Classification: CONCERNING (threshold: < -10% baseline)
        │
        ▼ Evidence assembled:
Evidence {
  outputs: [Recommendation("Remplace threshold par Z2")],
  chain: [
    { stage: "Observation", entity: "HRV = 63ms (Garmin, 04:15)", quality: HIGH },
    { stage: "Signal", entity: "HRV -10% baseline → CONCERNING", quality: HIGH },
    { stage: "Model", entity: "Recovery Synthesis Model v1.2", evidence_level: "Level 3-4" },
    { stage: "State", entity: "Readiness = 58/100 → MODERATE zone" },
    { stage: "Rule", entity: "MODERATE Readiness → downgrade planned intensity" }
  ],
  confidence: HIGH,
  scientific_references: ["Buchheit 2014 — HRV for recovery monitoring in athletes"]
}
```

### Coaching Intelligence: evidence → narrative

Coaching Intelligence receives:

- The Verdict + active Alerts
- All generated Recommendations
- The Evidence bundle for each output
- The Athlete's Context (lifestyle, constraints, preferences)
- The recent Athlete State history (trend, not just today)

It produces the **Daily Briefing**: a personalized, conversational narrative that the Athlete will actually
read and understand.

The Daily Briefing is NOT just a formatted version of the Evidence. It:

- Uses the Athlete's language and references their specific situation
- Provides context that the deterministic pipeline cannot: "This is expected mid-build — not a concern"
- Explains tradeoffs: "You could train, but the physiological cost tomorrow will be higher"
- Acknowledges nuance: "Your HRV is only slightly below baseline — this is a soft signal, not a hard stop"
- Never overstates certainty — its tone must match the Confidence level of the underlying Evidence

```
Daily Briefing generation inputs:
  Verdict.tone = AMBER
  Verdict.headline = "Récupération modérée — intensité déconseillée"
  Alerts: none active
  Recommendations: [session downgrade, sleep coaching]
  Evidence: [HRV -10%, sleep deficit 78min, Readiness 58]
  Context: "Ingénieur full-stack, travaille jusqu'à 21h. Phase BUILD semaine 6/10."
  Trend: "Readiness declining 3 consecutive days (68 → 63 → 58)"

Daily Briefing output:
  "Tu es à mi-BUILD, et la courbe de récupération descend depuis 3 jours — c'est un signe
  à prendre au sérieux avant que ça ne s'installe. Ton HRV de cette nuit est 10% en dessous
  de ta moyenne, et le déficit de sommeil commence à s'accumuler.

  Pour demain : remplace le tempo prévu par une sortie Z2 de 55 minutes. La séance threshold
  ne disparaît pas — décale-la à jeudi quand tu auras récupéré. Ça ne ralentit pas ton BUILD ;
  ça évite de construire sur une base fragilisée.

  Ce soir : vise 22h30 max pour le coucher. Un peu moins d'écrans avant d'aller dormir ferait
  la différence sur ton HRV de demain matin."
```

---

## Stage XI — The Feedback Loop

### What happens

The feedback loop closes the pipeline. It is how SHARPIT improves its estimates over time and why the Digital
Twin becomes more accurate as the Athlete uses it longer.

The feedback loop has three time horizons:

### Short loop: immediate feedback (hours)

```
Athlete receives Daily Briefing
    │
    ├── FOLLOWS Recommendation:
    │       └── Session completed as recommended → Compliance observed (implicit)
    │             └── Training Stress matches recommendation → feedback signal: consistent
    │
    ├── OVERRIDES Recommendation (trains harder than recommended):
    │       └── Session completed, higher TSS than recommended
    │             └── Implicit signal: Athlete felt better than Readiness predicted
    │                   └── Logged as: Readiness model potentially underestimated recovery
    │
    └── PROVIDES EXPLICIT FEEDBACK ("I felt great today despite the amber signal"):
            └── Subjective delta logged as Observation(SUBJECTIVE_FEEDBACK, delta)
                  └── Feature Extraction: "Athlete reported subjective-objective mismatch"
                        └── Confidence modifier: note discrepancy for this athlete profile
```

### Medium loop: session outcome feedback (days)

After a session completed following a Recommendation, SHARPIT observes the physiological response:

```
Recommendation: Z2 run 55min (due to Readiness 58)
  │
  ▼ Session completed: 57 min, Z2, TSS = 47 (as recommended)
  │
  ▼ Next morning HRV: 68 ms (+8% above previous day)
  │
  ▼ Recovery Synthesis Model: Readiness = 74 (GOOD)
  │
  Implicit feedback: recovery response after Z2 was positive, consistent with model prediction.
  No adjustment needed.

Alternative outcome:
  Next morning HRV: 57 ms (still declining despite recovery session)
  Readiness = 55 (not improving as model predicted)
  Implicit feedback: recovery is slower than model predicted for this Athlete.
  Long-loop: track pattern over 30+ days — may indicate model calibration needed.
```

### Long loop: baseline and capability refinement (weeks)

```
Personal baseline stability improves continuously:
  Day 1-21:    Baselines forming → Signals quality LOW → Confidence LOW
  Day 22-90:   Baselines stable → Signals quality HIGH → Confidence HIGH
  Day 90+:     Personal patterns emerging → model parameters refinable

Performance Capability updates:
  When Athlete sets new personal bests → Capability Estimation Model re-runs
  When Athlete completes an explicit test → Capability directly updated
  When Training Plan phase completes → full capability review recommended

Model calibration opportunities (future capability):
  The current models use population-level parameters (τ = 7, 42; FTP × 0.95).
  As Athlete history grows, SHARPIT has the data to personalize these parameters.
  This is the next evolution of the feedback loop: not just accumulating data,
  but using it to adapt the Models themselves to the individual.
```

---

## End-to-End Example: One Training Day

The following traces a complete pipeline cycle for one Athlete on one morning.

### Input events (08:00, Thursday)

Garmin sync completes overnight. Three Observations arrive simultaneously:

1. Sleep: 6h42m, deep sleep 10%, REM 22%, bedtime 23:42, score 71
2. HRV: 63 ms (overnight average)
3. Resting HR: 52 bpm

### Stage I-III (Ingestion → Normalization, seconds)

All three Observations validated (within plausible range, no conflicts). Normalized:

- Sleep duration: 6h42m (vs. Athlete target: 8h → delta: −1h18m)
- HRV: 63 ms (Athlete 30-day baseline: 70 ms → attached to record)
- RHR: 52 bpm (Athlete 30-day baseline: 48 bpm → attached to record)

### Stage IV (Feature Extraction → Signals, seconds)

Three Signals produced:

1. **Sleep Signal**: duration deficit −1h18m (82.5% of target), deep sleep 10% (below 13% reference).
   Classification: MODERATE_DEFICIT. Quality: HIGH.
2. **HRV Signal**: −10% below 30-day baseline (63 ms vs. 70 ms baseline, day 47, stability HIGH).
   Classification: CONCERNING. Quality: HIGH.
3. **RHR Signal**: +8% above baseline (52 vs. 48 bpm). Classification: MILDLY_ELEVATED. Quality: HIGH.

### Stage V (Model Execution, seconds)

Sleep Quality Model runs on Sleep Signal → Sleep quality estimate: MODERATE (71/100).

Recovery Synthesis Model runs on all three Signals + current Form (TSB = −14):

```
  Base: 70 (no safety override, no ACWR issue)
  HRV modifier: -10 (CONCERNING signal)
  Sleep modifier: -8 (moderate deficit)
  RHR modifier: -3 (mildly elevated)
  Form modifier: 0 (TSB -14 = normal training load)
  Result: 49 → Readiness = 49 (LOW-MODERATE boundary)
```

### Stage VI (Digital Twin Update, seconds)

Athlete State updated:

```
  Recovery State: Readiness = 49 (was 58 yesterday → declining trend, day 3)
  Physiological State: unchanged (no new session since last update)
  Risk: ACWR = 1.15 (optimal zone, unchanged)
  Physical Condition: no active conditions
```

State transition event: Readiness crossed below 50 threshold → LOW_RECOVERY_EVENT emitted.

### Stage VIII (Decision Engine, milliseconds)

```
  Step 1 (Safety): No Physical Condition ≥ 6. ACWR = 1.15 (safe). → Continue.
  Step 2 (Risk):   ACWR 1.15 (optimal). No Warning Alert.
  Step 3 (Recovery): Readiness = 49 → recovery_zone = LOW-MODERATE boundary → MODERATE.
  Step 4 (Load):   TSB = -14 (normal training). Readiness governs: AEROBIC_OR_EASY action.
  Step 5 (Goal):   22 days to B-race. Phase: BUILD, week 6/10. Planned session: THRESHOLD RUN.
  Step 6 (Week):   No session today yet. Thursday is planned quality day.

  Verdict:
    tone: AMBER
    headline: "Récupération basse — remplace le threshold par Z2 aujourd'hui"
    signals: [Readiness 49, HRV -10%, Sleep déficit -1h18m, TSB -14]
```

Alerts: one INFO Alert — HRV declining trend day 3.

### Stage IX (Recommendation Generation)

Session Recommendation: "Replace planned threshold run with Z2, 50-60 min. Reschedule threshold
to Saturday when recovery should improve."

Recovery Recommendation: "Sleep target tonight: before 22:30. You have a 1h18m average deficit
over 3 nights — this is affecting your HRV and readiness."

### Stage X (Evidence + Briefing)

Evidence bundle assembled (backwards trace completed).
Coaching Intelligence generates Daily Briefing (see Stage X example above).

### Stage XI (Feedback, later)

Athlete runs Z2 session, 58 minutes, TSS = 38. Compliance: HIGH.
Tomorrow morning HRV: 67 ms (+4 ms, partial recovery).
Implicit feedback: model prediction (recovery following Z2) was consistent with outcome.

---

## Challenging the Current Assumptions

This section does not describe what SHARPIT currently does. It challenges whether what it does is correct.

### Assumption 1: TSS is an adequate universal stress currency

**Current assumption**: All training stress can be represented as a single TSS value with a common unit.

**Challenge**: TSS was designed for cycling. Its extension to running, swimming, and strength training
relies on approximations with known, significant error:

- Running TSS using HR underestimates the mechanical and eccentric load of running (ground reaction forces,
  tendon stress, tibial impact) — a 3-hour marathon imposes musculoskeletal stress far exceeding its TSS
- Strength training TSS has no validated scientific basis; the commonly used "duration × intensity factor"
  method is purely heuristic
- Neuromuscular stress (sprint workouts, jump training) decays on a different time constant than aerobic
  stress — treating them identically produces wrong ATL predictions after speed sessions

**Implication**: A multi-dimensional Training Stress model is needed. Each dimension would have its own
time constant:

- Cardiovascular stress (τ_cv ≈ 7d) — current ATL
- Neuromuscular stress (τ_nm ≈ 3d) — decays faster, more acutely felt
- Mechanical/tendon stress (τ_mech ≈ 14d) — decays slower, injury risk lingers

PMC would become ONE model in a multi-model stress framework.

---

### Assumption 2: ATL and CTL time constants (τ = 7, 42) are correct

**Current assumption**: The exponential decay constants of the PMC model are universal.

**Challenge**: The τ = 7 (ATL) and τ = 42 (CTL) values were derived empirically from elite cyclists in the
1970s-80s (Banister, Calvert). Evidence for their universality is limited:

- Masters athletes (>45) typically require longer recovery — τ_ATL may be 9-10 days, not 7
- Highly trained athletes may have shorter time constants — they recover faster
- The constants differ between sports — running adaptation has different kinetics than cycling
- The constants may change over a season as the Athlete's fitness changes

**Implication**: Time constants should be personalized. The feedback loop already accumulates the data
needed to do this. The pattern of how quickly an individual Athlete's Readiness recovers after hard
sessions provides an empirical basis for personalizing τ_ATL.

---

### Assumption 3: Garmin's readiness score is a valid input

**Current assumption**: Garmin's readiness score can be used as a Recovery Signal.

**Challenge**: Garmin's readiness score is not an Observation — it is a proprietary MODEL OUTPUT applied
to the Athlete's own physiological data. Using it as an input to SHARPIT's Recovery Synthesis Model
creates a hidden model-in-model dependency:

```
What we think:  [Raw HRV] → [Our Model] → Readiness
What happens:   [Raw HRV] → [Garmin Model] → Garmin Score → [Our Model] → Readiness
```

This means:

- SHARPIT's reasoning is partially opaque (depends on Garmin's unpublished algorithm)
- Garmin's model may change without notice, silently changing SHARPIT's outputs
- SHARPIT cannot explain the Garmin score in its Evidence chain
- We have no access to the raw inputs Garmin used — only the output

**Implication**: SHARPIT should prefer running its own Models on the raw physiological data (HRV, RHR,
sleep architecture) rather than consuming Garmin's model output. Garmin's score should be used as a
cross-check signal (a way to validate SHARPIT's independent estimates), not as a primary input.

---

### Assumption 4: ACWR is a valid injury risk model

**Current assumption**: ACWR ≥ 1.5 (warning) and ≥ 1.8 (danger) are reliable injury risk thresholds.

**Challenge**: The ACWR model's injury risk claims have been significantly challenged in the sports
science literature:

- Gabbett 2016 was conducted primarily on team sport athletes (rugby, AFL) — applicability to endurance
  athletes is uncertain
- The optimal ACWR range (0.8-1.3) has wide confidence intervals in the original studies
- A recent re-analysis (Windt & Gabbett 2019) showed ACWR's predictive validity is weaker than
  originally claimed, particularly in athletes with high chronic load
- The model assumes a linear relationship between load ratio and injury risk — evidence for this
  linearity is limited

**Implication**: ACWR should be used as a RELATIVE warning signal, not an absolute injury prediction.
The current thresholds (1.5 / 1.8) should be communicated as "elevated population-level risk" not
"your injury probability is X%." The Alert language already partially reflects this, but the
confidence in ACWR as a reliable injury predictor should be downgraded in the Evidence chain.

---

### Assumption 5: Recovery Synthesis is a linear priority model

**Current assumption**: The Recovery Synthesis Model applies a sequential priority: HRV → RHR → Sleep →
Form. Higher-priority signals override lower-priority ones.

**Challenge**: Recovery is not a sequential priority problem. It is a non-linear signal integration problem:

- Multiple moderate signals in the same direction (slightly below-baseline HRV + slightly poor sleep +
  slightly elevated RHR) may represent worse recovery than a single strong signal alone
- Excellent sleep can genuinely compensate for moderate HRV suppression (sleep quality IS a recovery mechanism)
- The interactions between signals depend on the Training Plan Phase: a TSB of -20 in PEAK training is
  expected; the same TSB in BASE training is unusual

**Implication**: The Recovery Synthesis Model should evolve toward a weighted, non-linear signal integration
that captures signal convergence (multiple moderate signals in same direction = stronger inference) and
Phase-conditioned interpretation (the same HRV value means different things in BASE vs. PEAK).

---

### Assumption 6: The Training Plan is static

**Current assumption**: A Training Plan is generated once and followed. Compliance is measured against
the fixed plan.

**Challenge**: An 18-week plan generated at CTL = 65 becomes increasingly inaccurate if the Athlete's
CTL diverges from the planned trajectory. At week 8:

- If CTL = 80 (above plan): the remaining weeks are calibrated for a less-fit Athlete — they underestimate
  what this Athlete can now handle
- If CTL = 60 (behind plan): the remaining weeks assume a fitness that doesn't exist — following the plan
  as-is risks injury

**Implication**: The Training Plan should be a **reactive document**. Every week, the plan should be
re-evaluated against actual Athlete State. The Phase targets, weekly loads, and session intensities should
adapt to the real CTL — not the planned CTL. "Planned taper at CTL = 88" should become "taper when actual
CTL reaches 88, regardless of which week that is."

---

### Assumption 7: The feedback loop is passive

**Current assumption**: The feedback loop accumulates data and improves baselines, but the Models
themselves don't learn from individual Athlete data.

**Challenge**: The Models use population-level parameters applied uniformly. As Athlete history grows,
the data exists to personalize key parameters:

- τ_ATL (recovery time constant): observable from how quickly Readiness recovers after hard sessions
- FTP estimation correction factor (currently fixed at ×0.95): can be validated against direct tests
- ACWR risk thresholds: different athletes have different sensitivities to load spikes
- Recovery signal weighting in the Recovery Synthesis Model: some athletes are more HRV-dominant,
  others more sleep-dominant in their recovery pattern

**Implication**: The long-term roadmap for SHARPIT includes an **individual parameter estimation layer**
above the current Models — a Bayesian or simple regression layer that adapts model parameters to the
specific Athlete using their accumulated history. This transforms SHARPIT from a system that applies
science to a system that learns science for each individual.

---

## Summary: The Three Invariants

After all the pipeline complexity, three invariants govern the entire system:

### Invariant 1: Data does not speak for itself

Every output — Verdict, Recommendation, Alert, Prediction — is the result of an explicit, documented,
replaceable inference chain. No output is produced by magic. Every claim has Evidence.

### Invariant 2: Safety is unconditional

The behavioral safety invariants (Physical Condition severity ≥ 6 → no training; ACWR ≥ 1.8 → mandatory
rest) cannot be overridden by any model output, any reasoning layer, or any conversational context.
The hierarchy is enforced by the Decision Engine, not the AI Coach.

### Invariant 3: Confidence governs language, not silence

When data is incomplete or models are uncertain, SHARPIT qualifies its outputs — it does not suppress them.
A Low-Confidence Verdict is still a Verdict. A BASELINE_PENDING Signal is still a Signal. Honest uncertainty
is always more valuable than false precision or silence.

---

_This document was produced on 2026-07-02 from `docs/DOMAIN_CONCEPTS.md` as the single source of truth.
It should be updated whenever the inference pipeline changes conceptually — not when implementation details
change. The pipeline is the domain architecture. The implementation is its expression._
