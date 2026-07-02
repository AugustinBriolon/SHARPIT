# SHARPIT — Domain Concepts

> This document is the result of a domain discovery exercise. Its only input is the SHARPIT Manifesto, Product Vision,
> Product Principles, Architecture Handbook, and the scientific knowledge base. It deliberately ignores all technology:
> no database, no framework, no implementation.
>
> It answers one question: **What exists inside the world of SHARPIT?**
>
> Every naming decision, every data model, every algorithm, and every AI prompt should trace to one of these concepts.
> When there is ambiguity between two developers about what something means, this document resolves it.

---

## How to Read This Document

For each concept:

- **Definition** — what it is
- **Why it exists** — what question it answers
- **Responsibilities** — what it must do or know
- **What it is NOT** — common confusions to avoid
- **Example** — a concrete instance
- **Persistence** — stored permanently (persistent), or computed from stored data (derived)?

Concepts are organized in layers from most fundamental to most derived, following the inference pipeline that is the
core of SHARPIT's architecture.

---

## The Inference Pipeline

SHARPIT is not a coaching application. It is a **Human Performance Intelligence System** — an inference system that
continuously updates a model of the athlete from incomplete, noisy, and partial observations.

The fundamental flow:

```
Raw Observations (Objective + Subjective)
           │
           │  feature extraction
           ▼
        Signals
   (interpreted, contextualized)
           │
           │  inference
           ▼
        Models
 (replaceable scientific algorithms)
           │
           │  state update
           ▼
      Athlete State
  (multi-dimensional estimate)
  ├── Physiological State
  │    └── Fatigue · Fitness · Form
  ├── Recovery State
  │    └── Readiness
  ├── Performance State
  │    └── current vs. Performance Capability
  └── Goal State
       └── trajectory toward Goals
           │
           │  synthesis
           ▼
       Digital Twin
  (aggregate model + history)
           │
           ▼
    Decision Engine
  (deterministic rule-based)
           │
     ┌─────┴─────────────────┐
     ▼                       ▼
  Verdict               Recommendation
  Alert                 Prediction
                        Simulation (from Scenario)

Every output carries: Evidence + Confidence
```

The separation between **data** (Observations), **semantics** (Signals), **inference** (Models), **state** (Athlete State),
and **decisions** (Decision Engine) is the architectural invariant that allows SHARPIT to evolve for years without
rewriting its core.

---

## Concept Map (structural view)

```
LAYER 0 — SUBJECT
  Athlete

LAYER 1 — INPUTS
  Observation ──► (Objective: HR, HRV, Power)
                  (Subjective: RPE, Mood, Soreness)
  Session (special Observation)
  Sleep   (special Observation)
  Physical Condition (special Observation)

LAYER 2 — SEMANTIC INTERPRETATION
  Signal ◄── extracted from Observations by Models

LAYER 3 — INFERENCE
  Model ──► applies to Signals, produces State estimates
  Training Stress ◄── quantified by Stress Estimation Models

LAYER 4 — STATE ESTIMATES (dimensions of Athlete State)
  Fatigue · Fitness · Form · Readiness · Adaptation
  Risk · Performance Capability

LAYER 5 — THE AGGREGATE MODEL
  Athlete State (synthesis of all dimensions)
  Digital Twin (persistent, evolving container)

LAYER 6 — DECISION INFRASTRUCTURE
  Evidence · Confidence · Decision Engine

LAYER 7 — OUTPUTS
  Verdict · Recommendation · Alert · Prediction
  Scenario · Simulation

LAYER 8 — PLANNING DOMAIN
  Goal → Training Plan → Phase

LAYER 9 — PERSONALIZATION
  Context · Coaching Intelligence
```

---

## Concepts

### 1. Athlete

**Definition**
The central subject of SHARPIT. A human being engaged in physical training with the goal of improving performance,
health, or both. The Athlete is not a user account — it is a living physiological system in continuous change.

**Why it exists**
Every concept in SHARPIT exists to serve the Athlete. SHARPIT's mission is to understand this athlete better than raw
data ever could. Without the Athlete, nothing else has meaning. The Athlete is the reason SHARPIT exists.

**Responsibilities**
The Athlete has a physiological state (always evolving), a history of training (Observations), performance capabilities
(estimated thresholds and capacities), a set of Goals, and a Context (lifestyle, constraints, psychology). The Athlete
is the final decision-maker — SHARPIT provides inputs to those decisions, not replacements for them.

**What it is NOT**
Not a user profile. Not a database record. Not a collection of metrics. The Athlete is a living system that SHARPIT
tries to understand and never fully succeeds in understanding. SHARPIT does not define the Athlete — it models the
Athlete. The model is always an approximation of reality.

**Example**
A 40-year-old male triathlete, training 11 hours/week, targeting an Ironman 70.3 in October. CTL of 78, sleeping
6h45m on average, dealing with mild right knee pain, aiming for a sub-5h performance. SHARPIT's job is to understand
what is happening inside this specific person — not a generic triathlete.

**Persistence**
The Athlete's characteristics (estimated capabilities, Context, Goals, training history) are persistent. The Athlete's
Athlete State is computed from those characteristics and Observations.

---

### 2. Observation

**Definition**
Any data point about the Athlete collected from any source at a specific moment in time. Observations are the raw
inputs that feed the inference pipeline. An Observation is always partial: it captures one dimension of a
multi-dimensional physiological reality.

Observations are of two fundamental kinds:

- **Objective Observations** — externally measured, independent of the Athlete's perception: HR, HRV, power output,
  pace, sleep duration, resting heart rate, body weight, respiratory rate. Collected by sensors.
- **Subjective Observations** — reported by the Athlete about their internal experience: RPE, mood, perceived
  soreness, energy level, stress, motivation. Collected through self-reporting.

**Why it exists**
"No wearable directly measures fatigue. No wearable directly measures readiness. No wearable directly measures
adaptation." (Manifesto)

SHARPIT can never directly observe the Athlete's internal state. It can only collect Observations and infer from them.
Every Observation is evidence. None is truth. The distinction between the observation and the state it represents is
foundational to how SHARPIT reasons.

**Responsibilities**
An Observation must carry: a type (what physiological dimension it touches), a value, a timestamp, a source (sensor,
manual entry, wearable platform), and a quality classification (measured / estimated / missing). Observations are
immutable — once collected, they are historical facts that cannot be revised.

**What it is NOT**
Not an interpretation. Not a model output. An Observation is raw data — it has no opinion about what it means.

Critical distinction: `ATL`, `CTL`, `TSB`, `ACWR` are NOT observations, not even "derived observations." They are
**outputs of inference Models** applied to Training Stress history. Placing them in the Observation layer would
collapse the very distinction that makes the inference pipeline meaningful. The boundary is:

- Observation → what enters the system (measured or reported)
- Signal → what the system extracts from observations (interpreted meaning)
- Model output → what the inference layer produces (state estimates, risk scores)

**Example**
Objective: HRV = 58 ms. Source: Garmin optical sensor during sleep. Timestamp: 2026-07-02, 04:17 AM. Quality: measured.
Subjective: "Soreness level: 7/10, legs. Mood: 6/10." Timestamp: 2026-07-02, 07:30 AM.

These are the inputs. What they mean for today's Athlete State is the inference system's job.

**Persistence**
Always persistent. Observations are immutable historical records.

---

### 3. Session

**Definition**
A discrete training event. Sessions have two states: **Planned** (a future intended training event with characteristics
defined in advance) and **Completed** (a training event that has occurred, with actual measured outcomes). A Session
has a type (RUN, BIKE, SWIM, STRENGTH), a duration, a Training Stress value, and an intensity zone. It may carry
sport-specific metrics.

A Session is a special Observation: it is the primary source of Training Stress data and the atomic unit of training
history.

**Why it exists**
Training happens in Sessions. Every change to Fatigue, Fitness, and Adaptation is driven by Sessions. Without
Sessions, SHARPIT has no Training Stress history and therefore no PMC, no ACWR, no Adaptation tracking.

**Responsibilities**
A Completed Session captures:

- What was done (type, duration, Training Stress, intensity zone)
- How it felt (RPE, subjective feeling)
- The physiological response (HR, power, pace, cadence, sport-specific streams)
- Whether it matched a Planned Session, and the compliance delta

A Planned Session captures:

- The intended training stimulus (type, target duration, target load, target intensity)
- When it should occur
- Which Goal or Plan Phase it serves
- Its compliance status after completion

**What it is NOT**
Not a collection of raw streams. The GPS trace, HR time series, and power curve recorded during a Session are
Observations that belong to the Session — they are not the Session itself. The Session is the processed summary.

A Completed Session is a fact — it cannot be revised. A Planned Session is an intention — it can be modified,
canceled, or replaced as circumstances change.

