# Projected Athlete State

> **Status:** Implemented (v1)  
> **Architecture:** Product vertical — no new physiological engine  
> **Model id:** `projected-athlete-v1`

---

## Mission

The **Current Athlete State** answers: _Where is the athlete now?_

The **Projected Athlete State** answers: _Where is the athlete expected to be if the current plan is executed?_

This is **not a simulation**. It is an **explainable, deterministic projection** built exclusively from:

1. Current Athlete State (Recovery, Fatigue, Adaptation twin outputs)
2. Planned Sessions (future, non-completed)
3. Existing PMC load model (`computePmcSeries` EWMA)
4. Cached environmental projections on planned sessions
5. Decision Engine (`decision-v1`) for arbitration per projected day

No hidden heuristics. No black-box prediction. No new physiological engine.

---

## Pipeline

```
Current Athlete State (engines: recovery, fatigue, adaptation)
        +
Historical activities → PMC anchor (CTL, ATL, TSB)
        +
Planned Sessions (TSS estimate + environmentContext)
        ↓
PMC forward step (τ CTL=42, ATL=7 — same as analytics.ts)
        ↓
Score projection (linear transforms from PMC deltas)
        ↓
Decision Engine per future day (freshness confidence decay)
        ↓
ProjectedAthleteState (NOT persisted in Twin / Snapshot)
        ↓
ProjectedAthleteCardViewModel → Planning UI
```

---

## Projection window

Supported horizons: **1, 3, 7, 14** days (rolling from anchor training day).

Per day exposes:

| Field                       | Source                                              |
| --------------------------- | --------------------------------------------------- |
| Expected readiness          | `readiness₀ + ΔTSB × 0.45` (clamped 0–100)          |
| Expected fatigue            | `fatigueIndex₀ + ΔATL × 0.35` (clamped 0–100)       |
| Expected adaptation         | `adaptationIndex₀ + ΔCTL × 0.20` (clamped 0–100)    |
| Expected environmental load | Max `trainingImpact` from planned session forecasts |
| Expected confidence         | `baseConfidence × 0.95^dayOffset`                   |
| Projected limiting factor   | Decision Engine `limitingFactor`                    |

End-of-horizon summary also includes peak readiness day, highest risk day, and planning confidence (mean day confidence).

---

## Assumptions (explicit)

| Code                | Assumption                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `planned-only-load` | Only **non-completed** planned sessions contribute future TSS. Unplanned activity is assumed zero.                  |
| `pmc-ewma`          | Load evolution uses the same EWMA as historical PMC (`PMC_CTL_TAU=42`, `PMC_ATL_TAU=7`).                            |
| `score-linear`      | Physiological scores shift linearly from PMC deltas — coefficients fixed in `score-projection.ts`.                  |
| `static-health-env` | Physical health and environment snapshot remain constant across the horizon (no re-inference).                      |
| `decision-reuse`    | Decision Engine runs on synthesized twin copies with decaying `freshnessConfidence` (`× 0.92^dayOffset`, min 0.25). |

---

## Integration with Planned Sessions

- TSS per day: `estimatePlannedLoad()` from `@/lib/planning` (same as calendar load).
- Environmental load: parsed from persisted `PlannedSession.environmentContext` (Intelligent Planned Sessions vertical).
- Completed or linked sessions are excluded from forward load.

---

## Integration with Decision Engine

`runProjectedDecision()` wraps `runDecisionEngine()` with:

- Synthesized Recovery / Fatigue / Adaptation states (partial data completeness, reduced model confidence × 0.85)
- Unchanged Physical Health and Environment from anchor day
- Decaying freshness confidence for speculative future advice

The Decision Engine remains the **only arbitration layer** for verdicts, limiting factors, and conflicts on projected days.

Future extensions (overload detection, recovery deficit, environmental conflicts) consume `ProjectedDayState.decision` — no duplicate arbitration logic in presentation.

---

## Reproducibility

Given identical inputs:

```
anchorTrainingDayId
+ twin states at anchor
+ activity history (PMC anchor)
+ planned sessions in horizon
+ PROJECTION_MODEL_ID
```

…the projection is **fully reproducible**. Projections are **never written** to Digital Twin or Athlete Snapshot.

---

## API & UI

| Surface | Path                                                                         |
| ------- | ---------------------------------------------------------------------------- |
| API     | `GET /api/presentation/projected-athlete?horizon=7&trainingDayId=YYYY-MM-DD` |
| UI      | `ProjectedAthleteCard` on Planning view (current week)                       |
| Hook    | `useProjectedAthleteViewModel(horizonDays)`                                  |

---

## Limitations (v1)

1. **No unplanned activity modeling** — rest days assume TSS = 0 unless a session is planned.
2. **No sleep/HRV forward modeling** — readiness projection is PMC-derived, not a full recovery engine re-run.
3. **Static environment** — per-day env uses cached session forecasts only; no new Open-Meteo calls during projection.
4. **Physical health frozen** — injuries/conditions do not evolve over the horizon.
5. **Confidence decreases with distance** — far horizons are advisory, not prescriptive.

---

## Code map

| Module                                               | Role                    |
| ---------------------------------------------------- | ----------------------- |
| `src/core/projection/types.ts`                       | Domain types            |
| `src/lib/projection/pmc-forward.ts`                  | EWMA step forward       |
| `src/lib/projection/score-projection.ts`             | Score transforms        |
| `src/lib/projection/build-projection-input.ts`       | Input assembly          |
| `src/lib/projection/project-athlete-state.ts`        | Orchestrator            |
| `src/core/decision/projected-decision.ts`            | Decision Engine wrapper |
| `src/lib/presentation/projected-athlete.ts`          | ViewModel mapping       |
| `src/components/planning/projected-athlete-card.tsx` | Planning UI             |

---

## Related docs

- [`INTELLIGENT_PLANNED_SESSIONS.md`](./INTELLIGENT_PLANNED_SESSIONS.md)
- [`../models/DECISION_ENGINE.md`](../models/DECISION_ENGINE.md)
- [`../ATHLETE_SNAPSHOT.md`](../ATHLETE_SNAPSHOT.md)
