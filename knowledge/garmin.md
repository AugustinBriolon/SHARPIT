# Garmin

> SHARPIT's primary data source. Every metric Garmin provides, what it means, how SHARPIT uses it, and where the algorithm is opaque.

---

## SHARPIT's Dependency on Garmin

SHARPIT is deeply coupled to Garmin Connect as its primary data ingestion source. This is a deliberate architectural decision (see ADR-003 in `decisions/`) based on:

- Richest physiological data in consumer wearables
- Consistent API across device generations
- HRV during sleep (correct methodology)
- Activity data with power/HR/GPS

**Consequence:** when Garmin changes its API, changes an algorithm, or deprecates a metric, SHARPIT is affected. This coupling is a known risk. Mitigation: SHARPIT stores raw imported values, not computed values, wherever possible. If Garmin changes how readiness is computed, SHARPIT's stored values reflect the algorithm version active at import time.

---

## Garmin Metrics: Complete Reference

### Activity Metrics

| Metric               | Description                      | SHARPIT use                      | Confidence |
| -------------------- | -------------------------------- | -------------------------------- | ---------- |
| `duration`           | Session duration in seconds      | TSS fallback calculation         | High       |
| `distance`           | GPS distance in meters           | Pace computation                 | High       |
| `avgHr`              | Average heart rate               | hrTSS computation                | Medium     |
| `maxHr`              | Maximum heart rate               | Zone analysis                    | High       |
| `trainingEffect`     | Aerobic + anaerobic effect (1-5) | Not currently used               | Low        |
| `trainingLoad`       | Garmin's TRIMP-based load        | Used when available (priority 1) | Medium     |
| `calories`           | Total caloric expenditure        | Supplementary                    | Low        |
| `avgPower` (cycling) | Average power in watts           | Cycling TSS if no NP             | Medium     |
| `normalizedPower`    | Garmin-computed NP               | Cycling TSS primary input        | High       |
| `tss` (from bike)    | Garmin-computed cycling TSS      | Direct use if available          | High       |
| `vo2maxCalc`         | Garmin VO2max estimate           | Not primary SHARPIT input        | Low        |

### Daily Health Metrics

| Metric                | Description                         | SHARPIT use                      | Confidence |
| --------------------- | ----------------------------------- | -------------------------------- | ---------- |
| `restingHr`           | Resting HR from morning measurement | RHR trend alert                  | High       |
| `hrv`                 | HRV value (RMSSD-like, ms)          | HRV trend analysis               | Medium     |
| `hrvStatus`           | Garmin HRV classification           | Direct alert trigger             | Medium     |
| `bodyBattery`         | Energy reserves 0-100               | Supplementary recovery indicator | Low        |
| `stress`              | Average daily stress (0-100)        | Nocturnal stress alert           | Low        |
| `stressQualification` | Stress category                     | Alert context                    | Low        |
| `steps`               | Daily step count                    | Not currently used               | High       |

### Sleep Metrics

| Metric              | Description                 | SHARPIT use             | Confidence |
| ------------------- | --------------------------- | ----------------------- | ---------- |
| `sleepScore`        | Overall sleep quality 0-100 | Sleep quality tone      | Low-medium |
| `deepMin`           | Deep sleep minutes          | Deep sleep analysis     | Medium     |
| `remMin`            | REM sleep minutes           | REM analysis            | Medium     |
| `lightMin`          | Light sleep minutes         | Duration component      | Medium     |
| `awakening`         | Minutes awake during night  | Sleep quality indicator | Medium     |
| `avgStress` (sleep) | Average stress during sleep | Nocturnal stress alert  | Low        |
| `sleepStart`        | Bedtime (UTC timestamp)     | Regularity analysis     | High       |
| `sleepEnd`          | Wake time (UTC timestamp)   | Duration, regularity    | High       |

### Body Composition (Garmin/Renpho Scale)

| Metric           | Description             | SHARPIT use        | Confidence |
| ---------------- | ----------------------- | ------------------ | ---------- |
| `weight`         | Body weight in kg       | Trend tracking     | High       |
| `bmi`            | Body Mass Index         | Context only       | Medium     |
| `bodyFat`        | Body fat % (BIA)        | Trend tracking     | Low-medium |
| `skeletalMuscle` | Skeletal muscle % (BIA) | Lean mass trends   | Low-medium |
| `boneMass`       | Bone mass kg (BIA)      | Not primarily used | Low        |

---

## Garmin Algorithms: What Is Known

### Training Readiness Score

**What Garmin says it uses:** overnight HRV, sleep quality and duration, training load (recent), body battery recovery rate.

**What is published:** Garmin marketing documentation, not peer-reviewed methodology. The exact weighting of components is not disclosed.

**SHARPIT's thresholds (75/50):** empirically derived by the developer. No validation against performance outcomes or other readiness metrics.

**Algorithm stability:** Garmin updates readiness computation via firmware/Connect updates. Historical scores before a major algorithm update are not comparable to post-update scores.

### HRV Status

