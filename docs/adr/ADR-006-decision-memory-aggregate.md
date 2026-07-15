# ADR-006: Decision Memory — a New Aggregate, Separate From DecisionRecord

**Status:** Accepted
**Date:** 2026-07-15
**Author:** Principal Architect
**Supersedes:** N/A
**Superseded by:** N/A

---

## Context

`PRODUCT.md` §4 names Decision Memory as a first-class capability of the Digital Twin: "What SHARPIT recommended... What the athlete actually did... What happened afterwards... Whether the recommendation proved correct." Until now, nothing in the codebase closed this loop — the Plan Safety & Coherence Gate (`src/lib/plan-gate/`, ADR-005) validates a proposal before it reaches the athlete, but nothing records what the athlete then did with it, what happened physiologically afterward, or whether the recommendation held up.

The obvious candidate to extend is `DecisionRecord` (`src/core/inference/types.ts`), the existing "immutable audit trail" persisted per inference pass. Its repository (`src/infrastructure/inference/prisma-decision-record-repository.ts`, `DecisionRecordRepository`) exposes exactly four operations: `save`, `findLatest`, `findByRange`, `findRecent`. There is no `update`. Records are keyed by `(athleteId, modelId, trainingDayId)` — one row per engine run (recovery, fatigue, adaptation, reasoning), not per athlete-facing recommendation.

Decision Memory needs the opposite shape: a recommendation is _shown_, then — at an unpredictable later time — the athlete _acts_ on it, and later still — 24–72 hours after that — an _outcome_ becomes observable. This is an athlete-driven lifecycle with multiple follow-up writes against a stable identifier, not a single append-only fact recorded once per engine run.

A second, related problem: the natural way to record "what SHARPIT knew when it recommended this" is to point at `AthleteSnapshotRecord` (`prisma/schema.prisma`), the persisted `AthleteSnapshot`. But that table is `@@unique([athleteId, trainingDayId])` and is **upserted** whenever the day's snapshot regenerates (`src/lib/athlete-state/snapshot-service.ts`'s idempotent-fingerprint logic overwrites the row on any input change). A bare `snapshotId` string stored on a recommendation would silently point at stale or entirely different content the moment that day's snapshot regenerates for an unrelated reason.

This project already solved an analogous problem once, in ADR-004 (`docs/adr/ADR-004-signal-persistence.md`): rather than persist Signals independently and reference them by ID from Decision Records (where the referenced Signal could later be superseded by a new model version), Signals are embedded verbatim into the Decision Record at creation time. The Decision Record becomes self-contained and immune to future changes in what it references.

---

## Decision

**Model Decision Memory as three new tables — `CoachingDecision`, `CoachingDecisionAction`, `CoachingDecisionOutcome` — in a new `src/lib/decision-memory/` module, placed in the COACHING domain (same reasoning as ADR-005: it reads `AthleteSnapshot`/`DecisionState`, computes no new physiological state, and therefore does not belong under `src/core/`, which is gated by the Core Amendment Process for anything that could read as a new engine).**

`CoachingDecision.snapshotContext` embeds a frozen subset of the recommendation-time `AthleteSnapshot`/`DecisionState` (`confidence`, `confidenceTier`, `overallVerdict`, `limitingFactor`, `physicalHealth.aggregateTrainingCapacity`, `fatigue.trainingCapacity`) directly into the row, following the exact pattern ADR-004 established. A `snapshotIdAtRecommendation` field is kept only as a best-effort cross-reference for deep audit when the underlying `AthleteSnapshotRecord` happens to still match — documented as unreliable, never treated as a foreign key or relied on for correctness.

Session-execution state (`SCHEDULED`/`COMPLETED`/`SKIPPED`/`SUPERSEDED`) is **not** persisted in a fourth table. It is derived on read from the already-existing `PlannedSession.completed`/`activityId`/row-existence, reusing the existing auto-link flow (`src/lib/session-linking.ts`) rather than syncing a parallel cache that could drift from the source of truth.

`DecisionRecord` is not modified in any way.

---

## Options considered

### Option A — Extend `DecisionRecord` with athlete-action fields

Add `athleteAction`, `actionedAt`, `outcome` columns directly to the existing `DecisionRecord` table.

**Pros:**

- No new table; reuses an already-audited, already-append-only persistence path.
- Keeps "everything about a decision" in one place.

**Cons:**

