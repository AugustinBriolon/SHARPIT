# SHARPIT — Inference Architecture Review

> **Status:** Architectural gate document.
> **Scope:** Feature Extraction Layer readiness assessment before implementation.
> **Input documents reviewed:** `DOMAIN_CONCEPTS.md`, `SYSTEM_FLOW.md`, `DIGITAL_TWIN.md`,
> `FEATURE_EXTRACTION.md`, `docs/models/RECOVERY_MODEL.md`,
> `docs/models/TRAINING_STRESS_MODEL.md`, `docs/models/FATIGUE_MODEL.md`, `ADR-004`

---

## 0. How to Read This Document

This document is the architectural gate before the Feature Extraction Layer moves
from design into implementation.

Each finding is tagged with a severity:

- **[CRITICAL]** — blocks implementation. Must be resolved first.
- **[MODERATE]** — should be resolved before or during early implementation. Risk of rework if deferred.
- **[MINOR]** — can be addressed during implementation or noted as future work.

The document concludes with an explicit verdict and, if appropriate, an implementation strategy.

---

## 1. Model Dependency Review

### 1.1 Declared dependencies per model

| Model           | Reads from Digital Twin                                                                                                                                                                                                   | Reads from Feature Layer                         | Writes to Digital Twin                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------- |
| Training Stress | `capabilities.aerobic.ftp`, `capabilities.cardiac.maxHr`, `capabilities.cardiac.restingHr` (via ExtractionContext)                                                                                                        | Session features                                 | `fitnessState`, `SessionStressRecord[]` |
| Recovery        | None (pure Feature consumer in Round 1)                                                                                                                                                                                   | Recovery features, Load features                 | `recoveryState`                         |
| Fatigue         | `fitnessState.atl`, `fitnessState.ctl`, `fitnessState.loadMonotony`, `recoveryState.autonomicScore`, `recoveryState.sleepScore`, `recoveryState.dissonanceDetected`, `recoveryState.illnessRisk`, previous `fatigueState` | Session features (72h window), Recovery features | `fatigueState`                          |

### 1.2 Finding: The dependency graph is acyclic and well-formed

The declared dependencies produce a clean Directed Acyclic Graph:

```
Feature Layer ──► Training Stress ──┐
                                    ├──► Digital Twin ──► Fatigue ──► Digital Twin
Feature Layer ──► Recovery ─────────┘
```

No circular dependency exists in the steady-state. The only self-referential
dependency is the Fatigue Model reading its own previous `fatigueState`
(for CumulativeTrajectory) — this is a time-series lookback, not a cycle.

**Finding: PASS.** Dependency graph is acyclic.

---

## 2. Execution Order Review

### 2.1 Declared execution order (from Fatigue Model)

```
Round 1 (parallel): Training Stress Model, Recovery Model
Round 2 (sequential): Fatigue Model
Round 3 (parallel): Adaptation Model, Performance Forecast Model, Risk Model
Round 4 (sequential): Decision Engine
```

### 2.2 Finding [CRITICAL]: The Inference Orchestrator is referenced but not designed

The execution order appears in the Fatigue Model's dependency section. Multiple model
documents state "this is an Inference Orchestrator responsibility." But this component
has never been designed — its interface, trigger mechanism, error handling, and
lifecycle are undefined.

**The risk:** without an Orchestrator contract, every model implementor must independently
manage execution ordering. This produces either hidden coupling (models calling each other)
or duplicated orchestration logic across the codebase.

**What needs to be defined before implementation:**

```typescript
interface InferenceOrchestrator {
  // Trigger: called after Feature Engine completes feature extraction
  // for a given athlete + training day
  runInferencePass(athleteId: string, trainingDayId: string): Promise<InferenceResult>;

  // Partial failure contract:
  // - If Round 1 models partially fail, Round 2 models run with PENDING inputs
  // - Models must degrade gracefully (see each model's cold-start spec)
  // - Decision Engine always runs, even with incomplete model outputs
}

type InferenceResult = {
  trainingDayId: string;
  modelsRun: string[];
  modelsFailed: Array<{ modelId: string; reason: string }>;
  athleteStateSnapshot: AthleteStateSnapshot;
  duration: number; // ms
};
```

**Trigger mechanism options (to be decided as ADR):**

- **Event-driven:** ObservationIngested → Feature extraction → Inference run. Real-time, complex.
- **Scheduled:** run once per day per athlete at a fixed time. Simple, stale data possible.
- **Hybrid:** session events trigger immediate feature extraction; inference runs daily batch.

For v1, the hybrid approach is recommended: session features extracted immediately,
inference pass run as a nightly batch job per athlete.

---

## 3. Feature Taxonomy Review

### 3.1 Consolidated Feature Catalog across three models

Collecting all Features declared as "Required Features" across the three model documents:

**Session Features (per-session, from SESSION Observation):**

