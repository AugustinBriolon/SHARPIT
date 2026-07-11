# Stabilization Sprint 2 (P1) — Migration Report

> **Date:** 2026-07-10  
> **Status:** P1 complete — DecisionState extended to all athlete-facing drill-down surfaces  
> **Prerequisite:** [STABILIZATION_P0_MIGRATION_REPORT.md](./STABILIZATION_P0_MIGRATION_REPORT.md)  
> **Constitution:** [CORE_ARCHITECTURE.md](./CORE_ARCHITECTURE.md) (frozen)

---

## Objective

Extend the single product decision pipeline to every remaining athlete-facing surface. After P1:

- **DecisionState** = unique product language (verdict, action, limiting factor, confidence gate)
- **ReasoningState** = narrative projection only (deprecated for product decisions)
- **Domain verdicts** = model-specific interpretation, never substituting global decision

---

## Updated Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     DECISION ENGINE (decision-v1)                  [CORE]   │
│  Single arbiter — verdict · limiting factor · confidence · topAction        │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ DecisionState
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ATHLETE SNAPSHOT                                         │
│  decision · adviceActionable · limitingFactor · presentation metrics         │
│  reasoning (legacy projection — explanation only)                            │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          ▼                         ▼                         ▼
   Today (P0 ✓)              Drill-downs (P1 ✓)          Coach (P0 ✓)
   presentation/today        recovery · sleep · effort
                             adaptation · physical-health
                             body (composition only — no product verdict)

          ┌─────────────────────────┴─────────────────────────┐
          ▼                                                   ▼
   useToday() → AthleteSnapshotProductView          Notifications / Widgets
   (decision-first)                                 (not implemented — P2 contract)

┌─────────────────────────────────────────────────────────────────────────────┐
│  DOMAIN MODELS (read-only on drill-downs)                                    │
│  recovery.decision · fatigue.decision · adaptation.decision · ph.decision   │
│  Labelled "Verdict [domaine]" — never "Décision du jour"                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Migrated Surfaces (P1)

| Surface                   | Change                                                                           |
| ------------------------- | -------------------------------------------------------------------------------- |
| **Recovery drill-down**   | `globalDecision` strip + domain section renamed "Verdict récupération"           |
| **Effort drill-down**     | `globalDecision` strip; domain section remains "Décision de charge"              |
| **Adaptation drill-down** | `globalDecision` strip; domain section renamed "Verdict adaptation"              |
| **Sleep drill-down**      | `globalDecision` strip (sleep → recovery contribution path)                      |
| **Physical health**       | `globalDecision` strip; stat card renamed "Verdict modèle" (domain)              |
| **Body**                  | No product verdict (composition metrics only) — intentional                      |
| **useToday()**            | Returns `AthleteSnapshotProductView` (decision-first); `reasoning` deprecated    |
| **today-fetch**           | `snapshotToProductView()` canonical; `snapshotToTodayState()` deprecated adapter |

### New modules

| File                                                        | Role                                           |
| ----------------------------------------------------------- | ---------------------------------------------- |
| `src/core/presentation/global-decision-context.ts`          | `GlobalDecisionContext` type                   |
| `src/lib/decision/global-decision-context.ts`               | `buildGlobalDecisionContext(snapshot, domain)` |
| `src/lib/athlete-state/product-view.ts`                     | `snapshotToProductView()` — client projection  |
| `src/components/today/drill-down/global-decision-strip.tsx` | Shared UI for product decision on drill-downs  |

---

## Domain vs Global Decision (clarified)

| Layer                  | Source                     | UI label                               | May arbitrate product?    |
| ---------------------- | -------------------------- | -------------------------------------- | ------------------------- |
| **Product decision**   | `AthleteSnapshot.decision` | "Décision produit du jour"             | No — Decision Engine only |
| Recovery domain        | `recovery.decision`        | "Verdict récupération"                 | No                        |
| Fatigue domain         | `fatigue.decision`         | "Décision de charge"                   | No                        |
| Adaptation domain      | `adaptation.decision`      | "Verdict adaptation"                   | No                        |
| Physical health domain | `physicalHealth.decision`  | "Verdict modèle"                       | No                        |
| Sleep                  | No domain decision model   | Global strip only when recovery drives | No                        |

**P1 fix:** Recovery section previously labelled "Décision du jour" while showing domain intensity — corrected to avoid contradicting DecisionState.

---

## useToday() Pipeline (post-P1)

```
fetchAthleteSnapshot(trainingDayId)
  → AthleteSnapshotEnvelope
  → snapshotToProductView(snapshot)
  → UseTodayResult.data: AthleteSnapshotProductView
```

**Primary fields for product UI:**

- `decision` — canonical DecisionState
- `adviceActionable`, `todaysDecision`, `limitingFactor`, `confidence`
- `readiness`, `sleepScore`, `adaptationIndex` — presentation metrics

**Deprecated:**

- `reasoning` — kept for backward compatibility; marked `@deprecated` in types

**Note:** No production component currently calls `useToday()` — all drill-downs use Presentation ViewModels via `use-presentation-view-model.ts`. Hook is now decision-ready for any future consumer.

---

## Notifications & Widgets

| Item                      | Status              | Notes                                                            |
| ------------------------- | ------------------- | ---------------------------------------------------------------- |
| Push notifications        | **Not implemented** | No notification pipeline in repo                                 |
| Home screen widgets       | **Not implemented** | No widget code in repo                                           |
| Daily briefing (Coach IA) | **P0 migrated**     | Uses `AthleteSnapshot.decision` via coach-context                |
| Background briefing cron  | **Indirect**        | `generateAndStoreDailyBriefing` → coach-context (decision-first) |