**Example**
Planned: Thursday 10 July, RUN, 60 minutes, THRESHOLD intensity, estimated 80 TSS.
Completed: Thursday 10 July, RUN, 64 minutes, avg HR 161 bpm, 11.4 km, actual TSS = 91, RPE 7/10, feeling "Solid."
Gap: +11 TSS over plan — the Athlete ran slightly harder than planned. Relevant for ACWR computation this week.

**Persistence**
Persistent. Both Planned Sessions (intentions) and Completed Sessions (facts) are stored permanently.

---

### 4. Sleep

**Definition**
The nightly physiological recovery and consolidation process. Sleep is an Observation with special domain status: it
is the primary recovery mechanism, the window during which Growth Hormone is secreted and muscle protein synthesis
peaks, and one of the most sensitive early-warning signals for overtraining.

**Why it exists**
Sleep earns first-class domain status because its influence on all physiological dimensions is disproportionate.
Poor sleep directly suppresses: recovery, HRV, anabolic signaling, immune function, cognitive performance, and mood.
Sleep quality is also the most directly actionable recovery lever the Athlete controls.

**Responsibilities**

- Track duration (total sleep time), architecture (deep/slow-wave, REM, light, awake), timing (bedtime regularity),
  and quality (composite scores, HRV during sleep, respiratory rate)
- Analyze against personal targets and validated reference ranges
- Generate Alerts when systematic deficits are detected (7-night average <6h30, deep sleep <9%)
- Inform the Recovery State (Readiness) — recent poor sleep reduces Readiness regardless of Form
- Provide actionable coaching: bedtime recommendations, timing relative to training, thermal management

**What it is NOT**
Not fully observable. Even with Garmin optical sensors, sleep stage estimates have ~70-80% classification accuracy.
The data is directionally informative, not clinically precise.

Not unidirectional: training improves sleep quality (aerobic exercise), but excessive training or evening hard
sessions suppresses it.

**Example**
7-night analysis: 6h52m total (target: 8h), deep sleep 10% (reference: 13-23%), REM 24%, bedtime MAD = 41 minutes,
sleep score 68. Alerts: duration deficit (−1h08m/night avg), deep sleep below lower reference range.

**Persistence**
Persistent as daily Observation records. Sleep analysis and coaching are computed from the stored observations.

---

### 5. Physical Condition

**Definition**
The status of the Athlete's physical health with respect to pain, injury, mobility limitations, and postural issues.
Physical Condition is the somatic Observation layer that acts as the highest-priority safety override in SHARPIT's
decision hierarchy.

**Why it exists**
No physiological model can override a significant injury. Physical Condition is the body's direct signal that a
boundary has been crossed. SHARPIT must track it, monitor its trajectory, and inject it into every Recommendation. An
injury ignored is an injury worsened, and an injury worsened by misguided training recommendations is SHARPIT's failure.

**Responsibilities**

- Track conditions with: category (PAIN, INJURY, MOBILITY, POSTURE), severity (0-10), body side, affected region,
  and status lifecycle (ACTIVE → MONITORING → RESOLVED)
- Generate immediate safety Alerts when severity reaches danger threshold (≥ 6)
- Override positive Readiness and Form signals when a critical condition is active
- Track recovery trajectory through periodic severity check-ins
- Inject active conditions into the Coaching Intelligence context for every relevant output
- Prompt the Athlete to seek medical attention when severity is extreme or trajectory is worsening

**What it is NOT**
Not a medical diagnosis system. SHARPIT tracks what the Athlete reports and flags training implications. When Physical
Condition exceeds SHARPIT's competence (persistent severity ≥ 8), SHARPIT explicitly recommends professional medical
consultation.

Not permanent. Physical Conditions have a lifecycle and resolve. Resolution should be tracked, not just onset.

**Example**
"Right patellar tendon — ACTIVE. Severity: 7/10." Impact: immediate danger Alert, running removed, all coaching
outputs injected with "Right knee tendinopathy severity 7/10 — no running, low-load cycling only."

**Persistence**
Persistent. Physical Conditions and their periodic check-ins are stored as permanent health records.

---

### 6. Signal

**Definition**
An interpreted Observation that carries domain meaning. A Signal is produced by extracting and contextualizing one or
more raw Observations relative to the Athlete's personal baseline, thresholds, and physiological state. Where an
Observation is a raw measurement, a Signal is a fact about the Athlete's state with actionable domain meaning.

**Why it exists**
Inference Models cannot reason directly on raw measurements. A HRV value of 58 ms has no inherent meaning — its
meaning depends on this specific Athlete's personal baseline, the time in their training cycle, and recent load.
A Signal encodes that contextual meaning: "HRV 12% below 30-day baseline — parasympathetic suppression detected."
This is what the Model actually consumes.

Signals are the semantic bridge between the Observation layer and the Inference layer.

**Responsibilities**

- Encode the domain meaning of one or more Observations
- Express the Observation relative to the Athlete's personal baseline when applicable
- Carry a quality classification (reliable / noisy / missing / baseline-pending)
- Be typed by the physiological dimension it addresses: Recovery Signal, Load Signal, Performance Signal,
  Sleep Signal, Risk Signal
- Be producible even with partial data — degraded Signals carry lower quality, not absence

**What it is NOT**
Not an Observation (raw data). Not a Model output (state estimate). A Signal is the semantic interpretation layer —
it is what a Model reads to update Athlete State.

Not a metric. TSS = 95 is a stored Session metric. "This session represents 34% of this Athlete's chronic weekly
Training Stress" is a Signal derived from that metric.

**Example**

- Observation: HRV = 58 ms.
  Signal: "Recovery Signal — HRV 12% below 30-day baseline (70 ms). Classified: parasympathetic suppression. Quality: reliable."

- Observations: this week's Training Stress = 420 TSS, 42-day average weekly stress = 280 TSS.
  Signal: "Load Spike Signal — current week 50% above chronic load. ACWR = 1.50. Classified: elevated risk zone."

- Observations: subjective soreness 7/10 + RPE 8/10 at Z2 HR.
  Signal: "Metabolic Load Signal — decoupling between effort and intensity. Classified: residual fatigue affecting
  metabolic efficiency."

**Persistence**
Computed on demand from Observations and the Athlete's personal baselines. Not stored independently.

---

### 7. Model

**Definition**
A replaceable scientific algorithm that takes Signals as inputs and produces estimates of Athlete State dimensions,
Predictions, or Risk assessments as outputs. Every physiological inference in SHARPIT is performed by a Model.
The Models ARE the scientific intelligence of the system.

**Why it exists**
The Manifesto requires: "Every algorithm must be replaceable. Every assumption must be documented. Every
recommendation must evolve as science evolves." Without Model as an explicit domain concept, there is no way to
honor this principle. When PMC is replaced by a Banister Impulse-Response model, the concept being estimated
(Fatigue, Fitness) does not change — only the Model changes. The interface is stable; the implementation is not.

This replaceability is the core of SHARPIT's long-term scientific integrity.

**Responsibilities**

- Define its input Signals explicitly (minimum data requirements)
- Produce specific Athlete State dimension estimates, Predictions, or Risk scores
- Carry an evidence level:
  - Level 1-2: randomized controlled trials / systematic meta-analyses
  - Level 3-4: observational studies and cohort data
  - Level 5: practitioner consensus and expert practice
  - Level 6: proprietary / internal data
- Document its assumptions, limitations, population applicability, and known sources of error
- Be independently replaceable without changing what it estimates (stable output interface)
- Be versioned: when the model implementation changes, outputs can be recomputed retroactively

Types of Models in SHARPIT's current domain:

- **Fitness-Fatigue Model** (PMC): estimates Fatigue, Fitness, Form from Training Stress history. τ_atl = 7d, τ_ctl = 42d.
- **Workload Ratio Model** (ACWR): estimates acute injury Risk from the ratio of acute to chronic load.
- **Recovery Synthesis Model**: synthesizes HRV, resting HR, and Garmin readiness into Recovery State.
- **Sleep Quality Model**: analyzes sleep Observations into Sleep quality Signal and duration deficit.
- **Capability Estimation Model**: estimates Performance Capability from Performance History and direct tests.
- **Performance Prediction Model** (Riegel / racing): estimates race performance from Performance Capability.
- **Stress Estimation Model**: estimates Training Stress for a Session when primary data (power) is unavailable.

**What it is NOT**
Not a feature. Not a fixed formula baked into the codebase. A Model is a scientific approach with a documented
evidence base, known limitations, and a stable output contract. Its implementation can change without disrupting
the domain.

Not permanent. Models are explicitly provisional — they represent the best available science at a given time and
must be replaceable as better science emerges.

**Persistence**
Models are code, not data. Their outputs (Athlete State estimates) are computed and may be cached. Their scientific
assumptions and evidence levels are documented in the knowledge base. Model version history is tracked for auditability.

