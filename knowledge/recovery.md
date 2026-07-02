# Recovery

> How SHARPIT assesses recovery, why specific signals were chosen, and the limitations of each.

---

## Recovery in SHARPIT's Model

Recovery is not a binary state. SHARPIT models recovery as a multi-signal continuum assessed from four independent sources:

1. **Garmin Training Readiness Score** — vendor composite score
2. **HRV (Heart Rate Variability)** — autonomic nervous system status
3. **Resting Heart Rate** — cardiovascular baseline
4. **TSB (Training Stress Balance)** — load-based recovery proxy

No single signal is authoritative. The value of SHARPIT's recovery assessment comes from combining signals that measure different physiological processes. When they agree, confidence is high. When they disagree, SHARPIT must flag the conflict and defer to the athlete's subjective assessment.

---

## Signal 1: Garmin Training Readiness Score

**Implementation:** `buildReadinessView()` in `recovery.ts`  
**Evidence level:** Level 6 (proprietary, not peer-reviewed)

### What Garmin reports

Garmin computes a 0–100 score combining: overnight HRV, sleep quality and duration, training load (recent), and potentially body battery recovery. The exact algorithm is not published.

### SHARPIT's thresholds

| Score | Classification | Source                              |
| ----- | -------------- | ----------------------------------- |
| ≥ 75  | Good           | Empirical (no peer-reviewed source) |
| ≥ 50  | Moderate       | Empirical (no peer-reviewed source) |
| < 50  | Low            | Empirical (no peer-reviewed source) |

**These thresholds were set empirically by the developer.** They have no published scientific basis. They should be treated as reasonable starting points, not precise cutoffs.

### Why SHARPIT uses this signal

Despite its opacity, the Garmin readiness score integrates multiple physiological signals that SHARPIT would otherwise need to compute separately. For athletes without detailed HRV analysis workflows, it provides a useful daily summary. The alternative — ignoring it entirely — discards data that may have practical value.

**The honest position:** SHARPIT uses the readiness score as a directional indicator, not a precise measurement. A score of 60 does not mean the athlete is precisely "60% recovered." It means Garmin's sensor array suggests moderate recovery. This distinction matters for how SHARPIT communicates the score.

### Limitations

