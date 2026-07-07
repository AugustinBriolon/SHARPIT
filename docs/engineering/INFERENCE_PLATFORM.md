# SHARPIT — Inference Engine Execution Graph

> **Location:** `docs/engineering/INFERENCE_PLATFORM.md` (formerly `ENGINE_EXECUTION_GRAPH.md`)
> **Status:** Supporting deep dive. Model index: [`docs/models/README.md`](../models/README.md)
> **Cross-references:**
>
> - [`docs/models/README.md`](../models/README.md) — model index and reading order
> - [`docs/adr/ADR-004-signal-persistence.md`](../adr/ADR-004-signal-persistence.md) — Signal persistence strategy

---

## 0. How to Read This Document

This document is the execution platform specification for SHARPIT's Human Performance
Intelligence System. It defines:

- How inference models are ordered and executed
- How model outputs flow between tiers
- How failures are contained
- How determinism is guaranteed
- How the system evolves as new models are added

**Target audiences:**

- **Engineers implementing new inference models:** read Sections 4, 5, 6, 8, 10.
- **Engineers debugging the inference pipeline:** read Sections 7, 11, 13, 14.
- **Engineers adding model versioning or migration:** read Sections 12, 13.
- **Architects evaluating design decisions:** read the entire document.

**One fundamental invariant governs everything in this document:**

> _An Inference Model is a pure function. It has no side effects.
> The Execution Platform is responsible for orchestrating side effects —
> persistence, Digital Twin updates, event emission — in a controlled sequence._

---

## 1. Core Concepts

### 1.1 Inference Pass

A single execution of the complete inference pipeline for one athlete on one training day.
Initiated by an observation ingestion event or a scheduled trigger.

An Inference Pass produces:

- One `DecisionRecord` per model that executed successfully
- One updated `DigitalTwin` state (atomic write at completion)
- One `InferenceResult` that becomes the API response
- Zero or more typed events for downstream consumers

An Inference Pass is the unit of execution, audit, and replay.

### 1.2 InferenceContext

An in-memory object that accumulates model outputs during a single Inference Pass.
It is constructed by the Execution Platform at the start of a pass and discarded
at the end.

**Design invariant:** Models DO NOT read from the Digital Twin during an Inference Pass.
They receive previous Digital Twin state (from the previous pass) through the InferenceContext,
provided by the Execution Platform before execution begins.

```typescript
type InferenceContext = {
  readonly athleteId: string;
  readonly trainingDayId: string;
  readonly executionTime: Date; // pinned — all models share this timestamp
  readonly executionId: string; // UUID for the entire pass

  // Features (resolved before any model runs)
  readonly features: DayFeatures;

  // Previous Digital Twin state (from the last committed pass, not this one)
  readonly previousState: AthleteState;

  // Model outputs accumulated tier by tier
  readonly outputs: Partial<InferenceOutputRegistry>;
};
```

### 1.3 Execution Tier

A set of models that can run in parallel because they share no cross-model dependencies.
Tier N models may only consume outputs from Tiers 0 through N−1.

The Execution Platform executes one tier at a time, in order.
Within a tier, all models run concurrently.

### 1.4 Model Contract

Every inference model in SHARPIT implements the following contract:

```typescript
interface InferenceModel<Input extends ModelInput, Output extends ModelOutput> {
  readonly modelId: ModelId;
  readonly modelVersion: string;
  readonly tier: Tier;

  /**
   * Pure function. Given the InferenceContext, produce a ModelOutput.
   * No async operations. No network calls. No filesystem access.
   * No randomness. No reading from global state.
   * Must complete in < 200ms for a single athlete-day.
   */
  run(context: InferenceContext): Output;

  /**
   * Declare what this model reads from the context.
   * Used by the Execution Platform to:
   *   1. Validate that upstream dependencies are available before running.
   *   2. Detect dependency mismatches during startup.
   */
  readonly dependencies: {
    readonly features: readonly FeatureCategory[];
    readonly models: readonly ModelId[];
  };
}
```

### 1.5 InferenceOutputRegistry

The typed registry of all possible model outputs within a single Inference Pass:

```typescript
type InferenceOutputRegistry = {
  'recovery-synthesis-v1': RecoveryModelOutput;
  'training-stress-v1': TrainingStressModelOutput; // future
  'fatigue-v1': FatigueModelOutput; // future
  'adaptation-v1': AdaptationModelOutput; // future
  'risk-v1': RiskModelOutput; // future
  'performance-forecast-v1': PerformanceForecastOutput; // future
};
```

---

## 2. Execution Graph