| Feature Name                           | Model(s) consuming        | Source Observation        | Notes                                |
| -------------------------------------- | ------------------------- | ------------------------- | ------------------------------------ |
| `session.tssScore`                     | Training Stress, Fatigue  | SESSION + FTP             | ⚠️ Naming conflict — see Issue 4.1   |
| `session.intensityFactor`              | Training Stress           | SESSION + FTP             |                                      |
| `session.hrDriftPercent`               | Training Stress, Fatigue  | SESSION (stream)          |                                      |
| `session.aerobicLoadFactor`            | Training Stress           | SESSION (stream/HR zones) |                                      |
| `session.anaerobicLoadFactor`          | Training Stress, Fatigue  | SESSION (stream/HR zones) |                                      |
| `session.timeInZones`                  | Training Stress           | SESSION (stream)          |                                      |
| `session.powerData.normalizedPower`    | Training Stress           | SESSION                   |                                      |
| `session.powerData.avgWatts`           | Training Stress           | SESSION                   |                                      |
| `session.powerData.quality`            | Training Stress           | SESSION                   |                                      |
| `session.powerData.sourceComputedTss`  | Training Stress           | SESSION                   | Cross-validation only                |
| `session.hrData.avgBpm`                | Training Stress, Recovery | SESSION                   |                                      |
| `session.hrData.maxBpm`                | Training Stress           | SESSION                   |                                      |
| `session.hrData.quality`               | Training Stress           | SESSION                   |                                      |
| `session.durationSec`                  | Training Stress, Fatigue  | SESSION                   |                                      |
| `session.sportType`                    | Training Stress, Fatigue  | SESSION                   |                                      |
| `session.paceData.avgMinPerKm`         | Training Stress           | SESSION                   |                                      |
| `session.paceData.distanceM`           | Training Stress           | SESSION                   |                                      |
| `session.elevationM`                   | Training Stress           | SESSION                   |                                      |
| `session.sourceProvidedStress.value`   | Training Stress           | SESSION                   | Cross-validation                     |
| `session.sourceProvidedStress.quality` | Training Stress           | SESSION                   |                                      |
| `session.subjectiveRpe`                | Training Stress           | SUBJECTIVE (linked)       | ⚠️ Cross-observation — see Issue 4.3 |
| `session.timestamp`                    | Fatigue                   | SESSION                   | For decay weight                     |

**Load Features (window, from SESSION Observations):**

| Feature Name             | Window | Model(s) consuming                 | Notes                         |
| ------------------------ | ------ | ---------------------------------- | ----------------------------- |
| `load.acuteLoad`         | 7d     | Training Stress, Recovery          | Rolling sum of daily tssScore |
| `load.chronicLoad`       | 42d    | Training Stress                    | Rolling sum ÷ 6               |
| `load.acwr`              | 7/42d  | Training Stress, Recovery, Fatigue |                               |
| `load.loadMonotony`      | 7d     | Training Stress, Recovery, Fatigue |                               |
| `load.loadStrain`        | 7d     | Training Stress                    |                               |
| `load.trainingFrequency` | 7d     | Training Stress                    |                               |
| `load.restDayCount`      | 7d     | Training Stress                    |                               |
| `load.acuteLoadRun`      | 7d     | Training Stress                    | Sport-specific ACWR           |
| `load.acuteLoadBike`     | 7d     | Training Stress                    |                               |
| `load.chronicLoadRun`    | 42d    | Training Stress                    |                               |
| `load.chronicLoadBike`   | 42d    | Training Stress                    |                               |

**Recovery Features (per-training-day, from SLEEP/HRV/RHR/SUBJECTIVE):**

| Feature Name                                         | Model(s) consuming | Notes                                   |
| ---------------------------------------------------- | ------------------ | --------------------------------------- |
| `recovery.hrvDeltaFromBaseline`                      | Recovery           | 14-day baseline window                  |
| `recovery.rhrDeltaFromBaseline`                      | Recovery           | 14-day baseline window                  |
| `recovery.sleepEfficiencyPercent`                    | Recovery           | (deep + REM) / total                    |
| `recovery.sleepDebtMin`                              | Recovery, Fatigue  | 7-day debt                              |
| `recovery.subjectiveWellnessIndex`                   | Recovery, Fatigue  | Composite 0-10                          |
| `recovery.subjectiveWellnessIndex.mood`              | Fatigue            | Sub-component                           |
| `recovery.subjectiveWellnessIndex.energyLevel`       | Fatigue            | Sub-component                           |
| `recovery.subjectiveWellnessIndex.perceivedSoreness` | Fatigue            | Sub-component                           |
| `recovery.rpeVsTargetZone`                           | Recovery, Fatigue  | ⚠️ Requires target zone — see Issue 4.4 |

**Condition Features (from PHYSICAL_CONDITION):**

| Feature Name                           | Model(s) consuming | Notes |
| -------------------------------------- | ------------------ | ----- |
| `condition.maxActiveSeverity`          | Fatigue            |       |
| `condition.trainingBlockedByCondition` | Fatigue            |       |

**Features in FEATURE_EXTRACTION.md not yet consumed by any of the three models:**

| Feature Name                         | Notes                                                            |
| ------------------------------------ | ---------------------------------------------------------------- |
| `session.efficiencyFactor`           | Referenced in Feature doc, consumed by Adaptation Model (future) |
| `session.paceVariabilityIndex`       | Future use                                                       |
| `session.elevationStressScore`       | Future use                                                       |
| `session.mechanicalLoad` (kJ)        | Distinct from mechanicalStressFactor — ⚠️ see Issue 4.2          |
| `recovery.sleepOnsetConsistencyMin`  | Future Sleep Model                                               |
| `recovery.sleepDurationTrend`        | Future Sleep Model                                               |
| `recovery.hrvAbsolute`               | Direct value, future use                                         |
| `recovery.hrvCoefficientOfVariation` | Future use                                                       |
| `recovery.rhrAbsolute`               | Direct value                                                     |
| `body.*` features                    | Future body composition model                                    |
| `condition.activeConditionCount`     | Future                                                           |
| `condition.conditionTrend`           | Future                                                           |

