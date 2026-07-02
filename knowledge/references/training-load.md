# References: Training Load

Papers and sources that underpin SHARPIT's training load models.

---

## Coggan, A.R. (2003)

**Full citation:** Coggan, A.R. (2003). "Training and racing using a power meter: an introduction." TrainingPeaks technical documentation and coaching articles.  
**Evidence level:** Level 5 (practitioner consensus, not peer-reviewed journal article)  
**Population:** trained cyclists (various levels)

### What It Established

- CTL (τ=42), ATL (τ=7) as practical time constants for the PMC model
- TSB = CTL - ATL as the "form" metric
- 1-hour at FTP = 100 TSS as the reference normalization

### SHARPIT Application

**Used in:** `analytics.ts` — `CTL_DAYS`, `ATL_DAYS`, `computePmcSeries()`  
**Justifies:** τ_ctl=42 and τ_atl=7 as default time constants  
**Limitations:** population-derived constants; individual variation documented in `future-research.md#sd-003`

---

## Coggan, A.R. & Allen, H. (2006)

**Full citation:** Allen, H., & Coggan, A.R. (2006). _Training and Racing with a Power Meter._ Boulder, CO: VeloPress.  
**Evidence level:** Level 5  
**Population:** trained cyclists

### What It Established

- Normalized Power (NP) algorithm: 30s rolling average → 4th power → mean → 4th root
- Intensity Factor (IF) = NP / FTP
- Power-based TSS formula: `(duration_sec × NP × IF) / (FTP × 3600) × 100`
- FTP estimation factors from short efforts

### SHARPIT Application

**Used in:** `activity-analysis.ts` — `computeNormalizedPower()`, `computeCyclingTss()`  
**Justifies:** power-based TSS as high-confidence cycling load measurement  
**Limitations:** NP's 4th power exponent empirically derived; physiological derivation absent

---

## Gabbett, T.J. (2016)

**Full citation:** Gabbett, T.J. (2016). "The training—injury prevention paradox: should athletes be training smarter and harder?" _British Journal of Sports Medicine_, 50(5), 273-280.  
**Evidence level:** Level 3-4 (systematic review / prospective data in team sports)  
**Population:** rugby league, AFL, cricket players

### What It Found

- ACWR 0.8-1.3 associated with lowest injury risk (the "sweet spot")
- ACWR >1.3 associated with elevated risk; >1.5 with ×2-4 risk increase
- Positive effect: athletes with high chronic load tolerate acute load spikes better
- Key insight: not just about avoiding spikes, but building chronic load first

### SHARPIT Application

**Used in:** `training-load.ts`, `alerts.ts` — ACWR thresholds  
**Justifies:** 0.8-1.3 optimal zone, 1.5 warning, 1.8 danger thresholds  
**Limitations for SHARPIT:** team sport population; endurance athlete injury mechanisms differ. See `future-research.md#sd-002`.

---

## Carey, D.L. et al. (2017)

**Full citation:** Carey, D.L., Blanch, P., Ong, K.L., Crossley, K.M., Crow, J., & Morris, M.E. (2017). "Training loads and injury risk in Australian football—differing acute: chronic workload ratios influence match injury risk." _British Journal of Sports Medicine_, 51(16), 1215-1220.  
**Evidence level:** Level 3  
**Population:** AFL players, elite

### What It Found

- ACWR >1.5 associated with ×2-4 injury incidence
- Acute load spikes most dangerous when chronic load is low
- Supports Gabbett's thresholds with prospective data

### SHARPIT Application

**Used in:** `alerts.ts` — ACWR danger threshold (≥1.8)  
**Justifies:** using ×2-4 risk language in alerts

---

## Malone, S. et al. (2017)

**Full citation:** Malone, S., Owen, A., Newton, M., Mendes, B., Collins, K., & Gabbett, T.J. (2017). "The acute: chonic workload ratio in relation to injury risk in professional soccer." _Journal of Science and Medicine in Sport_, 20(6), 561-565.  
**Evidence level:** Level 3  
**Population:** professional soccer players

### What It Found

- EWMA-based ACWR more stable than rolling average ACWR
- EWMA ACWR reduces false positives after deload weeks
- Thresholds similar to Gabbett (2016) with EWMA

### SHARPIT Application

**Used in:** `future-research.md#sd-004` — basis for EWMA ACWR improvement  
**Justifies:** replacing rolling ACWR with EWMA as a future improvement  
**Current status:** not yet implemented in SHARPIT

---

## Friel, J. (2009)

**Full citation:** Friel, J. (2009). _The Triathlete's Training Bible._ 3rd ed. Boulder, CO: VeloPress.  
**Evidence level:** Level 5 (practitioner literature)

### What It Established (relevant to SHARPIT)

- 5 bpm RHR elevation as overtraining heuristic
- hrTSS methodology (approximate)
- Periodization phase structure and load distribution
- Deload week principles

### SHARPIT Application

**Used in:** `alerts.ts` (RHR threshold), `activity-analysis.ts` (hrTSS), `periodization.ts`  
**Limitations:** practitioner consensus; specific values not peer-reviewed

---

## Riegel, P.S. (1977)

**Full citation:** Riegel, P.S. (1977). "Athletic records and human endurance." _American Scientist_, 65(3), 285-290.  
**Evidence level:** Level 5 (widely adopted model)  
**Population:** analysis of world records across running distances

### What It Found

- Race time scales as: `T2 = T1 × (D2/D1)^1.06`
- The exponent 1.06 fits performance data across distance ranges
- Exponent slightly higher for recreational athletes (1.07-1.08)

### SHARPIT Application

**Used in:** `analytics.ts` — `predictRaceTime()` with `RIEGEL_EXPONENT = 1.06`  
**Justifies:** race time prediction from known performance  
**Limitations:** assumes homogeneous pacing; terrain and course profile affect accuracy
