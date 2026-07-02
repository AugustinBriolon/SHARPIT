# Sleep

> Sleep is the highest-leverage recovery intervention available to an athlete. SHARPIT treats sleep analysis as a primary feature, not a supplementary one.

---

## SHARPIT's Position on Sleep

Sleep is not optional for athletic performance. It is the primary mechanism of physical recovery, hormonal regulation, glycogen resynthesis, and motor skill consolidation. A training program optimized on paper will underperform if sleep is inadequate. SHARPIT's sleep analysis exists to close the loop between training recommendations and the physiological recovery that makes those recommendations effective.

**The practical implication:** when sleep signals are negative, SHARPIT's training recommendations shift conservative — regardless of what PMC/ACWR suggest. An athlete who is training well but sleeping poorly is on a degrading trajectory.

---

## Sleep Architecture

SHARPIT tracks four sleep stages as reported by Garmin:

| Stage         | Label           | SHARPIT variable | Physiological function                                                 |
| ------------- | --------------- | ---------------- | ---------------------------------------------------------------------- |
| Deep (N3/SWS) | Profond         | `sleepDeepMin`   | Physical recovery, GH release, muscle repair, glycogen synthesis       |
| REM           | Paradoxal (REM) | `sleepRemMin`    | Memory consolidation, motor learning, emotional regulation             |
| Light (N1/N2) | Léger           | `sleepLightMin`  | Transitional; necessary staging between deep and REM                   |
| Awake         | Éveillé         | `sleepAwakeMin`  | Minimal; too much indicates poor sleep quality or environment problems |

### Target percentages

| Stage | SHARPIT target             | Source                                                     |
| ----- | -------------------------- | ---------------------------------------------------------- |
| Deep  | 13–23% of total sleep time | Walker (2017), AASM guidelines, Garmin's own documentation |
| REM   | 20–25% of total sleep time | Walker (2017), multiple sleep science texts                |
| Light | Remainder                  | No specific target                                         |
| Awake | < ~5% (≤45 min)            | Operational threshold from literature                      |

**Important caveat:** these percentages are population averages. Individual variation is substantial. Older athletes naturally have less deep sleep. Athletes in heavy training phases may see REM compression. The targets are guidelines for identifying concerning deviations, not absolute requirements.

---

## Sleep Duration

**Target: 480 minutes (8 hours)**  
**Implementation:** `TARGET_DURATION_MIN = 480` in `sleep.ts`

This is a configurable value via `AthleteProfile.sleepTargetMinutes`. The default of 8 hours represents the consensus recommendation from sleep science literature (Walker 2017, AASM position statement 2015) and sports medicine (Mah et al. 2011 sleep extension study in athletes).

**Why 8 hours and not 7 or 9:**

- 7 hours is the minimum associated with health maintenance (AASM 2015)
- 8 hours is the target associated with athletic performance optimization (Mah et al. 2011)
- > 9 hours may indicate pathological sleepiness if consistent; not a target

**Sleep debt alert thresholds:**

- Average <390 min (6h30) over 7 days: `warning` alert
- Average <360 min (6h00) over 7 days: `danger` alert

The 390-minute threshold corresponds to the level below which cognitive performance decrement becomes measurable (Van Dongen et al. 2003). The 360-minute threshold corresponds to severe restriction.

---

## Sleep Score

Garmin reports a 0–100 sleep score. SHARPIT's interpretation thresholds:

| Score | Tone       | Implementation in SHARPIT   |
| ----- | ---------- | --------------------------- |
| ≥ 80  | `good`     | `scoreTone()` in `sleep.ts` |
| ≥ 60  | `moderate` |                             |
| < 60  | `low`      |                             |

**These thresholds are empirical.** Garmin calibrates its sleep score to its own algorithm. The 80/60 split was chosen because it produces reasonable separations in practice, but there is no published validation that 80 means "good sleep" by any external criterion.

---

## Deep Sleep

Deep sleep (slow-wave sleep, N3) is the physiologically most important stage for athletic recovery:

- Growth hormone is secreted almost exclusively during deep sleep
- Glycogen resynthesis occurs primarily during deep sleep
- Musculoskeletal repair is concentrated in this stage
- Immunological restoration is deep-sleep dependent

SHARPIT's deep sleep evaluation:

| Deep % | Tone       | Threshold                                 |
| ------ | ---------- | ----------------------------------------- |
| ≥ 13%  | `good`     | Lower bound of normal range (Walker 2017) |
| ≥ 9%   | `moderate` | Concerning but not critical               |
| < 9%   | `low`      | Significantly below normal                |

### Factors that reduce deep sleep

SHARPIT's sleep insights address these:

- **Alcohol**: fragments deep sleep in the second half of the night
- **Late heavy meals**: activate thermogenic and digestive processes incompatible with deep sleep
- **Evening intense exercise**: elevates core temperature and sympathetic tone, delaying sleep onset and compressing deep sleep
- **High room temperature**: deep sleep requires core temperature drop of ~1-1.5°C

