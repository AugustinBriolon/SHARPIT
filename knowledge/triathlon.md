# Triathlon

> How SHARPIT handles multi-sport athletes, where the single-PMC model works, and where it fails.

---

## The Multi-Sport Problem

Triathlon is the use case that most severely stresses SHARPIT's load model. A triathlete trains in three sports with fundamentally different injury profiles, different muscle recruitment patterns, and different energy system demands. SHARPIT's PMC combines all three into one CTL/ATL/TSB — a compression that produces useful directional information but obscures sport-specific stress.

**The core problem:**

- A triathlete with CTL=100 from 70% swim / 20% bike / 10% run has radically different capacity than one with CTL=100 from 10% swim / 80% bike / 10% run
- TSB of +5 after a heavy run block means something different than TSB of +5 after a heavy swim block
- Injury risk is sport-specific: running produces 60-70% of triathlon injuries; swimming and cycling produce far fewer

See ADR-002 in `decisions/` for the architectural decision on single vs. multi-PMC.

---

## Triathlon Distances and Training Demands

| Distance     | Swim    | Bike   | Run     | Peak CTL | Training volume |
| ------------ | ------- | ------ | ------- | -------- | --------------- |
| Sprint       | 0.75 km | 20 km  | 5 km    | 40-60    | 6-10 h/week     |
| Olympic      | 1.5 km  | 40 km  | 10 km   | 60-80    | 8-12 h/week     |
| 70.3 (Half)  | 1.9 km  | 90 km  | 21.1 km | 80-110   | 10-15 h/week    |
| Full (140.6) | 3.8 km  | 180 km | 42.2 km | 110-150  | 15-22 h/week    |

These CTL ranges are practitioner estimates (Friel 2009, 2012). Individual variation is substantial.

**Implication for SHARPIT:** athletes training for different distances have vastly different TSS targets. The default training plan targets must be customizable per distance. A sprint triathlete peaking at CTL=50 is normal; the same athlete aiming for CTL=120 may be overreaching.

---

## Brick Sessions

A brick session combines two sports back-to-back, simulating race transitions. The canonical format is bike-to-run.

**Physiological purpose:**

- Neuromuscular adaptation: the shift from cycling (glute/quad dominant) to running (glute/hamstring dominant) causes the infamous "brick legs"
- Transition practice: T1 (swim-to-bike) and T2 (bike-to-run) take time; practicing them saves minutes in races
- Metabolic conditioning: running with pre-fatigued glycolytic systems

**SHARPIT's brick analysis:**

- Implemented in `brickAnalysis()` (query key: `brickAnalysis(groupId)`)
- Analyzes bike-to-run pairs within a defined proximity window
- Can compute normalized run pace relative to standalone pace to quantify brick-specific fatigue

**TSS calculation for brick sessions:** the bike TSS and run TSS are computed separately and summed. This is correct — they represent separate physiological stressors.

---

## Sport-Specific Injury Risk

| Sport    | Primary injuries                                             | Mechanism                               |
| -------- | ------------------------------------------------------------ | --------------------------------------- |
| Running  | Stress fractures, IT band, plantar fasciitis, patellofemoral | Repetitive high-impact loading; overuse |
| Cycling  | Knee pain (patellofemoral, IT band), low back, saddle sores  | Repetitive non-impact loading; bike fit |
| Swimming | Shoulder impingement, rotator cuff, neck                     | Overhead loading; volume accumulation   |

**Why this matters for SHARPIT:** ACWR for a triathlete should ideally be computed per sport, not globally. A triathlete who doubles their run volume while maintaining swim/bike volume has a run-specific ACWR spike that the global ACWR underestimates.

This is the most significant limitation of the current model for triathletes. Running injury risk is substantially underrepresented in the global ACWR calculation for athletes who train more heavily in other sports.

---

## Swim Training and TSS

Swimming is the most problematic sport for TSS estimation in SHARPIT.

**Why swimming TSS is especially unreliable:**

1. Swimming power meters don't exist for most athletes
2. HR in water is suppressed by ~10-15 bpm due to the mammalian dive reflex and horizontal body position — HR-based TSS systematically underestimates swimming effort
3. Water temperature, pool vs. open water, and drafting dramatically affect HR
4. SHARPIT's swim LOAD_FACTOR (1.1 TSS/min) is a rough estimate with no robust empirical basis

**Practical implication:** a triathlete's CTL built on swim volume will be particularly inaccurate. This is accepted as a known limitation. The ATL spike from a hard swim session will be underrepresented.

---

## Transition Training

Transition (T1, T2) is often neglected in training plans. It has measurable time cost: 1-3 minutes at sprint/Olympic distances, 3-8 minutes at 70.3/140.6. For competitive age-groupers, transition time can determine podium placement.

**SHARPIT's current capability:** SHARPIT has no transition-specific analysis. T1/T2 practice sessions, if logged, appear as short-duration activities with minimal TSS.

**Future opportunity:** if the user logs brick sessions with transition segments, SHARPIT could track T1/T2 times over a season and identify improvement or regression.

---

## Race Planning for Triathlon

SHARPIT's training plan generator applies the standard periodization model (BASE/BUILD/PEAK/TAPER/RACE phases). For triathletes, specific considerations:

**Taper length by distance:**

- Sprint: 7-10 days
- Olympic: 10-14 days
- 70.3: 14-21 days
- Full: 21-28 days

SHARPIT's default TAPER phase factor is 0.55. This is appropriate for Olympic distance. For a full Ironman, 28 days at 55% load requires careful phasing — a blanket factor is insufficient. The taper should be progressive: higher load in week 4 pre-race, lower in week 3, very low in race week.

**Multi-sport taper hierarchy:**

1. Cut run volume first (highest injury risk, slowest recovery)
2. Reduce bike volume next
3. Maintain swim frequency (preserves feel for water with minimal fatigue)

This hierarchy is not currently implemented in SHARPIT's taper logic.

---

## Pacing Models for Triathlon

SHARPIT's race time predictor uses the Riegel model for run component prediction. Cycling pacing uses FTP-derived IF targets.

**For triathlon racing, the correct framing is effort distribution, not maximal pace:**

- Swim: 75-80% FTP heart rate (sustainable, non-glycolytic start)
- Bike: 70-75% of FTP for Olympic; 65-70% for 70.3/Full (to preserve run legs)
- Run: RPE-based — "comfortable fast" early, increasing effort

The optimal bike IF for 70.3 is approximately 0.78-0.82 (Allen & Coggan 2010). For Full: 0.68-0.72. These targets are for well-trained athletes; beginners should target the lower end.

**SHARPIT currently does not provide sport-specific pacing targets for triathlon race day.** This is a gap.

---

## Known Gaps for Triathlon Athletes

| Gap                                    | Priority | Notes                                                 |
| -------------------------------------- | -------- | ----------------------------------------------------- |
| Sport-segregated ACWR                  | High     | Critical for injury risk accuracy                     |
| Sport-segregated PMC                   | High     | Significant for Full distance athletes                |
| Swim TSS accuracy                      | High     | Cannot be fixed without better data sources           |
| Taper length customization by distance | Medium   | Default 0.55 works for Olympic; insufficient for Full |
| Multi-sport taper hierarchy            | Medium   | Run before bike before swim                           |
| T1/T2 tracking                         | Low      | Nice-to-have, low performance impact                  |
| Sport-specific pacing targets          | Medium   | Race day guidance                                     |