**Finding:** The three models collectively define a Feature surface that is largely
covered by the existing FEATURE_EXTRACTION.md catalog. There is no Feature required
by the three models that is missing from the catalog. The catalog appears sufficient
for the current model set.

---

## 4. Specific Issues Detected

### 4.1 [CRITICAL] — TSS Computation Duplication (canonicalTss vs. tssScore)

**Location:** FEATURE_EXTRACTION.md §Session Features; TRAINING_STRESS_MODEL.md §5.1

**The problem:**

FEATURE_EXTRACTION.md defines `session.tssScore` as a Feature computed by the
Feature Extraction Layer from raw power/HR observations using FTP (from ExtractionContext).

TRAINING_STRESS_MODEL.md §5.1 describes "SHARPIT's canonical TSS computation" with a
full 5-tier hierarchy (power → TRIMP → pace → RPE → duration), framing it as the
Training Stress Model's algorithm.

Both documents describe the **same computation**. The Feature Extraction Layer document
says extractors compute `session.tssScore`. The model document says the model computes
`session.canonicalTss`. There are two names for the same concept, described in two
different layers.

**The consequence:** if implemented naively, TSS would be computed twice —
once in the Feature Layer, once in the model — wasting computation and introducing
the risk of divergent results.

**Additionally:** the FATIGUE_MODEL.md Required Features section lists `session.canonicalTss`
as a Feature Layer product. But `session.canonicalTss` is the name used in the Training
Stress Model output (stored in `SessionStressRecord`). This conflates Feature Layer output
with Digital Twin content.

**Required resolution:**

The 5-tier TSS computation hierarchy described in TRAINING_STRESS_MODEL.md §5.1
belongs to the Feature Extraction Layer. The Training Stress Model's §5.1 should be
rewritten to describe the TSS computation as the responsibility of the
`session-extractor.ts` module in the Feature Layer, not as the model's algorithm.

The Training Stress Model's algorithm begins AFTER session TSS is already a Feature:
it computes PMC (CTL/ATL/TSB), session classification, mechanical stress factor,
and periodization phase detection.

**Naming standardization required:**
All documents must use `session.tssScore` (the Feature Layer canonical name).
Remove `session.canonicalTss` — it was a name used in design before the Feature
Layer concept was formalized.

---

### 4.2 [CRITICAL] — `session.mechanicalStressFactor` belongs to the Digital Twin, not the Feature Layer

**Location:** FATIGUE_MODEL.md Required Features; TRAINING_STRESS_MODEL.md §5.2

**The problem:**

The Fatigue Model lists `session.mechanicalStressFactor` as a Feature consumed
from the Feature Layer. But `mechanicalStressFactor` is defined in the Training Stress
Model as a lookup table indexed by sport type — it is a model-computed property
applied to each session and stored in the `SessionStressRecord` of the Digital Twin.

`mechanicalStressFactor` is NOT extractable from an Observation alone. It requires:

1. `session.sportType` (from Observation)
2. The Training Stress Model's lookup table (a model constant)
3. Application of the model's domain knowledge

This makes it a **model output**, not a Feature.

**Consequence:** if the Fatigue Model reads `session.mechanicalStressFactor` from
the Feature Layer, it creates an implicit requirement for the Feature Layer to
replicate the Training Stress Model's logic — an abstraction leak.

**Required resolution:**

The Fatigue Model must read `session.mechanicalStressFactor` from the Digital Twin's
`SessionStressRecord[]` (populated by the Training Stress Model in Round 1), not
from the Feature Layer.

Update FATIGUE_MODEL.md Required Features: move `session.mechanicalStressFactor` and
`session.canonicalTss` from "Features consumed from Feature Layer" to
"Digital Twin reads (from SessionStressRecord populated by Training Stress Model)."

---

### 4.3 [MODERATE] — `session.subjectiveRpe` cross-observation dependency

**Location:** TRAINING_STRESS_MODEL.md Required Features

**The problem:**

`session.subjectiveRpe` is listed as a Feature consumed by the Training Stress Model.
But by design (established in the Observation Engine), RPE is a `SUBJECTIVE` Observation
independent from the `SESSION` Observation. The link is `SubjectiveObservation.sessionExternalId`.

The Feature `session.subjectiveRpe` requires joining two Observation types.
This is not a pure per-Observation extraction — it is a cross-observation join.

**Two options:**

1. The Feature Layer joins SESSION and SUBJECTIVE observations by `sessionExternalId`
   and produces `session.subjectiveRpe` as a derived session-scoped Feature.
   This requires the session extractor to query for linked subjective observations,
   adding a dependency on the Observation Repository.
2. The Fatigue/Training Stress Model reads the SUBJECTIVE Observation directly for
   sessions in the last 72h window, treating it as a session-adjacent Feature.

**Recommendation:** Option 1 — the Feature Layer should resolve the join.
The session extractor receives the SESSION Observation plus any linked SUBJECTIVE
Observation as inputs from the FeatureEngine. The FeatureEngine is responsible
for assembling the input bundle, not the extractor.

This should be documented in the Feature Extraction public API: the `FeatureEngine`
assembles an `ExtractorInput` bundle (SESSION + linked SUBJECTIVE) and passes it
to the session extractor.

---

### 4.4 [MODERATE] — `recovery.rpeVsTargetZone` is not purely derivable from Observations

