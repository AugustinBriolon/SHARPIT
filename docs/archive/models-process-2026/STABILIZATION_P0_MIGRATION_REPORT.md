# Stabilization Sprint 1 (P0) — Migration Report

> **Date:** 2026-07-10  
> **Status:** P0 complete — single product decision pipeline enforced on Today + Coach + Snapshot  
> **Constitution:** [`CORE_ARCHITECTURE.md`](./CORE_ARCHITECTURE.md) · [`DECISION_ENGINE.md`](./DECISION_ENGINE.md)

---

## Objective

Eliminate parallel product decision paths. After P0, every athlete-facing **verdict, action, limiting factor, confidence gate, and why-block** on Today and Coach originates from:

```
Decision Engine → DecisionState → AthleteSnapshot.decision → Presentation → Surfaces
```

---

## Updated Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        INFERENCE DOMAINS (read-only inputs)                  │
│  Recovery · Fatigue · Adaptation · Physical Health · Environment · Strain   │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     DECISION ENGINE (decision-v1)                  [CORE]   │
│  Arbitration · conflict resolution · evidence ranking · confidence gate     │
│  Code: src/core/decision/                                                   │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ DecisionState
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     REASONING (explanation projection only)        [STABLE] │
│  runReasoningModel() → decisionStateToReasoningState() — no re-arbitration  │
│  Code: src/core/inference/reasoning/model.ts                                │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ATHLETE SNAPSHOT BUILD                         [STABLE] │
│  decision → todaysDecision, limitingFactor, recommendation, confidence      │
│  presentation metrics → readiness, sleepScore, adaptationIndex (projected)  │
│  Code: src/lib/athlete-state/snapshot-builder.ts                          │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ AthleteSnapshot.decision
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                                       │
│  src/lib/decision/projection.ts — canonical read helpers                    │
│  src/lib/presentation/today.ts — Today ViewModel                            │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
         Today UI              Coach IA            Notifications*
         (P0 ✓)                (P0 ✓)              (P2 backlog)

* Notifications not in P0 scope — must follow same contract in P1.
```

---

## Removed Decision Paths (P0)

| Path                                                               | Location                                     | Replacement                                                                                |
| ------------------------------------------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `pickRecommendation()` fallback chain                              | `snapshot-builder.ts`                        | `resolveRecommendationFromDecision()` — lookup by `decision.priority.attentionDomain` only |
| Verdict from `reasoning.overallVerdict`                            | `presentation/today.ts`, `snapshot-phase.ts` | `decisionVerdict(snapshot.decision)`                                                       |
| Top action from `reasoning.topAction`                              | `presentation/today.ts`, `snapshot-phase.ts` | `decisionTopAction(snapshot.decision)`                                                     |
| Why block from `buildWhyEvidence(reasoning)`                       | `presentation/today.ts`                      | `buildWhyEvidenceFromDecision(decision)`                                                   |
| Confidence href from `reasoning.systemAttentionPriority`           | `presentation/today.ts`                      | `resolveConfidenceHrefFromDecision(decision)`                                              |
| Limiting factor arbitration (physicalHealth → adaptation fallback) | `presentation/today.ts`                      | `snapshot.limitingFactor` (projected from DecisionState only)                              |
| Environment headline injection (parallel path)                     | `presentation/today.ts`                      | Environment evidence flows through DecisionState → supportingEvidence                      |
| `isAdviceActionable(reasoning, confidence)`                        | `snapshot-truthfulness.ts`                   | `isAdviceActionableFromDecision(decision)`                                                 |
| Phase narrative inputs from ReasoningState                         | `snapshot-phase.ts`                          | DecisionState projection                                                                   |
| Coach Twin bypass (`prisma.digitalTwin.reasoningState`)            | `coach-context.ts`                           | `getOrBuildAthleteSnapshot()` + `decision` section in prompt                               |
| Coach domain verdict (`adaptation.decision.verdict`)               | `coach-context.ts`                           | Removed — Coach explains product decision only                                             |
| Reasoning Engine prompt section                                    | `formatCoachContext()`                       | **Décision SHARPIT du jour (canonique)**                                                   |

---

## Files Migrated (P0)

| File                                                  | Change                                                                       |
| ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/lib/decision/projection.ts`                      | **New** — canonical DecisionState → product projection                       |
| `src/lib/decision/index.ts`                           | **New** — public exports                                                     |
| `src/lib/athlete-state/snapshot-builder.ts`           | Decision-only product fields; removed `pickRecommendation`                   |
| `src/lib/athlete-state/snapshot-truthfulness.ts`      | Advice gating from `decision`                                                |
| `src/lib/athlete-state/snapshot-phase.ts`             | Phase narrative driven by DecisionState                                      |
| `src/lib/presentation/today.ts`                       | Consumes `decision` + presentation metrics only                              |
| `src/lib/coach-context.ts`                            | AthleteSnapshot + decision; no Twin read for verdicts                        |
| `src/core/athlete-state/snapshot.ts`                  | Added `sleepScore`, `adaptationIndex`, `adaptationStatus`, `adaptationTrend` |
| `src/lib/today-twin-navigation.ts`                    | Deprecated reasoning helpers; re-export decision helpers                     |
| `src/lib/today-rich-view.ts`                          | Deprecated `buildWhyEvidence`; narrowed `buildProgressionSummary` input      |
| `src/app/api/today/route.ts`                          | Exposes `decision` in API response                                           |
| `src/lib/athlete-state/snapshot-truthfulness.test.ts` | Updated for DecisionState fixtures                                           |