---

## REM Sleep

REM sleep is critical for motor learning and memory consolidation:

- Motor skill acquisition (technique, movement patterns) consolidates during REM
- Emotional regulation and psychological recovery
- Concentrated in the latter third of the night — cutting sleep short disproportionately reduces REM

SHARPIT's REM evaluation:

| REM % | Tone       | Threshold                  |
| ----- | ---------- | -------------------------- |
| ≥ 20% | `good`     | Normal range (Walker 2017) |
| ≥ 15% | `moderate` | Mildly reduced             |
| < 15% | `low`      | Significantly reduced      |

**REM insight:** athletes who consistently cut sleep short (waking before completing a full 8-hour cycle) are disproportionately depriving themselves of REM. The insight message in SHARPIT explicitly communicates this: "Le REM est concentré en fin de nuit : dors suffisamment longtemps."

---

## Sleep Regularity

**Implementation:** Median Absolute Deviation (MAD) of bedtime over 30 nights

SHARPIT uses MAD (not standard deviation) because it is robust to outlier nights (travel, special events). MAD represents the typical variation of bedtime around the athlete's median bedtime.

**Why regularity matters:** Circadian rhythm stability is one of the strongest predictors of sleep quality, separate from sleep duration. Walker (2017) describes the circadian anchoring of sleep stages: going to bed at the same time each night optimizes the alignment of sleep stages with circadian timing.

**Alert threshold:** MAD > 60 minutes → insight fires: "Horaires irréguliers"

The 60-minute threshold is a SHARPIT product choice, not a validated clinical cutoff. It represents "more than one hour of typical variation in bedtime" — intuitively significant but not precisely derived from literature.

---

## Bedtime Recommendation

SHARPIT computes a recommended bedtime from the athlete's median wake time and sleep target:

```
recommendedBedtime = medianWakeTime - targetSleepDuration - 20 minutes (sleep onset buffer)
```

The 20-minute sleep onset buffer is based on typical sleep onset latency for healthy adults (Ohayon et al. 2004). Athletes with poor sleep efficiency may need a larger buffer.

This computation uses median wake time over 30 nights — a robust estimate of the athlete's habitual wake schedule. Recommended bedtime adapts if the athlete's wake schedule shifts.

---

## Analysis Windows

| Purpose                          | Window                     | Rationale                                                    |
| -------------------------------- | -------------------------- | ------------------------------------------------------------ |
| Recent state (7 nights)          | `RECENT_WINDOW_NIGHTS = 7` | Current recovery status, responsive to this week             |
| Habits and regularty (30 nights) | `HABIT_WINDOW_NIGHTS = 30` | Stable estimate of typical patterns, robust to outlier weeks |

Recent state uses a shorter window to be responsive to current training demands. Habit analysis uses a longer window to avoid flagging a single bad week as a chronic pattern.

---

## Sleep Insights Priority

`analyzeSleep()` generates up to 4 insights. Priority order:

1. Duration (critical — below target generates the most actionable recommendation)
2. Bedtime vs goal (personalized target conflict)
3. Deep sleep deficit (specific stage feedback)
4. REM deficit (specific stage feedback)
5. Regularity (habit feedback)
6. Bedtime vs recommended (calculated based on wake time)
7. Nocturnal stress (Garmin stress during sleep)
8. Summary positive ("Sommeil de qualité") — only if no other insight fires

This priority order ensures that the highest-leverage improvement (duration) is communicated first.

---

## Nocturnal Stress

Garmin measures stress continuously, including during sleep. SHARPIT alerts when average nocturnal stress > 30.

**Interpretation:** elevated nocturnal stress indicates sympathetic activation during sleep, which competes with parasympathetic recovery processes (HRV, deep sleep facilitation). Causes include psychological stress, incomplete recovery from intense exercise, illness, caffeine, and alcohol.

**Alert threshold rationale:** 30 represents "moderate" stress on Garmin's 0–100 scale. The threshold was set empirically based on the observation that sustained nocturnal stress >30 tends to coincide with other negative recovery signals.

---

## Limitations of SHARPIT's Sleep Analysis

1. **Garmin accuracy on sleep staging:** consumer wearable sleep staging has been validated against polysomnography (PSG) in some studies with mixed results. Accuracy for stage percentages is typically ±5-10 percentage points vs PSG. Absolute values should be interpreted with this uncertainty in mind.

2. **Aggregation from daily to trend obscures night-to-night variation.** SHARPIT reports 7-day averages, which can mask a pattern of alternating good/bad nights (which may indicate sleep apnea or another disorder).

3. **No behavioral pathway.** SHARPIT identifies sleep problems but cannot track whether the athlete followed the recommended changes. Insight effectiveness is not measured.

4. **No integration with training timing.** SHARPIT does not currently adjust recommendations based on whether morning vs evening training sessions affect sleep timing. This is a meaningful omission for athletes with tight schedules.
