# Injury Prevention

> How SHARPIT identifies injury risk, what signals it uses, where the evidence is strong, and where it is weak.

---

## SHARPIT's Role in Injury Prevention

SHARPIT does not prevent injuries. It identifies patterns associated with elevated injury risk and generates alerts so the athlete can make an informed decision.

This distinction matters:

- SHARPIT cannot know whether an athlete has poor running mechanics
- SHARPIT cannot see tissue tolerance or structural vulnerability
- SHARPIT can see training load trajectories and flag when they enter high-risk zones

**The ethical constraint:** SHARPIT must not produce false confidence. An athlete in the "optimal" ACWR zone can still get injured. An athlete in the "danger" zone often doesn't. The signals are population-level risks, not individual predictions.

---

## Primary Injury Risk Signal: ACWR

See `training-load.md` for full ACWR documentation.

**Summary for injury prevention context:**

The Acute:Chronic Workload Ratio is the most validated load-based injury risk proxy available to SHARPIT. Its original development (Gabbett 2016, Carey et al. 2017) was specifically motivated by injury prevention in team sports.

**ACWR thresholds and injury risk:**

- 0.8–1.3: low risk ("sweet spot")
- 1.3–1.5: elevated risk
- > 1.5: high risk (×2-4 injury incidence in source studies)
- <0.8: under-training (deconditioning risk, not overuse)

**Critical caveat for endurance athletes:** ACWR's predictive validity for endurance sport injuries is extrapolated from team sport data. Endurance sport injuries are predominantly overuse (repetitive stress), whereas team sport injuries include more acute (collision, cut) events. The threshold values may not transfer directly.

**SHARPIT's conservative approach:** apply the thresholds from the validated literature. When ACWR fires, communicate elevated risk, not certainty. The alert should motivate load management, not panic.

---

## Deload as Injury Prevention

One of the most evidence-supported injury prevention strategies is planned recovery weeks. SHARPIT's periodization model includes deloads.

**Evidence:** Friel (2009), Seiler (multiple publications) — consistent recommendation: every 3-4 weeks of progressive loading, reduce load by 30-50% for 5-7 days.

**SHARPIT's implementation:**

- Default deload trigger: every 4th week OR when TSB drops below -30
- Default deload load: 72% of target week load

**Known scientific debt:** these specific values (4 weeks, 72%) are not cited to a peer-reviewed source. They are practitioner consensus (Friel 2009). The actual optimal deload frequency and depth varies by athlete age, training history, and accumulated load. See `scientific-methodology.md`.

**The deload-ACWR artifact:** after a deload week, the chronic load average drops. The following week's training (even if returning to normal) will generate an elevated ACWR. This is a systematic false positive. SHARPIT should flag this known pattern in the alert message when it follows a deload period.

---

## Sleep and Injury Risk

Sleep deprivation independently increases injury risk.

**Evidence:** Milewski et al. (2014) — adolescent athletes sleeping <8 hours had 1.7× higher injury rate. Fullagar et al. (2015) — sleep deprivation reduces reaction time, balance, and tissue repair capacity.

**Mechanisms:**

- Reduced tissue repair (impaired GH secretion without deep sleep)
- Impaired proprioception and coordination (injury biomechanics)
- Elevated cortisol (catabolic effect on connective tissue)

**SHARPIT's implementation:** when both sleep debt and high ACWR are present simultaneously, injury risk should be considered additive. SHARPIT does not currently compute a combined risk score, but the AI coach should flag both signals together.

---

## Overuse Injuries: Common Patterns

Understanding overuse injury mechanisms allows SHARPIT to provide better contextual alerts.

### Running-Specific Overuse Injuries

