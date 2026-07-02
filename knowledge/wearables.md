# Wearables

> SHARPIT's relationship with consumer wearable technology: what it trusts, what it doesn't, and why.

---

## SHARPIT's Wearable Philosophy

SHARPIT is built on Garmin data. This is a deliberate technical choice, not an endorsement. Garmin devices provide the richest data accessible via consumer API, with the most consistent physiological coverage (HRV, sleep staging, training readiness, body battery). The alternative — building device-agnostic abstraction layers — dilutes SHARPIT's capability to the lowest common denominator.

**The honest position on wearable data:**

- Consumer wearables measure proxies, not ground truth
- Accuracy varies by metric, device, and wearing conditions
- The same metric from two different Garmin devices may not be identical
- Accuracy claims in marketing are not the same as peer-reviewed validation

Every wearable metric in SHARPIT carries an implicit "Garmin reports..." qualifier. See `scientific-methodology.md` for language standards.

---

## Garmin-Specific Documentation

For complete Garmin API coverage, metric definitions, and accuracy limitations, see `garmin.md`.

This document covers the general wearable science applicable to any manufacturer.

---

## Optical Heart Rate Accuracy

All consumer wearables use photoplethysmography (PPG) — green light reflected by blood pulsing through capillaries at the wrist.

**Accuracy for resting HR:** high. Error typically ±1-2 bpm. Reliable for RHR monitoring.

**Accuracy for exercise HR:**

- Steady-state, moderate intensity: good (±3-5 bpm)
- High-intensity intervals: poor (lag 15-30 seconds, undershoot at effort start, overshoot at recovery)
- Cycling: generally worse than running (wrist movement vibration interference)
- Impact sports (running on rough terrain, skiing): variable quality

**Implications for SHARPIT:**

- RHR tracking: reliable
- HR-based TSS for steady intervals: acceptable
- HR-based TSS for VO2max work: underestimates load (HR lags behind effort)
- HR-based TSS for easy long runs: can overestimate (cardiac drift without proportional effort increase)

**The fix for cycling:** power meters replace HR for TSS computation entirely. Power is instantaneous, accurate, and unaffected by environmental factors. This is why cycling TSS is high confidence in SHARPIT.

---

## Sleep Staging Accuracy

Consumer wearable sleep staging uses accelerometry (movement) + optical HR + sometimes HRV pattern recognition. This is not polysomnography (PSG — gold standard EEG-based staging).

**Validation studies (summary):**

Roomkham et al. (2018) systematic review: wearable sleep staging shows moderate accuracy overall, better for wake detection than for N3/REM discrimination. Epoch-by-epoch accuracy vs PSG: ~70-80%. Stage proportion accuracy (what % of sleep was REM): ±5-10 percentage points typically.

**What this means for SHARPIT:**

- Deep sleep % of 15% could be 10-20% in reality
- REM % of 22% could be 17-27% in reality
- The directional signal (low vs. normal deep sleep) is more reliable than the absolute value
- Trends over time are more reliable than single-night values

**SHARPIT uses these signals for alert thresholds calibrated to this uncertainty.** The deep sleep threshold of 9% (low) is set well below the validated clinical floor (13%) to account for measurement error. An alert at 9% means "significantly below what any reasonable interpretation would call normal."

---

## HRV Measurement Accuracy

HRV measured during sleep by a wrist-worn optical sensor is methodologically sound _if_ the R-R interval detection is accurate.

**Comparison to chest strap (ECG-accurate) HRV:**

- Wrist-based HRV (RMSSD specifically) shows good correlation with ECG-based HRV at rest and during sleep (Jarchi et al. 2017)
- Correlation degrades during exercise (optical HR lags)
- Garmin measures HRV during sleep specifically — this is the right methodology

**The caveat:** Garmin reports a proprietary HRV "status" (BALANCED, UNBALANCED, etc.) computed by their algorithm, not raw RMSSD values. SHARPIT consumes this classification, which means:

- The underlying computation is opaque
- Different devices may classify differently
- The algorithm improves over time (firmware updates change classifications without user notice)