```
                         ┌───────────────────────────────────────────┐
                         │           INFERENCE PASS START            │
                         │  athleteId, trainingDayId, executionId    │
                         └──────────────────────┬────────────────────┘
                                                │
                         ┌──────────────────────▼────────────────────┐
                         │         PRE-FLIGHT VALIDATION             │
                         │  ─ Resolve athlete profile                │
                         │  ─ Load previous AthleteState (DT read)  │
                         │  ─ Validate trainingDayId                 │
                         │  ─ Build InferenceContext skeleton        │
                         └──────────────────────┬────────────────────┘
                                                │
                         ┌──────────────────────▼────────────────────┐
                         │    PHASE 0 — FEATURE RESOLUTION            │
                         │                                           │
                         │  Feature Engine.getDayFeatures()          │
                         │  ─ SESSION features (per session)         │
                         │  ─ LOAD features (rolling windows)        │
                         │  ─ RECOVERY features (HRV, sleep, subj.)  │
                         │  ─ BODY features (body composition)       │
                         │  ─ CONDITION features (injury/health)     │
                         │                                           │
                         │  All extractors run in parallel.          │
                         │  Result is immutable DayFeatures.         │
                         │  PENDING is valid — models degrade.       │
                         └──────────────────────┬────────────────────┘
                                                │
                         ╔══════════════════════▼════════════════════╗
                         ║       SYNCHRONIZATION POINT 1             ║
                         ║   DayFeatures fully resolved              ║
                         ║   No model may begin before this point    ║
                         ╚══════════════════════╤════════════════════╝
                                                │
          ┌─────────────────────────────────────┴──────────────────────────────────┐
          │                            TIER 0 (parallel)                           │
          │                                                                        │
          │   ┌─────────────────────────────┐   ┌──────────────────────────────┐  │
          │   │     RecoveryModel v1        │   │   TrainingStressModel v1     │  │
          │   │                             │   │                              │  │
          │   │  in: RecoveryFeatureSet     │   │  in: SessionFeatureSet       │  │
          │   │      LoadFeatureSet         │   │      LoadFeatureSet           │  │
          │   │  in: previousState.recovery │   │  in: previousState.training  │  │
          │   │                             │   │      (EWMA continuity)       │  │
          │   │  out: RecoveryState         │   │  out: TrainingStressState    │  │
          │   │       RecoverySignals       │   │       PMCState (CTL/ATL/TSB) │  │
          │   │       RecoveryDecision      │   │       FitnessState           │  │
          │   └─────────────────────────────┘   └──────────────────────────────┘  │
          └─────────────────────────────────────┬──────────────────────────────────┘
                                                │
                         ╔══════════════════════▼════════════════════╗
                         ║       SYNCHRONIZATION POINT 2             ║
                         ║   All Tier 0 models complete              ║
                         ║   context.outputs[Tier 0] fully populated ║
                         ╚══════════════════════╤════════════════════╝
                                                │
                    ┌───────────────────────────┴──────────────────────────┐
                    │                    TIER 1 (sequential*)               │
                    │                                                       │
                    │   ┌────────────────────────────────────────────────┐ │
                    │   │                FatigueModel v1                  │ │
                    │   │                                                 │ │
                    │   │  in: LoadFeatureSet, RecoveryFeatureSet         │ │
                    │   │      context.outputs['recovery-synthesis-v1']   │ │
                    │   │      context.outputs['training-stress-v1']      │ │
                    │   │      previousState.fatigue (CumulativeTraject.) │ │
                    │   │                                                 │ │
                    │   │  out: FatigueState (FatigueIndex + Type + Risk) │ │
                    │   └────────────────────────────────────────────────┘ │
                    │                                                       │
                    │  * Sequential within this tier because currently      │
                    │    only one Tier 1 model exists. Future models at     │
                    │    this tier that share no cross-dependencies will    │
                    │    be promoted to parallel.                           │
                    └───────────────────────────┬──────────────────────────┘
                                                │
                         ╔══════════════════════▼════════════════════╗
                         ║       SYNCHRONIZATION POINT 3             ║
                         ║   All Tier 1 models complete              ║
                         ╚══════════════════════╤════════════════════╝
                                                │
    ┌───────────────────────────────────────────┴──────────────────────────────────────┐
    │                                TIER 2 (parallel)                                  │
    │                                                                                   │
    │  ┌──────────────────────┐  ┌─────────────────────────┐  ┌──────────────────────┐ │
    │  │   RiskModel v1       │  │  PerformanceForecast v1  │  │  AdaptationModel v1  │ │
    │  │                      │  │                          │  │                      │ │
    │  │  in: LoadFeatureSet  │  │  in: (minimal features)  │  │  in: SessionFeatures │ │
    │  │   ConditionFeatures  │  │  ctx: RecoveryState       │  │  ctx: TrainingStress │ │
    │  │  ctx: FatigueState   │  │       FatigueState        │  │       FatigueState   │ │
    │  │       RecoveryState  │  │       TrainingStress      │  │       (90d history)  │ │
    │  │                      │  │       AdaptationState     │  │                      │ │
    │  │  out: InjuryRisk     │  │  out: PerformanceForecast │  │  out: AdaptationState│ │
    │  │       LoadRisk       │  │       ExpectedFTP         │  │       PlateauSignal  │ │
    │  └──────────────────────┘  └─────────────────────────┘  └──────────────────────┘ │
    └───────────────────────────────────────────┬──────────────────────────────────────┘
                                                │
                         ╔══════════════════════▼════════════════════╗
                         ║       SYNCHRONIZATION POINT 4             ║
                         ║   All Tier 2 models complete              ║
                         ║   context.outputs fully populated         ║
                         ╚══════════════════════╤════════════════════╝
                                                │
                         ┌──────────────────────▼────────────────────┐
                         │         TIER 3 — REASONING ENGINE         │
                         │                                           │
                         │  in: context.outputs (all tiers)         │
                         │  Synthesizes cross-model signals          │
                         │  Detects cross-model conflicts            │
                         │  Assigns confidence weighting            │
                         │  Produces: UnifiedAthleteReasoning        │
                         └──────────────────────┬────────────────────┘
                                                │
                         ┌──────────────────────▼────────────────────┐
                         │         TIER 4 — DECISION ENGINE          │
                         │                                           │
                         │  in: UnifiedAthleteReasoning              │
                         │  Produces: one DailyDecision              │
                         │    ─ TrainingVerdict                      │
                         │    ─ IntensityBound                       │
                         │    ─ VolumeBound                          │
                         │    ─ PrimaryConstraint                    │
                         └──────────────────────┬────────────────────┘
                                                │
                         ┌──────────────────────▼────────────────────┐
                         │       TIER 5 — RECOMMENDATION ENGINE      │
                         │                                           │
                         │  in: DailyDecision + InferenceContext     │
                         │  Produces: DailyRecommendations[]         │
                         │    ─ Training recommendation              │
                         │    ─ Recovery recommendations             │
                         │    ─ Nutrition hints (if available)       │
                         │    ─ Alerts (high priority)               │
                         │    ─ Explanation (per recommendation)     │
                         └──────────────────────┬────────────────────┘
                                                │
                         ╔══════════════════════▼════════════════════╗
                         ║       SYNCHRONIZATION POINT 5             ║
                         ║   All pure computation complete           ║
                         ║   Side effects begin                      ║
                         ╚══════════════════════╤════════════════════╝
                                                │
                    ┌───────────────────────────┴──────────────────────────┐
                    │                    PERSISTENCE (parallel)             │
                    │                                                       │
                    │  ┌───────────────────────┐  ┌─────────────────────┐  │
                    │  │  DecisionRecords save  │  │  Digital Twin write │  │
                    │  │  (one per model)       │  │  (atomic upsert)    │  │
                    │  │  append-only           │  │  single operation   │  │
                    │  └───────────────────────┘  └─────────────────────┘  │
                    └───────────────────────────┬──────────────────────────┘
                                                │
                    ┌───────────────────────────┴──────────────────────────┐
                    │                    EVENT EMISSION (parallel)          │
                    │                                                       │
                    │  ─ InferenceCompleted                                 │
                    │  ─ DigitalTwinUpdated                                 │
                    │  ─ RecommendationsAvailable                           │
                    └───────────────────────────┬──────────────────────────┘
                                                │
                         ┌──────────────────────▼────────────────────┐
                         │           INFERENCE PASS COMPLETE         │
                         │  Returns: InferenceResult to API caller   │
                         └───────────────────────────────────────────┘
```

