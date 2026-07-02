# Physiology

> The physiological foundations underlying every training recommendation in SHARPIT. Not a textbook — a reference for why SHARPIT's models behave as they do.

---

## Energy Systems

Understanding energy systems is prerequisite to understanding why TSS, PMC, and polarized training exist.

### Three Systems

| System                 | Fuel               | Duration        | Relevance to SHARPIT                       |
| ---------------------- | ------------------ | --------------- | ------------------------------------------ |
| ATP-PCr (phosphagen)   | Creatine phosphate | 0–10 sec        | Sprint finishes; not tracked               |
| Glycolytic (anaerobic) | Glycogen → lactate | 10 sec – ~2 min | High-intensity intervals; drives ATL spike |
| Oxidative (aerobic)    | Fat + glycogen     | >2 min          | Base of all endurance training; drives CTL |

**Practical implication for SHARPIT:** long aerobic sessions (Z1/Z2) build CTL with low ATL accumulation per unit time. Short high-intensity sessions spike ATL disproportionately relative to TSS because HR-based TSS systematically underestimates glycolytic stress.

### The Lactate Threshold

Two thresholds separate physiological intensity zones:

**LT1 (First Lactate Threshold):** the intensity at which blood lactate begins to rise above baseline (~2 mmol/L). Training below LT1 is purely aerobic. This is the Z1/Z2 boundary. Training here maximizes fat oxidation and mitochondrial density.

**LT2 (Second Lactate Threshold / MLSS):** the maximal intensity at which lactate production equals clearance. Corresponds to approximately FTP in cycling, LTHR in running. One hour at exactly LT2 = 100 TSS by definition.

SHARPIT uses:

- `FTP` → cycling LT2 proxy
- `LTHR` (Lactate Threshold Heart Rate) → running LT2 proxy
- No explicit LT1 tracking — Z2 ceiling is operationally defined as ~75% LTHR or 75% FTP

---

## VO2max

VO2max is the maximum rate of oxygen consumption during exhaustive exercise. It is the ceiling of aerobic performance.

**Why SHARPIT doesn't directly track VO2max:**

- Direct measurement requires lab gas analysis
- Garmin estimates VO2max from speed/HR ratio — accuracy ±10-15% (Garmin documentation; no peer-reviewed validation)
- VO2max changes slowly (weeks-months); daily variation is noise
- CTL is a better proxy for trained endurance athletes because it reflects actual training capacity

**Where VO2max appears in SHARPIT:** indirectly, through FTP. FTP ≈ 75% VO2max power for well-trained cyclists (Coggan 2006). Athletes with higher VO2max can sustain higher FTP relative to body weight.

---

## Cardiac Adaptations to Endurance Training

These adaptations explain why trained athletes have different HRV and RHR baselines than recreational athletes.

| Adaptation                      | Trained state                  | Implication for SHARPIT                      |
| ------------------------------- | ------------------------------ | -------------------------------------------- |
| Increased stroke volume         | Higher SV at rest              | Lower RHR (bradycardia)                      |
| Cardiac hypertrophy (eccentric) | Larger LV volume               | Higher HRV baseline                          |
| Vagal dominance                 | Increased parasympathetic tone | HRV values non-comparable to untrained norms |
| Reduced blood viscosity         | Better O2 delivery             | Better aerobic capacity                      |

**Practical implication:** HRV interpretation must use individual baseline, not population norms. A well-trained athlete with resting HRV of 25 ms may have excellent recovery — that is their normal. See `recovery.md`.

---

## Muscle Fiber Types

| Fiber type                 | Characteristics                            | Training relevance                         |
| -------------------------- | ------------------------------------------ | ------------------------------------------ |
| Type I (slow-twitch)       | High oxidative capacity, fatigue-resistant | Aerobic base; CTL accumulation             |
| Type IIa (fast oxidative)  | High force and endurance; trainable        | Threshold and VO2max work                  |
| Type IIx (fast glycolytic) | Maximum force, rapid fatigue               | Sprints; negligible endurance contribution |

Endurance training shifts Type IIx toward Type IIa expression. This transition takes weeks-months and is irreversible in the short term. It explains why sudden detraining (injury, illness) produces rapid performance loss beyond what CTL decay alone would predict.

---

## Hormonal Responses to Training

These mechanisms explain why sleep and overtraining signals matter.

### Anabolic Hormones

**Testosterone:** peaks 15-30 min post-exercise. Signals muscle protein synthesis. Chronically suppressed in overtraining syndrome. Monitoring testosterone requires lab testing — SHARPIT cannot track this directly.

