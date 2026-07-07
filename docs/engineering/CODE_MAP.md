# Code map

> Formerly `knowledge/architecture-links.md`. Mapping between scientific concepts and code implementations.

---

## Purpose

This document is the bridge between SHARPIT's scientific knowledge base and its technical implementation. When a developer asks "where is CTL computed?" or an AI agent asks "what file implements the injury risk logic?", this document provides the authoritative answer.

Entries follow the pattern: concept → file → function → knowledge base reference.

---

## Training Load

| Concept                          | File                           | Function / Constant           | Knowledge ref                               |
| -------------------------------- | ------------------------------ | ----------------------------- | ------------------------------------------- |
| CTL computation (EWMA, τ=42)     | `src/lib/analytics.ts`         | `computePmcSeries()`          | `training-load.md#model-1-pmc`              |
| ATL computation (EWMA, τ=7)      | `src/lib/analytics.ts`         | `computePmcSeries()`          | `training-load.md#model-1-pmc`              |
| TSB computation                  | `src/lib/analytics.ts`         | `computePmcSeries()`          | `training-load.md#model-1-pmc`              |
| τ_ctl constant                   | `src/lib/analytics.ts`         | `CTL_DAYS = 42`               | `training-load.md`                          |
| τ_atl constant                   | `src/lib/analytics.ts`         | `ATL_DAYS = 7`                | `training-load.md`                          |
| ACWR formula                     | `src/lib/training-load.ts`     | `computeTrainingLoad()`       | `training-load.md#model-2-acwr`             |
| ACWR denominator (6-week avg)    | `src/lib/training-load.ts`     | `CHRONIC_WEEKS = 6`           | `training-load.md#acwr-formula`             |
| ACWR thresholds                  | `src/lib/alerts.ts`            | `ACWR_WARNING`, `ACWR_DANGER` | `training-load.md#thresholds`               |
| TSS from power (cycling)         | `src/lib/activity-analysis.ts` | `computeCyclingTss()`         | `training-load.md#cycling-tss`              |
| TSS from HR (running)            | `src/lib/activity-analysis.ts` | `computeHrTss()`              | `training-load.md#running-tss`              |
| TSS fallback (duration × factor) | `src/lib/analytics.ts`         | `LOAD_FACTOR`                 | `training-load.md#duration-factor-tss`      |
| Normalized Power                 | `src/lib/activity-analysis.ts` | `computeNormalizedPower()`    | `training-load.md#model-4-np`               |
| Load estimation priority         | `src/lib/activity-analysis.ts` | `computeSessionLoad()`        | `training-load.md#load-estimation-priority` |

---

## Recovery

| Concept                      | File                   | Function                 | Knowledge ref                               |
| ---------------------------- | ---------------------- | ------------------------ | ------------------------------------------- |
| Garmin readiness view        | `src/lib/recovery.ts`  | `buildReadinessView()`   | `recovery.md#signal-1-readiness`            |
| Readiness thresholds (75/50) | `src/lib/recovery.ts`  | constants                | `recovery.md#sharpit-thresholds`            |
| HRV status view              | `src/lib/recovery.ts`  | `buildHrvStatusView()`   | `recovery.md#signal-2-hrv`                  |
| HRV status alert (Garmin)    | `src/lib/alerts.ts`    | `computeAlerts()`        | `recovery.md#pathway-1-garmin-status`       |
| HRV trend alert (15% drop)   | `src/lib/alerts.ts`    | `computeAlerts()`        | `recovery.md#pathway-2-trend`               |
| RHR trend alert (+5 bpm)     | `src/lib/alerts.ts`    | `computeAlerts()`        | `recovery.md#signal-3-rhr`                  |
| TSB / form view              | `src/lib/recovery.ts`  | `buildFormView()`        | `recovery.md#signal-4-tsb`                  |
| Body battery tone            | `src/lib/recovery.ts`  | `bodyBatteryTone()`      | `recovery.md#body-battery`                  |
| Multi-signal aggregation     | `src/lib/dashboard.ts` | `buildTrainingVerdict()` | `recovery.md#multi-signal-aggregation`      |
| Training verdict             | `src/lib/dashboard.ts` | `buildTrainingVerdict()` | `recommendation-engine.md#training-verdict` |

---

## Sleep

| Concept                    | File               | Function / Constant                                 | Knowledge ref                     |
| -------------------------- | ------------------ | --------------------------------------------------- | --------------------------------- |
| Sleep analysis entry point | `src/lib/sleep.ts` | `analyzeSleep()`                                    | `sleep.md`                        |
| Sleep duration target      | `src/lib/sleep.ts` | `TARGET_DURATION_MIN = 480`                         | `sleep.md#sleep-duration`         |
| Sleep debt thresholds      | `src/lib/sleep.ts` | `WARNING_THRESHOLD = 390`, `DANGER_THRESHOLD = 360` | `sleep.md#sleep-duration`         |
| Deep sleep thresholds      | `src/lib/sleep.ts` | `DEEP_GOOD = 0.13`, `DEEP_MODERATE = 0.09`          | `sleep.md#deep-sleep`             |
| REM sleep thresholds       | `src/lib/sleep.ts` | `REM_GOOD = 0.20`, `REM_MODERATE = 0.15`            | `sleep.md#rem-sleep`              |
| Sleep score tones          | `src/lib/sleep.ts` | `scoreTone()`                                       | `sleep.md#sleep-score`            |
| Nocturnal stress alert     | `src/lib/sleep.ts` | constant `NOCTURNAL_STRESS_THRESHOLD = 30`          | `sleep.md#nocturnal-stress`       |
| Bedtime regularity (MAD)   | `src/lib/sleep.ts` | `computeRegularityMad()`                            | `sleep.md#sleep-regularity`       |
| Bedtime recommendation     | `src/lib/sleep.ts` | `computeRecommendedBedtime()`                       | `sleep.md#bedtime-recommendation` |
| Recent window              | `src/lib/sleep.ts` | `RECENT_WINDOW_NIGHTS = 7`                          | `sleep.md#analysis-windows`       |
| Habit window               | `src/lib/sleep.ts` | `HABIT_WINDOW_NIGHTS = 30`                          | `sleep.md#analysis-windows`       |

