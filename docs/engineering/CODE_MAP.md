# Code map

> Formerly `knowledge/architecture-links.md`. Mapping between scientific concepts and code implementations.

---

## Purpose

This document is the bridge between SHARPIT's scientific knowledge base and its technical implementation. When a developer asks "where is CTL computed?" or an AI agent asks "what file implements the injury risk logic?", this document provides the authoritative answer.

Entries follow the pattern: concept → file → function → knowledge base reference.

---

## Training Load

| Concept                          | File                                                | Function / Constant                              | Knowledge ref                               |
| -------------------------------- | --------------------------------------------------- | ------------------------------------------------ | ------------------------------------------- |
| CTL computation (EWMA, τ=42)     | `src/lib/training/pmc.ts`                           | `stepPmc()`, `runPmc()`                          | `training-load.md#model-1-pmc`              |
| ATL computation (EWMA, τ=7)      | `src/lib/training/pmc.ts`                           | `stepPmc()`, `runPmc()`                          | `training-load.md#model-1-pmc`              |
| TSB computation                  | `src/lib/training/pmc.ts`                           | `pmcTsb()`                                       | `training-load.md#model-1-pmc`              |
| τ_ctl constant                   | `src/lib/training/pmc.ts`                           | `PMC_CTL_TAU = 42`                               | `training-load.md`                          |
| τ_atl constant                   | `src/lib/training/pmc.ts`                           | `PMC_ATL_TAU = 7`                                | `training-load.md`                          |
| PMC across athlete history       | `src/lib/training/pmc-history.ts`                   | `computeAthletePmc()`, `toPmcPoints()`           | `training-load.md#model-1-pmc`              |
| PMC window semantics             | `src/lib/training/pmc.ts`                           | `slicePmcWindow()` (display width ≠ bound)       | `docs/adr/ADR-011-…`                        |
| ACWR formula                     | `src/lib/training/training-load.ts`                 | `computeTrainingLoad()`                          | `training-load.md#model-2-acwr`             |
| ACWR denominator (6-week avg)    | `src/lib/training/training-load.ts`                 | `CHRONIC_WEEKS = CHRONIC_DAYS / 7`               | `training-load.md#acwr-formula`             |
| ACWR thresholds                  | `src/lib/effort/load-reading.ts`                    | `classifyAcwrZone()`                             | `training-load.md#thresholds`               |
| TSS method selection (cascade)   | `src/core/features/extractors/session-extractor.ts` | `selectBestTss()`                                | `training-load.md#load-estimation-priority` |
| TSS from power (cycling)         | `src/core/features/extractors/session-extractor.ts` | `computePowerTss()`                              | `training-load.md#cycling-tss`              |
| TSS from HR (TRIMP)              | `src/core/features/extractors/session-extractor.ts` | `computeTrimpTss()`                              | `training-load.md#running-tss`              |
| TSS from pace                    | `src/core/features/extractors/session-extractor.ts` | `computePaceTss()`                               | `training-load.md`                          |
| TSS from session RPE             | `src/core/features/extractors/session-extractor.ts` | `computeRpeTss()`                                | `training-load.md`                          |
| TSS fallback (duration × factor) | `src/core/features/extractors/session-extractor.ts` | `durationFactorFallback()`, `SPORT_TSS_PER_HOUR` | `training-load.md#duration-factor-tss`      |
| Per-activity load estimate       | `src/lib/training/activity-load.ts`                 | `estimateActivityLoad()`, `LOAD_FACTOR`          | `training-load.md#duration-factor-tss`      |
| Method confidence weights        | `src/core/features/types.ts`                        | `TSS_METHOD_CONFIDENCE`                          | `confidence-scoring.md`                     |
| Normalized Power                 | `src/lib/activity/detail/activity-analysis.ts`      | `computeNormalizedPower()`                       | `training-load.md#model-4-np`               |

> The tiered TSS cascade lives in the Core, not in a `lib/` helper. `activity-load.ts` only ever
> produces the duration × factor tier and is the legacy per-activity path — see
> `docs/models/TRAINING_STRESS_MODEL.md`.

---

## Recovery

| Concept                      | File                                                            | Function                                | Knowledge ref                               |
| ---------------------------- | --------------------------------------------------------------- | --------------------------------------- | ------------------------------------------- |
| Garmin readiness view        | `src/lib/recovery/recovery.ts`                                  | `buildReadinessView()`                  | `recovery.md#signal-1-readiness`            |
| Readiness thresholds (75/50) | `src/lib/recovery/recovery.ts`                                  | constants                               | `recovery.md#sharpit-thresholds`            |
| HRV status view              | `src/lib/recovery/recovery.ts`                                  | `buildHrvStatusView()`                  | `recovery.md#signal-2-hrv`                  |
| HRV status (Garmin)          | `src/lib/recovery/recovery.ts` / `src/core/inference/recovery/` | `buildHrvStatusView()` / recovery model | `recovery.md#pathway-1-garmin-status`       |
| TSB / form view              | `src/lib/recovery/recovery.ts`                                  | `buildFormView()`                       | `recovery.md#signal-4-tsb`                  |
| Body battery tone            | `src/lib/recovery/recovery.ts`                                  | `bodyBatteryTone()`                     | `recovery.md#body-battery`                  |
| Multi-signal arbitration     | `src/core/decision/arbitration.ts`                              | verdict + limiting factor               | `recovery.md#multi-signal-aggregation`      |
| Overall training verdict     | `src/core/decision/` + Today presentation                       | OverallVerdict / Rich Today             | `recommendation-engine.md#training-verdict` |

