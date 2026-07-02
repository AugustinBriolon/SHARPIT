# Future Research

> Open scientific questions in SHARPIT, known gaps in the evidence base, and areas where additional research would improve model accuracy. This is SHARPIT's scientific debt register.

---

## Purpose of This Document

Scientific debt is the accumulation of:

1. Models implemented without peer-reviewed justification
2. Thresholds set empirically without published basis
3. Populations for which SHARPIT's evidence does not directly apply
4. Physiological phenomena SHARPIT tracks but does not model

This document tracks all three categories. Every item here is a known limitation that reduces SHARPIT's accuracy or reliability. Items are ranked by impact on recommendation quality.

---

## Priority 1: Critical — Affects Core Recommendations

### SD-001: Garmin Readiness Thresholds (75/50)

**Gap:** The thresholds of ≥75 (good), ≥50 (moderate), <50 (low) were set empirically by the developer. No peer-reviewed source validates that 75 = good recovery and 50 = moderate.

**Impact:** the primary daily training recommendation is driven by readiness classification. Incorrect thresholds produce systematically over- or under-conservative recommendations.

**Research needed:** correlation study between Garmin readiness score and objective performance metrics (time trial, lactate testing, subjective RPE). Does a readiness score of 75 predict better performance than 50 in trained athletes?

**Mitigation in place:** readiness is one of several signals. TSB and HRV corroborate when readiness disagrees.

**ADR:** none currently. This decision should have an ADR documenting the empirical rationale.

---

### SD-002: ACWR Team-Sport Extrapolation

**Gap:** ACWR thresholds (1.3 elevated, 1.5 high risk, ×2-4 injury) were validated in team sports (rugby, Australian Rules football). Their validity for endurance athletes is plausible but not directly validated.

**Impact:** SHARPIT's injury prevention model's primary signal has uncertain validity for its target population.

**Research needed:** prospective study of ACWR and injury incidence in trained cyclists, runners, and triathletes specifically. Gabbett (2016) and Carey (2017) are the best available but sport-specific validation is needed.

**Current handling:** thresholds used as-is, but alert language says "associated with elevated risk" not "will cause injury."

---

### SD-003: PMC Time Constants (τ_ctl=42, τ_atl=7)

**Gap:** τ_ctl=42 and τ_atl=7 were derived by Coggan from population data in trained cyclists. These constants may not apply to: masters athletes, recreational athletes, multi-sport athletes, or athletes returning from injury.

**Impact:** incorrect τ values produce CTL and ATL that do not reflect actual fitness and fatigue state.

**Research needed:** individual τ calibration methodology. Optimal approach: observe CTL recovery rate after deload weeks to fit individual τ. Requires: at least one complete deload cycle, pre and post performance testing.

**Future implementation:** configurable τ per athlete, estimated from historical patterns. See `training-load.md`.

---

### SD-004: ACWR Rolling vs. EWMA

**Gap:** SHARPIT uses rolling averages for ACWR. Malone et al. (2017) demonstrated that EWMA-based ACWR is more stable and less susceptible to deload artifacts. The rolling average version produces more false positives.

**Impact:** elevated false positive rate for ACWR alerts, particularly after planned deload weeks. Athletes may begin to ignore ACWR alerts if they fire during normal periodization.

**Implementation path:** swap rolling 7-day and 42-day windows for EWMA computation with λ values matching τ_atl=7 and τ_ctl=42. See `training-load.md` for formula.

**Effort:** medium. Requires updating `computeTrainingLoad()` and validating outputs.

---

## Priority 2: Significant — Affects Specific Recommendations

### SD-005: Periodization Load Factors

**Gap:** BASE phase load factor (0.85), BUILD (1.0), PEAK (1.08), TAPER (0.55), RACE (0.25) are product choices without cited sources.

**Source consulted:** Friel (2009) general periodization principles. Specific multipliers were estimated from common coaching practice.

**Impact:** training plans may over- or under-load specific phases. Most critical: PEAK multiplier (1.08 = 8% above BUILD) may be too conservative for well-adapted athletes.

**Research needed:** systematic review of optimal load distribution across periodization phases for endurance athletes.

---

### SD-006: Deload Trigger (Every 4 Weeks, 72% Load)

**Gap:** the 4-week deload cycle and 72% load reduction are practitioner consensus (Friel 2009) without a peer-reviewed basis specific to the exact values.

**Evidence available:** Seiler's research supports roughly 3-week loading + 1-week recovery as a common effective pattern. The 72% reduction is SHARPIT's specific choice.

**Impact:** deloads occurring too frequently reduce fitness accumulation; too infrequently increase overtraining risk. The 72% magnitude affects both recovery quality and fitness maintenance.

---

### SD-007: LOAD_FACTOR per Sport

**Gap:** LOAD_FACTOR values (RUN 1.0, BIKE 0.85, SWIM 1.1, STRENGTH 0.7 TSS/min) are estimates from general metabolic cost comparisons. No peer-reviewed validation.

