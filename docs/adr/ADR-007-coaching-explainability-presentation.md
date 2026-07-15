# ADR-007: Coaching Explainability Presentation Layer

**Status:** Accepted
**Date:** 2026-07-15
**Author:** Principal Architect
**Supersedes:** N/A
**Superseded by:** N/A

---

## Context

Phases 1–3 built the intelligence: a trustworthy daily `AthleteSnapshot`, the deterministic Plan Safety & Coherence Gate (`src/lib/plan-gate/`, ADR-005), and Decision Memory (`src/lib/decision-memory/`, ADR-006) — the recommendation → athlete-action → outcome loop. None of it reached the athlete beyond small inline `GateStatusBadge`/`GateFindingsList` pills in the plan-generator/plan-adapter dialogs. PRODUCT.md's execution doctrine is explicit that the post-Kernel era's job is to **express** existing intelligence, not accumulate more of it.

This phase builds four presentation surfaces — a weekly coaching brief, per-session rationale, an adaptation explainer, and evidence-backed learning feedback — following the established `src/core/presentation/*-view-model.ts` (types) + `src/lib/presentation/*.ts` (pure builder) + `src/app/api/presentation/*/route.ts` (the I/O boundary) + `src/hooks/use-*-view-model.ts` (client) pattern already used by `planned-session`, `scenario-comparison`, and the rest of the Presentation layer (`docs/models/CORE_ARCHITECTURE.md`). Three decisions in this work are non-trivial enough to record.

---

## Decision

### 1. `GateProposal.rationale` — carrying the LLM's own explanation through the frozen record