---

## 3. Dependency Graph

The complete dependency table for all current and planned models:

```
┌────────────────────────────┬──────┬──────────────────────────────────────┬─────────────────────────────────────┐
│ Model                      │ Tier │ Feature Dependencies                 │ Model Dependencies                  │
├────────────────────────────┼──────┼──────────────────────────────────────┼─────────────────────────────────────┤
│ RecoveryModel v1           │  0   │ RECOVERY, LOAD                       │ (none)                              │
│ TrainingStressModel v1     │  0   │ SESSION (all), LOAD                  │ (none)                              │
├────────────────────────────┼──────┼──────────────────────────────────────┼─────────────────────────────────────┤
│ FatigueModel v1            │  1   │ LOAD, RECOVERY, SESSION (neuromuscular) │ RecoveryModel, TrainingStressModel │
├────────────────────────────┼──────┼──────────────────────────────────────┼─────────────────────────────────────┤
│ RiskModel v1               │  2   │ LOAD, CONDITION                      │ FatigueModel, RecoveryModel         │
│ PerformanceForecast v1     │  2   │ (minimal)                            │ FatigueModel, TrainingStressModel,  │
│                            │      │                                      │ RecoveryModel, AdaptationModel      │
│ AdaptationModel v1         │  2   │ SESSION (90-day window), LOAD        │ FatigueModel, TrainingStressModel   │
├────────────────────────────┼──────┼──────────────────────────────────────┼─────────────────────────────────────┤
│ ReasoningEngine            │  3   │ (none)                               │ All Tier 0–2 models                 │
│ DecisionEngine             │  4   │ (none)                               │ ReasoningEngine                     │
│ RecommendationEngine       │  5   │ (none)                               │ DecisionEngine                      │
└────────────────────────────┴──────┴──────────────────────────────────────┴─────────────────────────────────────┘
```

**Tier assignment rules:**

