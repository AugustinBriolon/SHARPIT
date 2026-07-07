# ADR-004: Signal Persistence Strategy — Persisted Entity vs. Ephemeral Value Object

**Status:** Accepted
**Date:** 2026-07-02
**Author:** Principal Architect
**Supersedes:** N/A
**Superseded by:** N/A

---

## Context

The Feature Extraction Layer design (`docs/FEATURE_EXTRACTION.md`) introduces a three-layer
pipeline between raw Observations and the Decision Engine:

```
Observations → Features → [Signal] → Athlete State → Decision
```

The Signal concept was introduced as the layer where computed, context-free Features
are interpreted into named, context-dependent physiological phenomena
(e.g., `CardiovascularFatigue: MODERATE`, `RecoveryDecline: CRITICAL`).

During design review, a fundamental question emerged:

> **Should Signals be persisted domain entities, or ephemeral value objects
> produced during inference and discarded after the Athlete State is updated?**

This decision has architectural implications across scientific evolvability,
explainability, audit requirements, model versioning, and historical replay
for 10+ years of athlete data.

The following constraints are non-negotiable:

- SHARPIT must be scientifically evolvable for 10+ years.
- Scientific models will be replaced as evidence levels improve.
- Recommendations must be explainable and auditable indefinitely.
- Historical observations must be replayable through newer models.
- The architecture must avoid semantic duplication.
- The architecture must remain compatible with Event Sourcing principles.

---

## The Core Problem

Before evaluating options, the root tension must be named precisely.

**Signals are model-bound artifacts.**

A `RecoveryDecline` signal produced by `RecoverySynthesisModel v1` (HRV-based, Plews 2013)
and a `RecoveryDecline` signal produced by `RecoverySynthesisModel v3` (multi-factor:
HRV + sleep architecture + neuroendocrine markers) are:

- Identical in name.
- Semantically incomparable.
- Potentially contradictory on the same feature set.

This is the fundamental problem with persisting signals: **the name is stable, but the
interpretation is model-dependent.** The name creates an illusion of continuity that
conceals a change in scientific meaning.

A secondary problem: **signals create a semantic dependency between the Feature Layer
and the Model Layer.** If the signal vocabulary must change when a new model arrives,
the Feature Layer — which was designed to be model-independent — becomes implicitly coupled
to the models that consume it.

---

## Considered Options

### Option 1: Signal as a Persisted Domain Entity

**Architecture:**

```
Features → Signal Engine → Signal (persisted, lifecycle: DETECTED → ACTIVE → RESOLVED)
         → Athlete State Snapshot (persisted)
         → Decision Record (references Signal IDs)
```

Signal has its own database table, a UUID, a status, a model version tag, and a lifecycle.
When a new model replaces an old one, a migration job re-derives signals and marks old ones
`INVALIDATED` (or retains both with version tags).

**Evaluation by constraint:**

_Scientific evolvability:_
Weak. When `RecoverySynthesisModel v2` replaces v1, what happens to two years of `RecoveryDecline`
signals produced by v1? Three sub-options:

- Delete them → audit trail broken.
- Retain them alongside v2 signals → semantic pollution. The same date now has two
  conflicting signals with the same name. Queries become ambiguous.
- Retain them as `SUPERSEDED` → signals accumulate indefinitely; version-aware query logic
  permeates every consumer.
  None of these is clean. Each model migration becomes an operational event requiring
  a compaction strategy.

_Historical replay:_
Impossible to achieve consistently. Replaying five years of history with Model v3 produces
v3 signals that sit in the same table as v1 and v2 signals. Signal history becomes
a palimpsest — a record overwritten in ways that make the original meaning irrecoverable.

_Explainability:_
Strong. A Decision Record can reference Signal IDs. Auditors see: "Decision made because
Signal `RecoveryDecline: CRITICAL (confidence: 0.71)` was active on 2026-07-02."

_Model versioning:_
Possible but operationally expensive. Requires: Signal schema carries `modelId` + `modelVersion`.
Every query that needs "current signals" must filter by the active model version.
This filter leaks into every consumer.