---

## Sleep

| Concept                      | File                              | Function / Constant                                              | Knowledge ref                               |
| ---------------------------- | --------------------------------- | ---------------------------------------------------------------- | ------------------------------------------- |
| Sleep analysis entry point   | `src/lib/sleep/sleep.ts`          | `analyzeSleep()`                                                 | `sleep.md`                                  |
| Default duration target      | `src/lib/sleep/sleep.ts`          | `TARGET_DURATION_MIN = 480` (profile goal wins)                  | `sleep.md#sleep-duration`                   |
| Scoring target               | `src/lib/sleep/sleep-scoring.ts`  | `SLEEP_TARGET_MIN = 450`                                         | `sleep.md#sleep-duration`                   |
| Sleep score composition      | `src/lib/sleep/sleep-scoring.ts`  | `DURATION_WEIGHT = 0.55`, `ARCHITECTURE_WEIGHT = 0.45`           | `sleep.md#sleep-score`                      |
| Score breakdown              | `src/lib/sleep/sleep-scoring.ts`  | `buildSleepScoreBreakdown()`, `computeSharpitSleepScoreForDay()` | `sleep.md#sleep-score`                      |
| Sleep debt (7 d)             | `src/lib/sleep/sleep-scoring.ts`  | `computeSleepDebt7d()`                                           | `sleep.md#sleep-duration`                   |
| Sleep efficiency             | `src/lib/sleep/sleep-scoring.ts`  | `computeSleepEfficiencyPct()`                                    | `sleep.md`                                  |
| Restorative ratio (deep+REM) | `src/lib/sleep/sleep-scoring.ts`  | `computeRestorativeRatio()`, `restorativeRatioLabel()`           | `sleep.md#deep-sleep`, `sleep.md#rem-sleep` |
| Adequacy mapping             | `src/lib/sleep/sleep-scoring.ts`  | `mapSleepScoreToAdequacy()`                                      | `sleep.md#sleep-score`                      |
| Sleep score tones            | `src/lib/sleep/sleep.ts`          | `scoreTone()`                                                    | `sleep.md#sleep-score`                      |
| Bedtime regularity (MAD)     | `src/lib/sleep/sleep.ts`          | `medianAbsoluteDeviation()`, `normalizeBedtime()`                | `sleep.md#sleep-regularity`                 |
| Bedtime recommendation       | `src/lib/sleep/sleep.ts`          | `recommendedBedtime` in `analyzeSleep()`                         | `sleep.md#bedtime-recommendation`           |
| Tonight's reason             | `src/lib/sleep/tonight-reason.ts` | —                                                                | `sleep.md`                                  |
| Recent window                | `src/lib/sleep/sleep.ts`          | `RECENT_WINDOW_NIGHTS = 7`                                       | `sleep.md#analysis-windows`                 |
| Coach window                 | `src/lib/sleep/sleep.ts`          | `COACH_WINDOW_NIGHTS = 14`                                       | `sleep.md#analysis-windows`                 |

> The discrete phase thresholds this table used to list (`DEEP_GOOD`, `REM_GOOD`,
> `NOCTURNAL_STRESS_THRESHOLD`, …) no longer exist: architecture quality is scored through the
> restorative ratio in `sleep-scoring.ts` rather than per-phase cutoffs.

---

## Performance and Fitness Parameters

| Concept                     | File                                                              | Function / Constant                     | Knowledge ref                     |
| --------------------------- | ----------------------------------------------------------------- | --------------------------------------- | --------------------------------- |
| FTP estimation factors      | `src/lib/training/performance-predictor.ts`                       | `FTP_FACTORS`, `estimateFtp()`          | `metrics.md#ftp`                  |
| Riegel race time prediction | `src/lib/training/performance-predictor.ts`                       | `predictRunRaces()`                     | `metrics.md#race-time-prediction` |
| Riegel exponent             | `src/lib/training/performance-predictor.ts`                       | `RIEGEL_EXPONENT = 1.06`                | `metrics.md#race-time-prediction` |
| Run threshold pace estimate | `src/lib/training/performance-predictor.ts`                       | `estimateRunThresholdPace()`            | `metrics.md`                      |
| Threshold calibration       | `src/lib/threshold/threshold-estimates.ts`                        | `computeThresholdEstimates()`           | `metrics.md#ftp`                  |
| TSB interpretation zones    | `src/lib/effort/load-reading.ts` / `src/lib/recovery/recovery.ts` | `explainTsb()` / `buildFormView()`      | `training-load.md#tsb-thresholds` |
| ACWR zone labels            | `src/lib/effort/load-reading.ts`                                  | `classifyAcwrZone()`, `acwrZoneLabel()` | `training-load.md#model-2-acwr`   |