1. A model is Tier 0 if it has no model dependencies (only feature dependencies).
2. A model is Tier N if its deepest model dependency is Tier N−1.
3. A model must never be assigned a tier lower than its deepest model dependency.
4. Feature dependencies do not affect tier assignment.

**Adding a new model:**

Determine the deepest model dependency → assign to the next tier.
If no model dependencies exist → Tier 0.
If the new model would form a circular dependency → the design is rejected.
The Execution Platform validates the dependency graph at startup.

---

## 4. Execution Order

The execution order is derived from a topological sort of the dependency graph.
The Execution Platform computes and validates this order at startup — it is not hardcoded.

```
Phase 0:  Feature Resolution          (parallel, all extractors)
├─ Sync:  DayFeatures committed to InferenceContext
│
Phase 1:  Tier 0 models               (parallel)
│         RecoveryModel v1
│         TrainingStressModel v1
├─ Sync:  All Tier 0 outputs committed
│
Phase 2:  Tier 1 models               (parallel within tier)
│         FatigueModel v1
├─ Sync:  All Tier 1 outputs committed
│
Phase 3:  Tier 2 models               (parallel)
│         RiskModel v1
│         PerformanceForecast v1
│         AdaptationModel v1
├─ Sync:  All Tier 2 outputs committed
│
Phase 4:  ReasoningEngine             (single)
Phase 5:  DecisionEngine              (single)
Phase 6:  RecommendationEngine        (single)
├─ Sync:  All computation complete
│
Phase 7:  Persistence                 (parallel)
│         DecisionRecords
│         Digital Twin upsert
├─ Sync:  All writes committed
│
Phase 8:  Event emission              (parallel)
          InferenceCompleted
          DigitalTwinUpdated
          RecommendationsAvailable
```

**Performance budget (one athlete-day, production SLA):**

| Phase                                 | Budget        |
| ------------------------------------- | ------------- |
| Feature Resolution                    | ≤ 300ms       |
| Tier 0 models (parallel)              | ≤ 100ms each  |
| Tier 1 models                         | ≤ 150ms each  |
| Tier 2 models (parallel)              | ≤ 100ms each  |
| Reasoning + Decision + Recommendation | ≤ 150ms total |
| Persistence                           | ≤ 300ms       |
| **Total wall clock**                  | **≤ 1100ms**  |

These are soft limits for single-athlete inference. Batch replay operates without
wall-clock constraints.

---

## 5. InferenceContext — Specification

The InferenceContext is constructed once per Inference Pass and passed immutably
to each model. Models cannot mutate it — they return outputs which the Execution
Platform integrates.

```typescript
type InferenceContext = {
  // ── Identity ──────────────────────────────────────────────────────────────
  readonly executionId: string; // UUID — unique per Inference Pass
  readonly athleteId: string;
  readonly trainingDayId: string; // 'YYYY-MM-DD'

  /**
   * Pinned at Inference Pass start.
   * ALL models share this timestamp — it is NOT each model's execution time.
   * This ensures that DecisionRecords from the same pass have coherent timestamps.
   */
  readonly executionTime: Date;

  // ── Feature snapshot ──────────────────────────────────────────────────────
  readonly features: DayFeatures; // immutable after Phase 0

  // ── Previous Digital Twin state ───────────────────────────────────────────
  /**
   * The committed AthleteState from the previous Inference Pass.
   * Read-only during this pass. Used by models for continuity (EWMA, trends).
   * If no previous pass exists → empty state with null sub-dimensions.
   */
  readonly previousState: AthleteState;

  // ── Model outputs (accumulated by the Execution Platform) ─────────────────
  /**
   * Populated tier by tier. A model MAY access outputs from lower tiers.
   * The Execution Platform validates this access at runtime.
   *
   * Absent key = model not yet run or was skipped (null output).
   */
  readonly outputs: Partial<InferenceOutputRegistry>;
};
```

**What a model MAY read from InferenceContext:**

```
✅ context.features                    (always available)
✅ context.previousState               (always available)
✅ context.outputs[modelId]            (only for models in lower tiers)
✅ context.executionTime               (for computedAt timestamps)
✅ context.athleteId, trainingDayId    (for model audit output)

❌ context.outputs[sameOrHigherTier]   (dependency violation — runtime error)
❌ Digital Twin (direct database read) (architectural violation)
❌ Feature Repository (direct read)    (architectural violation — use context.features)
❌ Any external service                (models are pure functions — no I/O)
```

---

## 6. Synchronization Points

Five synchronization points govern the Inference Pass:

### SP1 — Feature Barrier

All feature extractors must complete before any model begins.
Partial feature availability (PENDING) is valid — models degrade gracefully.
Feature extraction failure for a critical extractor triggers the retry policy (§9).
A missing or PENDING feature does NOT block model execution.

**Invariant:** DayFeatures is frozen and immutable after SP1.

### SP2 — Tier 0 Barrier

All Tier 0 models must complete (succeed or fail gracefully) before Tier 1 begins.
A failed Tier 0 model sets its output to `null` in the InferenceContext.
Downstream models that depend on a null output use their cold-start behavior.