**SHARPIT's HRV approach:** uses both the Garmin status classification (direct alert) and a trend analysis on the raw HRV value when available. The trend approach is more robust to Garmin algorithm changes.

---

## Body Composition from Smart Scales

SHARPIT integrates body composition from Garmin/Renpho scales (bioelectrical impedance analysis, BIA). BIA accuracy for body composition:

**BIA methodology:** sends a small electrical current through the body. Fat tissue conducts differently than muscle/water. Fat mass is estimated from resistance.

**Accuracy:** ±3-5% body fat vs DXA (gold standard dual-energy X-ray absorptiometry). Dependent on hydration state — dehydration can artificially inflate body fat reading.

**What SHARPIT can reliably track from BIA:**

- Weight trends (very reliable)
- Lean mass trends (directional, not precise)
- Body fat % trends (useful for detecting meaningful changes over weeks/months)

**What BIA cannot reliably report:**

- Accurate absolute body fat %
- Small changes (<1-2%) within days

**SHARPIT's position:** track trends, not absolute values. Alert on concerning patterns (rapid lean mass loss, significant weight fluctuation during training blocks). Do not generate weight or body fat targets.

---

## GPS Accuracy

GPS-derived metrics (pace, distance, elevation) affect SHARPIT through:

- Running TSS (pace data)
- Training zone analysis
- Race performance comparison

**GPS accuracy:**

- Distance: ±1-2% on most modern devices
- Pace: ±2-5 sec/km instantaneous; more accurate averaged over 100m+
- Elevation: barometric altimeter is accurate (±1-2m); GPS-only elevation is poor (±10-30m)
- Indoor: GPS unavailable; uses accelerometer-based cadence estimation (less accurate)

**SHARPIT implication:** lap pace and race pacing data are accurate enough for trend analysis. Instantaneous pace targets (e.g., "maintain 4:30/km") are less reliable in the moment but good for post-session analysis.

---

## Device-Specific Notes

### Garmin

Primary supported device. See `garmin.md` for comprehensive coverage.

### Polar

Not directly integrated in current SHARPIT implementation. Polar produces HRV data via their H10 chest strap that is widely used in sports science research (often cited as reference-quality wrist + chest comparison). If Polar integration is added, their RR data quality is generally excellent.

### Apple Watch

Not integrated. Apple HealthKit could serve as a data bridge. Limitations: no running power, limited training load analysis, proprietary sleep staging, no published HRV validation against PSG. Apple Watch generates large volume of health data; signal quality is variable.

### WHOOP

Not integrated. WHOOP's recovery score and strain model has been studied (Flatt & Esco 2016 on HRV methodology; validation of WHOOP-specific scoring is mixed). WHOOP does not use GPS and cannot compute TSS-equivalent metrics.

---

## The Wearable Accuracy Stack

From most to least reliable, for SHARPIT's use cases:

| Signal                           | Reliability | Why                                      |
| -------------------------------- | ----------- | ---------------------------------------- |
| Cycling power (power meter)      | Very high   | Direct mechanical measurement            |
| GPS distance/pace                | High        | Well-validated satellite positioning     |
| Resting HR (optical)             | High        | Good accuracy at rest                    |
| Step count / cadence             | High        | Simple accelerometry                     |
| Sleep duration                   | High        | Wake/sleep transitions reliably detected |
| Exercise HR (optical, steady)    | Medium      | Acceptable for steady-state              |
| HRV (during sleep)               | Medium      | Good correlation with ECG at rest        |
| Sleep stage proportions          | Medium-low  | ±5-10% vs PSG                            |
| Body composition (BIA)           | Low-medium  | ±3-5% vs DXA; hydration-sensitive        |
| Exercise HR (optical, intervals) | Low         | Significant lag                          |
| VO2max estimate                  | Low         | Proprietary; no published validation     |
| Training readiness score         | Low         | Proprietary; empirically calibrated      |

**SHARPIT's design principle:** build models on the most reliable signals. Use low-reliability signals as supplementary context, not primary inputs.
