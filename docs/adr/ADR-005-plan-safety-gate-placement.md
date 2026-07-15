# ADR-005: Plan Safety & Coherence Gate — Placement Outside Frozen Core

**Status:** Accepted
**Date:** 2026-07-15
**Author:** Principal Architect
**Supersedes:** N/A
**Superseded by:** N/A

---

## Context

The AI Coach can generate `PlannedSession` proposals through two paths — `POST /api/coach/plan`
(fresh block generation) and `POST /api/coach/adapt` (adjustments to the existing plan). Until
this change, neither path had any deterministic safety check: proposals were validated only
structurally (Zod schema — types, ranges) and gated by a manual "approve/deny" click in the UI.
Nothing verified that a proposed session was actually compatible with the athlete's current
`DecisionState` (recovery/fatigue/confidence), active physical-health constraints, recent load
history, or already-planned sessions before it reached the athlete for review.

`docs/models/CORE_ARCHITECTURE.md` freezes the Core inference pipeline
(Observation → Feature → Digital Twin → specialized engines → Decision Engine → AthleteSnapshot →
Presentation) and requires that **any new Core engine** go through a decision-gap analysis, an
ADR, and explicit approval before implementation (`CORE_ARCHITECTURE.md` §"Amendment Process").
A deterministic validation layer for AI-generated plans could plausibly be read as exactly that
kind of new engine, so its placement needed to be decided explicitly rather than left implicit
in a source-file location.

The validation layer itself (referred to as "the Gate") needed to:

- Consume `AthleteSnapshot`/`DecisionState` as the canonical physiological input — never
  recompute or duplicate inference.
- Never silently alter a proposed session — only accept, warn, require confirmation, reject, or
  offer a separate safer alternative alongside the untouched original.
- Be deterministic, explainable, and independently unit-testable without mocking Prisma.

---

## Decision