**Invariant:** `context.outputs` contains entries for every Tier 0 model (value may be null).

### SP3 — Tier 1 Barrier

Same pattern as SP2. All Tier 1 models complete before Tier 2.

### SP4 — Tier 2 Barrier

All Tier 2 models complete before the Reasoning Engine.

### SP5 — Computation Barrier

All pure computation (Reasoning + Decision + Recommendation) complete before any
persistence or event emission begins.

**Invariant:** After SP5, the Inference Pass result is final. No computation changes it.

---

## 7. Digital Twin Update Strategy

### 7.1 Read Strategy (within a pass)

The Digital Twin is read ONCE at the start of an Inference Pass, before Phase 0.
The snapshot is stored in `context.previousState`.
Models that need historical state (EWMA continuity, trend computation) read from
`context.previousState`, NOT from the database.

**Consequence:** Two concurrent Inference Passes for the same athlete and same day
will each read the same `previousState`. The second write wins. This is acceptable
because concurrent inference is idempotent (see §9) and deterministic.

### 7.2 Write Strategy (after SP5)

The Digital Twin is written ONCE after SP5, in a single atomic upsert operation.
The Execution Platform combines all model outputs into a single `AthleteState`:

```typescript
const newState: AthleteState = {
  recovery: context.outputs['recovery-synthesis-v1']?.recoveryState ?? previousState.recovery,
  trainingStress: context.outputs['training-stress-v1']?.state ?? previousState.trainingStress,
  fatigue: context.outputs['fatigue-v1']?.state ?? previousState.fatigue,
  // ... future models
};
await digitalTwinRepo.write(athleteId, newState);
```

**Consequence:** If a model fails, its sub-dimension retains the previous value.
Failed models do NOT reset their sub-dimension to null.
Only explicit null outputs (cold start) set a sub-dimension to null.

### 7.3 Stale State Detection

The `computedAt` field in each sub-dimension marks when the model last ran.
The Execution Platform may compare `computedAt` to today's date to detect stale dimensions.
APIs expose `computedAt` per dimension so consumers know data freshness.

---

## 8. Parallel Execution Opportunities

```
┌─────────────────────────────────────────────────────────────────────┐
│ Phase             │ Parallelism          │ Concurrency limit         │
├─────────────────────────────────────────────────────────────────────┤
│ Feature Extraction│ All extractors       │ Unbounded (DB-bound)      │
│ Tier 0 models     │ All Tier 0 models    │ Bounded (model count)     │
│ Tier 1 models     │ All Tier 1 models    │ Bounded (model count)     │
│ Tier 2 models     │ All Tier 2 models    │ Bounded (model count)     │
│ Persistence       │ DecisionRecords + DT │ 2 (by design)             │
│ Event emission    │ All events           │ Unbounded (async fire)    │
└─────────────────────────────────────────────────────────────────────┘
```

**Batch inference (replay or nightly jobs):**

When processing multiple athlete-days, the Execution Platform MAY run inference
for multiple athletes in parallel. Athlete isolation ensures no cross-contamination.

Maximum recommended batch parallelism: `floor(availableConnections / 3)`.
This leaves headroom for write operations and avoids connection pool exhaustion.

---

## 9. Idempotency Rules

An Inference Pass is idempotent at the observation level:
running inference twice for the same `(athleteId, trainingDayId)` with identical features
produces identical model outputs and identical Digital Twin state.

**What changes on repeated runs:**

| Artifact       | First Run       | Second Run                        |
| -------------- | --------------- | --------------------------------- |
| DecisionRecord | Created         | New record created (both persist) |
| Digital Twin   | Created/Updated | Updated (same values)             |
| Recommendation | Generated       | Identical content                 |
| executionId    | UUID A          | UUID B (different)                |

**Why DecisionRecords are not upserted:**

DecisionRecords are append-only audit records. Multiple runs on the same day
legitimately occur when new observations arrive late (e.g., Garmin sync delay).
The latest record is always the authoritative one, but older records provide
the full history of inference reasoning across the day.

**The `refresh` semantic (API layer):**

`GET /api/recovery?refresh=true` triggers a new Inference Pass.
`GET /api/recovery` (without refresh) returns the latest cached DecisionRecord.
This is how the API balances freshness with computation cost.

---

## 10. Retry Policy

### 10.1 Feature Extraction Failures

Feature extractors are called by the Feature Engine, not directly by the Execution Platform.
The Feature Engine handles its own retry logic (3 attempts with exponential backoff for DB errors).
If a feature extractor fails after retries → returns PENDING for that feature category.
A PENDING feature category NEVER blocks the Inference Pass.

### 10.2 Model Failures

Each model execution is wrapped in a try-catch by the Execution Platform.

```
Attempt 1: run model
→ Success:  store output in InferenceContext
→ Exception: log with execution context, attempt 2

Attempt 2: run model again (identical context — safe because models are pure)
→ Success:  store output
→ Exception: log, mark model as FAILED_THIS_PASS

FAILED_THIS_PASS:
→ Output = null in InferenceContext
→ Digital Twin sub-dimension: retains previous value (no overwrite)
→ Inference Pass continues (no cascade failure)
→ InferenceCompleted event includes model failure details
```