---

### 8. Training Stress

**Definition**
The quantified physiological cost that training imposes on the Athlete's body. Training Stress is the abstract concept:
the multi-dimensional load that training produces — cardiovascular, metabolic, mechanical, and neuromuscular.
TSS (Training Stress Score) is the primary model for expressing Training Stress as a single normalized value.

**Why it exists**
Without a normalized measure of physiological cost, it is impossible to compare a 45-minute swim, a 3-hour ride, and
a 45-minute strength session in the same training model. Training Stress is the universal currency that enables
cross-sport comparison, chronic load tracking (Fitness), acute load monitoring (Fatigue), and quantitative Risk
assessment (ACWR).

Naming it "Training Stress" rather than "Training Load" is deliberate: load is external (the weights on the bar, the
kilometers run). Stress is internal (what the body experiences as a result). SHARPIT models the internal physiological
cost, not just the external quantity.

**Responsibilities**

- Quantify any Session as a Training Stress value
- Use the best available Stress Estimation Model for each session type:
  1. Directly reported (Garmin activity TSS) — best available
  2. Power-based cycling TSS — high accuracy
  3. HR-based TSS — moderate accuracy (±20-30% for variable efforts)
  4. Duration × sport factor — fallback only (±40% error)
- Be tagged with its source and quality so downstream Models know the input confidence
- Normalize across sports: 1 hour at personal threshold = 100 TSS by definition

**What it is NOT**
Not a performance measure. A high Training Stress does not mean the Session was fast or effective — it measures
physiological cost, not performance quality.

Not fully accurate. HR-based TSS systematically underestimates high-intensity sessions (HR lag) and overestimates
long easy sessions (cardiac drift). These limitations must be propagated to downstream Signals and Model outputs.

Not identical across sports at the same TSS value. 100 TSS from cycling and 100 TSS from running impose different
musculoskeletal stresses even if cardiovascular cost is equivalent.

Not the only possible stress model. Tomorrow SHARPIT may add mechanical load (ground contact time, jump loading),
neuromuscular load (intensity zones distribution), or cognitive load (race vs. training stress). TSS is a model,
not the truth.

**Example**
90-minute cycling session: NP = 245 W, FTP = 295 W, IF = 0.83 → TSS = 94 (power-based, high confidence).
Same session estimated from HR: avg HR = 148 bpm, LTHR = 163, IF = 0.91 → TSS ≈ 82 (HR-based, moderate confidence).
The 12-point gap is not a bug — it is a documented model limitation that must be communicated through Confidence.

**Persistence**
Persistent on the Session entity. The Training Stress value and its estimation method are stored facts.

---

### 9. Fatigue

**Definition**
The Athlete's accumulated acute training stress. In the PMC Fitness-Fatigue Model, Fatigue = Acute Training Load
(ATL) — the exponentially weighted 7-day moving average of daily Training Stress. Fatigue rises quickly with heavy
training and dissipates within days of rest.

Fatigue is a dimension of **Physiological State** (a sub-component of Athlete State).

**Why it exists**
Fatigue is the short-term cost of training. It is the Signal that tells SHARPIT: this Athlete's body is currently
processing recent stress. Understanding Fatigue is essential for day-to-day decisions. But Fatigue in isolation is
meaningless — it must always be interpreted in relation to Fitness.

**Responsibilities**

- Represent the Athlete's accumulated short-term training stress (τ = 7 days)
- Rise with Training Stress, fall with rest — reflecting the Athlete's acute physiological condition
- Serve as one component of Form (TSB = Fitness − Fatigue)
- Be distinguished from subjective fatigue (how the Athlete feels) — they often disagree

**What it is NOT**
Not directly observable. ATL is the output of the Fitness-Fatigue Model applied to Training Stress history — not a
raw measurement.

Not identical to subjective tiredness. An Athlete can have high ATL and feel excellent (good recovery), or low ATL
and feel exhausted (illness, life stress, sleep debt). Both realities are valid.

Not inherently bad: without Fatigue there is no training, and without training there is no Adaptation.

**Example**
After a hard week (140 TSS + 85 TSS + 85 TSS): ATL ≈ 90. After 5 days complete rest: ATL decays to ≈ 45.
The Athlete may feel subjectively recovered on day 3 while ATL is still 70 — this reflects the lag between
subjective experience and the physiological model's time constant.

**Persistence**
Computed output of the Fitness-Fatigue Model applied to Training Stress history. The ATL series may be cached
but is fully reconstructable from raw Session data.

---

### 10. Fitness

**Definition**
The Athlete's chronic training adaptation — the accumulated physiological capacity built over 42 days. In the PMC
model, Fitness = Chronic Training Load (CTL) — the exponentially weighted 42-day moving average of daily Training
Stress.

Fitness is a dimension of **Physiological State** (a sub-component of Athlete State).

**Why it exists**
Fitness is the long-term gain that justifies training. It answers: "Is this Athlete building a training base that
will produce performance?" Without tracking Fitness, SHARPIT cannot answer whether the Athlete is adapting.

**Responsibilities**

- Represent the Athlete's long-term aerobic base and load-bearing capacity (τ = 42 days)
- Rise slowly with sustained training and decay slowly with rest
- Serve as one component of Form (TSB = Fitness − Fatigue)
- Provide the chronic load baseline for ACWR computation
- Track whether the Athlete is building fitness over time or losing it

**What it is NOT**
Not VO2max. Not FTP. Not race performance capability. Fitness (CTL) is a load-tolerance indicator — it reflects how
much training stress the Athlete can absorb, not how fast they can go.

Not sport-specific. A CTL of 85 built entirely on the bike does not represent the same running capacity as a CTL of
85 built predominantly running. Cross-sport CTL is a pragmatic approximation with known error.

**Example**
An Athlete training consistently 11 hours/week at 60 TSS/hour for 4 months: Fitness ≈ 80. Three weeks of complete
rest (illness): Fitness decays to approximately 55. Their subjective detraining sensation precedes the model's
prediction — actual muscle enzyme losses outpace CTL decay in the first two weeks.

**Persistence**
Computed output of the Fitness-Fatigue Model. The CTL series may be cached but is fully reconstructable from raw
Session data.

---

### 11. Form

**Definition**
The balance between the Athlete's Fitness and Fatigue. Form = Training Stress Balance (TSB) = CTL − ATL. Form answers:
"How fresh is this Athlete relative to their current fitness level?"

Form is a dimension of **Physiological State** (a sub-component of Athlete State).

**Why it exists**
An Athlete can be very fit (high CTL) but exhausted (high ATL). Form captures the net. The goal of tapering is
precisely to maintain Fitness while rapidly dissipating Fatigue — maximizing Form for race day. Without Form,
SHARPIT cannot communicate whether the Athlete is in a productive training block or dangerously overreaching.

**Responsibilities**

- Express the net relationship between Fitness and Fatigue at any point in time
- Serve as the primary load-derived Signal for the daily Verdict
- Guide tapering: Form should reach approximately +10 to +25 for peak race performance
- Signal danger: Form below −30 indicates significant overreach requiring load reduction

**What it is NOT**
Not a complete readiness indicator. Form only reflects training load history — it cannot capture illness, sleep debt,
psychological stress, or travel fatigue. High Form does not guarantee readiness.

Not sufficient alone for decisions. Form is one input into Readiness. Readiness is the full synthesis.

**Example**
After a 3-week taper for Ironman: CTL = 88, ATL = 52, TSB = +36. Peak Form. During a hard build: TSB = −20 —
expected and productive, not alarming. TSB = −40 after a race + immediate build: immediate load reduction required.

**Persistence**
Computed from Fitness and Fatigue (both computed from Training Stress history). The TSB series may be cached.

---

### 12. Adaptation

**Definition**
The physiological process by which the Athlete's body responds to training stress by becoming stronger, more
efficient, or more resilient. Adaptation is the fundamental purpose of all training. It requires the correct balance
of stress (training stimulus) and recovery (consolidation).

**Why it exists**
Without Adaptation, training produces only fatigue. SHARPIT's entire training model — PMC, ACWR, periodization,
recovery monitoring — exists to maximize Adaptation while managing Risk. "Am I adapting?" is one of the core
questions SHARPIT must help answer.

**Responsibilities**

- Be tracked indirectly through CTL trend (rising = adaptation occurring), Performance Capability progression
  (improving FTP, threshold pace = adaptation confirmed), and consistent performance against targets
- Require both adequate training stress (stimulus) AND adequate recovery (consolidation)
- Inform periodization phase design: each Phase targets specific adaptation mechanisms

**What it is NOT**
Not directly measurable. Adaptation is inferred from convergent evidence — never directly observed.

Not immediate. Meaningful physiological adaptation takes weeks to months to manifest.

