# Adaptation Architecture Review

**Type**: Scientific Architecture Review  
**Date**: 2026-07-02  
**Context**: Post-implementation review conducted after Recovery Intelligence v1 and Fatigue Intelligence v1 reached production. The question examined is whether Adaptation Intelligence should exist as an independent model, and whether the decision made to implement it as such was architecturally sound.  
**Status**: Authoritative — conclusions are binding for future model design.

---

## Preamble

This review was conducted from first principles. It deliberately ignores existing code and existing model implementations to avoid confirmation bias. The goal is to derive the correct architecture from physiology, then compare it to what was built.

The eight questions below progress from definitional to structural to strategic.

---

## Question 1 — Physiological Definition of Adaptation in SHARPIT

Adaptation is the **net positive shift in the athlete's functional capacity baseline** that occurs across multiple supercompensation cycles when recovery is consistently adequate between stimuli.

The operational distinction:

- **A single training session** produces stress (homeostatic disruption), followed by recovery (homeostatic restoration), followed by supercompensation (temporary elevation above prior baseline). This entire cycle completes in 24–72 hours for metabolic fatigue, up to 14 days for structural adaptations (tendon, bone).
- **Adaptation** is the permanent elevation of the baseline that results from the accumulation of many such cycles over weeks to months. It is not the supercompensation itself — it is the residue of repeated supercompensation.

The Bangsbo/Bassett framework (2002) and Issurin (2010) describe this as the **cumulative training effect**: the long-term restructuring of biological systems that persists after acute fatigue resolves. This includes:

- Central cardiovascular remodeling: increased stroke volume, capillary density, mitochondrial volume fraction
- Peripheral neuromuscular remodeling: improved motor unit recruitment, synchronization, tendon stiffness
- Autonomic nervous system recalibration: higher resting HRV, lower resting HR, faster HRR
- Metabolic enzyme upregulation: increased oxidative capacity at the same absolute workload

In SHARPIT, adaptation is operationally defined as the **observable 14–42 day trend in efficiency, autonomic function, and load tolerance** that is not explained by day-to-day recovery or fatigue fluctuations. It is the signal remaining after subtracting short-term noise.

**What adaptation is NOT in SHARPIT:**

- It is not today's readiness (that is recovery)
- It is not today's impairment level (that is fatigue)
- It is not a single performance PR (that is a point observation)
- It is not fitness in the PMC sense (CTL is a mathematical accumulator, not a physiological state)

---

## Question 2 — Independent State or Emergent Property?

**Adaptation is an independent state of the Digital Twin. It is not reducible to Recovery + Fatigue.**

The argument:

### 2.1 Different timescales produce qualitatively different phenomena

Recovery operates on a 12–48 hour timescale. Fatigue operates on a 24–96 hour timescale (with cumulative effects over 7–14 days). Adaptation operates on a 2–12 week timescale. These are not different degrees of the same process — they are qualitatively distinct biological phenomena with different substrates.

Recovery restores what fatigue consumed. Adaptation creates what neither recovery nor fatigue explains: a permanent raise in the baseline. The Fitness-Fatigue model (Calvert et al. 1976, Busso 2003) explicitly models fitness (adaptation) and fatigue as two separate mathematical processes with different time constants — τ_fitness ≈ 42 days vs τ_fatigue ≈ 7 days — for precisely this reason.

### 2.2 Conflicting states require an independent concept

An athlete can simultaneously be:

- **Highly fatigued** (fatigue index 70/100) AND **positively adapting** (HRV trend +12%, load efficiency improving)
- **Fully recovered** (readiness 90/100) AND **detraining** (3-week load reduction, HRV trend neutral, efficiency plateau)
- **Moderately fatigued** (functional overreaching zone) AND **non-adapting** (injury risk rising without fitness gain)

None of these states can be represented as a function of Recovery and Fatigue alone. They require a third independent dimension.

### 2.3 Adaptation has causal primacy over Performance Forecast

The Performance Forecast model must estimate what the athlete is capable of producing on a target date. This is not derivable from current recovery or current fatigue without knowing the underlying fitness baseline. That baseline is adaptation. Omitting it forces the Performance Forecast to approximate fitness from CTL (a mathematical proxy) rather than from a physiological state estimate — a category error.

### 2.4 The counterfactual test

If adaptation were merely emergent from Recovery + Fatigue, then every athlete with identical recovery and fatigue scores would have identical adaptation states. This is demonstrably false: a beginner with fatigue index 40 is responding to a completely different adaptive stimulus than an elite athlete with fatigue index 40. The adaptation state captures this difference. Recovery and Fatigue cannot.

**Conclusion: Adaptation is an irreducible third dimension of the Digital Twin.**

---