**No retry for deterministic failures:**
If the exception is typed as a `ModelContractViolation` (indicating a programming error,
not a transient infrastructure error), retry is skipped immediately.

### 10.3 Persistence Failures

**DecisionRecord save failure:**

- Log the failure with full record content (for manual recovery)
- Inference Pass result is still returned to the API caller
- The model output is NOT lost (it is in the API response)
- A background job should retry persistence for failed records

**Digital Twin write failure:**

- Log the failure
- Inference Pass result is returned (computation succeeded)
- The Digital Twin will be re-synchronized on the next Inference Pass
- Mark the Digital Twin as potentially stale via a `lastAttemptedAt` field

---

## 11. Partial Failure Handling

SHARPIT is designed to degrade gracefully when upstream models fail.

### 11.1 Cascade Prevention

When a Tier N model fails:

1. Its output is null in the InferenceContext
2. Tier N+1 models that depend on it receive null as their upstream input
3. These models check their dependency inputs and invoke cold-start behavior
4. Cold-start behavior is defined in each model's specification (see RECOVERY_MODEL.md §10)

**Principle:** A null upstream input is never a reason to crash.
It is a valid state that triggers conservative, data-poor estimation.

### 11.2 Decision Engine Under Partial Failure

The Decision Engine always runs, even when all upstream models fail.
With no model outputs, it produces a conservative `INSUFFICIENT_DATA` decision:

- TrainingVerdict: `CONSERVATIVE`
- IntensityBound: `EASY`
- Confidence: 0.05

This is better than no recommendation at all. The athlete knows data is missing.

### 11.3 Confidence Propagation

Model failures degrade confidence upstream:

```
model_output.confidence = null → downstream model uses 0.0 for this input
synthesized_confidence = product_of_available_confidences × completeness_factor
```

The final `InferenceResult.confidence` reflects the aggregate data quality
across all dimensions. The API exposes this so UIs can indicate data limitations.

---

## 12. Model Versioning

### 12.1 Version Identity

Every model has a stable `modelId` that includes its version:

```
recovery-synthesis-v1
training-stress-v1
fatigue-v1
```

The version is immutable after the model is deployed to production.
A new scientific formulation produces a new model, not a modified version:

```
recovery-synthesis-v1  →  recovery-synthesis-v2
```

This invariant protects historical DecisionRecords: a record with `modelId: recovery-synthesis-v1`
will always correctly describe the computation that produced it.

### 12.2 Upgrade Strategy

**Phase 1 — Shadow run:**
Both v1 and v2 models run in parallel within the same Inference Pass.
v1 output is committed. v2 output is captured for comparison only.
Divergence rate and magnitude are monitored.

**Phase 2 — Backfill validation:**
Run a Replay (§13) for a representative athlete history through v2.
Compare checksums with the v1 Decision Records.
Confirm v2 produces scientifically justified differences.

**Phase 3 — Promotion:**
Register v2 as the active model version in the Model Registry.
v1 continues to run in shadow mode for 30 days (rollback window).
After 30 days, v1 is decommissioned.

**Phase 4 — History backfill (optional):**
For significant scientific improvements, replay the entire history through v2.
New DecisionRecords are created. Old v1 records are retained (immutable audit).
The Digital Twin reflects v2 state going forward.

### 12.3 Model Registry

A startup-time configuration that declares which model version is active for each modelId.
Hot-swapping model versions requires an application restart.
This is intentional — version changes are not stealth operations.

```typescript
const MODEL_REGISTRY: ModelRegistry = {
  'recovery-synthesis': { activeVersion: 'v1', shadowVersion: null },
  'training-stress': { activeVersion: 'v1', shadowVersion: null },
  fatigue: { activeVersion: null, shadowVersion: null }, // not yet implemented
};
```

---

## 13. Replay Behavior

### 13.1 What Replay Is

A controlled re-execution of the Inference Pipeline over historical training days.
Used for:

- Validating model upgrades against historical athlete data
- Rebuilding the Digital Twin after a corrupted or missing period
- Debugging inference anomalies in production
- Developer Platform analysis

### 13.2 Replay Invariants

1. Replay reads from the **Feature Repository** (not from Observations).
   Feature extraction is NOT re-run during replay.
   The features that existed at the original execution time are used.

2. Replay creates new DecisionRecords.
   Original DecisionRecords are never modified or deleted.

3. Replay in `dry-run` mode writes nothing to production repositories.

4. Replay is deterministic: identical features + identical model version = identical output.
   Two dry-run replays of the same history produce identical DecisionRecord contents.
   (Checksums can verify this — see Developer Platform.)

5. `executionTime` during replay is set to the `trainingDayId` date, not to the current time.
   This ensures replayed DecisionRecords are chronologically coherent.

### 13.3 Replay Execution Order