**Location:** FEATURE_EXTRACTION.md §Recovery Features; RECOVERY_MODEL.md; FATIGUE_MODEL.md

**The problem:**

`recovery.rpeVsTargetZone = rpe − targetRpe derived from session zone`

"Target RPE" requires knowing what zone the session was intended to be.
This is either:

- A training plan target (Decision Engine / Planning Model output)
- An approximation derived from the session's actual zone distribution
  (circular: the zone IS what was executed, not what was intended)

For v1, no training plan or planning model exists. The closest approximation:
use the session's `sessionType` (from the Training Stress Model's SessionStressRecord)
to infer expected RPE. But this creates a dependency on Round 1 model output.

**Required resolution for v1:**

Define `recovery.rpeVsTargetZone` as a Day 1 simplification:

```
rpeVsTargetZone = actualRpe − expectedRpeFromSessionType[sessionType]

expectedRpeFromSessionType = {
  RECOVERY:    2, AEROBIC_BASE: 4, TEMPO: 6,
  THRESHOLD:   7, VO2MAX:       8, ANAEROBIC: 9,
  NEUROMUSCULAR: 6, MIXED: 5
}
```

Where `sessionType` is read from the Digital Twin's `SessionStressRecord`
(populated by the Training Stress Model in Round 1). This makes
`recovery.rpeVsTargetZone` a hybrid Feature: partially from the Feature Layer
(actual RPE), partially from the Digital Twin (session type).

Document this as a constraint in FEATURE_EXTRACTION.md:
`recovery.rpeVsTargetZone` requires `SessionStressRecord` to be available.
It is computed in a second pass after Round 1 inference, or with a simplified
fallback (targetRpe from raw sportType directly from Observation).

---

### 4.5 [MODERATE] — "Signal Engine" terminology is obsolete

**Location:** FEATURE_EXTRACTION.md §Pipeline diagram; §Update Strategy; §Dependencies

**The problem:**

FEATURE_EXTRACTION.md still shows "Signal Engine" as the downstream consumer
of Features in the pipeline diagram:

```
Features → [Signal Engine] → Inference Models → Athlete State
```

Per ADR-004, there is no standalone Signal Engine component. Signals are ephemeral
values produced during the inference pass by individual models. The pipeline is:

```
Features → Inference Models (produce ephemeral Signals) → Athlete State → Decision Records
```

**Finding:** the architectural evolution from "Signal Engine as component" to
"Signals as ephemeral model outputs" (ADR-004) was not propagated back to
FEATURE_EXTRACTION.md. This creates confusion for any engineer reading both documents.

**Required resolution:**

Update FEATURE_EXTRACTION.md to replace all references to "Signal Engine" with
"Inference Models." The pipeline diagram must be updated to reflect the current
architecture established by ADR-004.

---

### 4.6 [MODERATE] — Load Features: rolling sums vs. EWMA are both present and underspecified

**Location:** FEATURE_EXTRACTION.md §Load Features; TRAINING_STRESS_MODEL.md §6.1-6.2

**The problem:**

FEATURE_EXTRACTION.md defines:

- `load.acuteLoad` = rolling 7-day sum of daily tssScore

TRAINING_STRESS_MODEL.md defines:

- `ATL` = EWMA with τ=7 days (stored in `fitnessState.atl`)
- `load.acuteLoad` = rolling 7-day sum (listed as a Feature consumed by the model)

These are two distinct computations that approximate the same concept.
Their relationship is not specified:

- Does the Training Stress Model use `load.acuteLoad` (Feature) or compute ATL independently?
- Does the Recovery Model's Load Context dimension use `load.acuteLoad` or `fitnessState.atl`?

**Why this matters:** ATL (EWMA) gives more weight to recent sessions.
Rolling sum treats all days equally. They diverge during load spikes and tapers.
Using different proxies in different models for "acute load" produces inconsistency.

**Required resolution:**

Define the canonical use for each:

```
Feature Layer produces:
  load.acuteLoad   = rolling 7-day SUM         (simple, model-independent proxy)
  load.chronicLoad = rolling 42-day SUM ÷ 6    (simple, model-independent proxy)
  load.acwr        = acuteLoad / chronicLoad    (simple ACWR — for Feature use)

Training Stress Model produces (Digital Twin):
  fitnessState.atl = EWMA τ=7 (science-based accumulated fatigue proxy)
  fitnessState.ctl = EWMA τ=42 (science-based fitness)
  fitnessState.tsb = ctl - atl (form)
```

The Recovery Model and Fatigue Model use `load.acuteLoad` (Feature) for their
Load Context dimension. The Training Stress Model uses its own EWMA `atl` internally.
This distinction must be documented explicitly in each model's Required Features section.

---

### 4.7 [MINOR] — Feature lifecycle (INVALIDATED) not handled by models

**Location:** FEATURE_EXTRACTION.md §Feature Lifecycle; all model documents

**The problem:**

FEATURE_EXTRACTION.md defines a Feature lifecycle including `INVALIDATED` state.
None of the three model documents address what happens when a consumed Feature
transitions to `INVALIDATED` during an inference pass.

**Finding:** This is the Inference Orchestrator's responsibility, not the models'.
When a Feature is `INVALIDATED`, the Orchestrator should:

1. Wait for re-extraction to complete before scheduling the affected inference pass.
2. OR run the inference pass with the `INVALIDATED` Feature treated as `PENDING`
   (degraded confidence result) if re-extraction is taking too long.