**Impact:** TSS estimates for non-power-meter sessions carry ±30-50% error. This directly affects CTL, ATL, ACWR.

**Research needed:** validation of duration-based TSS estimation against gold-standard measurements (lactate, VO2, session RPE) for each sport.

**Priority for cycling:** lower — cyclists with power meters bypass this factor entirely.

---

### SD-008: Sleep Score Thresholds (80/60)

**Gap:** Garmin sleep score thresholds (≥80 good, ≥60 moderate, <60 low) are based on Garmin's scale, not external validation. The score itself is proprietary.

**Impact:** incorrect classification of sleep quality may produce wrong insights (e.g., labeling adequate sleep as poor).

**Mitigation:** SHARPIT uses sleep stage percentages and duration (more specific) alongside the score. The score is one signal among several.

---

### SD-009: Body Battery Thresholds (70/40)

**Gap:** thresholds ≥70 good, ≥40 moderate, <40 low are empirical SHARPIT product choices. No published basis.

**Impact:** body battery is already a Level 6 (proprietary) metric. The added layer of empirical thresholds compounds the uncertainty.

**Mitigation:** body battery is supplementary, not primary. Its classification rarely drives recommendations alone.

---

## Priority 3: Moderate — Affects Edge Cases

### SD-010: HRV Trend Window (3 vs 4-10 Days)

**Gap:** SHARPIT uses a shorter trend window (3 days vs 4-10 days baseline) than most published HRV monitoring protocols (7-14 day baseline). This makes the alert more sensitive but less specific.

**Research basis:** Buchheit (2014), Plews (2013) both recommend 7-14 day baselines for meaningful HRV trend detection.

**Impact:** higher false positive rate for HRV trend alerts. An athlete with one poor night's HRV may trigger the alert without true physiological meaning.

**Mitigation path:** increase window to 7-day acute vs 8-21 day baseline. More conservative but fewer false positives.

---

### SD-011: Nocturnal Stress Threshold (>30)

**Gap:** the threshold of average nocturnal stress >30 triggering an alert is empirical. Set based on the observation that sustained nocturnal stress >30 correlates with other negative recovery signals.

**No peer-reviewed source.** Garmin's stress score itself is proprietary.

---

### SD-012: Bedtime Regularity MAD Threshold (>60 min)

**Gap:** the 60-minute MAD threshold for "irregular bedtime" alert is a SHARPIT product judgment. No clinical cutoff exists in the literature.

**Research basis:** Walker (2017) and others consistently emphasize circadian regularity but do not define a "minutes of variation" clinical threshold.

---

### SD-013: Sleep Onset Buffer (20 min)

**Gap:** the 20-minute sleep onset latency buffer in bedtime recommendation is a population average from Ohayon et al. (2004). Individual athletes may require 5 min (highly trained, low stress) to 45+ min (high stress, poor sleep hygiene).

**Impact:** recommended bedtime may be too early or too late for specific athletes.

---

## Structurally Unresolved Problems

These are fundamental limitations of SHARPIT's current architecture that research alone cannot fix without also implementing new data models:

| Problem                                           | Impact                   | Required for resolution                       |
| ------------------------------------------------- | ------------------------ | --------------------------------------------- |
| Cross-sport TSS contamination                     | High for triathletes     | Sport-segregated PMC (ADR-002)                |
| Strength training neuromuscular fatigue invisible | High for hybrid athletes | New strength load model                       |
| No individual model calibration                   | Medium                   | Athlete longitudinal data + fitting algorithm |
| Psychological recovery unmeasured                 | Medium                   | Self-reported wellbeing feature               |
| Return-to-sport ACWR miscalibration               | Medium                   | Injury-status-aware ACWR computation          |
| No recovery trajectory modeling                   | Low-medium               | Predictive recovery model                     |

---

## Research Papers Needed

Papers that would most improve SHARPIT's evidence base if they existed or if existing papers were properly implemented:

1. **ACWR in endurance athletes:** prospective cohort, ≥200 trained runners/cyclists/triathletes, ≥1 season, logging acute and chronic load with injury outcomes. Currently relying on rugby/AFL studies.

2. **Garmin readiness score validation:** correlation between Garmin readiness score and objective recovery markers (lactate threshold, time trial, force production). Currently zero peer-reviewed papers on this metric.

3. **Individual PMC time constant optimization:** methodology for estimating individual τ_ctl from observed CTL recovery patterns. Could be implemented with existing athlete data in the future.

4. **Concurrent endurance-strength periodization for age-group athletes:** most concurrent training research is in young adults. Masters athletes (40+) may have different interference dynamics.

5. **Consumer wearable HRV vs ECG in athletes during sleep:** comprehensive validation of wrist-worn optical HRV during sleep specifically in trained athletes across device generations.