**P2 contract (when built):** notifications and widgets must call `getOrBuildAthleteSnapshot()` and read `snapshot.decision` only — never Twin or ReasoningState directly.

---

## Legacy ReasoningState — Consumer Audit

| Consumer                                                                | Classification       | Reason                                                 |
| ----------------------------------------------------------------------- | -------------------- | ------------------------------------------------------ |
| `src/core/inference/reasoning/model.ts`                                 | **Keep**             | Delegates to Decision Engine; produces projection      |
| `src/core/decision/adapters.ts`                                         | **Keep**             | `decisionStateToReasoningState()` — intentional bridge |
| `src/lib/today-state-server.ts`                                         | **Keep temporarily** | Loads decision + reasoning for snapshot build          |
| `src/app/api/reasoning/route.ts`                                        | **Deprecated**       | Legacy API — use `/api/today` or snapshot API          |
| `src/hooks/use-today.ts` → `reasoning`                                  | **Deprecated**       | Field retained; decision-first view                    |
| `src/lib/today-rich-view.ts` → `buildWhyEvidence`                       | **Deprecated**       | Use `buildWhyEvidenceFromDecision`                     |
| `src/lib/today-twin-navigation.ts` → `resolveConfidenceHref`            | **Deprecated**       | Use `resolveConfidenceHrefFromDecision`                |
| `src/lib/athlete-state/snapshot-truthfulness.ts` → `isAdviceActionable` | **Deprecated**       | Use `isAdviceActionableFromDecision`                   |
| `src/infrastructure/digital-twin/`                                      | **Keep temporarily** | Twin persistence for reasoning projection              |
| `src/core/inference/reasoning/scoring.ts`                               | **Keep**             | Explanation artifacts for Decision Engine path         |
| `src/core/benchmarks/reasoning-*`                                       | **Keep**             | Engine benchmarks — not product surfaces               |
| Drill-down presentation builders                                        | **Migrated**         | Domain verdicts only + `globalDecision` strip          |

---

## Deprecated APIs

| API / symbol                       | Replacement                                           |
| ---------------------------------- | ----------------------------------------------------- |
| `GET /api/reasoning`               | `GET /api/today` or `GET /api/athlete-state/snapshot` |
| `ReasoningData` (product use)      | `DecisionData`                                        |
| `buildWhyEvidence(reasoning)`      | `buildWhyEvidenceFromDecision(decision)`              |
| `resolveConfidenceHref(reasoning)` | `resolveConfidenceHrefFromDecision(decision)`         |
| `snapshotToTodayState()`           | `snapshotToProductView()`                             |
| `isAdviceActionable(reasoning)`    | `isAdviceActionableFromDecision(decision)`            |

---

## Repository Audit — Remaining Occurrences

### Product verdict construction (legitimate)

| Location                                | Verdict                             |
| --------------------------------------- | ----------------------------------- |
| `src/core/decision/decision-engine.ts`  | Canonical — only legitimate arbiter |
| `src/core/inference/reasoning/model.ts` | Delegates — no re-arbitration       |

### Domain verdict display (legitimate — not product)

| Location                                  | Type                                     |
| ----------------------------------------- | ---------------------------------------- |
| `src/lib/presentation/recovery.ts`        | `recovery.decision.recommendedIntensity` |
| `src/lib/presentation/effort.ts`          | `fatigue.decision.verdict`               |
| `src/lib/presentation/adaptation.ts`      | `adaptation.decision.verdict`            |
| `src/lib/presentation/physical-health.ts` | `physicalHealth.decision.verdict`        |

### Duplicated logic removed in P0/P1

| Pattern                              | Status        |
| ------------------------------------ | ------------- |
| `pickRecommendation()`               | Removed (P0)  |
| Recovery "Décision du jour" mislabel | Fixed (P1)    |
| Coach Twin bypass for verdict        | Removed (P0)  |
| `useToday()` reasoning-first select  | Migrated (P1) |

### Remaining technical debt (P2)

1. Remove `/api/reasoning` route after client migration confirmed
2. Remove deprecated helpers (`buildWhyEvidence`, `resolveConfidenceHref`, etc.)
3. Stop persisting `reasoning` on snapshot when all consumers gone
4. Move shared types from `hooks/use-today.ts` to `core/athlete-state/types.ts`
5. Implement notification/widget contract when features are built

---

## Next Removable Components (ordered)

1. `src/app/api/reasoning/route.ts` — after confirming zero client usage
2. `src/lib/today-rich-view.ts` → `buildWhyEvidence()`
3. `src/lib/today-twin-navigation.ts` → legacy href resolvers
4. `AthleteSnapshot.reasoning` field — after snapshot API consumers migrated
5. `src/lib/today-state-server.ts` → `formatReasoningResult()` exposure to surfaces
6. Twin `reasoningState` column — last; keep until projection fully inlined

---

## Validation

```bash
npm test -- --run src/lib/decision/ src/lib/athlete-state/
```

---

## Success Criteria

| Criterion                                      | Status                           |
| ---------------------------------------------- | -------------------------------- |
| DecisionState = unique product language        | Met                              |
| ReasoningState = narrative projection only     | Met (deprecated on surfaces)     |
| Drill-downs separate domain vs global decision | Met                              |
| useToday() decision-first                      | Met                              |
| Notifications use DecisionState                | N/A — contract documented for P2 |
| Widgets use DecisionState                      | N/A — contract documented for P2 |
| No new features introduced                     | Met                              |
