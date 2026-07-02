# Training Load

> Every load model in SHARPIT — what it measures, why it was chosen, how it is computed, and where it fails.

---

## The Load Problem

Training load is the foundational input of every SHARPIT recommendation. If load is wrong, everything downstream is wrong. Load has two inseparable problems:

**The measurement problem:** how do you measure the physiological cost of a training session as a single number? Power meters provide the most accurate input for cycling; heart rate provides a reasonable proxy for other sports; duration × intensity is a gross approximation.

**The normalization problem:** how do you compare the load of a 1-hour run to a 3-hour bike ride? SHARPIT normalizes all sports to TSS equivalents, which is a pragmatic choice that introduces known inaccuracies.

---

## Model 1: Performance Management Chart (PMC)

**Primary use:** long-term fitness tracking, form/freshness for race planning  
**Implementation:** `computePmcSeries()` in `src/lib/analytics.ts`  
**Evidence level:** Level 2-3 (validated in endurance sports)

### What it computes

Three values, each for every day in the athlete's history:

```
CTL(t) = CTL(t-1) + (TSS(t) - CTL(t-1)) / τ_ctl
ATL(t) = ATL(t-1) + (TSS(t) - ATL(t-1)) / τ_atl
TSB(t) = CTL(t) - ATL(t)
```

- **CTL** (Chronic Training Load): 42-day EWMA. "Fitness."
- **ATL** (Acute Training Load): 7-day EWMA. "Fatigue."
- **TSB** (Training Stress Balance): CTL - ATL. "Form/Freshness."

### Time constants

| Constant | Value   | Justification                         |
| -------- | ------- | ------------------------------------- |
| τ_ctl    | 42 days | Coggan (2003), TrainingPeaks standard |
| τ_atl    | 7 days  | Coggan (2003), TrainingPeaks standard |

These are population-derived constants. Individual optimization (e.g., τ_ctl = 35-56 depending on age and training age) is possible but not currently implemented. See ADR-001.

### TSB interpretation thresholds

| TSB range  | Label    | Interpretation                        |
| ---------- | -------- | ------------------------------------- |
| > +15      | Fresh    | Tapered, low fatigue. Race-ready.     |
| -10 to +5  | Optimal  | Ideal training adaptation zone        |
| -10 to -30 | Fatigued | High training block. Monitor recovery |
| < -30      | Overload | Significant overreaching risk         |

These thresholds are Coggan/TrainingPeaks practitioner consensus (Level 5). They are directionally correct but individual variation is substantial — some athletes perform best at TSB -5, others at +10.

### Why SHARPIT chose this model

