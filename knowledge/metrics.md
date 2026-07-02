# Metrics

> Every metric SHARPIT computes, displays, or uses in decision-making. Authoritative reference for naming, units, computation, and interpretation.

---

## Canonical Metric Definitions

This is the single source of truth for metric definitions. When the UI displays a metric, when an AI agent references a metric, or when a developer implements a computation, this document takes precedence.

---

## Load Metrics

### TSS — Training Stress Score

| Property       | Value                                        |
| -------------- | -------------------------------------------- |
| Unit           | unitless (index)                             |
| Range          | 0–300+ (no hard cap)                         |
| Reference      | 100 = one hour at exactly FTP/LTHR           |
| Implementation | `computeSessionLoad()` in `training-load.ts` |
| Evidence       | Coggan & Allen (2006) — Level 5              |

**Computation priority:** (1) Garmin activity load, (2) power-based cycling TSS, (3) HR-based TSS, (4) duration × sport factor

**Reference values:**

- <50: easy recovery session
- 50-150: moderate training day
- 150-300: hard training day
- > 300: extreme day (long race, double session)

**Interpretation warning:** these ranges vary significantly by athlete. A 100 TSS day for a CTL=50 athlete is very different from a 100 TSS day for a CTL=120 athlete.

---

### CTL — Chronic Training Load (Fitness)

| Property       | Value                                  |
| -------------- | -------------------------------------- |
| Unit           | TSS/day                                |
| Decay constant | τ = 42 days                            |
| Initialization | 0 for new users                        |
| Implementation | `computePmcSeries()` in `analytics.ts` |
| Evidence       | Coggan (2003) — Level 5                |

**Formula:** `CTL(t) = CTL(t-1) + (TSS(t) - CTL(t-1)) / 42`

**Reference values for cyclists:**

- <50: beginner/casual
- 50-80: recreational
- 80-100: committed amateur
- 100-130: serious amateur / early elite
- > 130: high-level amateur / professional

**Known limitations:** cold start at 0, single τ for all athletes, cross-sport contamination.

---

### ATL — Acute Training Load (Fatigue)

| Property       | Value                                  |
| -------------- | -------------------------------------- |
| Unit           | TSS/day                                |
| Decay constant | τ = 7 days                             |
| Implementation | `computePmcSeries()` in `analytics.ts` |
| Evidence       | Coggan (2003) — Level 5                |

**Formula:** `ATL(t) = ATL(t-1) + (TSS(t) - ATL(t-1)) / 7`

**Interpretation:** represents approximately 1 week of training load, exponentially weighted. Rises quickly with training and falls quickly with rest.

---

### TSB — Training Stress Balance (Form)

| Property       | Value                                  |
| -------------- | -------------------------------------- |
| Unit           | TSS/day                                |
| Computation    | CTL - ATL                              |
| Implementation | `computePmcSeries()` in `analytics.ts` |
| Evidence       | Coggan (2003) — Level 5                |

**Thresholds:**

| TSB        | State                        |
| ---------- | ---------------------------- |
| > +15      | Fresh / tapered              |
| -10 to +5  | Optimal training zone        |
| -10 to -30 | Training fatigue / high load |
| < -30      | Overload risk                |

---

### ACWR — Acute:Chronic Workload Ratio

| Property       | Value                                           |
| -------------- | ----------------------------------------------- |
| Unit           | ratio (dimensionless)                           |
| Computation    | 7-day sum / (42-day sum / 6)                    |
| Implementation | `computeTrainingLoad()` in `training-load.ts`   |
| Evidence       | Gabbett (2016), Carey et al. (2017) — Level 1-3 |

**Thresholds:**

| ACWR    | Classification | Alert   |
| ------- | -------------- | ------- |
| < 0.8   | Under-training | None    |
| 0.8–1.3 | Optimal        | None    |
| 1.3–1.5 | Elevated risk  | warning |
| ≥ 1.5   | High risk      | warning |
| ≥ 1.8   | Danger         | danger  |

---

### NP — Normalized Power

| Property       | Value                                                |
| -------------- | ---------------------------------------------------- |
| Unit           | Watts                                                |
| Computation    | 4th-power-weighted 30s rolling average               |
| Implementation | `computeNormalizedPower()` in `activity-analysis.ts` |
| Evidence       | Coggan & Allen (2006) — Level 5                      |

Used only for cycling sessions with power data.

---

### IF — Intensity Factor

| Property       | Value                  |
| -------------- | ---------------------- |
| Unit           | ratio                  |
| Computation    | NP / FTP               |
| Range          | 0–1.2+                 |
| Implementation | `activity-analysis.ts` |

**Reference:**

- <0.75: Z1/Z2, easy
- 0.75-0.90: Z3, tempo
- 0.90-1.05: Z4, threshold
- > 1.05: Z5+, above threshold

---

## Fitness Parameters

### FTP — Functional Threshold Power

| Property   | Value                                 |
| ---------- | ------------------------------------- |
| Unit       | Watts                                 |
| Definition | Highest sustainable power for ~1 hour |
| Source     | Athlete profile (manual or estimated) |
| Evidence   | Coggan & Allen (2006) — Level 5       |

**Estimation factors (from effort duration):**

- 60 min: × 0.97
- 30 min: × 0.95
- 20 min: × 0.95
- 10 min: × 0.90

---