```
Replay.run(athleteId, from, to, modelVersion):
  for each trainingDayId in [from, to]:
    features = FeatureRepository.getSnapshot(athleteId, trainingDayId)
    previousState = ReplayDigitalTwin.getState(athleteId)   // in-memory DT for replay
    context = buildInferenceContext(features, previousState, trainingDayId)
    result = ExecutionPlatform.run(context, mode=replay)
    ReplayDigitalTwin.commit(result.newState)
    yield result
```

### 13.4 Cross-Replay Determinism

Two independent replay runs for the same athlete history and model version MUST produce
outputs with identical checksums for the model computation fields.

The following fields are excluded from checksum computation (they are legitimately different):

- `executionId` (UUID per pass)
- `createdAt` (wall-clock time of the replay run)
- `decisionRecordId` (UUID per record)

---

## 14. Event Emission

The Execution Platform emits typed events via the in-process event bus at defined stages.
Events are fired asynchronously (fire-and-forget within the same process).
Event handler failures do not affect the Inference Pass result.

### 14.1 Event Catalog

```typescript
type InferenceEvents = {
  'inference.started': {
    executionId: string;
    athleteId: string;
    trainingDayId: string;
    triggeredBy: 'observation_ingested' | 'scheduled' | 'manual' | 'replay';
  };

  'inference.feature_resolved': {
    executionId: string;
    completeness: 'FULL' | 'PARTIAL' | 'SPARSE';
    pendingCategories: FeatureCategory[];
    durationMs: number;
  };

  'inference.model_completed': {
    executionId: string;
    modelId: ModelId;
    modelVersion: string;
    tier: number;
    durationMs: number;
    confidence: number;
  };

  'inference.model_failed': {
    executionId: string;
    modelId: ModelId;
    tier: number;
    error: string;
    attempt: number;
  };

  'inference.computation_complete': {
    executionId: string;
    durationMs: number; // wall clock from Pass start to SP5
    successfulModels: ModelId[];
    failedModels: ModelId[];
    overallConfidence: number;
  };

  'digital_twin.updated': {
    executionId: string;
    athleteId: string;
    updatedDimensions: string[]; // which sub-dimensions changed
  };

  'recommendations.available': {
    executionId: string;
    athleteId: string;
    trainingDayId: string;
    recommendationTypes: string[];
    primaryIntensity: RecommendedIntensity;
  };

  'inference.completed': {
    executionId: string;
    athleteId: string;
    trainingDayId: string;
    totalDurationMs: number;
    outcome: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  };
};
```

### 14.2 Event Consumers (current)

| Event                            | Consumer                    | Purpose                     |
| -------------------------------- | --------------------------- | --------------------------- |
| `inference.completed`            | Engine Metrics Collector    | Update performance counters |
| `digital_twin.updated`           | Developer Platform          | Pipeline Inspector tracing  |
| `inference.model_failed`         | Error logging               | Alert on repeated failures  |
| `recommendations.available`      | (future) Push notifications | Real-time UI updates        |
| `inference.computation_complete` | Developer Platform          | Metrics dashboard           |

---

## 15. Deterministic Execution Guarantees

### 15.1 Sources of Non-Determinism

The Execution Platform eliminates all sources of non-determinism from model computation:

| Source                     | Mitigation                                                                                                                          |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| System time (`new Date()`) | Pinned as `context.executionTime` at Pass start. All models use this value.                                                         |
| Random UUIDs               | Used only for `executionId` and `DecisionRecord.id` — never in model computation.                                                   |
| Database read order        | Features are sorted before being passed to models. Extractors produce deterministic outputs.                                        |
| Floating-point precision   | Models use integer arithmetic where possible; double precision where required. Outputs are rounded at defined precision boundaries. |
| External API latency       | Models are pure functions — no external calls.                                                                                      |
| Parallel thread ordering   | Model outputs are combined by `modelId`, not by completion order.                                                                   |

### 15.2 Determinism Invariant

**Formal statement:**

```
Given:
  features₁ = features₂       (identical DayFeatures)
  modelVersion₁ = modelVersion₂  (identical model code)
  context₁.previousState = context₂.previousState (identical prior state)

Then:
  checksum(output₁.computationFields) = checksum(output₂.computationFields)
```

This is the invariant the Developer Platform's determinism tests verify (see `src/core/dev/__tests__/determinism.test.ts`).

### 15.3 Verification Protocol

After any model change, determinism is verified by the Determinism Test Suite:

1. Construct a reference observation history with known outputs
2. Run two independent replays (different executionIds, same features)
3. Compare checksums of all DecisionRecord computation fields
4. Any divergence is a bug — the test suite fails

---

## 16. Reasoning Engine (Specification)

The Reasoning Engine is the synthesis layer between individual model outputs and
the Decision Engine. It does not run inference — it reconciles.

Its responsibilities:

1. **Cross-model consistency check:**
   Detect when models produce conflicting signals (e.g., Recovery says OPTIMAL
   while Fatigue says CRITICAL). Flag `UnifiedReasoning.conflictDetected = true`.
   Apply the conservative signal in all conflicts.

2. **Confidence synthesis:**
   Combine per-model confidences into a single `overallConfidence` using a
   harmonic mean weighted by model tier.

