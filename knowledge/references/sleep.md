# References: Sleep

Papers and sources that underpin SHARPIT's sleep analysis model.

---

## Walker, M. (2017)

**Full citation:** Walker, M. (2017). _Why We Sleep: Unlocking the Power of Sleep and Dreams._ New York: Scribner.  
**Evidence level:** Level 5 (synthesis of existing research; popular science book with extensive citations)  
**Note:** Walker is a sleep scientist (UC Berkeley). Some specific claims in the book have been disputed; the sleep architecture targets cited here represent mainstream consensus.

### What It Established (relevant to SHARPIT)

- Deep sleep (N3/SWS): 13-23% of total sleep as normal range
- REM sleep: 20-25% of total sleep as normal range
- REM is concentrated in the final third of the night — cutting sleep short disproportionately reduces REM
- 8 hours as the performance optimization target for adults
- Sleep regularity (consistent bedtime) as a circadian anchor

### SHARPIT Application

**Used in:** `sleep.ts` — deep sleep and REM targets, stage tone thresholds  
**Justifies:** `DEEP_GOOD = 0.13`, `REM_GOOD = 0.20` thresholds  
**Limitations for SHARPIT:** population averages; individual variation is substantial. Walker's specific percentages as targets (not floors) represent ideal rather than required.

---

## AASM Position Statement (2015)

**Full citation:** Watson, N.F., et al. (2015). "Recommended amount of sleep for a healthy adult: a joint consensus statement of the American Academy of Sleep Medicine and Sleep Research Society." _Journal of Clinical Sleep Medicine_, 11(6), 591-592.  
**Evidence level:** Level 1-2 (consensus statement based on systematic review)  
**Population:** healthy adults (general)

### What It Found

- Minimum recommended sleep for health maintenance: 7 hours/night
- Adults routinely sleeping <7 hours are at increased risk of health problems

### SHARPIT Application

**Used in:** `sleep.ts` — 480-minute target (8 hours)  
**Justifies:** 8 hours as performance optimization target (above 7-hour health minimum)  
**Note:** 8 hours is SHARPIT's default; 7 hours is the health floor. Athletes may need more.

---

## Mah, C.D. et al. (2011)

**Full citation:** Mah, C.D., Mah, K.E., Kezirian, E.J., & Dement, W.C. (2011). "The effects of sleep extension on the athletic performance of collegiate basketball players." _Sleep_, 34(7), 943-950.  
**Evidence level:** Level 2 (experimental, but small sample, specific population)  
**Population:** collegiate basketball players (N=11)

### What It Found

- Sleep extension to ≥10 hours/night for 5-7 weeks improved sprint times, shooting accuracy, and reaction time
- Players reported improved overall ratings of physical and mental well-being
- "Optimal" sleep (not just adequate) produces measurable performance benefits

### SHARPIT Application

**Used in:** `sleep.ts` — justification for 8-hour target over 7-hour minimum  
**Justifies:** aiming for performance optimization (8h) rather than health maintenance (7h)  
**Limitations:** basketball players; small sample; extension protocol (10h) isn't necessarily the target, just that more sleep helped

---

## Van Dongen, H.P.A. et al. (2003)

**Full citation:** Van Dongen, H.P.A., Maislin, G., Mullington, J.M., & Dinges, D.F. (2003). "The cumulative cost of additional wakefulness: dose-response effects on neurobehavioral functions and sleep physiology from chronic sleep restriction and total sleep deprivation." _Sleep_, 26(2), 117-126.  
**Evidence level:** Level 2 (RCT)  
**Population:** healthy adults (N=48)

### What It Found

- Chronic sleep restriction to 6 hours/night for 2 weeks produced cognitive impairment equivalent to 48 hours of total sleep deprivation
- Subjects were unaware of their level of impairment (performance tracking poor)
- 6.5 hours corresponded to the threshold below which measurable cognitive decrement begins

### SHARPIT Application

**Used in:** `sleep.ts` — 390-minute (6.5h) warning threshold  
**Justifies:** the warning threshold represents the population level at which measurable performance impairment begins  
**Limitations:** cognitive performance, not athletic performance. Endurance performance may be more or less sensitive at this threshold.

---

## Ohayon, M.M. et al. (2004)

**Full citation:** Ohayon, M.M., Carskadon, M.A., Guilleminault, C., & Vitiello, M.V. (2004). "Meta-analysis of quantitative sleep parameters from childhood to old age in healthy individuals: developing normative sleep values across the human lifespan." _Sleep_, 27(7), 1255-1273.  
**Evidence level:** Level 1 (meta-analysis)  
**Population:** healthy individuals across age groups

### What It Found

- Normal sleep onset latency: approximately 16-20 minutes for healthy adults
- Sleep onset latency increases with age
- Sleep efficiency (time asleep / time in bed) decreases with age

### SHARPIT Application

**Used in:** `sleep.ts` — bedtime recommendation formula (20-minute sleep onset buffer)  
**Justifies:** `recommendedBedtime = medianWakeTime - targetDuration - 20 minutes`

---

## Milewski, M.D. et al. (2014)

**Full citation:** Milewski, M.D., Skaggs, D.L., Bishop, G.A., Pace, J.L., Ibrahim, D.A., Wren, T.A.L., & Barzdukas, A. (2014). "Chronic lack of sleep is associated with increased sports injuries in adolescent athletes." _Journal of Pediatric Orthopaedics_, 34(2), 129-133.  
**Evidence level:** Level 3 (retrospective cohort)  
**Population:** adolescent athletes (N=112)

### What It Found

- Athletes sleeping <8 hours/night had 1.7× higher injury rate
- Sleep was the strongest predictor of injury, stronger than hours of sports participation

### SHARPIT Application

**Used in:** `injury-prevention.md` — sleep and injury risk connection  
**Justifies:** sleep debt as an injury risk modifier alongside ACWR  
**Limitations:** adolescent population; mechanisms may differ in adults. Retrospective design.