_Event Sourcing compatibility:_
Moderate. Signals are derived projections. Persisting them as primary entities conflates
the event log (Observations) with its read models (Signals). This violates the core
Event Sourcing invariant that projections are disposable and rebuildable.

_Semantic duplication risk:_
High. `CardiovascularFatigue: MODERATE` (Signal) will inevitably drift toward overlap
with `recovery.hrvDeltaFromBaseline: −21.5%` (Feature) or `readinessScore: 32/100`
(Athlete State). Maintaining clean conceptual boundaries under team evolution pressure
is difficult when all three live as independent persistent entities.

**Summary:**
Persisted Signals provide strong explainability but at severe cost to scientific evolvability
and Event Sourcing compatibility. They become progressively more expensive to manage as
models evolve. The architecture optimizes for the present at the expense of the next decade.

---

### Option 2: Signal as an Ephemeral Value Object

**Architecture:**

```
Features → Inference Pass
           → Signals (TypeScript types, in-memory only, no persistence)
           → Athlete State Snapshot (persisted)
           → Decision Record (persisted, contains reasoning snapshot)
```

Signals exist as strongly-typed domain concepts in the codebase.
They are produced during the inference pass, consumed by models, embedded in decision
reasoning — and then discarded. Nothing persists the Signal independently.

**Evaluation by constraint:**

_Scientific evolvability:_
Strong. When Model v2 replaces v1, no Signal records require migration. The new model
produces new (ephemeral) signals from the same Features. Features are the stable,
model-independent persistence layer. Observation log → Features → (re-derive signals
at any time with any model).

_Historical replay:_
Strong. The source of truth is: Observations + Features + Decision Records (with embedded
reasoning snapshots). To replay history: read historical Features, run new model, produce
new ephemeral Signals, generate new Athlete State. The old decision records are preserved
verbatim — they show what SHARPIT believed at the time, with which model.

_Explainability:_
Potentially weak, but solvable by design (see consequences below).
If Signals are ephemeral, a Decision Record cannot reference a Signal entity by ID.
It must embed the reasoning snapshot inline: the Signal-level interpretations must be
serialized INTO the Decision Record at decision time.

_Model versioning:_
Strong. No migration required when models change. Each Decision Record is stamped with
the model version that produced it. Old decisions are unaffected. New decisions use the
new model. No cross-contamination.

_Event Sourcing compatibility:_
Strong. Observations are events (immutable, append-only). Features are projections
(derived, cacheable, rebuildable). Athlete State Snapshots are projections. Decision
Records are also events (the decision itself is a domain event). Signals are purely
transient objects within projection computation. This is the canonical Event Sourcing pattern.

_Semantic duplication risk:_
Low. The Signal concept exists only in the type system. It cannot drift toward Feature
or Athlete State because it has no persistence and no independent lifecycle.

**Open problem:** Explanation generation in this model requires re-running the inference
pass retroactively if an explanation is requested for a past decision, OR embedding a
complete reasoning snapshot in the Decision Record at decision time.

---

### Option 3: Signal as an Ephemeral Type + Decision Record as the Explainability Unit

**Architecture:**

```
Observations (persisted, immutable — Event Log)
  │
  ▼
Features (persisted, versionable, model-independent — Projection Cache)
  │
  ▼  [Inference Pass — stateless function]
     Signals (ephemeral, strongly-typed, discarded after pass)
     Athlete State Delta (computed)
  │
  ▼
Athlete State Snapshot (persisted, model-version tagged — Projection)
  │
  ▼
Decision Record (persisted, immutable — Domain Event)
  │ contains:
  │  - timestamp
  │  - model version used
  │  - Feature values at decision time (snapshot)
  │  - Signal interpretations at decision time (embedded, not referenced)
  │  - Athlete State at decision time (snapshot)
  │  - Recommendation produced
  │  - Confidence
  │  - Evidence (human-readable, embedded)
```

This option makes Signal a **first-class concept in the domain model (type system)**
but **not a first-class concept in the persistence model**.

The Signal exists, is named, is strongly typed, and is reasoned over — but it is not
stored independently. Its interpretation is captured within the Decision Record that it
contributed to producing.

**The key insight:** the unit of explainability is not the Signal.
The unit of explainability is the Decision Record.