Not guaranteed. High training stress without adequate recovery produces Fatigue without Adaptation — this is
non-functional overreaching.

Not uniform across sports. Endurance adaptation does not transfer to strength. Adaptation is specific to the stimulus.

**Example**
After a 10-week BASE phase: CTL rises from 52 to 71, resting HR decreases 2 bpm, FTP improves 255 → 270 W, threshold
run pace improves 3 seconds/km. These convergent changes are evidence that adaptation to the aerobic stimulus has
occurred.

**Persistence**
Not stored directly. Inferred from the trajectory of Fitness, Performance Capability, and Performance History.

---

### 13. Risk

**Definition**
The probability and potential severity of a harmful outcome — specifically: injury, overtraining syndrome, or
significant performance regression — resulting from a training decision. Risk is the safety dimension that
constrains all Recommendations unconditionally.

**Why it exists**
"The athlete's long-term health is always more important than short-term performance." (Manifesto)

SHARPIT must not only optimize adaptation — it must protect the Athlete from decisions that damage them. Risk is the
guardian concept. When Risk exceeds defined thresholds, it overrides all positive Signals, regardless of how good
the Athlete's Form or Readiness appears.

**Responsibilities**

- Be quantified through:
  - ACWR (acute:chronic workload ratio) — injury Risk from sudden load spike
  - Sustained Fatigue accumulation — overtraining Risk
  - Physical Condition severity — injury aggravation Risk
- Override positive Readiness and Form when safety thresholds are crossed
- Be communicated honestly: Risk cannot be suppressed or minimized
- Alert the Athlete when Risk exceeds defined thresholds (ACWR ≥ 1.5 warning, ≥ 1.8 danger)
- Never be bypassed by Coaching Intelligence reasoning — behavioral invariants are unconditional

**What it is NOT**
Not a prediction of injury. SHARPIT cannot predict whether a specific Athlete will be injured — it flags elevated
population-level probability. An ACWR of 1.6 does not mean injury is coming; it means statistical risk is elevated.

Not binary. Risk exists on a spectrum. Not zero. All training carries some degree of risk.

**Example**
After a training camp (4 days × 160 TSS/day): ACWR = 1.9. Risk Signal: "High injury risk — ACWR 90% above baseline.
Statistical injury risk 2-4× baseline at this ACWR. Mandatory load reduction 48h minimum. [Gabbett 2016, Carey 2017]"

**Persistence**
Computed from Training Stress data (ACWR) and Physical Condition records. Regenerated with each data update.

---

### 14. Readiness

**Definition**
The Athlete's estimated daily capacity to absorb and benefit from training. Readiness is the multi-signal synthesis
that answers: "Can this Athlete train hard today?" It integrates Recovery Signals (HRV, resting heart rate, Garmin
readiness score, sleep quality) and load-derived Signals (Form) under a defined priority hierarchy.

Readiness is the primary output of the **Recovery State** (a sub-component of Athlete State).

**Why it exists**
Form alone is insufficient for daily decisions. An Athlete with TSB = +10 (mathematically fresh) may have suppressed
HRV and poor sleep — physiologically unready for high-intensity. Conversely, an Athlete with TSB = −15 who has
excellent HRV and 9 hours of sleep is likely ready despite their load-derived "fatigue." Readiness closes this gap.

**Responsibilities**

- Synthesize multiple Recovery Signals into a graduated daily assessment (good / moderate / low)
- Apply the correct priority hierarchy: safety first, then physiological signals (HRV, readiness score),
  then load-derived signals (Form)
- Override positive Form when physiological Signals indicate impaired recovery
- Degrade gracefully when Signals are missing: qualify outputs rather than fabricate confidence
- Always expose the reasoning: "Moderate readiness driven by HRV suppression despite positive Form"

**What it is NOT**
Not a binary. Readiness exists on a continuum.

Not a replacement for subjective feeling. The Athlete's own perception is primary data. A Readiness assessment of
"good" with an Athlete who reports feeling terrible deserves immediate attention.

Not fixed — Readiness can change within the same day (improving after morning recovery, declining after afternoon
heat and stress).

**Example**
Post-hard-session morning: Form = −8 (normal training fatigue). Garmin Readiness = 58 (moderate). HRV = 7% below
baseline. ACWR = 1.2 (optimal zone). Readiness: "Moderate — aerobic or technical session recommended; no high
intensity today." The HRV dip governs the recommendation despite modest Form depletion.

**Persistence**
Computed daily from available Observations and Signals. Not stored independently.

---

### 15. Performance Capability

**Definition**
The current estimated set of physiological capabilities that define what this Athlete can sustain at various
intensities, durations, and efforts. Performance Capability encompasses: aerobic thresholds (FTP, LTHR, CSS),
aerobic capacity (VO2max estimate), running economy parameters (threshold pace, VMA), neuromuscular capacity, and
sport-specific endurance limits.

Performance Capability is the primary output of the **Performance State** (a sub-component of Athlete State), and the
evidence base for training zone prescription, Training Stress computation, race Prediction, and Adaptation tracking.

**Why it exists**
Performance Capability is what makes Training Stress meaningful at the individual level. 250 W is Zone 2 for one
Athlete and Zone 5 for another, depending on their FTP. Without Performance Capability, all load computation
degrades to population averages that are irrelevant for individual athletes.

Performance Capability also represents the evidence of Adaptation over time — a rising FTP is Adaptation made visible.

**Responsibilities**

- Aggregate the Athlete's physiological capability parameters across sport dimensions
- Be estimated from Performance History (best efforts, power curves, race results), direct tests (FTP tests, time
  trials), and Capability Estimation Models
- Update when new evidence arrives (test result, new personal best, performance analysis)
- Track capability evolution over time to confirm Adaptation is occurring (or detect regression)
- Serve as the calibration input for Training Stress computation (1 hour at threshold = 100 TSS, by definition)
- Feed race time Predictions via Performance Prediction Models (Riegel law, etc.)

Sub-dimensions:

- **Aerobic Threshold Capability** — sustainable intensity below lactate accumulation (LT1 / ~75% FTP)
- **Lactate Threshold Capability** — maximal intensity with balanced lactate production (LT2 / FTP / CSS / VMA)
- **Aerobic Capacity** — VO2max estimate — the ceiling of aerobic performance
- **Neuromuscular Capability** — peak power, sprint performance, explosive output
- **Endurance Capability** — sustainable performance at ultra-endurance durations

**What it is NOT**
Not a fixed value. Performance Capability changes with training and detraining — it is always an estimate from the
best available evidence at a given time.

Not directly measurable. Capability is always inferred by a Capability Estimation Model. Even a laboratory lactate
test produces an estimate with known measurement error.

Not the same as Fitness (CTL). Fitness tracks load tolerance. Performance Capability tracks what the Athlete can
physiologically DO at specific intensities.

Not "Performance Records" in the trophy-display sense. The records are the evidence base for estimation — they
inform the Capability Model. The capability estimate is what matters, not the records themselves.

**Example**
Current capability profile: FTP = 278 W (estimated from 20-min power curve best effort), LTHR = 163 bpm (from
race data), threshold pace = 4:10/km (from recent 10K), VO2max estimate = 54 ml/kg/min (from Cooper running test).
After 12 weeks: FTP estimated at 292 W (new power curve personal best), threshold pace improved to 4:03/km.
The delta is the fingerprint of Adaptation to the BUILD phase.

**Persistence**
Persistent. Current capability values are stored on the Athlete profile with a history of snapshots to track
evolution. Performance History (the evidence base — power curves, best efforts, race results) is stored on completed
Sessions.

---

### 16. Athlete State

**Definition**
SHARPIT's multi-dimensional estimate of the Athlete's current condition. Athlete State is what the Digital Twin
continuously updates. It is multi-layered: it captures not only the physiological condition (Fatigue, Fitness, Form)
but also the Recovery condition (Readiness), the Performance condition (current capabilities vs. baseline), and the
Goal alignment (trajectory toward objectives).

**Why it exists**
The original concept "Physiological State" was too narrow. The Digital Twin does not model only physiology — it models
the full picture of what the Athlete IS at any moment: their fitness, their recovery, their capabilities, and where
they stand relative to their goals. "Athlete State" is the correct name for that totality.

**Responsibilities**
Athlete State integrates four sub-dimensions:

- **Physiological State** — Fatigue, Fitness, Form, Adaptation trajectory. Produced by the Fitness-Fatigue Model
  from Training Stress history.
- **Recovery State** → Readiness. Produced by the Recovery Synthesis Model from Recovery Signals (HRV, sleep,
  resting HR, Garmin score).
- **Performance State** — current Performance Capability relative to historical baseline and Goal targets. Produced
  by the Capability Estimation Model from Performance History and recent Sessions.