---

## Performance and Fitness Parameters

| Concept                     | File                           | Function / Constant      | Knowledge ref                     |
| --------------------------- | ------------------------------ | ------------------------ | --------------------------------- |
| FTP estimation factors      | `src/lib/activity-analysis.ts` | `FTP_FACTORS`            | `metrics.md#ftp`                  |
| Riegel race time prediction | `src/lib/analytics.ts`         | `predictRaceTime()`      | `metrics.md#race-time-prediction` |
| Riegel exponent             | `src/lib/analytics.ts`         | `RIEGEL_EXPONENT = 1.06` | `metrics.md#race-time-prediction` |
| TSB interpretation zones    | `src/lib/dashboard.ts`         | `ACWR zone labels`       | `training-load.md#tsb-thresholds` |
| ACWR zone labels            | `src/lib/dashboard.ts`         | `acwrZone()`             | `training-load.md#model-2-acwr`   |

---

## Periodization

| Concept              | File                       | Function                  | Knowledge ref                   |
| -------------------- | -------------------------- | ------------------------- | ------------------------------- |
| Periodization phases | `src/lib/periodization.ts` | `PeriodizationPhase` enum | `training-load.md` (referenced) |
| Phase load factors   | `src/lib/periodization.ts` | `PHASE_LOAD_FACTOR`       | `future-research.md#sd-005`     |
| Phase distribution   | `src/lib/periodization.ts` | `distributePhases()`      | `training-load.md`              |
| Deload trigger       | `src/lib/periodization.ts` | `DELOAD_TRIGGER_INTERVAL` | `future-research.md#sd-006`     |

---

## Alerts

| Concept               | File                | Function          | Knowledge ref                               |
| --------------------- | ------------------- | ----------------- | ------------------------------------------- |
| All alert computation | `src/lib/alerts.ts` | `computeAlerts()` | `recommendation-engine.md#alert-generation` |
| Alert types enum      | `src/lib/alerts.ts` | `AlertType`       | `recommendation-engine.md`                  |
| Alert severity enum   | `src/lib/alerts.ts` | `AlertSeverity`   | `recommendation-engine.md`                  |

---

## Data Layer

| Concept                       | File                           | Entity                                  | Knowledge ref                           |
| ----------------------------- | ------------------------------ | --------------------------------------- | --------------------------------------- |
| Athlete profile singleton     | `prisma/schema.prisma`         | `AthleteProfile (id="default")`         | `data-quality.md#single-user`           |
| Activity load unit constraint | `prisma/schema.prisma`         | `Activity.load`                         | `training-load.md#load-unit-constraint` |
| Query keys registry           | `src/lib/client/keys.ts`       | `queryKeys`                             | `ARCHITECTURE.md`                       |
| Serialized<T> wire type       | `src/lib/client/fetchers.ts`   | `Serialized<T>`                         | `ARCHITECTURE.md`                       |
| Optimistic mutation helper    | `src/lib/client/optimistic.ts` | `listOptimistic()`                      | `ARCHITECTURE.md`                       |
| All Prisma query definitions  | `src/lib/queries.ts`           | `activityInclude`, `activityListSelect` | `ARCHITECTURE.md`                       |

---

## AI Coach

| Concept                         | File                                 | Knowledge ref                                |
| ------------------------------- | ------------------------------------ | -------------------------------------------- |
| Coach context assembly          | `src/app/api/coach/context/route.ts` | `recommendation-engine.md#ai-coach`          |
| Daily briefing generation       | `src/app/api/briefing/route.ts`      | `recommendation-engine.md`                   |
| AI coach behavioral constraints | `product-constitution.md`            | `product-constitution.md#ethical-principles` |

---

## Cross-Reference: Knowledge Base → Code

For finding where a concept from any knowledge document is implemented:

```
product-constitution.md   → No direct code implementation (design constraints)
glossary.md               → Cross-index for all other files
scientific-methodology.md → No direct code implementation (process constraints)
physiology.md             → Informs recovery.ts, sleep.ts, analytics.ts (no direct impl)
training-load.md          → analytics.ts, training-load.ts, activity-analysis.ts
recovery.md               → recovery.ts, alerts.ts, dashboard.ts
sleep.md                  → sleep.ts
nutrition.md              → Not currently implemented
strength-training.md      → analytics.ts (LOAD_FACTOR only)
triathlon.md              → training-load.ts (ACWR), partial brick analysis
hybrid-athlete.md         → Not currently implemented beyond TSS fallback
injury-prevention.md      → alerts.ts (ACWR), physical-notes schema
wearables.md              → Informs data ingestion (no single file)
garmin.md                 → src/app/api/garmin/*, sync pipeline
metrics.md                → Distributed: analytics.ts, recovery.ts, sleep.ts
recommendation-engine.md  → dashboard.ts, alerts.ts, sleep.ts, recovery.ts
decision-engine.md        → dashboard.ts (buildTrainingVerdict)
confidence-scoring.md     → Not currently implemented (future work)
data-quality.md           → src/lib/queries.ts, validators/, sync pipeline
future-research.md        → No implementation (scientific debt register)
```