3. **Primary constraint identification:**
   Given all model outputs, identify the single most limiting factor for today.
   Examples: `ACUTE_FATIGUE`, `SLEEP_DEBT`, `OVERREACHING_RISK`, `INJURY_RISK`.

4. **Context flag propagation:**
   Forward special flags from upstream models: `illnessRisk`, `dissonanceDetected`,
   `functionalOverreachingRisk`, `deloadPeriod`.

5. **Athlete state narrative:**
   Produce a structured summary of the athlete's current state in human-readable terms,
   for use by the Recommendation Engine's explanation generator.

**Output:** `UnifiedAthleteReasoning` (typed object passed to Decision Engine).

---

## 17. Decision Engine (Specification)

The Decision Engine converts the Reasoning Engine's synthesis into a single,
actionable daily decision.

```typescript
type DailyDecision = {
  // Core verdict
  readonly trainingVerdict: 'TRAIN' | 'TRAIN_CONSERVATIVELY' | 'ACTIVE_RECOVERY' | 'REST'
  readonly primaryConstraint: string | null   // what is limiting today

  // Intensity and volume bounds (for session planning)
  readonly maxIntensity: RecommendedIntensity
  readonly recommendedVolumeFactor: number    // 0.0–1.5 × typical volume

  // Specific constraints
  readonly avoidHigh Intensity: boolean
  readonly avoidRunning: boolean              // e.g., injury risk per discipline
  readonly avoidBiking: boolean

  // Confidence
  readonly confidence: number
  readonly dataCompleteness: DataCompleteness

  // Flags for Recommendation Engine
  readonly flags: {
    readonly illnessPatternDetected: boolean
    readonly overreachingRiskHigh: boolean
    readonly dissonanceDetected: boolean
    readonly insufficientData: boolean
  }
}
```

**Decision rules are explicit, not learned:**
All decision rules are documented in the Decision Engine specification (future document).
No black-box logic. Every rule has a scientific rationale and an evidence level.

---

## 18. Execution Platform Contract

The Execution Platform (the Inference Orchestrator) is responsible for everything
that is NOT a pure model computation. It is the only component that may perform I/O.

```
Execution Platform responsibilities:
  ✅ Building the InferenceContext
  ✅ Scheduling models in tier order
  ✅ Running models in parallel within a tier
  ✅ Handling model failures and retries
  ✅ Committing results to the Feature Repository
  ✅ Writing Decision Records
  ✅ Updating the Digital Twin
  ✅ Emitting events
  ✅ Returning InferenceResult to the API caller

Execution Platform MUST NOT:
  ❌ Implement inference logic
  ❌ Read from the Digital Twin during model execution (only before and after)
  ❌ Share InferenceContext between two concurrent passes for the same athlete
  ❌ Skip a synchronization point under any circumstances
  ❌ Swallow model failures silently
```

---

## 19. Open Questions and Deferred Decisions

These questions are explicitly deferred — they are noted here to prevent premature
decisions before the system has real usage data.

| Question                                                                      | Why Deferred                                                   |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Should the Execution Platform be a long-running process or function-per-pass? | Requires profiling real athlete loads. Premature optimization. |
| Should inference be triggered in real-time or scheduled nightly?              | Depends on UX requirements not yet defined.                    |
| Should the InferenceContext include weather or calendar data as inputs?       | Awaiting product decision on external data integration.        |
| Should the Decision Engine support athlete-defined rules (overrides)?         | Personalization layer is a future product feature.             |
| Should model outputs be cached (memoization by feature checksum)?             | Premature until per-model latency is measured in production.   |

These questions will be resolved by future ADRs when the system has production usage data.

---

## 20. Evolution Checklist — Adding a New Inference Model

When adding a new model to SHARPIT, the implementing engineer MUST:

1. **Determine tier** by inspecting model dependencies (see §3).
2. **Register the model** in the Model Registry (see §12.3).
3. **Write the algorithm specification** following `docs/models/RECOVERY_MODEL.md` structure.
4. **Implement the pure function** — no async, no I/O, no randomness.
5. **Add required features** to the Feature Extraction Layer if needed (new feature ticket).
6. **Declare dependencies** in the model's `dependencies` field.
7. **Write unit tests** covering all dimension scoring functions and edge cases.
8. **Write integration tests** covering the full pipeline for this tier.
9. **Add the model output type** to `InferenceOutputRegistry`.
10. **Update the Digital Twin schema** with the new sub-dimension (Prisma migration).
11. **Update this document** — add the model to §3 (Dependency Graph) and §4 (Execution Order).
12. **Run the Determinism Test Suite** to confirm the model is deterministic.
13. **Validate the dependency graph** at startup (no cycles, no missing deps).

This checklist is non-negotiable. An inference model that skips any step is not ready for production.

---

_This document is the living specification for SHARPIT's inference execution platform.
It must be updated each time a new model is added, a tier changes, or a new execution rule is defined.
It supersedes any ad-hoc execution logic in code comments or README files._