## Question 3 — Fitness: Explicit Model or Observable Consequence of Adaptation?

**Fitness should be the observable consequence of Adaptation, not an independent model.**

### 3.1 The conceptual hierarchy

Adaptation is the physiological process. Fitness is the measurable outcome of sustained adaptation. The relationship is:

```
Repeated training stimuli
       ↓ (with adequate recovery)
Adaptation (biological mechanism)
       ↓ (observed as)
Fitness (functional capacity increase)
       ↓ (measured as)
CTL / VO2max / FTP / threshold pace / economy
```

A model that computes fitness without modeling adaptation is computing a proxy (CTL is a mathematical accumulator, not a physiological model). It will be accurate on average but incorrect at the boundaries — precisely where decisions matter most: during taper, during illness recovery, during a return from injury.

### 3.2 Fitness as a derived quantity

In SHARPIT, fitness can be represented as a derived quantity from `AdaptationState`:

- **Absolute fitness**: the athlete's current estimated performance capacity (conceptual FTP analog)
- **Fitness trajectory**: the direction and rate of fitness change (from `AdaptationState.adaptationTrajectory`)
- **Fitness confidence**: how reliable the estimate is given available data

A separate Fitness model would either (a) duplicate adaptation logic, or (b) consume `AdaptationState` outputs and reformat them — which is not a model but a data transformation.

### 3.3 Exception: Fitness as a Training Stress output

There is one legitimate role for fitness as an explicit quantity: the **Training Stress Model** produces CTL (Chronic Training Load) as a mathematical accumulator. This is not physiological fitness — it is a statistical approximation useful for load prescribing. It belongs to `LoadState`, not to a Fitness model.

**Conclusion: Fitness is the observable consequence of Adaptation. A separate Fitness model would be redundant. Fitness is exposed via `AdaptationState.absoluteFitnessIndex` and `AdaptationState.adaptationTrajectory`, derived by the Adaptation Model, not by a dedicated Fitness model.**

---

## Question 4 — Physiological Mechanisms Exclusive to Adaptation

The following mechanisms belong to Adaptation and are not captured by Recovery or Fatigue:

### 4.1 Progressive Overload Rate (load progression slope)

The slope of ACWR over 14–28 days captures whether the training stimulus is progressively challenging the organism beyond its current capacity. Recovery only reads today's status. Fatigue captures the current accumulation. Neither captures whether the organism has been consistently pushed — and at the right rate — for adaptation to occur.

**Scientific basis**: Principle of progressive overload (DeLorme 1945, Helgerud et al. 2007). Without systematic load progression, training stimulus decays toward no-signal (accommodation).

### 4.2 Neuromuscular Efficiency Trend

The 14-day trend in HR drift at a controlled intensity. An improving trend (lower drift for same workload) indicates genuine aerobic adaptation — the aerobic engine is becoming more efficient. Recovery captures today's readiness. Fatigue captures today's impairment. Neither captures whether the engine itself is improving.

**Scientific basis**: Economy of motion and lactate threshold shift as adaptation indicators (Coyle et al. 1988, Jeukendrup & Diemen 1998).

### 4.3 Chronic Autonomic Recalibration

The 21–42 day trend in resting HRV and resting HR, distinct from the day-to-day HRV fluctuations used by Recovery. Short-term HRV drops are noise and stress signals (Recovery domain). Long-term HRV elevation is a structural marker of parasympathetic adaptation (adaptation domain).

**Scientific basis**: HRV as a long-term adaptation marker (Plews et al. 2013, Kiviniemi et al. 2007). The distinction between day-to-day HRV and trend HRV is well established in sports science.

### 4.4 Supercompensation Phase Detection

The identification of whether the athlete is currently in a productive adaptation phase vs. a plateau vs. detraining. Recovery and Fatigue have no concept of training block phases. Adaptation introduces `adaptationPhase` (ACCUMULATION, TRANSFORMATION, REALIZATION, TRANSITION) — a concept without equivalent in the other two models.

**Scientific basis**: Periodization theory (Matveev 1965, Bompa 1999, Issurin 2010 — Block Periodization).

### 4.5 Recovery Quality as Adaptation Enabler

The chronic adequacy of recovery — not today's readiness but whether the athlete has consistently recovered enough over 2–4 weeks to allow adaptive processes to complete. An athlete can appear "recovered" daily (Recovery Model) while chronically under-recovering, preventing adaptation.

**Scientific basis**: Sleep and adaptation (Dattilo et al. 2011). The adaptation window closes if recovery is insufficient even when acute readiness appears adequate.

---

## Question 5 — Feature Inputs and Digital Twin Dependencies

### 5.1 Feature Inputs (from Feature Engine)