"Why did SHARPIT recommend reducing load on 2026-07-02?" is answered by reading the
Decision Record, which contains — embedded, immutable, verbatim — the reasoning that
existed at decision time, including the Signal-level interpretations.

---

## Scenario Analysis

### Scenario 1 — New Recovery Model replaces previous one

**Option 1 (persisted):** Old `RecoveryDecline` signals remain. New model produces new signals.
Database has two flavors of `RecoveryDecline` on overlapping dates. Any query must now
specify model version. Schema changes required. Migration job required. Operational cost: high.

**Option 3 (ephemeral + Decision Records):** Observations and Features are unchanged.
The new model starts producing new ephemeral Signals on new Decisions.
Old Decision Records remain verbatim — they accurately represent what was believed at the time
with the old model. No migration required. Historical audit remains clean. Operational cost: zero.

---

### Scenario 2 — Recalculating 5 years of athlete history with Model v3

**Option 1 (persisted):** Requires a full Signal table migration — invalidate all Signals,
re-run model, persist new Signals. During migration, the system is in an inconsistent state.
Old Decision Records reference old Signal IDs — those Signals now carry `SUPERSEDED` status.
Auditors face a confusing record where referenced Signals contradict the current model.

**Option 3 (ephemeral + Decision Records):** Run the new model over historical Features.
Generate a new Athlete State history. Old Decision Records are untouched — they are
immutable domain events. They accurately show: "On 2026-07-02, with Model v1, SHARPIT
recommended X." New analysis with Model v3 can be published as a separate report or
comparison view. No semantic collision.

---

### Scenario 3 — Multiple inference models consuming the same observations

**Option 1 (persisted):** Each model produces its own Signal set. The Signal table
carries signals from three models simultaneously. Any consumer reading "current signals"
must be aware of which model is authoritative. Complex arbitration logic required.

**Option 3 (ephemeral + Decision Records):** Each model runs independently over the same
Features. Each produces its own ephemeral Signals and its own Athlete State estimate.
The Decision Engine arbitrates between model outputs at the Athlete State level — not at
the Signal level. Signals are model-internal intermediate values. No cross-model Signal
conflicts possible because no Signal is shared across model boundaries.

---

### Scenario 4 — Explanation generation

**Option 1 (persisted):** Decision Record references `[Signal-ID-1, Signal-ID-2]`.
Explanation engine joins Decision + Signals → produces text. Clean, lazy evaluation.
Works perfectly until a Signal is superseded and no longer semantically valid.

**Option 3 (ephemeral + Decision Records):** Decision Record embeds at creation:

```json
{
  "evidence": [
    {
      "type": "SIGNAL",
      "name": "RecoveryDecline",
      "severity": "CRITICAL",
      "confidence": 0.71,
      "sourceFeatures": {
        "recovery.hrvDeltaFromBaseline": -21.5,
        "recovery.sleepEfficiencyPercent": 37.2,
        "recovery.rhrDeltaFromBaseline": +4
      }
    },
    {
      "type": "SIGNAL",
      "name": "AcuteLoadElevated",
      "severity": "HIGH",
      "confidence": 0.83,
      "sourceFeatures": {
        "load.acuteLoad": 412,
        "load.acwr": 1.47
      }
    }
  ],
  "modelId": "recovery-synthesis-v1",
  "modelVersion": "1.3.2"
}
```

Explanation engine reads from Decision Record directly. No joins required. No staleness
possible — the evidence is embedded verbatim at decision time. Works correctly regardless
of how many model versions have passed since.

**Key observation:** This approach actually produces BETTER audit trails than Option 1.
In Option 1, an old Decision references an old Signal. If that Signal is later superseded,
the Decision's evidence chain is silently degraded. In Option 3, the evidence is a permanent
verbatim snapshot — it will never be affected by future model evolution.

---

### Scenario 5 — Historical audit

"On 2026-07-02, SHARPIT recommended reducing load. Was this correct given what was known?"

**Option 1:** Read Decision → read referenced Signals → read referenced Features.
Works if Signals haven't been superseded. If they have: the chain is broken.