Garmin classifies HRV status as: BALANCED, UNBALANCED (trending high or low), POOR, LOW.

**Implementation:** Garmin uses the user's baseline HRV (established after 2-3 weeks of consistent measurement) to classify current HRV relative to personal norms.

**SHARPIT's dual approach:**

- Direct: `UNBALANCED_LOW`, `LOW`, `POOR` → immediate warning alert
- Trend: independent 3-day vs 4-10 day comparison (15% drop threshold) regardless of Garmin classification

The trend approach is more robust to Garmin algorithm changes because it uses the raw HRV value, not the derived classification.

### Body Battery

Body Battery is Garmin's proprietary energy tracking metric. It integrates stress, physical activity, and sleep to estimate an energy reserve level (0-100).

**Garmin's stated methodology:** uses stress data, activity, HRV, sleep quality, and body battery from the previous day. The exact algorithm is not published.

**Practical characteristics:**

- Charges primarily during sleep
- Depletes with stress and activity
- Maximum charge: ~100 (after excellent sleep, full recovery)
- Morning value correlates with prior night sleep quality

**SHARPIT's use:** supplementary recovery indicator. Thresholds: ≥70 good, ≥40 moderate, <40 low. These are empirical SHARPIT product choices.

### Sleep Staging

Garmin classifies sleep into Deep/Light/REM/Awake using accelerometry + optical PPG pattern recognition. See `wearables.md` for accuracy discussion.

**Device variation:** older Garmin devices (pre-Fenix 6 era) used simpler sleep algorithms with less accurate staging. Athletes using older devices may see systematically different REM/Deep percentages.

**SHARPIT's handling:** all Garmin devices are treated identically. No device-version adjustment.

---

## Data Import Architecture

SHARPIT imports Garmin data via the Garmin Health API. Key architectural facts:

- Data arrives in Garmin's native format and is stored with minimal transformation
- Timestamps are converted to UTC and stored as `DateTime` in Prisma
- Activity streams (second-by-second power/HR/cadence data) are stored separately from activity summaries
- The import pathway uses `GarminRawActivity` → processing → `Activity` + associated metrics

**Data freshness:** Garmin pushes data to connected apps within minutes of workout completion. Sleep data is available after the watch syncs (usually morning). Health metrics are pushed daily.

---

## Garmin Calibration Requirements

Several Garmin metrics require a calibration period before they produce reliable values:

| Metric             | Calibration period               | SHARPIT implication                     |
| ------------------ | -------------------------------- | --------------------------------------- |
| HRV baseline       | 2-3 weeks consistent measurement | New users: HRV status is unreliable     |
| Training readiness | 3+ weeks                         | New users: readiness score unreliable   |
| VO2max estimate    | 2-4 weeks running outdoors       | Accuracy improves with runs             |
| Body battery       | 1 week                           | Builds its model of the user's patterns |

**SHARPIT's handling of new users:** alerts that depend on trend analysis automatically require a minimum history window. A new user with 5 days of data will not trigger an HRV trend alert (the window is 10 days minimum). However, readiness-based alerts fire from day 1 because they use Garmin's own calibration.

The cold start problem is not fully solved. New users should be informed that data quality improves after 3-4 weeks of consistent wear.

---

## Device Recommendations

SHARPIT works with any Garmin device that supports the metrics it uses. Minimum requirements:

**Required:** HRV during sleep measurement (requires optical HR sensor during sleep)  
**Recommended:** power meter for cycling (dramatically improves cycling TSS accuracy)  
**Optional:** running power (e.g., Running Dynamics Pod or Garmin HRM-Pro)

**Device generations with full support:**

- Forerunner 945, 955, 965 (and current generation)
- Fenix 6 and newer
- Epix Gen 2 and newer
- Venu series (limited training data but sleep/HRV present)

**Devices with partial support:**

- Older Forerunner (735XT, 935): HRV support variable; simpler sleep staging
- Vivoactive series: limited training analytics

SHARPIT does not gate features by device. It uses available data and degrades gracefully when metrics are absent.

---

## Garmin API Limitations and Known Issues

1. **Training load definition change:** Garmin changed the definition of "training load" between device generations. Older devices used TRIMP; newer devices use a Firstbeat-computed load. These values are not directly comparable. SHARPIT stores whatever Garmin reports.

2. **HRV data gaps:** if the watch is not worn during sleep, HRV data is absent. SHARPIT marks these as missing data points, not zero. Zeros would corrupt trend analysis.

3. **Duplicate activities:** Garmin occasionally creates duplicate activity records. SHARPIT's import logic should deduplicate by timestamp + device ID, but edge cases may create duplicates in the database.

4. **Timezone handling:** Garmin timestamps are in UTC. Sleep times especially must be converted to the athlete's local timezone for meaningful analysis (7am sleep-wake is different in different timezones). SHARPIT uses the athlete's configured timezone for display.

5. **API rate limits:** Garmin applies rate limits to their Health API. Bulk historical imports may require throttled requests. Real-time push data is not rate-limited in the same way.