- **Goal State** — the Athlete's trajectory toward their declared Goals: on track / ahead / behind / at risk.
  Computed from Performance State, Training Plan adherence, and time remaining.

**What it is NOT**
Not a single score. Every single-number representation is an impoverished approximation of one dimension.

Not directly observable. Every dimension of Athlete State is an estimate produced by a Model from available Signals.

Not static. It is in permanent motion — updated after every Session, every Sleep, every new Observation.

Context is NOT a dimension of Athlete State. Context (work schedule, constraints, preferences) is external input
that the Athlete provides explicitly. Athlete State is what SHARPIT INFERS, not what the Athlete declares.

Confidence is NOT a dimension of Athlete State. Confidence is the epistemic quality of SHARPIT's estimates.
It is a property of outputs, not a state of the Athlete.

**Example**
Thursday morning, race week: Physiological State: CTL = 92, ATL = 65, TSB = +27 (very fresh). Recovery State:
Readiness = 84/100 (HRV within 2% of baseline, sleep 7h54m, Garmin 79). Performance State: FTP estimate unchanged,
running pace on target. Goal State: 8 days to Ironman 70.3, CTL trajectory aligned with target. No Risk signals.
Physical Condition: knee monitoring, severity 2 (stable).

**Persistence**
Never stored as a whole. Individual dimensions are computed from stored observations, Training Stress history,
and Performance History on demand. Point-in-time snapshots of key dimensions may be stored for trend analysis.

---

### 17. Digital Twin

**Definition**
SHARPIT's continuously evolving internal model of the Athlete — the persistent, aggregate container that holds all
Observations, maintains all Signals, runs all Models, and exposes the current Athlete State. The Digital Twin is the
product itself. Every recommendation, alert, and prediction is a consequence of this model.

**Why it exists**
The Manifesto states unambiguously: "The Digital Twin is the product. Recommendations are only one consequence of
this model."

The Digital Twin is not a database enriched with metrics. It is the result of an explicit inference chain: Observations
enter, Signals are extracted, Models infer, Athlete State is updated. The Digital Twin is the orchestrator of this
pipeline and the persistent memory of its history.

**Responsibilities**

- Receive new Observations and trigger Signal extraction
- Maintain the Athlete's complete Observation history (immutable record)
- Invoke the appropriate Models when new Signals are available
- Update Athlete State dimensions as Model outputs change
- Expose the current Athlete State to the Decision Engine
- Express every estimate with calibrated Confidence
- Be explainable: every state estimate traces to the Observations and Models that produced it (Evidence)
- Improve over time as the Athlete's history grows and baselines stabilize
- Acknowledge its own limitations: flag when data is missing, stale, or of low quality

**What it is NOT**
Not a dashboard. Not a database. Not a collection of charts. The Digital Twin is a generative inference model —
it can answer questions that no individual metric can answer, because it integrates across all Signals.

Not omniscient. The Digital Twin never achieves certainty. Its quality depends directly on the quality and
completeness of its Observations. Poor data → poor understanding.

Not a monolith. Each Model within the Digital Twin is independently replaceable. Replacing the PMC Model with a
Banister Impulse-Response Model changes how Fatigue/Fitness are estimated, not what they mean.

**Example**
At 7 AM: the Digital Twin receives a new Sleep Observation (HRV = 68 ms, sleep 7h12m, score 82). It extracts a
Recovery Signal: "HRV 2% below 30-day baseline — within normal range. Sleep duration 90% of target." The Recovery
Synthesis Model updates Recovery State → Readiness: 72/100. The Fitness-Fatigue Model has yesterday's 95 TSS
factored in: ATL = 86, CTL = 84, TSB = −2. Goal State: 12 days to target race, CTL on track. All inputs to the
Decision Engine are now current.

**Persistence**
The Digital Twin's history (Observations, Training Stress data, Performance History, capability snapshots) is
persistent. Current-state estimates (Athlete State) are computed on demand from the stored history.

---

### 18. Evidence

**Definition**
The structured causal chain that traces any SHARPIT output — a Recommendation, an Alert, a Prediction — back to
the specific Observations, Signals, Models, and thresholds that produced it. Evidence is what makes explainability
operational, not aspirational.

**Why it exists**
The Manifesto requires every recommendation to answer: "Why? Based on which observations? Based on which scientific
model? With which assumptions? With which confidence? What uncertainty remains?"

Evidence is not an audit log. It is a first-class domain output. Without Evidence, SHARPIT is a black box that
produces recommendations without justification — which violates its core promise and the Athlete's right to
understand the system advising them.

**Responsibilities**

- Associate each significant output with the Observations that informed it
- Identify which Signals were derived from those Observations
- Identify which Model was applied, its version, and its evidence level
- Identify the threshold or rule that triggered the output
- Express the Confidence level at each stage of the inference chain
- Be presentable to the Athlete in intelligible language:
  "Your HRV dropped 12% → Recovery Signal: parasympathetic suppression → Recovery Model: reduced readiness →
  Decision Engine: no high-intensity training today."

**What it is NOT**
Not an audit log (implementation detail). Evidence is a human-readable explanation object — a structured narrative
of the inference chain, not a technical trace.

Not just a disclaimer. Evidence enables the Athlete to understand, evaluate, and ultimately disagree with SHARPIT's
outputs if their subjective experience contradicts the inference. This is the correct relationship between the
system and its user.

**Example**
Recommendation: "Replace tomorrow's tempo run with Z2."
Evidence bundle:

- Observations: HRV = 64 ms (−10% baseline), sleep 6h42m (−78m target), last session TSS = 91
- Signals: Recovery Signal — HRV moderate suppression; Sleep Signal — duration deficit
- Model: Recovery Synthesis Model (v1.2) applied → Readiness = 58/100
- Rule: Readiness < 65 → recommend recovery session, not intensity
- Evidence level: HRV-based recovery inference — Buchheit 2014 (Level 3-4)
- Confidence: High (three signals in agreement, all current)

**Persistence**
Partially persistent. Evidence bundles for significant stored outputs (Daily Briefings, Alerts) are stored alongside
the outputs they justify. Evidence for ephemeral outputs is computed on demand.

---

### 19. Confidence

**Definition**
The epistemic certainty attached to any SHARPIT output. Confidence reflects four dimensions: data completeness (are
all required Signals present?), data recency (are they current?), model validity (how well-validated is the underlying
science?), and individual fit (does the Model's population match this Athlete?). Confidence is a first-class property
of every output SHARPIT produces — not an optional qualifier.

**Why it exists**
"Bien récupéré : séance intense possible" supported by 30 days of excellent multi-signal data is qualitatively
different from the same statement supported by 3 days of data and no HRV. Without Confidence, the Athlete cannot
distinguish these cases. Fabricating certainty violates the Manifesto's core principles.

**Responsibilities**

- Be computed for every significant output (Verdict, Recommendation, Prediction, Alert)
- Govern output language: high confidence → specific recommendations; low confidence → qualified language;
  insufficient → display data gap, no recommendation
- Prevent recommendations when data is insufficient — show an explicit "Données insuffisantes" state instead
- Communicate data quality issues to the Athlete: "Your HRV baseline is still being established (day 12 of 21
  needed for stable trend analysis)"

**What it is NOT**
Not just a warning label. Low Confidence changes WHAT the system outputs, not just how it presents it.

Not a single percentage. Confidence is multi-dimensional and the weakest dimension gates the overall level.

**Example**
New user, day 8. Data completeness: minimal (no HRV history, no sleep regularity, no baselines). Individual fit:
low (no personal baselines established). → Overall Confidence: Low. Output: "Données insuffisantes pour une
recommandation précise. Les analyses s'amélioreront après 21 jours d'utilisation régulière. Charge estimée :
±60 TSS. Écoutez votre ressenti."

**Persistence**
Computed on demand as a dimension of every significant output. Not independently stored.

---

### 20. Decision Engine

**Definition**
The deterministic, rule-based system that transforms the current Athlete State, active Alerts, Confidence levels,
and Context into Verdicts and Recommendations. The Decision Engine encodes SHARPIT's priority hierarchy — the
explicit rules governing how understanding becomes guidance.

**Why it exists**
Someone must decide. The inference pipeline (Observations → Signals → Models → Athlete State) produces understanding.
The Decision Engine converts that understanding into action guidance, transparently and consistently. Without an
explicit Decision Engine concept, the rules governing how Athlete State becomes a Verdict are invisible and
inconsistent — they live scattered across components with no authoritative definition.

The Decision Engine is also the boundary between **deterministic logic** (the Decision Engine) and **contextual
reasoning** (Coaching Intelligence). This separation is architecturally critical: the engine decides; the coach
explains.

**Responsibilities**