**Option 3:** Read Decision Record. Full reasoning chain embedded verbatim. Immune to
model evolution. Auditor sees exactly what the system knew, believed, and decided — frozen
at decision time.

---

### Scenario 6 — Model versioning without data migration

**Option 3 enables zero-cost model versioning:**

1. Implement new model version.
2. Deploy. New inference passes use new model.
3. Old Decision Records reference old model version — immutable, untouched.
4. New Decision Records reference new model version.
5. A/B comparison is possible by querying Decision Records by `modelVersion`.
6. Rollback: revert model reference. Old Decision Records still valid.

No database migration. No semantic pollution. No compaction strategy.

---

## Decision

**Adopt Option 3: Signal as an ephemeral domain type, Decision Record as the persisted
explainability unit.**

Specifically:

- Signal is a **strongly-typed concept in the TypeScript domain model**. It is not an interface
  or a technical type — it is a named, first-class physiological phenomenon with its own
  severity taxonomy, confidence model, and source feature linkage.
- Signal is **produced during the inference pass** by Signal Detectors (pure functions) and
  consumed by Models and the Decision Engine.
- Signal is **never persisted independently**.
- Signal interpretations are **embedded verbatim into Decision Records** at decision time.
- Decision Records are **immutable domain events** (append-only, never modified after creation).
- Athlete State Snapshots are **model-versioned projections** (rebuildable from Features).

The persistence hierarchy is:

| Artifact               | Persistence | Mutability        | Model-bound? |
| ---------------------- | ----------- | ----------------- | ------------ |
| Observation            | Permanent   | Immutable (event) | No           |
| Feature                | Persistent  | Versioned         | No           |
| Signal                 | **None**    | Ephemeral         | Yes          |
| Athlete State Snapshot | Persistent  | New version/model | Yes          |
| Decision Record        | Permanent   | Immutable (event) | Versioned    |

---

## Rationale

### Why not Option 1 (persisted Signal)

The core flaw: **the Signal namespace is stable but the Signal semantics are model-bound.**
Persisting Signals creates an entity whose identity (name) outlives the validity of its
meaning. This is a subtle but fatal semantic coupling between the persistence layer and the
scientific layer.

Formally: Signal is a **projection**, not an **event**. In Event Sourcing, projections are
always derived from the event log and must be rebuildable on demand. Elevating a projection
to a primary entity creates an implicit source of truth that competes with the event log.
When the two diverge — and they will, during every model migration — the system has no
principled way to resolve the conflict.

### Why not Option 2 (fully ephemeral, no embedding)

Option 2 sacrifices explainability entirely without compensation. A Decision Record that
contains only "model produced recommendation X" with no embedded reasoning is not auditable
and not explainable. This is not acceptable for a system that must be able to answer
"why did SHARPIT recommend this?" on any decision ever made.

### Why Option 3

Option 3 resolves the tension by separating:

- **What Signal IS** (a domain concept, a named physiological phenomenon) from
- **How Signal is stored** (embedded in Decision Records, not independently persisted).

The Decision Record becomes the atomic unit of scientific accountability. It contains
everything required to reconstruct the reasoning chain — feature values, signal interpretations,
model version, confidence — at a single frozen point in time. It is immune to future
model evolution because it is immutable.

This is architecturally equivalent to **event sourcing with rich event payloads**:
the Decision Event carries its own reasoning context, making it self-contained and
permanently interpretable without relying on joinable related entities.

The type system provides all the benefits of Signal-as-concept (strong typing, named phenomena,
taxonomic severity) without the persistence costs. Signal Detectors remain pure functions:
`(features: AthleteFeatures) => Signal[]`. They are independently testable, replaceable,
and version-controllable.

---

## Consequences

### Positive

- **Zero-cost model migration.** Replacing a scientific model requires no database migration.
  Old Decision Records are untouched. New model runs on future inferences immediately.

- **Replay is clean and unambiguous.** Re-running 5 years of history through a new model
  produces a new Athlete State history without touching Decision Records. Historical decisions
  remain verbatim records of past beliefs.

- **Explanation is immune to model evolution.** Decision Records embed reasoning at creation
  time. No future model change can degrade a past explanation.

