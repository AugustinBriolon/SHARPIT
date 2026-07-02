# References: Recovery

Papers and sources that underpin SHARPIT's recovery model.

---

## Plews, D.J. et al. (2013)

**Full citation:** Plews, D.J., Laursen, P.B., Stanley, J., Buchheit, M., & Kilding, A.E. (2013). "Training adaptation and heart rate variability in elite endurance athletes: opening the door to effective monitoring." _Sports Medicine_, 43(9), 773-781.  
**Evidence level:** Level 3 (review + prospective data in elite athletes)  
**Population:** elite endurance athletes (Ironman, rowing, cycling)

### What It Found

- HRV monitoring in trained athletes requires individual baseline tracking, not population norms
- 7-day rolling mean of HRV (RMSSD) is more meaningful than single-day readings
- Deviation from individual baseline (not absolute value) is the relevant signal
- Training readiness (enhanced vs. impaired) correlates with HRV deviation from baseline
- HRV monitoring requires ≥2 weeks of consistent measurement to establish a reliable baseline

### SHARPIT Application

**Used in:** `recovery.ts` — `buildHrvStatusView()`, `alerts.ts` HRV trend logic  
**Justifies:** trend-based HRV analysis using personal baseline deviation rather than absolute values  
**Limitations:** elite endurance athletes; recreational athletes may have different HRV patterns and training sensitivities

---

## Buchheit, M. (2014)

**Full citation:** Buchheit, M. (2014). "Monitoring training status with HR measures: do all roads lead to Rome?" _Frontiers in Physiology_, 5, 73.  
**Evidence level:** Level 3-4 (review)  
**Population:** trained athletes (various sports)

### What It Found

- HRV-based training monitoring is effective when using individual baselines
- 10-15% deviation from baseline represents a physiologically meaningful change
- Recommended: compare 3-7 day rolling mean against 7-28 day baseline
- Multiple HR-derived metrics (HRV, RHR, HRmax) should be used together

### SHARPIT Application

**Used in:** `alerts.ts` — HRV trend threshold (15% drop)  
**Justifies:** the 0.85× multiplier in the trend alert (3-day avg < 4-10 day avg × 0.85)  
**Limitations:** SHARPIT's window is narrower (3-day vs 4-10-day baseline) than Buchheit's recommendation. See `future-research.md#sd-010`.

---

## Noakes, T. (1991)

**Full citation:** Noakes, T. (1991). _Lore of Running._ 3rd ed. Cape Town: Oxford University Press Southern Africa.  
**Evidence level:** Level 5 (practitioner reference)  
**Note:** Noakes' work is Level 5 (practitioner text) but is widely cited in clinical sports medicine for the overtraining markers.

### What It Established (relevant to SHARPIT)

- 5 bpm elevation in resting HR above personal baseline as an overtraining warning signal
- Multiple consecutive days of elevated RHR as more significant than single-day elevation

### SHARPIT Application

**Used in:** `alerts.ts` — RHR trend alert (+5 bpm threshold)  
**Justifies:** 5 bpm over 14-day baseline as the alert trigger  
**Limitations:** practitioner heuristic; exact threshold has no prospective validation

---

## Meeusen, R. et al. (2013)

**Full citation:** Meeusen, R., et al. (2013). "Prevention, diagnosis, and treatment of the overtraining syndrome: joint consensus statement of the European College of Sport Science and the American College of Sports Medicine." _Medicine & Science in Sports & Exercise_, 45(1), 186-205.  
**Evidence level:** Level 1 (expert consensus statement)  
**Population:** athletes (general)

### What It Found

- Overtraining syndrome (OTS) definition and diagnostic criteria
- Distinction between functional overreaching (short-term), non-functional overreaching (weeks), and OTS (months)
- HRV, RHR, and performance monitoring as early OTS indicators
- Emphasis on multi-signal assessment (no single marker is diagnostic)

### SHARPIT Application

**Used in:** `physiology.md` and `injury-prevention.md` — OTS framing  
**Justifies:** SHARPIT's multi-signal approach to recovery assessment  
**Application note:** SHARPIT cannot diagnose OTS. It identifies patterns consistent with overreaching trajectory.

---

## Flatt, A.A. & Esco, M.R. (2016)

**Full citation:** Flatt, A.A., & Esco, M.R. (2016). "Evaluating individual training adaptation with smartphone-derived heart rate variability in a collegiate female soccer team." _Journal of Strength and Conditioning Research_, 30(2), 378-385.  
**Evidence level:** Level 3  
**Population:** female collegiate soccer players

### What It Found

- Smartphone-derived HRV (RMSSD, 1-min measurement) is reliable and correlates with athletic performance
- Individual HRV tracking identifies athletes with superior vs. impaired adaptation
- Team-level HRV patterns reflect training load periodization

### SHARPIT Application

Not directly implemented, but supports the HRV monitoring approach generally.  
**Relevance:** validates consumer wearable HRV tracking as a legitimate monitoring tool.

---

## Jarchi, D. et al. (2017)

**Full citation:** Jarchi, D., Pope, J., Lee, T.K.M., Tamjidi, L., Mirzaei, A., & Sanei, S. (2017). "A review on accelerometry-based gait analysis and emerging clinical applications." _IEEE Reviews in Biomedical Engineering_, 11, 177-194. [Selected for: wrist PPG vs ECG HRV comparison studies within this review's cited literature]  
**Evidence level:** Level 2-3

### What It Found

- Wrist-based optical PPG shows good correlation with ECG-derived HRV at rest and during sleep
- Correlation degrades during exercise
- Garmin's sleep HRV methodology (overnight measurement) represents the optimal use case for optical PPG HRV

### SHARPIT Application

**Used in:** `wearables.md` — justification for trusting Garmin's overnight HRV  
**Justifies:** medium confidence rating for Garmin HRV during sleep