- Apply the defined priority hierarchy (see below) to produce Verdicts and activate Recommendations
- Be deterministic: the same Athlete State always produces the same Verdict and the same Alerts
- Be transparent: every Decision traces to the rule that produced it
- Be separate from Coaching Intelligence: the Decision Engine decides; the AI Coach explains and contextualizes
- Enforce behavioral invariants unconditionally:
  - Physical Condition severity ≥ 6 → no hard training, regardless of any other Signal
  - ACWR ≥ 1.8 → mandatory load reduction, regardless of Form or Readiness
  - These invariants cannot be overridden by any other signal, any Confidence level, or any AI reasoning

Priority hierarchy (descending precedence):

1. **Physical Condition** (severity ≥ 6) → all training recommendations overridden. Rest or medical consultation.
2. **Risk / ACWR** (≥ 1.5 warning, ≥ 1.8 danger) → load reduction required in any Recommendation.
3. **Recovery State / Readiness** (physiological Signals: HRV, resting HR, Garmin score) → overrides Form/TSB
   when they disagree.
4. **Physiological State / Form (TSB)** — contextual modifier when physiological Signals are unavailable.
5. **Goal State and Context** — personalizes Recommendations within the above safety constraints.

**What it is NOT**
Not the AI Coach. Coaching Intelligence is conversational, contextual, and interpretive. The Decision Engine is
deterministic, rule-based, and authoritative. They are complementary: the Decision Engine produces the Verdict;
Coaching Intelligence wraps it in understanding.

Not omniscient. The Decision Engine operates only on what the Digital Twin knows. Its quality depends on Signal
quality and Model accuracy.

**Persistence**
Not stored — the Decision Engine is code. Its outputs (Verdicts, active Recommendations) may be stored when
published as Daily Briefings.

---

### 21. Verdict

**Definition**
The single, consolidated daily training recommendation that synthesizes all available Signals into one actionable
answer. The Verdict is the primary output of the Decision Engine — it answers the Athlete's fundamental question:
"What should I do today?"

**Why it exists**
The Athlete is surrounded by metrics. The Verdict's purpose is radical simplification: distill every available Signal
— Readiness, Form, Risk, Physical Condition, day context — into one clear guidance with a tone (good / moderate /
low), a headline, and an explanation. This is SHARPIT's core daily promise.

**Responsibilities**

- Synthesize the Decision Engine's output (Athlete State + priority hierarchy) into a single daily recommendation
- Always expose the Signals and Evidence that produced it — the Verdict must be fully explainable
- Adapt to temporal context: a morning Verdict, a post-session Verdict, and an evening Verdict have different meaning
- Degrade gracefully when data is insufficient: qualify Confidence explicitly

**What it is NOT**
Not a command. The Verdict is a recommendation, not an order. The Athlete remains the final decision-maker, always.

Not a free-form AI opinion. The Verdict is deterministic — the same Athlete State always produces the same Verdict.
Coaching Intelligence provides contextual narration around the Verdict; it does not replace it.

**Example**
"Feu vert pour l'intensité. Tu es bien récupéré et ta charge est sous contrôle : tu peux encaisser une séance
qualitative. · Readiness 84/100 · Forme +6 (optimal) · ACWR 1.05 · 1 séance planifiée"

Alternative: "Priorité à la récupération. [DANGER] Risque de blessure — ACWR 1.82 · Readiness 48/100 · Douleur
genou active (sévérité 7). Repos obligatoire."

**Persistence**
Computed on demand from current Athlete State. The AI-generated Daily Briefing is the persistent narrative version.

---

### 22. Recommendation

**Definition**
A specific suggested action produced by SHARPIT for the Athlete. Unlike the Verdict (the daily synthesis),
a Recommendation is targeted: it addresses a specific dimension of the Athlete's behavior and suggests a concrete
change. Every Recommendation must carry its reasoning, Confidence level, and Evidence.

Recommendations are typed by domain:

- **Session Recommendation** — what session to do, replace, or cancel
- **Load Recommendation** — weekly load target, volume adjustment, recovery week
- **Recovery Recommendation** — rest day, cold/heat protocol, massage, nutrition timing
- **Sleep Recommendation** — bedtime target, screen habits, thermal management
- **Planning Recommendation** — Training Plan adjustment, phase shift, goal revision
- **Capability Test Recommendation** — when to retest FTP, threshold pace, VO2max estimate

**Why it exists**
An Athlete who understands their state but doesn't know what to do with that understanding cannot act. Recommendations
convert SHARPIT's physiological understanding into concrete, actionable guidance.

**Responsibilities**

- Be specific and actionable: "Replace Thursday's tempo session with Z2 run" is a Recommendation. "You seem fatigued"
  is not.
- Always expose Evidence: "Based on HRV suppression (−12% baseline) and yesterday's 95 TSS session..."
- Express Confidence: "High — four Signals in agreement" or "Low — load data only"
- Include expected benefit and possible downside
- Never fabricate certainty — if data is weak, say so explicitly

**What it is NOT**
Not a description. "Your ACWR is 1.65" is an Alert, not a Recommendation. A Recommendation always says what to DO.

Not a medical prescription. When physical symptoms suggest clinical concern, SHARPIT's recommendation is to consult
a physician, not to diagnose.

**Example**
"Based on your moderate Readiness (62/100) and yesterday's threshold session (91 TSS), I recommend replacing
tomorrow's planned tempo run with a 50-minute Z2 run instead. The planned session would be better placed Thursday
when your Readiness should recover. [Session Recommendation · Confidence: High · Evidence: Garmin readiness +
HRV −8% + TSB −14 · Recovery Model v1.2]"

**Persistence**
Daily Briefings and Weekly Reviews are persistent Recommendation outputs. Proactive Recommendations generated from
current state are computed on demand.

---

### 23. Alert

**Definition**
A deterministic, threshold-based safety Signal generated when a specific observable condition crosses a defined limit.
Alerts are NOT Recommendations — they are factual threshold notifications that must be visible to the Athlete
regardless of how positive other Signals appear.

**Why it exists**
Some conditions are too important to be handled through qualitative reasoning. When ACWR exceeds 1.5, that fact must
be communicated clearly — it cannot be softened by positive Form. Alerts are SHARPIT's safety net. They are produced
by the Decision Engine, not the Coaching Intelligence layer, and cannot be overridden by any reasoning.

**Responsibilities**

- Fire deterministically: the same Athlete State always produces the same Alerts
- Have three severity levels: `info` (attention), `warning` (action recommended), `danger` (action required)
- Cover the defined risk domains: injury risk (ACWR), recovery (HRV declining trend, elevated RHR), sleep deficits,
  active Physical Conditions
- Be visible regardless of other positive Signals — Alerts are additive, not competing
- Include the triggering Signal, the threshold crossed, and the scientific Evidence level

**What it is NOT**
Not a Recommendation. Alerts describe what IS, not what to DO.

Not probabilistic. An Alert fires or does not fire based on defined deterministic rules.

Not suppressible by AI reasoning.

**Example**
"[AVERTISSEMENT] HRV en baisse marquée. Ton HRV moyen des 3 derniers jours (58 ms) est 18% en dessous de ta moyenne
récente (71 ms). Récupération incomplète détectée. Privilégie une journée légère ou de repos. [Source: HRV Signal ·
Evidence: Buchheit 2014 · Level 3-4]"

**Persistence**
Computed from current Observations and Signals. Not independently stored — recomputed on each data update.

---

### 24. Prediction

**Definition**
A forward-looking estimate produced by the Decision Engine about the Athlete's future performance or physiological
trajectory. Predictions carry explicit Confidence and are produced by applying Performance Prediction Models to
current Athlete State and Performance History.

Predictions are typed by domain:

- **Performance Forecast** — projected race time, FTP, or threshold performance at a future date
- **Recovery Forecast** — estimated time to full Readiness after a hard block, illness, or injury
- **Adaptation Forecast** — projected CTL and Performance Capability evolution given the current Training Plan
- **Risk Forecast** — projected ACWR and overtraining Risk trajectory under current load

**Why it exists**
Athletes make decisions today that affect performance weeks or months from now. Without Predictions, planning is
intuition. SHARPIT's Predictions close the gap: "If I follow this Training Plan, what will my Form be at race day?
What will my race time likely be given current fitness?"

**Responsibilities**

- Estimate race performance from current Performance Capability (Riegel fatigue law for running)
- Project CTL and Form at race date given current Training Plan adherence
- Always communicate uncertainty explicitly — no Prediction is a guarantee
- Always communicate the Model, its assumptions, and limitations
- Differentiate Predictions with horizon-appropriate Confidence: ≤4 weeks = moderate accuracy,
  > 6 weeks = directional only

**What it is NOT**
Not a guarantee. Performance depends on race-day conditions, nutrition, sleep, and factors beyond SHARPIT's model.