| Feature Set          | Fields Consumed                                                                         | Adaptation Dimension         |
| -------------------- | --------------------------------------------------------------------------------------- | ---------------------------- |
| `LoadFeatureSet`     | `acuteChronicLoadTrend` (14-day ACWR slope), `acwr`, `chronicLoad`, `trainingFrequency` | Load Progression             |
| `SessionFeatureSet`  | `hrDriftPercent`, `intensityFactor`, `aerobicLoadFactor`, `tssScore`                    | Neuromuscular Efficiency     |
| `RecoveryFeatureSet` | `hrvAbsolute`, `rhrAbsolute`, `sleepEfficiencyPercent`, `sleepDebtMin`                  | HRV Trend, Recovery Adequacy |

### 5.2 Digital Twin State Dependencies

| State                               | Fields Consumed                                                                | Purpose                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| `RecoveryState`                     | `readinessScore`, `readinessCategory`, `dimensions.autonomic.score`            | Recovery Adequacy dimension                                   |
| `FatigueState`                      | `fatigueLevel`, `fatigueIndex`, `functionalOverreachingRisk`, `isAccumulating` | Determines if current fatigue is functional or non-functional |
| Prior `AdaptationState` (7–42 days) | `adaptationIndex`, `adaptationTrajectory`, `adaptationPhase`                   | Historical trend computation                                  |

### 5.3 Historical Window Requirements

Unlike Recovery and Fatigue which operate on a 7–14 day window, Adaptation requires:

- **Minimum viable window**: 14 days (SPARSE confidence, limited output reliability)
- **Optimal window**: 28–42 days (FULL confidence, all dimensions computable)
- **Historical AdaptationState access**: 42 days of prior `AdaptationState` via `DecisionRecordRepository.findRecent()`

This is the primary reason Adaptation requires a separate orchestrator: it reconstructs a longer history than any other model and requires a qualitatively different memory management strategy.

---

## Question 6 — Downstream Dependents on Adaptation

Every future high-value model depends on `AdaptationState` as a primary input:

### 6.1 Performance Forecast Model (direct dependency)

Cannot estimate an athlete's potential performance without knowing their current fitness baseline (from `AdaptationState.absoluteFitnessIndex`) and the direction of their fitness trajectory. Using CTL as a fitness proxy would systematically underestimate recently-adapted athletes and overestimate detrained athletes.

### 6.2 Injury Risk Model (direct dependency)

The ACWR-based injury risk framework (Gabbett 2016) is inherently incomplete without knowing whether an athlete is adapted to their current load. A maladapted athlete running at ACWR 1.1 is at significantly higher injury risk than a well-adapted athlete at the same ratio. `AdaptationState.maladaptationDetected` and `adaptationTrajectory` are the signals that enable contextual risk adjustment.

### 6.3 Training Plan Generator (direct dependency)

Cannot prescribe load targets without knowing where the athlete is in their adaptation arc. The phase classification (`ACCUMULATION` → `TRANSFORMATION` → `REALIZATION` → `TRANSITION`) is the direct input to periodization logic. A planner without this information generates generically structured plans rather than individually adapted ones.

### 6.4 Reasoning Engine (current dependency — already implemented)

The Reasoning Engine's cross-system synthesis depends on `AdaptationState` as its third input alongside `RecoveryState` and `FatigueState`. Without it, the Reasoning Engine cannot:

- Detect high-opportunity training windows (recovery excellent + adaptation ascending)
- Detect overreaching-without-adaptation patterns
- Produce phase-appropriate load recommendations

---

## Question 7 — Can Performance Forecast and Injury Risk Be Implemented Correctly Without Adaptation?

**No. Not with physiological correctness.**

### 7.1 Performance Forecast without Adaptation

A Performance Forecast model without `AdaptationState` must approximate fitness using CTL (the Training Stress Model output). CTL is a mathematical exponential moving average of training stress — not a physiological state. Its key failure modes:

1. **Post-taper underestimation**: CTL drops during taper, but real performance capability peaks. A model using CTL would predict poor performance precisely when the athlete is at their best.
2. **Post-illness return**: An athlete returning from a 2-week illness has low CTL but may have retained fitness (muscle memory, aerobic infrastructure). CTL would underestimate capacity.
3. **Beginner vs. elite at same CTL**: A beginner who rapidly built to CTL 60 in 6 weeks and an elite athlete who has sustained CTL 60 for 3 years are radically different. Their performance capacity at the same CTL is not comparable.

`AdaptationState.absoluteFitnessIndex` addresses all three cases because it is a physiological estimate, not a mathematical accumulator.

### 7.2 Injury Risk without Adaptation