`GeneratedSession.rationale`/`AdaptChange.reason` (the LLM's stated purpose for a proposal) existed in the `coach/plan`/`coach/adapt` output but were dropped when mapped to `GateProposal` (`src/lib/plan-gate/types.ts`) — the Gate's rules never needed them. Because `CoachingDecision.proposal` freezes exactly this `GateProposal` at creation (ADR-006), the athlete-facing "why this session" text had no persisted source to draw on.

`GateProposal` gains `readonly rationale: string | null`. Gate rules ignore it — no rule logic changes. Both routes now populate it from the LLM's own output (`s.rationale`, `change.reason ?? null`). This is additive: the only literal constructors of `GateProposal` are `baseProposal()` (test fixture, one touch point) and the two routes.

### 2. Presentation builders are pure; all I/O lives in the route

`session-rationale.ts`, `weekly-coaching-brief.ts`, `describe-outcome.ts`, `classify-trigger.ts`, and `learning-feedback.ts` are all plain-object-in, plain-object-out functions with no Prisma import — matching `evaluate-outcome.ts`'s existing convention in `src/lib/decision-memory/`. Each API route (`weekly-coaching-brief`, `session-rationale/[id]`) is the sole place that calls `getPlannedSessionById`, `findDecisionForPlannedSession`, `findDecisionWithHistory`, `getActiveTrainingPlan`, etc., and hands plain data to the builder. This keeps every new builder unit-testable with fixtures alone (no `vi.mock`), and keeps the boundary CORE_ARCHITECTURE.md already draws — "no Presentation component performs business logic" — extended one layer deeper: no Presentation _builder_ does I/O either.

Two new read-only repository functions were added to `src/lib/decision-memory/repository.ts` to support this: `findDecisionWithHistory` (one decision with its full action log and outcome, via Prisma `include`) and `findRecentEvaluatedOutcomes` (evaluated outcomes since a date, paired with their proposal's type/intensity). Neither adds a write path.

### 3. Learning Feedback is an on-demand, unpersisted aggregate — explicitly not `AthleteCalibrationSignal`

ADR-006's Phase 3 plan named a future `AthleteCalibrationSignal` table: a **persisted, versioned** cross-decision learning signal meant to feed back into coach context, deliberately deferred because it needs a real population of `CoachingDecisionOutcome` rows to be tested against anything but synthetic data.

This phase's Learning Feedback (`src/lib/decision-memory/learning-feedback.ts`) is a different, smaller thing: a **pure, read-only aggregation** recomputed on every request from `findRecentEvaluatedOutcomes`, never written to a table, never fed back into any prompt or model. It groups evaluated outcomes by `(type, intensity)` and only emits a sentence for a category once it has 3+ evaluated samples (silence over noise, PRODUCT.md §XI) — otherwise the athlete sees either nothing (zero outcome history) or a single "evidence is still too limited" line (some history, no category qualifies yet).

This distinction is recorded explicitly so a future reader does not conflate the two or assume Phase 3's deferral was silently reversed. `AthleteCalibrationSignal` remains not built.

---

## Options considered

### Option A (for #2) — Let the route pass Prisma-shaped rows straight into the builder, cast at the boundary

Skip mapping to plain objects; have `buildSessionRationaleViewModel` accept the raw Prisma `PlannedSession`/`CoachingDecision` include shape directly.

**Pros:** Less mapping code in the route.
**Cons:** Couples the builder to Prisma's generated types, makes fixture-based unit testing require constructing full Prisma row shapes (as already avoided by every other builder in this phase and by `evaluate-outcome.ts`), and reintroduces exactly the coupling `ARCHITECTURE.md` §8.3 ("Never use Prisma types in domain functions") warns against.
**Rejected because:** it would be the only builder in the codebase to do this; consistency with the existing pattern was worth the small amount of route-side mapping.

### Option B (for #3) — Build `AthleteCalibrationSignal` now, backed by only a handful of real outcomes

Implement the persisted, versioned table this phase instead of an on-demand aggregate, since the presentation layer needs _some_ answer to "what does the history show."

**Pros:** Would have closed Phase 3's deferred item in the same pass.
**Cons:** ADR-006 already reasoned through why this should wait — testing a persisted, versioned aggregation against synthetic fixtures risks calibrating thresholds that don't hold once real athlete data exists, and a persisted signal implies a migration and a feedback path into coach context that this phase's scope (presentation only, no new inference/feedback loops) explicitly excludes.
**Rejected because:** the on-demand aggregate delivers the same athlete-facing sentences today, at a fraction of the commitment, and leaves the harder persisted-signal design for when there's real data to validate it against.

---

## Consequences

### Positive

- Every new ViewModel builder is testable with plain fixtures — no `vi.mock`, matching this codebase's established pure/impure split. 47 new unit tests across `describe-outcome`, `classify-trigger`, `learning-feedback`, `session-rationale`, and `weekly-coaching-brief` shipped alongside the routes.
- `GateProposal.rationale` closes a real gap (the LLM's own purpose text was being silently discarded) without touching any Gate rule.
- The Learning Feedback / `AthleteCalibrationSignal` distinction is on record before any confusion could arise, rather than discovered later by someone trying to reconcile two similarly-named concepts.

### Negative

- Two parallel "why did this happen" surfaces now exist at different layers: `RuleFinding.rationale` (Gate, session-level) and the Learning Feedback sentence (aggregate, cross-session). They read differently by design (one factual/immediate, one statistical/historical) but a future reviewer should not assume they are the same mechanism.
- `findRecentEvaluatedOutcomes` recomputes its aggregation on every Weekly Brief request rather than caching — acceptable at current data volume (bounded by a 90-day window and per-athlete outcome count), revisit if this becomes a real cost once `AthleteCalibrationSignal` exists and could serve as a faster read path.

### Neutral

- `src/lib/presentation/snapshot-context-labels.ts` extracts the `DecisionSnapshotContext` → French-label mapping shared by `session-rationale.ts` and `weekly-coaching-brief.ts` — a small, reusable presentation helper, not a new domain concept.

---

## References

- `docs/adr/ADR-005-plan-safety-gate-placement.md` — the Gate placement and rule-code taxonomy this phase's `classify-trigger.ts` reads (never re-derives).
- `docs/adr/ADR-006-decision-memory-aggregate.md` — Decision Memory's persistence model, and the `AthleteCalibrationSignal` deferral this ADR distinguishes Learning Feedback from.
- `docs/models/CORE_ARCHITECTURE.md` — the Presentation layer's "no business logic in components" boundary this phase extends to builders.
- `docs/product/PRODUCT.md` §"The single objective" and §XI "Silence is preferable to noise" — the product doctrine behind the ≥3-sample threshold and the empty/degraded-state requirements.
- `src/lib/presentation/session-rationale.ts`, `src/lib/presentation/weekly-coaching-brief.ts`, `src/lib/decision-memory/learning-feedback.ts` — implementation.