---

## Periodization

| Concept              | File                                | Function / Constant                                                      | Knowledge ref                   |
| -------------------- | ----------------------------------- | ------------------------------------------------------------------------ | ------------------------------- |
| Periodization phases | `src/lib/training/periodization.ts` | `PlanPhase` (Prisma enum), `phaseLabels`                                 | `training-load.md` (referenced) |
| Phase load factors   | `src/lib/training/periodization.ts` | `PHASE_LOAD_FACTOR`                                                      | `future-research.md#sd-005`     |
| Phase distribution   | `src/lib/training/periodization.ts` | `distributePhases()`                                                     | `training-load.md`              |
| Plan generation      | `src/lib/training/periodization.ts` | `generateMacroPlan()`                                                    | `training-load.md`              |
| Deload rule          | `src/lib/training/periodization.ts` | inline in `generateMacroPlan()` — every 4th BASE/BUILD week, load × 0.72 | `future-research.md#sd-006`     |

> There is no `DELOAD_TRIGGER_INTERVAL` constant; the cadence is expressed inline where the weekly
> load is built.

---

## Alerts / decisions

Legacy `src/lib/alerts.ts` was removed. Athlete-facing alerts and daily recommendations now flow through the Decision Engine and Athlete Snapshot / Today presentation — not a standalone alert aggregator.

| Concept                 | File                                            | Function / type        | Knowledge ref                               |
| ----------------------- | ----------------------------------------------- | ---------------------- | ------------------------------------------- |
| Verdict arbitration     | `src/core/decision/arbitration.ts`              | limiting-factor select | `recommendation-engine.md#alert-generation` |
| Overall verdict         | `src/core/decision/`                            | `OverallVerdict`       | `recommendation-engine.md`                  |
| Rich Today presentation | `src/lib/today/today-rich-view.ts` + components | `buildTopActionLine()` | `docs/RICH_TODAY.md`                        |

---

## Data Layer

| Concept                       | File                          | Entity                               | Knowledge ref                           |
| ----------------------------- | ----------------------------- | ------------------------------------ | --------------------------------------- |
| Athlete profile singleton     | `prisma/schema.prisma`        | `AthleteProfile (id="default")`      | `data-quality.md#single-user`           |
| Activity load unit constraint | `prisma/schema.prisma`        | `Activity.load`                      | `training-load.md#load-unit-constraint` |
| Query keys registry           | `src/lib/query/keys.ts`       | `queryKeys`                          | `ARCHITECTURE.md`                       |
| Serialized<T> wire type       | `src/lib/query/fetchers.ts`   | `Serialized<T>`                      | `ARCHITECTURE.md`                       |
| Optimistic mutation helper    | `src/lib/query/optimistic.ts` | `listOptimistic()`                   | `ARCHITECTURE.md`                       |
| Prisma query definitions      | `src/lib/queries/`            | `activityInclude`, planned-sessions… | `ARCHITECTURE.md`                       |

---

## AI Coach

| Concept                         | File                                  | Knowledge ref                                |
| ------------------------------- | ------------------------------------- | -------------------------------------------- |
| Coach context assembly          | `src/app/api/coach/context/route.ts`  | `recommendation-engine.md#ai-coach`          |
| Daily briefing generation       | `src/app/api/coach/briefing/route.ts` | `recommendation-engine.md`                   |
| AI coach behavioral constraints | `product-constitution.md`             | `product-constitution.md#ethical-principles` |

---

## Cross-Reference: Knowledge Base → Code

For finding where a concept from any knowledge document is implemented:

```
product-constitution.md   → No direct code implementation (design constraints)
glossary.md               → Cross-index for all other files
scientific-methodology.md → No direct code implementation (process constraints)
physiology.md             → Informs recovery/, sleep/, training/pmc.ts (no direct impl)
training-load.md          → training/pmc.ts, training/training-load.ts, core/features/extractors/
recovery.md               → recovery/recovery.ts, core/inference/recovery/, core/decision/
sleep.md                  → sleep/sleep.ts, sleep/sleep-scoring.ts
nutrition.md              → core/features/extractors/fuel-extractor.ts
strength-training.md      → training/activity-load.ts (LOAD_FACTOR.STRENGTH only)
triathlon.md              → training/training-load.ts (ACWR), partial brick analysis
hybrid-athlete.md         → Not currently implemented beyond TSS fallback
injury-prevention.md      → effort/load-reading.ts (ACWR), physical-health / Condition
wearables.md              → Informs data ingestion (no single file)
garmin.md                 → src/app/api/garmin/*, sync pipeline
metrics.md                → Distributed: training/performance-predictor.ts, recovery/, sleep/
recommendation-engine.md  → core/decision/, today/today-rich-view.ts, sleep/, recovery/
decision-engine.md        → src/core/decision/ (arbitration + OverallVerdict)
confidence-scoring.md     → core/features/types.ts (TSS_METHOD_CONFIDENCE)
data-quality.md           → src/lib/queries/, validators/, sync pipeline
future-research.md        → No implementation (scientific debt register)
```