Models treat `PENDING` and `INVALIDATED` identically: as absent data.
This is correct behavior. No model changes are required.

**Action:** Document this in the Inference Orchestrator contract.

---

### 4.8 [MINOR] — `session.mechanicalLoad` (kJ) vs. `mechanicalStressFactor` naming conflict

**Location:** FEATURE_EXTRACTION.md §Session Features (`mechanicalLoad` in kJ);
TRAINING_STRESS_MODEL.md §5.2 (`mechanicalStressFactor`, dimensionless)

**The problem:**

Two distinct concepts share similar names:

- `session.mechanicalLoad` (kJ) = ∫ power dt — a Feature derived from power stream
- `session.mechanicalStressFactor` (dimensionless) = sport-type based modifier
  used by the Training Stress Model and Fatigue Model

These are completely different concepts. The naming proximity will cause confusion.

**Required resolution:** ensure documentation consistently distinguishes:

- `session.mechanicalLoad` (kJ) = physical work done (Feature Layer)
- `mechanicalStressFactor` (dimensionless) = sport injury risk multiplier
  (Training Stress Model output in SessionStressRecord)

---

### 4.9 [MINOR] — ExtractionContext Digital Twin dependency is implicit

**Location:** FEATURE_EXTRACTION.md §Ownership

**The problem:**

The Feature Extraction Layer is declared to depend only on `src/core/observation/`.
But all session features requiring FTP, maxHr, or restingHr need these values from
the Digital Twin via `ExtractionContext`. This is a real dependency, even if it's
parameter-injected rather than module-imported.

**Finding:** This is architecturally acceptable — parameter injection prevents
a hard module dependency. But it creates an initialization requirement:
the Digital Twin must be initialized (with athlete onboarding data) before
any session Feature can be extracted. This should be explicitly documented.

**Action:** Add to FEATURE_EXTRACTION.md Dependencies section:
"The FeatureEngine is responsible for assembling `ExtractionContext` from the
Digital Twin before calling any extractor. The Feature Extraction Layer itself
has no import dependency on the Digital Twin — this is the FeatureEngine's concern."

---

## 5. Feature Catalog Completeness Assessment

### 5.1 Question: are three models sufficient to define a stable Feature Catalog?

**Assessment: YES, with important caveats.**

The three current models (Recovery, Training Stress, Fatigue) collectively require
**41 distinct Features** across 4 categories. After resolving the ownership issues
(Issues 4.1 and 4.2), the catalog reduces to:

**Cleanly owned by Feature Layer:** 37 features
**Owned by Digital Twin / model outputs:** 4 (canonicalTss/mechanicalStressFactor — should not be in Feature Layer)

The Feature Extraction document's existing catalog covers all 37 cleanly-owned features.

### 5.2 Question: will future models (Adaptation, Risk, Performance Forecast) require new Feature categories?

**Assessment: LOW RISK — the existing five categories are sufficient.**

Based on DOMAIN_CONCEPTS.md and SYSTEM_FLOW.md, future models will likely require:

| Future Model         | Likely New Features                                                | New Category Required?                |
| -------------------- | ------------------------------------------------------------------ | ------------------------------------- |
| Adaptation Model     | `session.efficiencyFactor`, `session.hrDriftPercent` trend         | No (session category)                 |
| Performance Forecast | CTL trajectory, TSB peak                                           | No (load category, from Digital Twin) |
| Risk Model           | ACWR per sport, cumulative soreness                                | No (existing load + condition)        |
| Sleep Model          | `recovery.sleepDurationTrend`, `recovery.sleepOnsetConsistencyMin` | No (recovery category)                |
| Nutrition Model      | Would require new `nutrition.*` category                           | YES — new category                    |
| Psychological Stress | Would require new `psych.*` category                               | YES — new category                    |

The five existing categories (session, load, recovery, body, condition) are stable
for the current and near-term model set. Nutrition and psychological stress models
(SD-010 from Recovery Model) would require new categories, but these are >v2 scope.

**Conclusion:** The three models are sufficient to define a Feature Catalog
that will remain stable through the next 3–4 inference model implementations.

---

## 6. Abstraction Leak Analysis

### 6.1 Does the Feature Layer expose model-internal state?

**Finding: NO CURRENT LEAKS, with one borderline case.**

The `load.acuteLoad` Feature (rolling sum) and the `fitnessState.atl` Digital Twin
field (EWMA) both measure acute load. They are distinct computations. The Feature Layer
correctly exposes the simpler rolling sum; the model exposes the EWMA via Digital Twin.
No leak — but see Issue 4.6 for the underspecification.

### 6.2 Does the Fatigue Model leak Recovery Model internal state through the Digital Twin?

**Finding: Borderline but acceptable.**

The Fatigue Model reads `recoveryState.autonomicScore` — a dimension score computed
internally by the Recovery Model and stored in the Digital Twin.

This is an intermediate model result being exposed. The alternative would be the
Fatigue Model re-computing autonomic balance independently from the same raw Features
(duplicated computation).

**Verdict:** acceptable, because the Digital Twin is explicitly designed to store
"interpreted knowledge" and dimension scores qualify. However, the semantics must
be stable: `autonomicScore` must remain a public interface of `RecoveryState`,
not an internal implementation detail. This is enforced by the Digital Twin's
immutable snapshot pattern (ADR-004).

### 6.3 Does any model create hard coupling to a specific database or framework?