- `DecisionRecordRepository` has no `update` method by design — it is `save`-only, and every consumer (fatigue orchestrator's history reconstruction, reasoning model) assumes rows never change after creation. Adding mutation would either break that invariant for all consumers or require a parallel, harder-to-reason-about "sometimes mutable" contract.
- `DecisionRecord` is keyed one-row-per-engine-run (`athleteId, modelId, trainingDayId`), not one-row-per-athlete-facing-recommendation. A single `coach/plan` call proposing 5 sessions doesn't correspond to a single engine run — there is no natural `DecisionRecord` row to attach an athlete action to.
- Mixes two different responsibilities (physiological-inference audit trail vs. athlete-facing recommendation lifecycle) in one table, violating the single-responsibility boundary the repository's own name implies.

**Rejected because:** the shape mismatch (per-engine-run vs. per-recommendation) and the absence of an update path aren't incidental gaps — they reflect that `DecisionRecord` was designed for a different, narrower purpose. Bending it to fit would compromise the guarantee every existing consumer relies on: that a `DecisionRecord`, once saved, is exactly what it was at `computedAt`.

### Option B — Reference `AthleteSnapshotRecord` by id instead of embedding `snapshotContext`

Store only `snapshotId: string` on `CoachingDecision`, and look up the full snapshot content by joining to `AthleteSnapshotRecord` when needed.

**Pros:**

- Smaller `CoachingDecision` row; no duplicated physiological data.
- Single source of truth for snapshot content — no risk of the embedded copy drifting from how snapshots are actually shaped elsewhere.

**Cons:**

- `AthleteSnapshotRecord` is `@@unique([athleteId, trainingDayId])` and upserted on every snapshot regeneration for that day. If the athlete's snapshot regenerates for any reason (new sync, new wellness check-in, a bug fix redeploy that changes snapshot-building logic) after a recommendation was shown, the referenced row's content silently changes underneath the `CoachingDecision` that pointed at it — the recorded "what SHARPIT knew when it recommended this" becomes retroactively wrong with no signal that it happened.
- Breaks the auditability requirement stated in the product constraints: a recommendation's context must be reconstructable exactly as it was at recommendation time, indefinitely.

**Rejected because:** the whole point of Decision Memory is to answer "was this recommendation good, given what was known at the time" — a reference that can silently repoint defeats that purpose. This is the identical failure mode ADR-004 already reasoned through for Signals, just one layer up the stack.

---

## Consequences

### Positive

- `CoachingDecision` rows are self-contained and permanently reconstructable — reading one months later reproduces exactly what was proposed, what the Gate said, and what SHARPIT believed about the athlete at that moment, with zero risk of the referenced Snapshot having changed underneath it.
- `DecisionRecord` and its repository contract are untouched — the fatigue orchestrator's history reconstruction and every other existing consumer keep their current guarantees with no risk introduced by this change.
- The athlete-driven lifecycle (recommendation → action → outcome, arriving at unpredictable, independent times) gets a persistence model actually shaped for that pattern, instead of forcing a per-engine-run table to serve a purpose it wasn't built for.
- No 4th table for session-execution state means one less place for data to drift from `PlannedSession`, the actual source of truth for whether a session was completed.

### Negative

- `snapshotContext` duplicates a subset of `AthleteSnapshot` fields. If the Snapshot contract's field meanings change in the future (e.g. `confidenceTier` thresholds are recalibrated), old `CoachingDecision` rows keep the _old_ semantics embedded — this is intentional (historical accuracy) but means naive aggregation across old and new rows requires care, similar to any versioned audit log.
- Three new tables (plus enums) is more migration surface than a single-table extension would have been. Mitigated: all three are purely additive, no existing table or column changes.
- `snapshotIdAtRecommendation` being explicitly unreliable-for-correctness is a subtlety a future engineer could misuse if they don't read this ADR — mitigated by a code comment at the field definition pointing here.

### Neutral

- `src/lib/decision-memory/` sits alongside `src/lib/plan-gate/` as a second non-Core, deterministic COACHING-domain module — this establishes a repeatable pattern (deterministic logic reading Snapshot/DecisionState → `src/lib/`, not `src/core/`) that future similar decisions (e.g. a future calibration-signal aggregator) can follow without a fresh placement debate.

---

## References

- `docs/adr/ADR-004-signal-persistence.md` — the embed-verbatim-not-reference pattern this decision reuses.
- `docs/adr/ADR-005-plan-safety-gate-placement.md` — the COACHING-domain-not-Core placement reasoning this decision reuses.
- `docs/product/PRODUCT.md` §4 "Decision Memory" — the product requirement this implements.
- `src/core/inference/types.ts`, `src/infrastructure/inference/prisma-decision-record-repository.ts` — `DecisionRecord`'s existing, unmodified contract.
- `src/lib/decision-memory/` — implementation.