Not a diagnosis. "You will be injured" is not a Prediction SHARPIT makes. Risk Forecast gives probabilistic signal;
injury outcome is individual and cannot be predicted.

**Example**
"Performance Forecast: based on your best 10K (44:15), I estimate your HM time at approximately 1:36:40 (Riegel
1.06, ±4%). Adaptation Forecast: your CTL trajectory (+8/day) projects CTL = 91 at race week if you maintain
current load — up from today's 77. Confidence: Moderate (assumes no interruption)."

**Persistence**
Computed on demand. Not stored individually. Capability snapshots informing Predictions are stored as part of
Performance History.

---

### 25. Scenario

**Definition**
An alternative future configuration of training inputs, explicitly designed to represent a "what if" hypothesis
that the Athlete or Coaching Intelligence wants to explore through Simulation. A Scenario specifies the deviations
from the current Training Plan that should be modeled: a different load distribution, an added training camp, a
modified taper, a race schedule change.

**Why it exists**
Decisions with irreversible consequences — adding a training camp, skipping a taper week, switching a race priority —
deserve structured exploration before action. The Scenario is the OBJECT of that exploration. Without the Scenario
as a first-class domain concept, "what if" reasoning has no container, no identity, and no comparability between
alternatives.

The relationship: Scenario → Simulation → Prediction → Decision. The Athlete designs a Scenario; SHARPIT runs a
Simulation against that Scenario; the Simulation produces a Prediction of the resulting Athlete State; the Athlete
makes a Decision informed by that Prediction.

**Responsibilities**

- Define the modification to the current trajectory (add load, remove load, change intensity, shift taper, skip race)
- Specify the time horizon of the Simulation
- Be reusable — the same Scenario can be re-simulated as the Athlete's current state changes
- Enable comparison between multiple Scenarios on a common basis

**Example**
Scenario A: "Add 2-day training camp this weekend: +180 TSS above current plan."
Scenario B: "Start taper 1 week earlier than current plan."
Scenario C: "Downgrade Nice from A-race to B-race and add a late-season A-race."

Each Scenario is passed to Simulation independently. The Athlete compares the projected outcomes.

**Persistence**
Persistent when explicitly saved by the Athlete or Coaching Intelligence. Ephemeral for exploratory simulations that
are not saved.

---

### 26. Simulation

**Definition**
A "what-if" computation that projects the Athlete's future Athlete State under a defined Scenario before any action
is taken. Simulations run the Digital Twin's Models forward in time using the alternative inputs specified by the
Scenario, producing a Prediction of the resulting Athlete State.

**Why it exists**
Training decisions with non-trivial consequences deserve quantitative analysis before commitment. Simulation
transforms these decisions from intuition into evidence-based reasoning: the Athlete can compare projected outcomes
of alternative Scenarios before committing to one.

**Responsibilities**

- Accept a Scenario as input (the alternative training configuration)
- Project the impact on Athlete State dimensions (CTL, ATL, TSB, ACWR, estimated Readiness) over the defined horizon
- Compare the simulated future against the default trajectory
- Express uncertainty: longer horizons have higher uncertainty; Simulations beyond 6 weeks are directional only
- Enable Scenario comparison with quantified differences

**What it is NOT**
Currently aspirational in SHARPIT — this is Phase 4 of the product roadmap and is not yet implemented. Its inclusion
here reflects the domain concept, which exists regardless of implementation status.

Not a guarantee. Simulated trajectories can be disrupted by illness, injury, or life events outside the model.

**Example**
"Scenario A: add Saturday long ride (+75 TSS). Projected: CTL at taper entry = 85 (vs. 83 current plan). Risk: ACWR
on Friday of week 6 reaches 1.45 (elevated). Alternative: move Thursday tempo to Saturday + extend 20 min — same
CTL gain, no ACWR spike. [Simulation confidence: Moderate (4-week horizon)]"

**Persistence**
Not stored in current implementation. Future: Simulations would be persistable with stored Scenarios for comparison.

---

### 27. Goal