The PMC is 50 years old. It is also the most extensively validated training load model in endurance sports practice. TrainingPeaks, WKO5, Intervals.icu, and virtually every professional cycling and triathlon program use it. The Level 5 evidence base is enormous. More sophisticated models (Busso's nonlinear variant, multi-component models) exist in the academic literature but lack the practical validation infrastructure.

**Rejected alternatives:**

- **Banister's original impulse-response model** (1975): PMC is a simplification of this. The original used separate fitting parameters for each athlete derived from performance tests. SHARPIT does not currently have the infrastructure to run individual parameter fitting.
- **Multi-component models** (Busso 2003): account for non-linear fitness-fatigue interactions. More accurate in theory but require parameter estimation and introduce additional uncertainty. Not warranted given current data quality.

### Known limitations

1. **Linear assumption**: the model assumes fitness accumulates linearly with load. Real adaptation is non-linear (diminishing returns, phase-specific responses).
2. **Single time constant**: τ_ctl = 42 days for all athletes. In reality, τ varies with training age, age, and sport.
3. **Day-by-day resolution**: the model treats each day independently. Weekly load distribution (same TSS spread across 7 days vs concentrated in 2) is invisible.
4. **Unit inconsistency across sports**: CTL combines cycling TSS (power-based) with running TSS (HR-based) as if they are equivalent. They are not. A CTL of 80 trained entirely on the bike does not represent the same aerobic capacity for running as a CTL of 80 trained on foot.
5. **Cold start problem**: CTL initializes at 0 for new users. A returning athlete with prior history begins with artificially low CTL, making TSB misleadingly positive and ACWR potentially misleading.

---

## Model 2: Acute:Chronic Workload Ratio (ACWR)

**Primary use:** injury risk screening  
**Implementation:** `computeTrainingLoad()` in `src/lib/training-load.ts`  
**Evidence level:** Level 1-3 (meta-analyses exist; extrapolation to endurance sports uncertain)

### What it computes

```
ACWR = Σ(load last 7 days) / (Σ(load last 42 days) / 6)
```

The denominator is the average weekly load over the preceding 6 weeks, not the total. This was a critical bug in the original implementation (dividing by 6 without a clear physiological rationale) that was identified and corrected. See SCIENCE.md for the correction history.

### Thresholds

| ACWR range | Classification               | Source                                  |
| ---------- | ---------------------------- | --------------------------------------- |
| < 0.8      | Under-training               | Gabbett (2016), Carey et al. (2017)     |
| 0.8 – 1.3  | Sweet spot (optimal)         | Gabbett (2016), multiple meta-analyses  |
| 1.3 – 1.5  | Elevated risk                | Gabbett (2016), Blanch & Gabbett (2016) |
| > 1.5      | High risk (×2–4 injury risk) | Carey et al. (2017)                     |

Alert thresholds implemented:

- ACWR ≥ 1.5: `warning` alert
- ACWR ≥ 1.8: `danger` alert

### Why SHARPIT uses this model

ACWR provides a different perspective than PMC. PMC tells you about fitness and cumulative fatigue. ACWR tells you about the rate of change of load — how much harder are you training this week compared to recent history? This is the key injury risk signal that PMC does not capture directly.

**Critical note:** ACWR was developed and validated primarily in team sports (rugby, Australian Rules Football). Its extrapolation to endurance athletes is physiologically plausible but less rigorously validated. SHARPIT uses it for screening (flag for attention), not for clinical diagnosis.

**Known limitations:**

1. **Team sport origins**: the original validation populations were rugby and football players. Endurance athletes have different injury mechanisms.
2. **Deload artifact**: after a planned deload week, ACWR will be artificially low. The following training week will produce a spike (ACWR >1.3) even if the absolute load is not unusual. This is a systematic false positive during normal periodization.
3. **Rolling average vs EWMA**: SHARPIT uses rolling averages (simpler). The EWMA variant of ACWR (Malone et al. 2017) is more stable but harder to communicate. A future improvement.
4. **Load definition**: ACWR's validity depends on having an accurate, consistent load measure. SHARPIT's cross-sport TSS estimation introduces noise.
5. **Individual baseline**: the "chronic" load window is a fixed 42 days. Athletes who have been training for only a few weeks will have artificially low chronic load, making their ACWR appear elevated.

---

## Model 3: Training Stress Score (TSS)

**Primary use:** session load quantification  
**Implementation:** `activity-analysis.ts`, `analytics.ts`  
**Evidence level:** Level 2-5 (cycling: well validated; running: less validated; strength: estimated)

### Cycling TSS (power-based) — High confidence

```
TSS = (duration_sec × NP × IF) / (FTP × 3600) × 100

where:
  NP  = Normalized Power (30s rolling average ^ 4, averaged, ^ 0.25)
  IF  = Intensity Factor = NP / FTP
  FTP = Functional Threshold Power (W)
```

One hour at exactly FTP = 100 TSS. This is the reference. Power-based TSS is the most accurate load measure SHARPIT can compute. Source: Coggan & Allen (2006).

### Running TSS (HR-based) — Medium confidence

When heart rate data is available:

```
TSS = (duration_sec / 3600) × IF² × 100
where IF = avgHR / LTHR
```

This is a simplified hrTSS. The Friel hrTSS formula is more commonly cited; SHARPIT's implementation is equivalent for steady-state efforts but diverges for variable-intensity work. Source: approximate Friel (2009) methodology.

**Known accuracy problem:** HR-based TSS systematically underestimates VO2max interval sessions (HR lag means HR is still low early in the effort) and overestimates easy long runs (cardiac drift elevates HR without proportional increase in effort). Errors of ±20-30% are typical.

### Duration × Sport Factor TSS — Low confidence

When neither power nor HR is available:

```
TSS_estimated = (duration_min × LOAD_FACTOR[sport])

LOAD_FACTOR = {
  RUN:      1.0 TSS/min
  BIKE:     0.85 TSS/min
  SWIM:     1.1 TSS/min
  STRENGTH: 0.7 TSS/min
}
```

These factors are approximations based on typical session intensities. Source: Coggan & Allen (2006) general principles; Friel (2009). Errors can exceed ±40% depending on session type. Used only as a fallback.

### The sport normalization problem

SHARPIT's PMC and ACWR mix TSS from different sports as if they are equivalent. They are not. A TSS of 100 from cycling does not produce the same musculoskeletal stress as 100 TSS from running. The cardiovascular load may be similar; the injury risk profile is entirely different.

**Current decision:** normalize to a single TSS unit for load management purposes, accepting the inaccuracy. This is pragmatic (athletes compete in one PMC, one ACWR) and consistent with TrainingPeaks and Intervals.icu practice. See ADR-002.

---

## Model 4: Normalized Power (NP)

**Primary use:** representing the physiological cost of variable-power efforts  
**Implementation:** `computeNormalizedPower()` in `activity-analysis.ts`  
**Evidence level:** Level 5 (Coggan practitioner consensus, widely adopted)

### Computation

```
1. Compute 30-second rolling average of power
2. Raise each value to the 4th power
3. Take the mean of all 4th-power values
4. Take the 4th root
```

The 4th power exponent reflects the non-linear relationship between power and metabolic stress (oxygen consumption and glycolytic activation both increase disproportionately above threshold). The 30-second window smooths GPS and power meter noise.

**Why the 4th power:** empirically derived by Coggan to produce NP values that best correlate with lactate, RPE, and perceived difficulty across different effort profiles. Not derived from first principles.

---

## Load Estimation Priority

When SHARPIT computes session load, it uses the first available method in order:

1. Explicitly recorded `Activity.load` (from Garmin or user entry)
2. Cycling: computed from `BikeMetrics.tss` (from power meter)
3. Running/cycling: computed from HR × LTHR (hrTSS)
4. Fallback: `duration_min × LOAD_FACTOR[sport]`

The method used is not currently surfaced to the athlete. Future improvement: tag each load value with its computation method and confidence level.

---

## The Load Unit Constraint

**All load values stored in `Activity.load` and `PlannedSession.load` must be TSS equivalents.**

This is an architectural constraint, not a suggestion. Violating it (e.g., storing RPE×10 as "load") breaks PMC and ACWR across the board. Any new data ingestion path (new wearable, manual entry, new sport type) must normalize to TSS before writing to the database.

---

## Future Improvements

Ranked by scientific value:

1. **Individual τ calibration**: allow per-athlete τ_ctl and τ_atl based on observed CTL recovery rate. Significant scientific improvement; requires substantial history.
2. **EWMA-based ACWR**: replace rolling average ACWR with EWMA ACWR (Malone 2017). More stable, less susceptible to deload artifacts.
3. **Sport-segregated PMC**: separate CTL/ATL tracking per sport. Prevents cross-sport TSS pollution. Critical for triathlon athletes. See `future-research.md`.
4. **Critical Power model**: replace FTP with CP/W' for cycling load computation. More physiologically accurate, but requires dedicated test protocol.
5. **VO2max normalization**: estimate VO2max-equivalent TSS to enable true cross-sport comparison.
6. **Cold-start CTL initialization**: when an athlete starts SHARPIT with prior training history, estimate initial CTL from their recent performance records rather than starting at 0.