The ACWR injury risk model (Gabbett 2016) is well-validated but universally acknowledged as incomplete. Its primary limitation: it treats all athletes at a given ACWR equally. Published evidence (Hulin et al. 2016, Blanch & Gabbett 2016) shows that an athlete's adaptation state systematically modifies risk at any given ACWR level.

Without `AdaptationState.maladaptationDetected`, the Injury Risk Model cannot distinguish between:

- An athlete at ACWR 1.3 who has been building load effectively for 6 weeks (normal adaptation, moderate risk)
- An athlete at ACWR 1.3 who just returned from 3 weeks of rest (low adaptation to current load, high risk)

The CTL proxy cannot capture this distinction. Only an explicit adaptation state can.

**Conclusion: Both models can be implemented, but they will be physiologically incorrect at the boundaries — which are precisely the cases where SHARPIT's value is highest. The scientific cost of omitting Adaptation is the degradation of every model that consumes it.**

---

## Question 8 — Scientific Literature Supporting the Architecture

| Claim                                                           | References                                                    |
| --------------------------------------------------------------- | ------------------------------------------------------------- |
| Adaptation as independent process from fatigue and recovery     | Calvert et al. (1976), Busso (2003), Bangsbo & Bassett (2002) |
| Different time constants for fitness vs. fatigue                | Busso (2003), Coggan (2003 CTL) — τ_fit ≈ 42d, τ_fat ≈ 7d     |
| Supercompensation as mechanism of long-term adaptation          | Selye (1950), Zatsiorsky & Kraemer (2006)                     |
| Progressive overload as prerequisite for adaptation             | DeLorme (1945), Helgerud et al. (2007)                        |
| HRV as long-term adaptation marker (distinct from acute signal) | Plews et al. (2013), Kiviniemi et al. (2007), Buchheit (2014) |
| Neuromuscular efficiency (HR drift) as aerobic adaptation proxy | Coyle et al. (1988), Jeukendrup & Diemen (1998)               |
| Recovery adequacy as adaptation enabler                         | Dattilo et al. (2011) — sleep and anabolic hormones           |
| Periodization phases as structuring principle                   | Matveev (1965), Bompa (1999), Issurin (2010)                  |
| ACWR limits without adaptation context                          | Gabbett (2016), Hulin et al. (2016), Blanch & Gabbett (2016)  |
| Performance forecast requires fitness state, not load proxy     | Mujika & Padilla (2000), Thomas et al. (2009)                 |

---

## Conclusion and Recommendation

**The physiological architecture is sound. Adaptation is correctly positioned as an independent third model.**

The evidence from first principles converges on a single conclusion: Adaptation cannot be absorbed into Recovery or Fatigue without losing scientific correctness. It operates at a different timescale, tracks different mechanisms, produces different outputs, and is required by every high-value downstream capability.

The three-model architecture — Recovery, Fatigue, Adaptation — maps precisely to the three fundamental timescales of sports physiology:

```
Recovery     → 12–48 hours  → "Can the athlete absorb the next stimulus?"
Fatigue      → 24–96 hours  → "How much capacity has been consumed?"
Adaptation   → 2–12 weeks   → "Is the organism growing stronger?"
```

The Reasoning Engine is correctly positioned as a fourth layer that synthesizes across all three — unable to exist without all three being independently computed, because the value of the synthesis comes from detecting alignments and conflicts between models that cannot see each other.

**Specific validations:**

1. ✅ Adaptation is physiologically distinct from Recovery and Fatigue and justifies its own model
2. ✅ Fitness should not be a separate model — it is a derived output of AdaptationState
3. ✅ The mechanisms exclusive to Adaptation (load progression slope, efficiency trend, chronic HRV recalibration, phase detection) are not captured elsewhere
4. ✅ Performance Forecast and Injury Risk cannot be implemented with physiological correctness without `AdaptationState`
5. ✅ The Reasoning Engine cannot provide its cross-system synthesis without all three independent states

**One correction to the implemented architecture:**

The Reasoning Engine should be considered a model layer (Inference Layer 4), not a standalone module. Its `ReasoningState` should be persisted in the Digital Twin alongside `RecoveryState`, `FatigueState`, and `AdaptationState`, so that historical reasoning patterns become traceable and auditable via Decision Records. This is both a scientific and a product requirement: the AI Coach should be able to reference past reasoning, not just past model outputs.

**Next step recommendation:**

The next inference model to implement is **Training Stress v2** — an upgrade from the existing mathematical TSS accumulator to a physiologically-grounded stress model that produces explicit `FitnessState` and `LoadState` dimensions in the Digital Twin, enabling the Performance Forecast and Injury Risk models to consume physiologically-sound inputs rather than CTL proxies.

This is architecturally lower risk than Performance Forecast or Injury Risk because it improves data quality for all existing models, rather than introducing new reasoning logic above incomplete inputs.