| Injury                 | Primary risk factor                         | SHARPIT-visible signal     |
| ---------------------- | ------------------------------------------- | -------------------------- |
| Tibial stress fracture | Run volume spike, low bone density          | ACWR elevation, load spike |
| IT Band Syndrome       | Sudden mileage increase, weak hip abductors | ACWR elevation             |
| Plantar fasciitis      | High weekly mileage, calf tightness         | Cumulative load            |
| Patellofemoral pain    | Rapid load increase, strength deficit       | ACWR elevation             |
| Achilles tendinopathy  | Speed work increase, tight calves           | Load type shift            |

**Common thread:** most running overuse injuries are precipitated by rapid load increases — exactly what ACWR detects.

### Cycling-Specific Overuse Injuries

Cycling injuries are less frequently from training load spikes and more frequently from bike fit issues, which SHARPIT cannot observe. When a cyclist reports cycling-related injury without an ACWR signal, bike fit should be the first hypothesis.

### Swimming-Specific

Shoulder impingement is the dominant swimming injury. Risk factors: high yardage, poor technique, external rotation weakness. SHARPIT cannot observe any of these directly.

---

## Injury Logging and Severity

SHARPIT allows athletes to log physical notes/injuries. The severity scale is used to gate training recommendations:

**Severity thresholds (from `recovery.md`):**

- Severity ≥6 → training verdict overrides all other signals: mandatory rest
- This threshold is applied in `buildTrainingVerdict()` before any other consideration

**Rationale for severity ≥6 threshold:** a pain level of 6/10 or higher during training indicates tissue damage that will worsen with continued load. Training through >5/10 pain is contraindicated in sports medicine practice. The threshold was set empirically; no specific peer-reviewed source.

**What SHARPIT cannot assess from injury logs:**

- Type of injury (structural vs. soft tissue vs. nerve)
- Whether rest or movement is indicated
- Treatment protocol

**SHARPIT's conservative stance:** when severity is high, recommend professional evaluation. Never generate a "train through it" recommendation for high-severity injuries.

---

## Monitoring Injury Recovery

When an athlete is returning from injury, standard ACWR and TSB analysis is misleading:

**Cold start problem during return-to-sport:**

- Chronic load (the denominator in ACWR) was low during injury
- Any meaningful return-to-training load will generate an elevated ACWR
- The "elevated ACWR" is partly real risk (deconditioned tissue) and partly artifact (low baseline)

**SHARPIT's partial handling:** the system will fire ACWR alerts during return-to-sport. These alerts are physiologically appropriate — deconditioned athletes are at elevated injury risk with sudden load increases. However, the threshold that would normally be acceptable during a normal training block (ACWR 1.5) may be too permissive for post-injury return.

**Recommendation to AI coach:** when injury history is present, apply more conservative ACWR interpretation during the first 4-6 weeks of return. ACWR >1.2 during return-to-sport should generate an alert.

---

## Running Economy as Injury Prevention Metric

Running economy (oxygen cost at a given pace) deteriorates with fatigue and improves with training. Poor running economy = degraded biomechanics = increased injury risk per kilometer.

**SHARPIT's indirect economy tracking:** pace-to-HR ratio (or pace-to-power ratio for athletes with running power meters) at a given effort level can proxy for running economy. Consistent deterioration in this ratio indicates fatigue, detraining, or both.

This analysis is not currently implemented in SHARPIT but is possible from the data SHARPIT already collects.

---

## Known Gaps in Injury Prevention Model

| Gap                                                      | Impact | Notes                                                   |
| -------------------------------------------------------- | ------ | ------------------------------------------------------- |
| ACWR validated in team sports, extrapolated to endurance | High   | Flag limitation in alerts                               |
| No biomechanical analysis                                | High   | Cannot predict injury from movement patterns            |
| No sport-specific ACWR                                   | High   | Running injury risk underestimated for triathletes      |
| Deload-ACWR false positive not handled                   | Medium | Alert should note "following deload, spike is expected" |
| No combined risk scoring (load + sleep)                  | Medium | Future improvement                                      |
| Return-to-sport protocol not ACWR-adjusted               | Medium | Applies normal thresholds to deconditioned state        |
| Injury type and treatment: zero capability               | High   | Professional referral must be default                   |