**Finding: NO.** All models operate on typed domain objects. Repository interfaces
are ports (interfaces). No model document references Prisma, Next.js, or React.

---

## 7. Circular Dependency Analysis

### 7.1 Static dependencies

```
Feature Layer → (no model dependency) ✓
Training Stress → Feature Layer ✓
Recovery → Feature Layer ✓
Fatigue → Feature Layer + Digital Twin (Training Stress output + Recovery output) ✓
```

No static circular dependencies.

### 7.2 Dynamic / data circular dependencies

**Finding: One potential issue — the TSS two-pass relationship**

As documented in the Training Stress Model:

- Feature Layer computes `load.acuteLoad` (rolling sum) from `session.tssScore`
- `session.tssScore` is computed by the Feature Layer
- The Training Stress Model consumes `load.acuteLoad`

This creates a dependency chain where window Features depend on session Features.
The FeatureEngine must ensure session features are computed before window features.
This is an **execution ordering constraint within the Feature Engine**, not a circular
dependency. The FeatureEngine already describes this: "session-scoped features synchronous,
window features asynchronous."

**No circular dependency.** The ordering is linear within the Feature Engine.

---

## 8. Long-Term Extensibility Assessment

### 8.1 Adding a new inference model

**Assessment: STRAIGHTFORWARD** — the architecture supports this well.

Adding a new model (e.g., Adaptation Model) requires:

1. Define which existing Features it consumes (likely session + load categories — already defined).
2. Define which Digital Twin dimension it updates.
3. Determine its execution round (after Fatigue Model → Round 3).
4. Implement pure detector functions.
5. Register with Inference Orchestrator.

No changes required to the Feature Layer, the Observation Engine, or existing models.
This is the Open/Closed principle at the architecture level.

### 8.2 Replacing a scientific algorithm

**Assessment: WELL-DESIGNED** — per ADR-004 and model versioning strategies.

Each model specifies a versioning strategy (`model-id-vN.M.P`).
Feature algorithms are independently versioned (`session-tss-trimp-v1`).
Decision Records embed model versions verbatim — historical audit is immune to upgrades.

### 8.3 Adding a new data source (e.g., WHOOP, Oura, Apple Watch)

**Assessment: CLEAN.** The Adapter Layer (already implemented) handles source normalization.
The Feature Layer consumes `Observation` types regardless of source. A new wearable
produces existing Observation types (HRV, SLEEP, BODY_COMPOSITION) through a new adapter.
No changes required to the Feature Layer or inference models.

### 8.4 Scaling from 1 athlete to N athletes

**Assessment: ARCHITECTURALLY SOUND, operationally unproven.**

Every computation is scoped to `athleteId`. The FeatureEngine and Inference Orchestrator
operate per-athlete. No shared mutable state exists between athletes.

The batch Inference Orchestrator (nightly run) will need horizontal scaling at >1000
athletes. This is an infrastructure concern, not an architecture concern.

---

## 9. Scientific Evolvability Assessment

### 9.1 Can SHARPIT replace a model without cascading effects?

**Finding: YES**, by design.

ADR-004 (Decision Records embed evidence verbatim) ensures historical explainability
survives model replacement. Model versioning strategies (v1 → v2 → v3) are defined
in every model document.

The Feature Layer is the stable foundation. Features are model-independent. A new model
consuming the same features produces different Athlete State outputs — but the Feature Layer
itself does not change.

### 9.2 Can SHARPIT replay history with a new model?

**Finding: YES**, subject to one constraint.

Replay requires:

1. Historical Observations (immutable — always available)
2. Historical Features (persisted — available)
3. Historical athlete capabilities at the time (FTP at the time of each session)

Point 3 is the constraint: `ExtractionContext.ftp` is the current FTP, not the
historical FTP at session time. If an athlete's FTP improved from 220W to 280W
over a year, replaying their old sessions with the new FTP produces incorrect
historical TSS values.

**This should be recorded as scientific debt (SD-022):** the FeatureEngine should
store the `ExtractionContext` used for each feature computation alongside the feature value.
This enables true historical replay with the FTP that was active at that time.

---

## 10. Open Issues Ranked by Impact and Implementation Cost

| #   | Issue                                                                             | Severity     | Impact                                                                     | Implementation Cost                                                      | Action Required                                                        |
| --- | --------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| 1   | TSS computation duplication (`session.tssScore` vs `session.canonicalTss`)        | **CRITICAL** | High — causes duplicated computation, naming confusion across all models   | Low — rename in documents; clarify ownership; no code changes needed yet | Update model documents; standardize on `session.tssScore`              |
| 2   | `session.mechanicalStressFactor` in Feature Layer (wrong owner)                   | **CRITICAL** | High — abstraction leak if implemented as written                          | Low — update documents only                                              | Remove from Feature Layer Required Features; add to Digital Twin reads |
| 3   | Inference Orchestrator not designed                                               | **CRITICAL** | High — without contract, every model implementor fills the gap differently | Medium — requires a design decision (ADR) and interface definition       | Write Inference Orchestrator contract before implementation begins     |
| 4   | "Signal Engine" terminology obsolete in FEATURE_EXTRACTION.md                     | **MODERATE** | Medium — architectural confusion for implementors                          | Very Low — documentation update                                          | Update FEATURE_EXTRACTION.md pipeline diagram and references           |
| 5   | Load Feature: rolling sum vs. EWMA relationship underspecified                    | **MODERATE** | Medium — models may use inconsistent load measures                         | Low — documentation clarification                                        | Add one paragraph to each model's Required Features section            |
| 6   | `recovery.rpeVsTargetZone` requires model output (session type)                   | **MODERATE** | Low for v1 (can use sportType fallback)                                    | Low — document the fallback                                              | Add v1 fallback definition to FEATURE_EXTRACTION.md                    |
| 7   | `session.subjectiveRpe` cross-observation join not specified                      | **MODERATE** | Medium — unclear who resolves the join                                     | Low — document FeatureEngine assembles input bundle                      | Update FeatureEngine API description                                   |
| 8   | ExtractionContext Digital Twin dependency implicit                                | **MINOR**    | Low — architecturally acceptable, just undocumented                        | Very Low                                                                 | Add one sentence to FEATURE_EXTRACTION.md §Dependencies                |
| 9   | Feature lifecycle (INVALIDATED) not addressed by models                           | **MINOR**    | Low — models correctly treat it as PENDING                                 | Very Low                                                                 | Document as Orchestrator responsibility                                |
| 10  | SD-022: ExtractionContext not stored with features (historical replay constraint) | **MINOR**    | Low for v1, high for v3+                                                   | Medium — schema addition                                                 | Add to future-research.md as SD-022                                    |