### LTHR — Lactate Threshold Heart Rate

| Property   | Value                                       |
| ---------- | ------------------------------------------- |
| Unit       | bpm                                         |
| Definition | HR at LT2 / FTP equivalent                  |
| Source     | Athlete profile (manual entry or estimated) |
| Evidence   | Friel (2009) — Level 5                      |

---

### VO2max (Garmin estimate)

| Property | Value                        |
| -------- | ---------------------------- |
| Unit     | mL/kg/min                    |
| Source   | Garmin proprietary algorithm |
| Evidence | Level 6 (proprietary)        |

SHARPIT displays this value but does not use it in primary computations. Accuracy ±10-15%.

---

## Recovery Metrics

### Garmin Training Readiness

| Property | Value              |
| -------- | ------------------ |
| Unit     | 0–100              |
| Source   | Garmin proprietary |
| Evidence | Level 6            |

**Thresholds:** ≥75 good, ≥50 moderate, <50 low. Empirical, no peer-reviewed source.

---

### HRV Value

| Property    | Value                                                    |
| ----------- | -------------------------------------------------------- |
| Unit        | milliseconds (ms)                                        |
| Measurement | During sleep (overnight)                                 |
| Source      | Garmin optical PPG                                       |
| Evidence    | Level 3-4 (methodology); Level 6 (Garmin implementation) |

Individual baseline required for interpretation. Do not compare across athletes.

---

### Body Battery

| Property | Value              |
| -------- | ------------------ |
| Unit     | 0–100              |
| Source   | Garmin proprietary |
| Evidence | Level 6            |

**Thresholds:** ≥70 good, ≥40 moderate, <40 low. Empirical SHARPIT product choices.

---

## Sleep Metrics

### Sleep Duration

| Property       | Value                                               |
| -------------- | --------------------------------------------------- |
| Unit           | minutes                                             |
| Target         | 480 minutes (configurable via `sleepTargetMinutes`) |
| Implementation | `analyzeSleep()` in `sleep.ts`                      |

**Alert thresholds (7-day average):**

- <390 min (6h30): warning
- <360 min (6h): danger

---

### Deep Sleep %

| Property       | Value                              |
| -------------- | ---------------------------------- |
| Computation    | sleepDeepMin / totalSleepMin × 100 |
| Target         | 13-23%                             |
| Implementation | `analyzeSleep()` in `sleep.ts`     |

**Tones:** ≥13% good, ≥9% moderate, <9% low

---

### REM Sleep %

| Property       | Value                             |
| -------------- | --------------------------------- |
| Computation    | sleepRemMin / totalSleepMin × 100 |
| Target         | 20-25%                            |
| Implementation | `analyzeSleep()` in `sleep.ts`    |

**Tones:** ≥20% good, ≥15% moderate, <15% low

---

### Sleep Score (Garmin)

| Property | Value              |
| -------- | ------------------ |
| Unit     | 0–100              |
| Source   | Garmin proprietary |
| Evidence | Level 6            |

**Tones:** ≥80 good, ≥60 moderate, <60 low. Empirical; no external validation.

---

### Bedtime Regularity (MAD)

| Property        | Value                                               |
| --------------- | --------------------------------------------------- |
| Unit            | minutes                                             |
| Computation     | Median Absolute Deviation of bedtime over 30 nights |
| Alert threshold | >60 minutes                                         |
| Implementation  | `analyzeSleep()` in `sleep.ts`                      |

---

## Performance Metrics

### Race Time Prediction (Riegel)

| Property       | Value                       |
| -------------- | --------------------------- |
| Formula        | `T2 = T1 × (D2 / D1)^1.06`  |
| Exponent       | 1.06 (Riegel 1977, Level 5) |
| Implementation | `predictRaceTime()`         |

**Known limitations:** exponent assumes homogeneous pace; varies for elite (1.05) vs. recreational (1.07-1.08) athletes; does not account for terrain.

---

## Metric Naming Conventions

### In Code

| Layer             | Convention       | Example                     |
| ----------------- | ---------------- | --------------------------- |
| Database (Prisma) | camelCase        | `sleepDeepMin`, `restingHr` |
| Domain functions  | camelCase        | `computePmcSeries()`        |
| UI display        | Localized string | "Sommeil profond"           |
| API JSON          | camelCase        | `{ "sleepScore": 75 }`      |

### Prohibited Naming Patterns

- Never use "score" for a value that is a ratio (use "ratio" or "index")
- Never use "fitness" as a variable name without the CTL qualifier — "fitness" is ambiguous
- Never use "load" without qualificying: TSS, ATL, CTL, ACWR are all "load" in different senses
- Use full metric names in function signatures: `computeAcwr()` not `computeRatio()`

---

## Metric Availability by Data Source

| Metric                | Garmin                | Manual entry | Computed      |
| --------------------- | --------------------- | ------------ | ------------- |
| TSS                   | ✓ (activity load)     | Possible     | ✓ (fallback)  |
| CTL/ATL/TSB           | —                     | —            | ✓             |
| ACWR                  | —                     | —            | ✓             |
| FTP                   | Via activity analysis | ✓            | ✓ (estimated) |
| HRV                   | ✓                     | —            | —             |
| Sleep duration/stages | ✓                     | —            | —             |
| Readiness             | ✓                     | —            | —             |
| Body composition      | ✓ (scale)             | —            | —             |