**Implement the Gate as `src/lib/plan-gate/`, a pure, deterministic module in the COACHING
domain (per `ARCHITECTURE.md`'s domain map) — explicitly outside `src/core/`.**

The Gate consumes already-computed `AthleteSnapshot`/`DecisionState`, `Condition`-derived
`PhysicalHealthData`, and plain historical data (activities, planned sessions, plan weeks,
calendar busy blocks) via a single I/O boundary (`build-context.ts`). Every validation rule
(`src/lib/plan-gate/rules/*.ts`) is a pure function `(GateContext, GateProposal) => RuleFinding[]`
with zero Prisma access and zero re-derivation of physiological state. The orchestrator
(`evaluate-plan.ts`) performs no I/O at all.

---

## Rationale

The Gate infers nothing new about the athlete — every physiological signal it reads
(`DecisionState.overallVerdict`, `PhysicalHealthData.aggregateTrainingCapacity`,
`FatigueData.trainingCapacity`) is already the finished output of a Core engine. What the Gate
adds is downstream: cross-checking an _external proposal_ (from the LLM) against that already-
computed state, plus plain arithmetic over historical `PlannedSession`/`Activity` rows (ACWR via
the existing `computeTrainingLoad`, rolling-week session counts, date-range overlaps). None of
this meets the bar CORE_ARCHITECTURE.md sets for a Core engine: "produces dimension state +
DecisionRecord" via a scientific model. The Gate produces no dimension state and asserts no new
physiological claim — it only decides whether an already-classified state (RECOVER, LIMITED
capacity, REST_ONLY, etc.) is compatible with a proposed action.

Placing it under `src/lib/`, alongside `coach-tools.ts` and `coach-context.ts` (the existing
COACHING/AI-domain modules that already consume Snapshot/DecisionState for the same kind of
downstream product decision), keeps the frozen-Core boundary legible: nothing under
`src/core/inference/` changed, no new Digital Twin field was added, and the Decision Engine's
sole-arbitration-point property (`CORE_ARCHITECTURE.md` principle 7 — "All product decisions
come from DecisionState") is preserved, since the Gate never overrides or recomputes a verdict,
it only checks a proposal against the verdict that already exists.

---

## Alternatives Considered

### Alternative 1: `src/core/decision/plan-gate/` (sibling of the Decision Engine)

**Description:** Place the Gate as a submodule of `src/core/decision/`, reasoning that it is
"decision-adjacent" arbitration logic.

**Pros:**

- Physically close to `DecisionState`, the type it consumes most.
- Signals architecturally that it is authoritative validation, not a UI nicety.

**Cons:**

- `src/core/decision/` is explicitly listed as **CORE (frozen)** in `CORE_ARCHITECTURE.md`'s
  Architectural Status Matrix — any new file there reads as an amendment to a frozen subsystem,
  triggering the same review weight as an actual new engine even though the Gate does no
  inference.
- Blurs the frozen/evolving boundary for future contributors: a new engineer scanning
  `src/core/` would reasonably assume everything there requires the full amendment process,
  making the Gate harder to iterate on than its actual risk profile warrants.

**Rejected because:** the cost of the false signal (implying Core-frozen review is required for
Gate rule changes, which are product/coaching-domain tuning, not physiological model changes)
outweighs the benefit of physical proximity to `DecisionState`.

### Alternative 2: New top-level `src/core/plan-gate/` directory

**Description:** Create a new, explicitly-named top-level directory under `src/core/`,
documented as "not an inference engine" via its own README.

**Pros:**

- Still visually groups it with other `src/core/*` domain-type modules (e.g.
  `src/core/planned-session/`, `src/core/scenario/`), which are Core-adjacent but also not
  inference engines.

**Cons:**

- `CORE_ARCHITECTURE.md`'s Amendment Process explicitly requires "a written decision-gap
  analysis... before implementation" for changes to **CORE (frozen)** subsystems, and while
  `src/core/planned-session/` and `src/core/scenario/` do exist as non-engine domain types under
  `src/core/`, they predate this Gate and are not what's being changed here — adding a new
  directory to `src/core/` for a first-of-its-kind cross-cutting validation layer is a larger,
  precedent-setting claim than the decision warrants, and risks being read by future amendments
  as "the bar for adding to `src/core/` has been lowered."

**Rejected because:** `src/lib/plan-gate/` achieves the same domain-type clarity (pure functions,
typed contracts) without touching the directory whose contents `CORE_ARCHITECTURE.md` explicitly
enumerates as gated.

---

## Consequences

### Positive

- Gate rule changes (tuning thresholds, adding a rule) follow the normal COACHING-domain review
  process — no decision-gap analysis required per change, since the module is explicitly outside
  the Amendment Process's scope. Confirmed by this ADR itself: the _placement_ decision is
  reviewed once, here; individual rule tuning is not.
- Every rule is unit-testable with plain object literals (55 unit tests added, zero Prisma
  mocking) because the pure-function/I/O-boundary split is enforced by the module's placement
  outside `src/core/`, where such purity is a house convention (`ARCHITECTURE.md` §2.2) but not a
  frozen contract.
- `ACWR_THRESHOLDS` (`src/lib/training-load.ts`) is reused rather than redefined — the Gate
  introduces exactly two new numeric thresholds (10% weekly-load tolerance, 3 high-intensity
  sessions per rolling week), both already stated as instructions in the existing
  `coach/plan/route.ts` LLM prompt, so no new physiological claim was introduced, only made
  deterministic.

### Negative

- `AthleteSnapshot`/`DecisionState` field shapes are now a de facto public contract consumed by
  two independent domains (Presentation and the Gate) rather than one. A future Snapshot field
  rename requires checking `src/lib/plan-gate/build-context.ts` in addition to Presentation
  builders — not enforced by any automated boundary today.
- The Gate does not persist its results in this phase (`GateResult` is returned in the API
  response only). A future "Decision Memory" phase that links a recommendation to an athlete
  action will need a new table to make Gate evaluations queryable after the fact — this ADR does
  not cover that persistence design.

### Neutral

- `src/lib/coach-tools.ts`'s chat-based `createPlannedSession`/`updatePlannedSession` tools are
  **not** wired to the Gate yet — they keep their existing manual UI-approval gate. Extending Gate
  coverage to that path is a separate, smaller follow-up (no new placement decision required,
  since it would call the same `evaluatePlan`/`buildGateContext` functions this ADR establishes).

---

## Review Criteria

This decision should be revisited if:

- A future rule genuinely needs to _compute_ new physiological state (not just read existing
  Snapshot/DecisionState fields) — at that point it would cross into engine territory and the
  full Core Amendment Process applies, likely requiring the rule to move into a proper inference
  engine instead of `plan-gate/`.
- Gate evaluation needs to become synchronous with persistence (e.g., blocking writes at the
  database layer rather than the API layer) — that would argue for moving `build-context.ts`'s
  responsibilities closer to the query layer, which may change the module's boundary.
- The `src/core/planned-session/` precedent (non-engine domain types living under `src/core/`)
  is itself reconsidered — if that convention changes, this ADR's Alternative 2 should be
  re-evaluated under the new convention.

---

## References

- `docs/models/CORE_ARCHITECTURE.md` — frozen Core boundary, Amendment Process, Architectural
  Status Matrix (`Coach IA` row updated to reference this Gate).
- `ARCHITECTURE.md` §4 Domain Boundaries — COACHING domain map, updated to list `plan-gate`.
- `src/lib/plan-gate/types.ts` — `GateContext`, `GateProposal`, `GateResult` contracts.
- `src/app/api/coach/plan/route.ts`, `src/app/api/coach/adapt/route.ts` — integration points.