---

## 11. Verdict

### **READY AFTER MINOR CHANGES**

SHARPIT's inference architecture is fundamentally sound. The three models form
a coherent, acyclic dependency graph. The Feature Catalog is sufficiently complete
to support implementation. ADR-004 resolves the Signal persistence question cleanly.
The abstraction boundaries are well-designed.

Three issues must be resolved before implementation begins. All three are
**documentation-level changes** — no code is written yet, so the cost is minimal.
These are design decisions, not bugs.

**Blocking items (resolve before writing any Feature Engine code):**

1. **Standardize `session.tssScore`:** Update TRAINING_STRESS_MODEL.md §5.1 to frame the 5-tier TSS hierarchy as the Feature Layer's session extractor spec. Rename all occurrences of `session.canonicalTss` to `session.tssScore`. Update Fatigue Model Required Features accordingly.

2. **Remove `session.mechanicalStressFactor` from Feature Layer catalog:** Update FATIGUE_MODEL.md §15 Required Features — move `session.mechanicalStressFactor` and `session.tssScore` (last 72h) to "Digital Twin reads (from SessionStressRecord)."

3. **Write the Inference Orchestrator contract:** Create `docs/INFERENCE_ORCHESTRATOR.md` — minimum viable design: interface definition, trigger mechanism decision (recommend: hybrid event-driven features + nightly batch inference), partial failure contract. This does not need to be fully implemented before the Feature Engine, but the contract must exist.

**Should be done during early implementation (not blocking):**

4. Update FEATURE_EXTRACTION.md: replace "Signal Engine" with "Inference Models" throughout.
5. Document the rolling sum vs. EWMA distinction in each model's Required Features.
6. Specify `recovery.rpeVsTargetZone` v1 fallback using `sportType`.
7. Specify FeatureEngine input bundle assembly (SESSION + linked SUBJECTIVE) in API doc.
8. Add SD-022 (ExtractionContext persistence) to `knowledge/future-research.md`.

---

## 12. Implementation Strategy

_Applicable once the three blocking items are resolved._

### 12.1 Architecture alignment

The Feature Engine maps to the following module structure:

```
src/core/features/
  types.ts              // Feature, FeatureStatus, all FeatureSet types
  extractors/
    session-extractor.ts   // SESSION + linked SUBJECTIVE → SessionFeatureSet
    load-extractor.ts      // SESSION[] (rolling windows) → LoadFeatureSet
    recovery-extractor.ts  // SLEEP + HRV + RHR + SUBJECTIVE → RecoveryFeatureSet
    body-extractor.ts      // BODY_COMPOSITION → BodyFeatureSet
    condition-extractor.ts // PHYSICAL_CONDITION → ConditionFeatureSet
  repository.ts           // Port (interface) — Feature storage
  engine.ts               // FeatureEngine — orchestrates extraction + invalidation
  index.ts                // Public API

src/infrastructure/features/
  prisma-feature-repository.ts  // Concrete implementation

src/lib/
  feature-engine.ts       // Singleton instance (mirrors observation-engine.ts)
```

### 12.2 Phase plan

**Phase 1 — Session and Recovery Extractors (pure functions)**

Implement `session-extractor.ts` and `recovery-extractor.ts` as pure functions.
These are the highest-priority because:

- They feed all three current models
- They are pure functions → fully testable without mocks or database
- Their algorithms are fully specified in FEATURE_EXTRACTION.md

```typescript
// Pure function signature — no side effects
function extractSessionFeatures(
  session: SessionObservation,
  linkedSubjective: SubjectiveObservation | null,
  context: ExtractionContext,
): SessionFeatureSet;

function extractRecoveryFeatures(
  hrv: HrvObservation | null,
  rhr: RestingHrObservation | null,
  sleep: SleepObservation | null,
  subjective: SubjectiveObservation | null,
  history: RecoveryHistory, // 14 days of prior observations for baselines
  context: ExtractionContext,
): RecoveryFeatureSet;
```

**Deliverables:** 2 extractor modules + comprehensive unit test suites.

**Phase 2 — Load Extractor**

Implement `load-extractor.ts`. This requires window queries over SessionFeatureSets —
it cannot run until session features exist. The window computation is O(n) over
session history (not complex, but requires access to the Feature repository).