**Definition**
An Athlete-defined target that gives direction and meaning to all training decisions. Goals are of two kinds:
**Race** (a specific competitive event with a date and optionally a target performance) and **Metric** (a measurable
performance target to reach by a date). Race Goals carry priority: **A** (season's primary objective), **B**
(intermediate race), **C** (training race or test event).

**Why it exists**
Training without a Goal is exercise without direction. SHARPIT uses Goals as the anchor for periodization (a race
date drives Training Plan generation), Planning (phase structure derives from weeks before the race), and Goal State
tracking (is the current trajectory consistent with reaching the target?).

**Responsibilities**

- Provide the anchor date for Training Plan generation
- Define what success looks like (target performance, time, or metric value)
- Organize the season through A/B/C priority
- Drive urgency signals in daily coaching ("J-12 avant votre Ironman")
- Inform the Goal State dimension of Athlete State

**What it is NOT**
Not a wish. A Goal without a date, a measurable target, and a priority cannot drive periodization.

A Race Goal is not a calendar event. It is the physiological target that all training prepares for.

**Example**
Goal A: "Ironman 70.3 Nice — October 12, 2026. Target: Sub-5h00." Anchors a 20-week Training Plan.
Goal B: "HM Marseille — June 22, 2026. Target: Sub-1h50."
Metric Goal: "Run threshold pace below 4:10/km by end of BUILD phase."

**Persistence**
Persistent. Goals, their target values, and progress history are stored throughout the training season.

---

### 28. Training Plan

**Definition**
A structured program of future training organized to produce peak physiological preparedness at a target Goal date.
A Training Plan defines the macro structure: total duration, training phases, weekly load objectives, and deload weeks.

**Why it exists**
Without a plan, training is reactive — the Athlete responds to how they feel today rather than building systematically
toward a peak. The Training Plan embodies SHARPIT's periodization intelligence.

**Responsibilities**

- Be anchored to a Race Goal with a defined target date
- Organize training into sequential Phases (BASE → BUILD → PEAK → TAPER → RACE)
- Define weekly target Training Stress and hours for each week
- Schedule deload weeks at regular intervals (every 4 weeks during BASE/BUILD) to enable supercompensation
- Calibrate weekly targets to the Athlete's current Fitness (CTL baseline)

**What it is NOT**
Not a rigid daily schedule. A Training Plan defines weekly load targets and phase intent — not every session.

Not a guarantee. An Athlete who consistently completes 60% of planned sessions cannot expect the Plan's projected
outcomes.

**Example**
18-week plan for Ironman 70.3 Nice: BASE 4w (320→380 TSS/week) → BUILD 5w (400→460 TSS/week) → PEAK 3w
(470→490 TSS/week) → TAPER 2w (280→200 TSS/week) → RACE 1w. Baseline CTL: 65. Target CTL at TAPER entry: 88.

**Persistence**
Persistent. An Athlete may have at most one active plan. Previous plans are archived.

---

### 29. Phase

**Definition**
A named period within a Training Plan with a specific physiological focus, load multiplier, and training emphasis.
SHARPIT implements linear periodization through five phases: **BASE**, **BUILD**, **PEAK**, **TAPER**, and **RACE**.

| Phase | Focus                                           | Load factor | Duration  |
| ----- | ----------------------------------------------- | ----------- | --------- |
| BASE  | Aerobic foundation, high volume, low intensity  | 0.85×       | 3-6 weeks |
| BUILD | Progressive overload, threshold work introduced | 1.00×       | 4-6 weeks |
| PEAK  | Race-specific intensity, maximum combined load  | 1.08×       | 2-3 weeks |
| TAPER | Volume reduction, intensity maintained briefly  | 0.55→0.35×  | 2-3 weeks |
| RACE  | Active recovery and competition                 | 0.25×       | 1 week    |

**Why it exists**
Different physiological adaptations require different stimuli. BASE builds mitochondrial density and aerobic enzyme
capacity. BUILD raises lactate threshold and VO2max. PEAK pushes race-specific neuromuscular adaptation. TAPER
allows supercompensation. Undifferentiated year-round training at constant intensity produces inferior adaptation.

**Responsibilities**

- Define the physiological intent for a period of training
- Prescribe the load multiplier relative to the Athlete's baseline CTL
- Set the training emphasis (what kind of work to prioritize)
- Provide Coaching Intelligence with context for session prescription

**What it is NOT**
Not a rigid block with immovable boundaries. Phases can shift if the Athlete is ahead of their CTL target, if an
injury requires a detour, or if a new race is added.

**Persistence**
Persistent as weekly records within a Training Plan.

---

### 30. Context

**Definition**
The Athlete's personal situation that shapes how Recommendations must be interpreted and personalized. Context
includes: lifestyle constraints (work schedule, family, travel), explicit training targets (hours/week, sleep goal),
physical environment (available equipment, altitude), and free-form notes about current circumstances.

**Why it exists**
"No two athletes are identical." Personalization is not a feature — it is the operating principle. The same training
recommendation appropriate for a professional athlete is irrelevant for a parent who can train 6 hours/week.
Context is what makes personalization possible.

Context is explicitly provided by the Athlete — it is not inferred by the Digital Twin. This is the key distinction
from Athlete State: State is estimated; Context is declared.

**Responsibilities**

- Inform Coaching Intelligence for every Recommendation generation
- Store explicit targets (sleep goal, training hours per week, bedtime target)
- Capture free-form narrative about the Athlete's current life and constraints
- Be kept current — stale Context produces irrelevant Recommendations
- Prevent SHARPIT from generating recommendations that are practically impossible given the Athlete's circumstances

**What it is NOT**
Not a dimension of Athlete State. Context is external input (explicitly declared), not inferred.

Not a preferences database. Context is the Athlete's life description — qualitative as much as quantitative.

**Example**
"Full-time software engineer. Work ends 20-22h. Train 10-12 hours/week. Cannot train Tuesday mornings. Prefers
morning sessions. Sleep target: 8 hours. Bedtime goal: 22h30. Partner is expecting in November — training
availability will reduce significantly."

**Persistence**
Persistent. Stored on the Athlete's profile as structured fields (numeric targets) and free-form text.

---

### 31. Coaching Intelligence

**Definition**
The reasoning and communicative layer of SHARPIT that generates natural language explanations, contextual coaching,
and conversational interaction. Coaching Intelligence synthesizes all other domain concepts into human-readable
guidance that goes beyond what the Decision Engine alone can express.

**Why it exists**
The Decision Engine produces Verdicts and Alerts. But training decisions are made by humans who need explanation,
context, and conversation — not just scores and thresholds. "Your ATL is 90" does not help the Athlete decide.

"Yesterday's 140 TSS session is still present in your acute load, which is why your Readiness is moderate despite
positive Form. This is expected and temporary — a Z2 session today will consolidate the adaptation without adding
unnecessary Fatigue" does help.

Coaching Intelligence is the interpretive layer that translates the Decision Engine's deterministic output into
human reasoning.

**Responsibilities**

- Explain the reasoning behind Verdicts and Recommendations in natural language
- Provide context that deterministic Models cannot capture: "Your moderate Readiness is expected given Sunday's
  long ride — not a concern in isolation"
- Engage in multi-turn conversation about training, recovery, planning, and performance
- Generate daily Briefings and weekly Reviews that synthesize the physiological narrative
- Apply Context to personalize explanations and avoid irrelevant suggestions
- Acknowledge uncertainty and limitations honestly — never project more Confidence than the data supports
- NEVER override safety behavioral invariants — the Decision Engine's rules are unconditional

**What it is NOT**
Not a free-form AI that can say anything. Coaching Intelligence is constrained by SHARPIT's scientific principles,
domain safety rules, and the requirement for explainability. It interprets Decision Engine outputs — it does not
replace them.

Not a substitute for Verdicts and Alerts. Coaching Intelligence adds context and communication. The Decision Engine's
output is independent and authoritative.

**Example**
Athlete: "My Readiness is 55 this morning but I feel perfectly fine — should I do my planned interval session?"

Coaching Intelligence: "Your Readiness of 55 reflects mainly yesterday's 95 TSS threshold session in your ATL.
Your HRV this morning is within 5% of your baseline — better than a typical post-threshold score. The 55 is
slightly conservative given your subjective feeling. If you feel genuinely strong after warmup (not just motivated),
do the intervals at the lower end of your zones and be prepared to switch to Z2 if your HR runs high at target
power. If you have to force the effort — abort. The adaptation from yesterday is still consolidating and pushing
through today risks setting back next week."

**Persistence**
Conversations are persistent. Daily Briefings and Weekly Reviews are generated and stored. The reasoning capacity
is invoked on demand.

---

## The Inference Pipeline in Practice

```
Raw World                     SHARPIT Inference Pipeline           Athlete Output
─────────────────────────────────────────────────────────────────────────────────

Athlete runs a session ──► Session (Observation)
                                   │
Athlete sleeps ──────────► Sleep (Observation)        Signal Extraction
                                   │                         │
Garmin measures ─────────► HRV/Readiness/RHR (Obs.)         ▼
                                   │                      Signals
Athlete reports soreness ─► Subjective (Observation)   (contextualized,
                                   │                    baseline-relative)
Athlete logs condition ──► Physical Condition (Obs.)         │
                                   │                         │ Models apply
                                   │                         ▼
                                   │               Fitness-Fatigue Model
                                   │               Recovery Synthesis Model
                                   │               Capability Estimation Model
                                   │               Risk / ACWR Model
                                   │                         │
                                   │                         ▼
                                   │                   Athlete State
                                   │              ┌─── Physiological State
                                   │              │    (Fatigue/Fitness/Form)
                                   │              ├─── Recovery State
                                   │              │    (Readiness)
                                   │              ├─── Performance State
                                   │              │    (vs. Capability)
                                   │              └─── Goal State
                                   │                         │
                                   └──────── History ────► Digital Twin
                                                             │
                                                    Decision Engine
                                                    (deterministic rules,
                                                     priority hierarchy)
                                                             │
                                          ┌──────────────────┤
                                          │                  │
                                       Verdict         Recommendation
                                       Alert            Prediction
                                                       Simulation (← Scenario)
                                          │
                                  Each output carries:
                                  Evidence + Confidence
                                          │
                                  Coaching Intelligence
                                  (contextual explanation,
                                   natural language)
                                          │
                                  Athlete decides
```

---

## Relationships Between Concepts

### Priority hierarchy (when Signals conflict)

1. **Physical Condition** (severity ≥ 6) → all training recommendations overridden. Rest or medical consultation.
2. **Risk / ACWR** (≥ 1.5 warning, ≥ 1.8 danger) → load reduction required in any Recommendation.
3. **Recovery State / Readiness** (HRV, resting HR, Garmin score) → overrides Form/TSB when they disagree.
4. **Physiological State / Form (TSB)** — contextual modifier when Recovery Signals are unavailable.
5. **Goal State and Context** — personalizes Recommendations within the above safety constraints.

No amount of positive Form, high Fitness, or high Confidence can override a safety signal at a higher priority level.

### Athlete State decomposition

```
Athlete State
├── Physiological State  ←── Fitness-Fatigue Model(Training Stress history)
│    ├── Fatigue (ATL)
│    ├── Fitness (CTL)
│    ├── Form (TSB)
│    └── Adaptation (trajectory)
│
├── Recovery State  ←── Recovery Synthesis Model (HRV + Sleep + Garmin signals)
│    └── Readiness (daily estimate)
│
├── Performance State  ←── Capability Estimation Model (Performance History + tests)
│    └── Performance Capability (FTP, LTHR, threshold pace, VO2max, etc.)
│
└── Goal State  ←── computed from Performance State + Training Plan + time remaining
     └── trajectory (on track / ahead / behind / at risk)
```

---

## What belongs here — and what does not

### These ARE domain concepts

The 31 concepts above. Each has domain meaning independent of technology, implementation, or user interface.

### These are NOT domain concepts — they are implementation artifacts

| Term                                   | What it actually is                                                               |
| -------------------------------------- | --------------------------------------------------------------------------------- |
| `Garmin`, `Strava`, `Renpho`, `Google` | Data sources — infrastructure, not domain                                         |
| `TSS`, `CTL`, `ATL`, `TSB`, `ACWR`     | Metric computations — outputs of Models, not domain concepts                      |
| `Dashboard`                            | UI concept — a view of the domain                                                 |
| `Hook`, `Query`, `Fetcher`             | Implementation layers                                                             |
| `DailyBriefing`                        | A persistent output artifact — an implementation of Recommendation                |
| `AthleteProfile`                       | A storage model — an implementation of Athlete + Performance Capability + Context |
| `PlanWeek`                             | A storage model — an implementation of Phase                                      |
| `ActivityStream`                       | Raw measurement data — an implementation of Observation                           |
| `Feature Extraction`                   | A process, not a concept — what a Model does to Observations to produce Signals   |
| `Inference`                            | A process, not a concept — what a Model does to Signals to update Athlete State   |

---

_This document was updated on 2026-07-02 through iterative domain refinement.
It reflects the transition from a coaching application model to a Human Performance Intelligence System model:
an explicit inference pipeline with clear separation between Observations, Signals, Models, Athlete State,
Decision Engine, and outputs._

_From 27 to 31 concepts: Signal, Model, Evidence, Scenario, and Decision Engine were added.
Physiological Threshold and Performance Record were merged into Performance Capability.
Physiological State was elevated to Athlete State with a four-dimensional sub-structure._

_Every concept in the codebase should trace to one of these 31 concepts. When a new concept emerges in product
or engineering discussion that has no home here, this document must be updated first._