**Growth Hormone (GH):** secreted almost exclusively during deep sleep (N3/SWS). This is the primary physiological link between sleep quality and recovery. An athlete who skimps on deep sleep is suppressing their primary anabolic signal. See `sleep.md`.

**IGF-1 (Insulin-like Growth Factor 1):** mediates GH action in muscle. Stimulated by resistance training. Relevant for hybrid athletes — strength training increases IGF-1 beyond what endurance training alone produces.

### Catabolic Hormones

**Cortisol:** rises with training stress, psychological stress, and poor sleep. Catabolic — suppresses muscle protein synthesis and immune function. Chronically elevated cortisol is a marker of overtraining. SHARPIT indirectly tracks cortisol load through training load metrics and recovery signals.

**The testosterone:cortisol ratio** is used in sports science as an overtraining marker. SHARPIT cannot measure this directly but elevated ACWR + low readiness + sleep debt is a proxy pattern that may reflect an unfavorable ratio.

---

## Supercompensation

The theoretical model underlying periodization:

```
Training stress → Fatigue → Recovery → Supercompensation → Return to baseline (if no stimulus)
```

**SHARPIT's PMC model is a mathematical implementation of this principle:**

- ATL = acute fatigue accumulation
- CTL rise = supercompensation integrated over time
- TSB = net supercompensation state

**Key timing for SHARPIT:**

- Full recovery from a hard session: 24-72 hours depending on intensity and volume
- Supercompensation peak: 3-7 days after a training stimulus
- Detraining begins: 7-14 days without stimulus

This timing justifies the ATL τ=7 days constant — it represents the typical decay of acute fatigue.

---

## Overtraining Syndrome (OTS)

Overtraining syndrome is distinct from normal fatigue. It is a clinical condition characterized by performance decrement not reversed by short-term rest.

**OTS diagnostic criteria (Meeusen et al. 2013 — ECSS/ACSM joint consensus):**

- Performance decline persisting >2 weeks despite rest
- No organic disease explaining the decline
- Associated symptoms: mood disturbance, sleep disruption, decreased motivation, hormonal changes

**SHARPIT's position:**
SHARPIT cannot diagnose OTS. Its role is early warning. When SHARPIT fires sustained ACWR alerts + low readiness + poor sleep, it is flagging a trajectory toward OTS, not the syndrome itself. The correct response is 3-5 days of reduced load and monitoring — not diagnosis.

The line between overreaching (2-week recovery) and overtraining (>4-week recovery) is important clinically. SHARPIT treats both the same: mandatory load reduction.

---

## Detraining

Detraining is the partial or complete reversal of training adaptations.

| Adaptation                   | Rate of loss without training |
| ---------------------------- | ----------------------------- |
| VO2max                       | 4-14% in first 4 weeks        |
| Muscle oxidative enzymes     | Rapid: 50% in 3 weeks         |
| Lactate threshold (absolute) | Follows VO2max decay          |
| Muscle glycogen stores       | Weeks                         |
| Capillary density            | Months                        |
| Cardiac mass                 | Months                        |

**Implication for PMC:** CTL decay at τ=42 underestimates actual fitness loss in the first 1-2 weeks of complete detraining. The model assumes continuous partial training input. A complete stop (illness, injury) produces faster performance loss than PMC predicts.

SHARPIT does not currently model detraining differently from normal ATL decay. When an athlete is forced to stop completely, their actual fitness will fall faster than CTL suggests.

---

## Thermoregulation

Core temperature management is a significant performance limiter in endurance events.

**Relevant to SHARPIT for:**

- Sleep quality: core temperature must drop ~1-1.5°C to initiate sleep. High room temperature, hot baths before bed, and evening intense exercise all delay this drop. See `sleep.md`.
- Training in heat: increases cardiovascular strain relative to pace/power. HR-based TSS will overestimate aerobic load; power-based TSS remains accurate.

SHARPIT currently has no heat adjustment for load calculation. This is a known limitation.

---

## Individual Physiological Variation

A recurring theme in SHARPIT's design: population averages often don't apply to specific athletes.

| Parameter               | Population average | Individual variation                       |
| ----------------------- | ------------------ | ------------------------------------------ |
| Deep sleep %            | 13-23%             | Older athletes: often <13%                 |
| REM %                   | 20-25%             | Heavy training: REM suppression            |
| HRV (resting)           | Wide range         | Training age, age, genetics                |
| FTP as % VO2max power   | ~75%               | 65-85% depending on fast-twitch proportion |
| CTL at peak performance | 100-150 for elite  | 50-70 for recreational                     |

**SHARPIT's approach:** use population averages as defaults. Flag deviations. Never declare an athlete "abnormal" — flag the deviation for attention.