```typescript
function extractLoadFeatures(
  sessionFeaturesWindow: SessionFeatureSet[], // 42 days of session features
  trainingDayId: string,
): LoadFeatureSet;
```

**Deliverables:** 1 extractor + unit tests.

**Phase 3 — Feature Repository (Prisma adapter)**

Implement `prisma-feature-repository.ts` and add the `Feature` table to Prisma schema.

```prisma
model Feature {
  id              String   @id
  athleteId       String
  name            String   // e.g., "session.tssScore"
  version         Int
  trainingDayId   String?
  sessionObsId    String?
  status          String   // PENDING | COMPUTING | COMPUTED | INVALIDATED
  value           Json
  confidence      Float
  computedAt      DateTime
  algorithmId     String
  sourceObsIds    String[] // Observation IDs
  windowDays      Int?

  @@index([athleteId, name])
  @@index([athleteId, trainingDayId])
  @@index([sessionObsId])
}
```

**Phase 4 — Feature Engine (FeatureEngine class)**

Implement the FeatureEngine orchestrator: trigger on `ObservationIngested` event,
assemble input bundles, call extractors, persist via repository, emit invalidation events.

```typescript
class FeatureEngine {
  async onObservationIngested(observation: Observation): Promise<void>;
  async getFeatures(athleteId: string, trainingDayId: string): Promise<AthleteFeatures>;
  async getSessionFeatures(athleteId: string, sessionObsId: string): Promise<SessionFeatureSet>;
  async backfill(athleteId: string, since: Date): Promise<BackfillResult>;
}
```

**Phase 5 — Wire to Observation Engine**

The Observation Engine emits `ObservationIngested` events (already implemented via
the `DomainEventBus`). Wire the FeatureEngine to subscribe to these events.

```typescript
// In src/lib/feature-engine.ts (singleton)
observationEngine.eventBus.subscribe('ObservationIngested', (event) => {
  featureEngine.onObservationIngested(event.observation);
});
```

**Phase 6 — Migration from src/lib/ functions (Strangler Fig)**

The existing `src/lib/training-load.ts`, `recovery.ts`, and `sleep.ts` compute
equivalents of Load, Recovery, and Session Features on request.

Migration path:

1. Feature Engine computes and persists features in parallel with existing `src/lib/` functions.
2. Verify Feature Engine outputs match existing `src/lib/` outputs on real data.
3. Switch read paths: components that call `src/lib/` functions begin calling
   `FeatureEngine.getFeatures()` instead.
4. Delete `src/lib/` computation logic (retain test suites for regression comparison).

### 12.3 Testing strategy

**Unit tests (pure functions — zero mocks):**

- All 5 extractor modules are pure functions.
- Test each extractor against known inputs/expected outputs.
- Cover: happy path, boundary values, PENDING inputs, sparse data, cold-start behavior.
- Target: 100% branch coverage on extraction logic.

**Integration tests (Feature Engine + Observation Engine):**

- Use the existing 78 Observation Engine tests as upstream validation.
- Add integration tests: ingest a session Observation → verify Feature Engine produces
  correct `session.tssScore` and `load.acuteLoad` features.
- Test invalidation: ingest a new session → verify window features are re-queued.

**Regression tests (Feature vs. existing lib/):**

- Compare `session.tssScore` vs. existing `computeCyclingTss()` output on same inputs.
- Compare `load.acuteLoad` vs. existing `computeTrainingLoad()` output.
- Document systematic differences where they exist (these may represent improvements,
  not bugs — each difference should be explained, not just fixed).

### 12.4 Migration from existing UI read paths

The existing `src/lib/` functions are called by `src/hooks/use-data.ts` and directly
from React components. These will continue to work unchanged until Phase 6.

The migration in Phase 6 should be feature-flag gated:

```typescript
// Temporary flag during migration
const USE_FEATURE_ENGINE = process.env.NEXT_PUBLIC_USE_FEATURE_ENGINE === 'true';

function useTrainingLoad() {
  if (USE_FEATURE_ENGINE) {
    return useFeatureEngineQuery(athleteId, 'load.acuteLoad');
  }
  return useLegacyTrainingLoad();
}
```

This allows production rollback without a code deploy.

---

## 13. Summary

| Aspect                       | Status                        | Notes                                          |
| ---------------------------- | ----------------------------- | ---------------------------------------------- |
| Model dependency graph       | ✅ PASS                       | Acyclic, well-formed                           |
| Execution order              | ⚠️ NEEDS ORCHESTRATOR         | Contract required before implementation        |
| Feature taxonomy             | ✅ PASS                       | 5 categories, stable for next 3-4 models       |
| Feature lifecycle            | ✅ PASS                       | Orchestrator owns lifecycle management         |
| Digital Twin interaction     | ✅ PASS                       | Clean separation of Features vs. model state   |
| Circular dependencies        | ✅ NONE                       | Time-series lookback ≠ circular                |
| Abstraction leaks            | ⚠️ 2 FOUND                    | canonicalTss + mechanicalStressFactor          |
| Long-term extensibility      | ✅ PASS                       | New models and sources add cleanly             |
| Scientific evolvability      | ✅ PASS                       | ADR-004 + model versioning strategies          |
| Feature Catalog completeness | ✅ SUFFICIENT                 | 37 clean features for 3 models + future buffer |
| **Overall verdict**          | **READY AFTER MINOR CHANGES** | **3 blocking docs changes, 5 non-blocking**    |
