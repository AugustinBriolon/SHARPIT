# Scenario Engine

> **Status:** Implemented (v1.1 — decision ownership refactor)  
> **Architecture:** Product vertical — orchestrates Projected Athlete State  
> **Model id:** `scenario-engine-v1`

---

## Responsibility boundaries

| Layer                       | Owns                                                                 | Does NOT own                                                |
| --------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------- |
| **Decision Engine**         | Verdict, limiting factor, confidence, expectedBenefit, arbitration   | Scenario exploration                                        |
| **Projected Athlete State** | Deterministic forward projection per plan                            | Comparing alternatives                                      |
| **Scenario Engine**         | Generating alternatives, running projections, explaining differences | Product scoring, ranking weights, physiological arbitration |
| **Scenario Comparison**     | Presenting Decision Engine output deltas between futures             | Any decision logic outside Decision Engine                  |

> **Rule:** No product decision exists outside the Decision Engine.

The Scenario Engine **explores** multiple deterministic futures and **presents consequences**. It never introduces its own decision logic.

---

## Philosophy

**Projected Athlete State** answers:

> _What happens if the current plan is executed?_

**Scenario Engine** answers:

> _Which plausible future produces the best athlete outcome?_

A scenario is a **modified planning context** — not a new simulation. Each scenario runs through the **identical** projection pipeline and produces **Decision Engine outputs** per projected day.

---

## Architecture

```
Anchor DecisionState (today)
        ↓
Scenario generation (from limiting factor domain)
        ↓
Modified planning slices per scenario
        ↓
projectAthleteState() — same pipeline for each
        ↓
Decision Engine outputs per projected day
        ↓
Scenario Comparison — lexicographic diff on DecisionState fields
        ↓
Presentation / Coach (explanation only)
```

### Reused components

| Component                       | Role                                                    |
| ------------------------------- | ------------------------------------------------------- |
| `buildProjectionBaseContext`    | Anchor twin + PMC + sessions + **anchor DecisionState** |
| `projectAthleteState`           | Deterministic forward projection                        |
| `runProjectedDecision`          | Decision Engine per projected day                       |
| `generateScenariosFromDecision` | Alternatives from anchor limiting factor                |

---

## Decision-driven scenario generation

Scenarios are generated from the **anchor DecisionState** — not generic heuristics.

| Limiting domain       | Generated alternatives                                |
| --------------------- | ----------------------------------------------------- |
| `ENVIRONMENT`         | Indoor, move earlier, delay, reduce intensity         |
| `RECOVERY`            | Recovery day (remove), easy endurance (reduce), delay |
| `FATIGUE`             | Remove session, delay, reduce intensity               |
| `ADAPTATION`          | Reduce intensity, delay                               |
| `PHYSICAL_HEALTH`     | Reduce intensity, remove, delay                       |
| Fallback (`PLANNING`) | Indoor, reduce, delay                                 |

Each alternative is contextualized with the triggering domain in its rationale.

---

## Decision comparison (no product scoring)

The comparison layer **does not compute a weighted benefit score**.

It extracts `ScenarioDecisionSnapshot` from each projection:

- `endVerdict`, `endConfidence`, `endExpectedBenefit` (from Decision Engine `primaryDecision`)
- `endLimitingFactorDomain`, `endLimitingFactorPriority`
- `worstVerdict`, `riskDayCount` across horizon

### Recommendation rule (lexicographic)

Alternatives are compared to baseline using **Decision Engine fields only**, in order:

1. `worstVerdict` risk (lower is better)
2. `endVerdict` risk (lower is better)
3. `primaryDecision.expectedBenefit` (higher is better)
4. `confidence` (higher is better)
5. `limitingFactor.priority` (lower is better)
6. `riskDayCount` (lower is better)

An alternative is recommended only if it is **strictly preferable** on this lexicographic ordering. Otherwise the baseline plan wins.

Physiological scores (readiness, fatigue, adaptation) are **displayed for context** — they do not drive the recommendation.

---

## Coach integration

`formatScenarioComparisonForCoach` injects:

- Anchor limiting factor domain
- Per-scenario Decision Engine verdict + confidence + expectedBenefit
- Preferability explanation (from decision deltas)
- Explicit reminder: Scenario Engine explores, Decision Engine arbitrates

Example:

> Keeping today's session outdoors increases recovery demand because of forecasted heat. Moving it to tomorrow improves projected readiness while preserving adaptation.

---

## API & UI

| Surface | Path                                                  |
| ------- | ----------------------------------------------------- |
| API     | `GET /api/presentation/scenario-comparison?horizon=7` |
| UI      | `ScenarioComparisonCard` on Planning (current week)   |

---

## Limitations (v1)

1. Auto-generated scenarios only — no custom builder
2. Single focus session per comparison
3. Lexicographic tie → baseline preferred (conservative)
4. Anchor environment/health frozen across horizon (inherited from projection v1)

---

## Code map

| Module                                       | Role                                |
| -------------------------------------------- | ----------------------------------- |
| `src/lib/scenario/generate-from-decision.ts` | Decision-driven generation          |
| `src/lib/scenario/decision-snapshot.ts`      | Extract Decision Engine aggregates  |
| `src/lib/scenario/decision-comparison.ts`    | Lexicographic compare + explain     |
| `src/lib/scenario/compare-scenarios.ts`      | Orchestrate comparison presentation |
| `src/lib/scenario/scenario-engine.ts`        | Top-level orchestrator              |

---

## Related docs

- [`PROJECTED_ATHLETE_STATE.md`](./PROJECTED_ATHLETE_STATE.md)
- [`../models/DECISION_ENGINE.md`](../models/DECISION_ENGINE.md)