---

## Remaining Consumers of Legacy ReasoningState

| Consumer                                                       | Status                                           | Sprint                           |
| -------------------------------------------------------------- | ------------------------------------------------ | -------------------------------- |
| `src/hooks/use-today.ts`                                       | Exposes `reasoning` for legacy drill-down pages  | P1                               |
| `src/lib/query/today-fetch.ts`                                 | Passes through `snapshot.reasoning`              | P1                               |
| `src/app/api/reasoning/route.ts`                               | Legacy API route                                 | P2 — deprecate                   |
| `src/lib/today-rich-view.ts` → `buildWhyEvidence()`            | Deprecated, unused by Today                      | P1 remove                        |
| `src/lib/today-twin-navigation.ts` → `resolveConfidenceHref()` | Deprecated                                       | P1 remove                        |
| `src/core/inference/reasoning/scoring.ts`                      | Explanation/findings for Reasoning projection    | STABLE — not product arbitration |
| `src/lib/presentation/{recovery,effort,adaptation}.ts`         | Domain drill-down verdicts (not product verdict) | P1 audit                         |
| Notifications / widgets                                        | Not audited in P0                                | P1                               |

**Note:** `AthleteSnapshot.reasoning` remains stored for backward compatibility and drill-down APIs. It is a **projection** of DecisionState (`decisionStateToReasoningState`) and must not be read for product decisions on P0 surfaces.

---

## Remaining Technical Debt

### P1 (next sprint)

1. **Drill-down pages** (`/today/recovery`, `/today/effort`, etc.) — audit `src/lib/presentation/*.ts` for domain vs product verdict confusion; link copy to DecisionState where showing daily guidance.
2. **Remove deprecated helpers** — `buildWhyEvidence`, `resolveConfidenceHref`, `isAdviceActionable(reasoning)`.
3. **`use-today` hook** — prefer `decision` in client types; mark `reasoning` deprecated.
4. **Cached snapshots in DB** — old rows may lack `sleepScore` / `adaptationIndex`; fingerprint bump or lazy upgrade on read.

### P2

1. **Legacy API routes** — `/api/reasoning`, direct Twin reads in remaining endpoints.
2. **Notifications pipeline** — wire to `AthleteSnapshot.decision`.
3. **Type hygiene** — `src/core/athlete-state/snapshot.ts` should not import from `hooks/use-today` (move shared types to `core/`).

### Documented Justification (not violations)

| Location                                               | Justification                                                                                                    |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `src/core/inference/reasoning/scoring.ts`              | Builds explanation artifacts consumed by Decision Engine path; `runReasoningModel` does not re-arbitrate verdict |
| `src/lib/presentation/{recovery,effort,adaptation}.ts` | **Domain pages** — show model-specific state, not daily product verdict                                          |
| `src/lib/daily-phase/narrative.ts`                     | Receives **pre-resolved** verdict from snapshot-phase (DecisionState-derived)                                    |
| Coach fatigue/adaptation sections                      | **Contextual detail** for explanation; canonical verdict is `ctx.decision`                                       |

---

## Validation

### Grep audit (product verdict construction)

Legitimate product verdict construction outside Decision Engine on P0 surfaces: **0**.

Remaining `overallVerdict` reads in presentation/coach paths: **0** (post-migration).

### Tests

```
npm test -- --run src/lib/athlete-state/ src/lib/decision/ src/core/decision/
→ 9 passed
```

---

## Invariants (post-P0)

| Layer           | Rule                                                    |
| --------------- | ------------------------------------------------------- |
| Decision Engine | **Only** arbiter of product verdict                     |
| Reasoning       | Explains DecisionState — never decides                  |
| Snapshot build  | Projects DecisionState → product fields                 |
| Today           | Reads `AthleteSnapshot.decision` + presentation metrics |
| Coach           | Explains existing `decision` — never builds verdict     |
| Presentation    | Maps DecisionState — never combines Recovery + Fatigue  |

---

## Success Criterion

✅ **Met for P0 scope (Today + Coach + Snapshot phase):** product verdict construction on these paths flows exclusively through Decision Engine → DecisionState → AthleteSnapshot.decision.

⏳ **P1 required** for full-repo zero-occurrence claim (drill-downs, hooks, notifications, legacy APIs).