- Algorithm is proprietary; validation papers are not available
- Different Garmin devices may compute the score differently
- Scores are calibrated over time (a new user's scores are less reliable)
- Garmin's baseline computation takes 3+ weeks of consistent wear
- Score can be artificially low after a planned high-load day that was physiologically appropriate

---

## Signal 2: HRV (Heart Rate Variability)

**Implementation:** `buildHrvStatusView()` in `recovery.ts`  
**Evidence level:** Level 3-4 (validated in trained athletes; Garmin's specific implementation is Level 6)

### What HRV measures

HRV reflects the variation in time between heartbeats, driven by autonomic nervous system activity. High parasympathetic tone (rest and digest) produces high HRV. High sympathetic tone (fight or flight — exercise, stress, illness) suppresses HRV. In trained athletes, overnight HRV is a sensitive marker of recovery status.

### SHARPIT's implementation

SHARPIT reads `DailyHealth.hrv` (raw ms value) and `DailyHealth.hrvStatus` (Garmin classification). Two alert pathways:

**Pathway 1 — Garmin status:**

- `UNBALANCED_LOW`, `LOW`, `POOR` → `warning` alert fires immediately

**Pathway 2 — Trend analysis (in `alerts.ts`):**

```
If avg(last 3 days HRV) < avg(days 4-10 HRV) × 0.85 → warning: "HRV en baisse marquée"
```

A 15% drop from recent baseline triggers the alert.

The 15% threshold is based on Buchheit (2014) and Plews et al. (2013), who suggest meaningful baseline deviations of ≥10-15% are physiologically significant.

### Why SHARPIT uses trend, not absolute value

HRV values are highly individual — a value of 35 ms might be excellent for one athlete and poor for another. The peer-reviewed approach to HRV monitoring in trained athletes consistently recommends tracking individual baseline deviation, not absolute values. See Plews et al. (2013).

**Limitation:** SHARPIT's trend window (3 days vs 4-10 days) is shorter than most research protocols (which use 7-14 day baselines). This makes the alert more sensitive to day-to-day variation. Future improvement: configurable window.

### Limitations

- Garmin measures HRV during sleep (good methodology); the specific algorithm is proprietary
- HRV can be low after alcohol consumption, illness, or high stress — not all sources of suppressed HRV indicate insufficient recovery for training
- HRV can be elevated after a deload week (sympathetic suppression + recovery) — a brief "high" HRV spike after a rest week is normal, not pathological
- HRV-based training guidance requires 2+ weeks of consistent overnight measurement to establish a reliable baseline

---

## Signal 3: Resting Heart Rate (RHR)

**Implementation:** alert in `computeAlerts()` in `alerts.ts`  
**Evidence level:** Level 3 (observational evidence in trained athletes)

### What RHR measures

An elevated resting heart rate above personal baseline indicates increased sympathetic tone. This can reflect incomplete recovery, overtraining, illness, dehydration, or psychological stress. It is a less sensitive marker than HRV but is more robustly measured (heart rate is simpler to measure accurately than HRV).

### SHARPIT's threshold

```
If avg(last 3 days RHR) >= avg(days 4-17 RHR) + 5 bpm → warning alert
```

A 5 bpm elevation above a 2-week baseline is used by Friel (2009) and Noakes (1991) as a clinical rule of thumb for overtraining detection.

**Limitation:** the 5 bpm threshold is a practitioner heuristic (Level 5 evidence). It lacks the precision of HRV for recovery assessment but is robust to measurement error.

---

## Signal 4: Training Stress Balance (TSB)

**Implementation:** `buildFormView()` in `recovery.ts`  
**Evidence level:** Level 2-5 (underlying PMC model is Level 2-3; TSB thresholds are Level 5)

### What TSB measures

TSB = CTL - ATL. The mathematical difference between the athlete's accumulated fitness (CTL) and their current fatigue burden (ATL). It represents how "fresh" the athlete is relative to their fitness level.

TSB is a load-derived recovery signal — it measures training-induced fatigue, not physiological recovery state. A high TSB does not mean the athlete is recovered from illness or psychological stress. It means their training load balance favors freshness.

### Thresholds

See `training-load.md`. Brief summary:

- TSB > +15: fresh/tapered
- TSB -10 to +5: optimal training state
- TSB -10 to -30: high training load
- TSB < -30: overload risk

### When TSB and readiness disagree

This is a diagnostically significant situation. Examples:

**TSB positive, readiness low:**
The athlete is mathematically fresh but physiological sensors show impaired recovery. Probable causes: illness, psychological stress, non-training life stressors, accumulated sleep debt. SHARPIT should flag this conflict and defer to the physiological signals.

**TSB negative (high training load), readiness good:**
The athlete is carrying training fatigue but physiologically recovering well. This is the desired state during a planned build phase. SHARPIT should interpret this positively: the training is being absorbed.

**Resolution:** when TSB and readiness-derived signals conflict, SHARPIT's `buildTrainingVerdict()` uses readiness and recovery signals as primary inputs, with TSB as context. This reflects the correct clinical hierarchy: physiological signals > load model.

---

## Body Battery

**Implementation:** `bodyBatteryTone()` in `recovery.ts`  
**Evidence level:** Level 6 (Garmin proprietary)

Body Battery (0–100) represents Garmin's estimate of available energy reserves. It charges during sleep/rest and depletes during activity. SHARPIT uses it as a supplementary indicator.

Thresholds:

- ≥ 70: good
- ≥ 40: moderate
- < 40: low

These thresholds are empirical. Body Battery is best used for intra-day decision making (should I train now or wait?), not as a primary recovery metric.

---

## Multi-Signal Aggregation

SHARPIT's `buildTrainingVerdict()` combines signals into a single daily recommendation. The aggregation logic follows this priority:

1. **Active injury alert (severity ≥6)** → verdict overrides everything else. Rest is mandatory regardless of PMC/readiness state.
2. **ACWR ≥ 1.5** → load management takes priority over readiness state
3. **Low readiness (multiple days)** → conservative recommendation
4. **TSB context** → modulates recommendation within the above constraints

The rationale: safety overrides performance. An athlete with good TSB and high ACWR should not receive a "push hard" recommendation. The system's job is to protect long-term health first.

---

## Recovery Recommendations

SHARPIT generates one of three primary recovery recommendations:

| Tone       | Recommendation                            | Conditions                                          |
| ---------- | ----------------------------------------- | --------------------------------------------------- |
| `good`     | "Bien récupéré : séance intense possible" | Readiness ≥75, no ACWR alert, TSB > -20             |
| `moderate` | "Privilégie Z2 ou technique"              | Readiness 50-75, or elevated ACWR                   |
| `low`      | "Repos actif ou journée off recommandée"  | Readiness <50, or ACWR ≥1.5, or active danger alert |

---

## Known Gaps in SHARPIT's Recovery Model

1. **No independent HRV algorithm.** SHARPIT depends entirely on Garmin for HRV analysis. A transparent, independently computed HRV score (using methods from Plews et al. 2013 or Buchheit 2014) would make recovery assessment scientifically verifiable.

2. **No psychological recovery tracking.** Motivation, mood, and perceived wellbeing are validated recovery markers (Morgan's POMS, Foster et al. RPE). SHARPIT currently tracks only physiological signals.

3. **No recovery trajectory modeling.** SHARPIT assesses recovery state at a point in time but does not model recovery trajectory (will the athlete be recovered in 48 hours?). This would enable better planning for multi-day training blocks.

4. **No nutrition/hydration signals.** Dehydration and glycogen depletion are significant recovery limiters. SHARPIT cannot observe these directly.