- **Multiple models can coexist without Signal table conflicts.** Each model produces its own
  ephemeral Signal set within its inference boundary.

- **The type system enforces Signal discipline.** Since Signals are TypeScript types (not DB
  rows), adding a new Signal type requires only a type definition and a Signal Detector.
  No schema migration. No backfill.

- **Event Sourcing compatibility.** Observations are events. Features are projections. Decision
  Records are events. Athlete State Snapshots are projections. The architecture is clean.

### Negative

- **Decision Record schema must be rich at creation time.** The inference pass must produce
  a complete embedded evidence snapshot before persisting the Decision Record. Lazy evaluation
  of evidence is not possible.

- **Decision Record size is higher than with referenced Signals.** Embedding feature values
  and signal interpretations inline produces larger JSON payloads than referencing Signal IDs.
  Mitigation: feature value embedding is bounded (≤ 20 features per decision). Acceptable.

- **Signal history is not independently queryable.** "When was the last time CardiovascularFatigue
  was detected?" requires querying Decision Records' embedded evidence, not a Signal table.
  This is more complex than a simple `SELECT * FROM signals WHERE name = 'X'`.
  Mitigation: Decision Records can be indexed by embedded Signal names for efficient queries.

- **Athlete State history requires explicit snapshot management.** Since Signals are not
  persisted, the Athlete State history depends on Athlete State Snapshots being created
  after each inference pass. If a snapshot is missing, that day's state cannot be recovered
  without re-running the inference (which is possible but adds latency).

### Scientific debt created

- **SD-004:** Signal history query patterns need to be evaluated as SHARPIT scales.
  If "last occurrence of Signal X" becomes a frequent query, a derived Signal History table
  (populated from Decision Records via event projection) should be evaluated. This is a
  read model optimization, not a persistence model change. Add to `future-research.md`.

- **SD-005:** Athlete State Snapshot compaction strategy undefined. As snapshots accumulate,
  a retention policy must be established (e.g., one snapshot per training day per model version).
  Add to `future-research.md`.

---

## Implementation Implications

The following concepts require design documents before implementation:

### Signal Detector (new)

A pure function module: `(features: AthleteFeatures, context: AthleteContext) => Signal[]`
One Detector per physiological domain (Recovery, Load, Sleep, Performance, Risk).
Detectors are stateless, independently testable, version-controlled.

### Decision Record (new)

The atomic unit of scientific accountability. Schema:

```typescript
type DecisionRecord = {
  id: string; // UUID, immutable
  athleteId: string;
  createdAt: Date; // immutable
  trainingDayId: string;
  modelId: string; // e.g., "recovery-synthesis"
  modelVersion: string; // semver
  athleteStateSnapshot: AthleteStateSnapshot;
  signals: EmbeddedSignal[];
  featureSnapshot: FeatureSnapshot;
  recommendation: Recommendation | null;
  verdict: Verdict | null;
  confidence: number;
};

type EmbeddedSignal = {
  name: string; // e.g., "RecoveryDecline"
  severity: SignalSeverity;
  confidence: number;
  sourceFeatures: Record<string, number>; // verbatim values at decision time
};
```

### Athlete State Snapshot (update existing concept)

Persisted after every successful inference pass. Carries `modelId` + `modelVersion`.
The Digital Twin reads from the latest snapshot. Historical snapshots are retained.

---

## Review Criteria

This decision should be revisited if:

- **Query performance degrades.** If querying Signal history via Decision Record JSON
  becomes unacceptable at scale (> 5 seconds for a 5-year history query), a derived
  Signal History read model should be introduced (SD-004).

- **Decision Record size exceeds 64 KB.** If the embedded feature snapshot grows larger
  than this threshold, a hybrid approach (embed Signal interpretations, reference Features
  by ID) should be evaluated.

- **A regulatory requirement mandates Signal-level audit trails independent of Decision
  Records.** Currently no such requirement exists in the sports technology domain.

- **The team consistently confuses Signal-the-type with Signal-the-entity.** If Signal
  as an ephemeral concept creates systematic developer confusion, the cost of naming
  and documentation exceeds the architectural benefit, and a re-evaluation is warranted.
