# Strength Training

> How SHARPIT models strength training load, integrates it with endurance metrics, and why the current approach is a known compromise.

---

## SHARPIT's Core Challenge with Strength Training

Strength training does not fit naturally into the PMC model. The PMC was designed for aerobic endurance sport, where load can be normalized to a cardiovascular cost (TSS). Strength training is fundamentally different:

- **Primary stress is neuromuscular, not cardiovascular.** A heavy squat session leaves HR barely elevated but produces profound muscular fatigue lasting 48-72 hours.
- **Adaptations are different.** Endurance training builds aerobic capacity. Strength training builds force production capacity, tendon/bone density, neuromuscular efficiency.
- **TSS cannot represent it accurately.** There is no power meter for the barbell.

**SHARPIT's honest position:** strength training is included in load calculations using a duration × factor approximation. This is a pragmatic fallback that produces directionally correct outputs (heavy lifting days increase ATL) but systematically underestimates the neuromuscular stress of high-intensity strength sessions.

---

## Strength Load Estimation

**Implementation:** `LOAD_FACTOR.STRENGTH = 0.7 TSS/min` in `src/lib/analytics.ts`

This factor was estimated based on typical metabolic cost of moderate-intensity strength training relative to moderate-intensity running. It has no published source and carries low confidence (see `training-load.md`).

**Known problems:**

- A 45-minute Z2 run produces ~45 TSS; a 45-minute heavy deadlift session produces ~31.5 TSS by the formula — but the actual systemic recovery burden may be equivalent or higher
- The formula treats all strength training identically: Olympic lifts ≠ isolated machine exercises ≠ CrossFit metcons
- No RPE-based adjustment

**Future improvement:** RPE-adjusted load for strength sessions. A user-entered RPE (1-10) could be used to scale the estimated TSS: `TSS = duration_min × 0.7 × (RPE/7)`. This would make heavy sessions produce ~1.0 and light sessions produce ~0.4 TSS/min, a more realistic spread.

---

## Strength Training in Periodization

### Why Endurance Athletes Should Lift

Evidence level: Level 2-3 (Aagaard & Andersen 2010, Rønnestad & Mujika 2014, Beattie et al. 2017)

Strength training benefits for endurance athletes:

1. **Improved running economy** — better neuromuscular efficiency reduces oxygen cost at a given pace
2. **Reduced injury risk** — tendon and bone density adaptations that aerobic training does not produce
3. **Improved peak power** — benefits climbs, sprints, and race finishes
4. **Slows aging-related muscle loss** — critical for masters athletes

The evidence is particularly strong for running economy improvements from heavy strength training (>80% 1RM). Concurrent training (combining endurance + strength) is compatible with endurance adaptations when periodized correctly.

### Periodization Integration

**SHARPIT's current approach:** strength training adds to the global TSS pool. The periodization planner treats strength sessions identically to endurance sessions in terms of load budgeting.

**The correct approach (not yet implemented):** separate strength and endurance load tracking. Strength volume should be highest in the BASE phase (when overall endurance load is lower), tapered in PEAK and RACE phases (when neuromuscular freshness matters).

| Periodization phase | Strength emphasis            | Rationale                                           |
| ------------------- | ---------------------------- | --------------------------------------------------- |
| BASE                | High (2-3 sessions/week)     | Build structural capacity with lower endurance load |
| BUILD               | Moderate (1-2 sessions/week) | Maintain strength while building endurance          |
| PEAK                | Low (1 session/week)         | Maintain without accumulating fatigue               |
| TAPER               | Minimal (<1 session/week)    | Full neuromuscular freshness for race               |
| RACE                | None                         |                                                     |

This periodization logic is not yet implemented in SHARPIT's training plan generator.

---

## The Concurrent Training Problem

Concurrent training (endurance + strength in the same day or adjacent days) can produce interference effects:

**AMPK-mTOR interference:** endurance training activates AMPK (energy sensing pathway). Strength training activates mTOR (growth/hypertrophy pathway). These pathways partially antagonize each other when activated simultaneously.

**Practical implication:** endurance-dominant athletes doing strength training should:

1. Separate strength and hard endurance sessions by ≥6-8 hours, or train on separate days
2. Prioritize the primary sport in session ordering (endurance first)
3. Accept some reduction in peak hypertrophy (not the goal for endurance athletes)

**SHARPIT's recommendation:** the AI coach should flag when a user's schedule places heavy strength work within 6 hours of a hard endurance session.

---

## Strength-Specific Metrics SHARPIT Tracks

SHARPIT currently receives strength workout data from Garmin with:

- Duration
- Workout name (if logged)
- Heart rate data (limited utility)

**Not available:**

- Exercise selection
- Load (weight × reps × sets)
- RPE
- Muscle groups targeted
- Progressive overload tracking

Without these, SHARPIT cannot meaningfully analyze strength training quality or provide periodization guidance for strength. The current capability is: "you did strength training today, here is the estimated TSS contribution."

---

## Injury Prevention Role

Strength training's primary role in SHARPIT's injury prevention model is structural. See `injury-prevention.md` for the full model.

Key evidence:

- Tendon injury risk: heavy slow resistance training (HSR) is effective rehabilitation and prevention for tendinopathy (Beyer et al. 2015 — Level 2)
- Bone stress injury prevention: progressive resistance training increases bone mineral density; relevant for runners with stress fracture history
- Muscle imbalance correction: unilateral strength work addresses contralateral imbalances that biomechanical analysis identifies

**SHARPIT's current gap:** no injury prevention specific strength prescriptions. The training plan generator does not currently include targeted strength work based on injury history or biomechanical profile.

---

## Hybrid Athletes

Hybrid athletes pursue both high endurance capacity and high strength simultaneously. SHARPIT's target user population likely includes some hybrid athletes (triathletes who also lift, cyclists with gym routines).

Full hybrid athlete modeling is documented in `hybrid-athlete.md`. Key implications for strength tracking:

- Hybrid athletes need higher protein intake (1.8-2.4 g/kg vs 1.6-2.0 g/kg for pure endurance)
- Their CTL/ATL mixed with strength sessions is especially inaccurate
- Their periodization must consider both strength and endurance peaking

---

## Known Limitations Summary

| Limitation                                  | Severity | Mitigation                                       |
| ------------------------------------------- | -------- | ------------------------------------------------ |
| TSS underestimates neuromuscular stress     | High     | Flag: strength session TSS is approximate        |
| No exercise-specific data                   | High     | Cannot be resolved without custom data model     |
| No progressive overload tracking            | Medium   | Future feature: strength-specific metrics module |
| No concurrent training interference warning | Medium   | Future AI coach behavior                         |
| No strength periodization in planner        | Medium   | Future periodization enhancement                 |
| Single LOAD_FACTOR for all strength types   | Low      | Acceptable given other limitations               |
