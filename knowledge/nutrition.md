# Nutrition

> What SHARPIT knows and doesn't know about nutrition. Where nutrition fits in the performance model, and why SHARPIT's current nutrition coverage is limited by design.

---

## SHARPIT's Current Nutrition Coverage

SHARPIT does not track nutrition. This is an explicit product decision, not an oversight.

**Why no nutrition tracking:**

1. Accurate nutrition tracking requires food logging, which is a dedicated product domain (MyFitnessPal, Cronometer) with massive UX investment
2. Athlete compliance with food logging is poor — data that exists for <50% of days degrades recovery analysis more than it helps
3. Nutrition data without lab validation (body composition trends, performance markers) has low signal
4. SHARPIT's founding constraint: depth in fewer domains beats breadth in many

**What SHARPIT can infer indirectly:**

- **Poor glycogen repletion** → TSB and recovery metrics will show slower-than-expected recovery
- **Dehydration** → elevated resting HR, HRV suppression (both tracked)
- **Poor overnight nutrition timing** → Garmin sleep score and stress during sleep

SHARPIT flags these patterns without knowing their cause. The AI coach can suggest nutrition as a potential contributing factor when recovery signals are chronically low and training is not excessive.

---

## The Nutrition-Performance Link

### Why Nutrition Matters to Training Load

Training load (TSS, CTL, ATL) measures exercise stress, not the body's ability to adapt to it. Adaptation requires:

1. **Protein:** muscle protein synthesis requires adequate leucine (~2.5g/meal) and total daily protein (~1.6-2.2 g/kg — Phillips & Van Loon 2011)
2. **Carbohydrates:** glycogen is the primary fuel for sessions >90 min. Glycogen depletion limits both endurance and subsequent recovery
3. **Fats:** required for fat-soluble vitamins (D, K2, A, E) essential for bone health and hormone production

**The relevant implication for SHARPIT:** when an athlete's recovery metrics are poor despite reasonable training load, and sleep is adequate, insufficient nutrition is a probable contributing factor. The AI coach should raise this hypothesis.

### Peri-Exercise Nutrition

**Pre-exercise (2-4h before):**

- Primary goal: top up muscle glycogen
- ~1-2 g/kg carbohydrate for sessions >90 min
- Not relevant to SHARPIT's current data model

**During exercise:**

- Required for sessions >90 min: 30-90g carbohydrate/hour
- SHARPIT does not track this but can flag sessions where bonking is probable (long duration, high TSS, late in a training block)

**Post-exercise (within 30-60 min):**

- 20-40g protein + 1.0-1.5 g/kg carbohydrate
- This is the "anabolic window" — real but narrower than popularized
- SHARPIT does not track this

### Fueling and the PMC Model

The PMC model assumes training adaptations occur. Severe underfueling (Relative Energy Deficiency in Sport — RED-S) prevents adaptation — CTL increases on paper while actual fitness stagnates or declines. This creates a discrepancy between PMC-predicted fitness and actual performance.

**RED-S indicators SHARPIT can indirectly detect:**

- CTL increasing but performance metrics not improving
- Chronically poor recovery despite moderate load
- Weight loss during a build phase (body composition tracking)
- Increased injury frequency

---

## Carbohydrate Periodization

Carbohydrate periodization is the practice of deliberately reducing carbohydrate availability on certain training days to enhance metabolic adaptations.

**The theory:** training with low glycogen availability (train low) upregulates fat oxidation enzymes. Racing with high glycogen (race high) uses the full metabolic capacity.

**Evidence level:** Level 2-3. Improved in lab studies; practical implementation is complex. Hawley & Burke (2010), Bartlett et al. (2015).

**SHARPIT's position:** carbohydrate periodization is an advanced strategy for well-trained athletes with specific performance goals. SHARPIT does not recommend it as a default. If a user specifically asks, the AI coach can discuss it as a practice-informed strategy.

**Risk:** athletes who accidentally train low (poor planning, life constraints) are not periodizing — they are underfueling. SHARPIT should distinguish intentional strategy from accidental deficiency.

---

## Hydration

Dehydration of ≥2% body weight impairs aerobic performance measurably (Sawka et al. 2007 — ACSM position stand).

**Physiological mechanisms:**

- Blood volume decreases → cardiac output decreases
- Core temperature rises faster
- RPE increases at the same intensity
- HR increases at the same intensity (the primary signal SHARPIT can detect)

**SHARPIT's indirectly observable hydration signals:**

- Elevated RHR during what should be easy training
- HR-based TSS systematically overestimates load (cardiac drift from dehydration elevates HR)
- Garmin body battery depletes faster than expected

SHARPIT cannot distinguish dehydration from overtraining based on HR elevation alone. When the AI coach observes elevated HR without corresponding training load increases, dehydration is one of several factors to flag.

---

## Supplements: SHARPIT's Position

SHARPIT does not track supplements. The AI coach can discuss evidence-based supplements when asked, constrained by the evidence hierarchy in `scientific-methodology.md`.

**Evidence-based supplements for endurance athletes (Level 1-2 evidence):**

| Supplement         | Evidence  | Use case                                                                                        |
| ------------------ | --------- | ----------------------------------------------------------------------------------------------- |
| Caffeine           | Level 1   | Performance enhancement, 3-6 mg/kg, 60 min pre-race                                             |
| Nitrate (beetroot) | Level 1   | Endurance performance, ~500mg nitrate, 2-3h pre                                                 |
| Creatine           | Level 1-2 | Strength athletes; limited benefit for pure endurance                                           |
| Vitamin D          | Level 2   | Deficiency is common (>50% athletes at latitude >35°N); supplementation required when deficient |
| Beta-alanine       | Level 2   | High-intensity events 1-10 min; limited relevance for most endurance athletes                   |

**Position on other supplements:** SHARPIT does not endorse supplements beyond this list without Level 1-2 evidence. Many popular sports supplements (BCAA, glutamine, HMB) have evidence that does not exceed Level 3-4 in trained athletes.

---

## Body Composition

SHARPIT tracks body composition data from Garmin scales (Renpho integration added as of de61827). Body composition affects performance in multiple ways:

- **Weight:** critical for climbing performance (W/kg) and running economy
- **Muscle mass:** determines peak power output and strength
- **Body fat %:** high body fat is a performance limiter in weight-sensitive sports; very low body fat is associated with RED-S risk
- **Lean mass tracking during training blocks:** loss of lean mass during a build phase suggests insufficient protein or total calories

**Body composition targets:** SHARPIT does not prescribe body composition targets. Body composition goals must come from the athlete. SHARPIT tracks trends and flags concerning patterns (rapid weight loss, lean mass loss).

**Risk of body composition pressure:** SHARPIT must never generate recommendations that pressure athletes toward lower body weight. This is an ethical constraint. See `product-constitution.md`.

---

## Limitations

1. **No nutritional data:** all nutritional recommendations are hypothesis-level, not data-driven.
2. **No food logging integration:** this would require significant product investment.
3. **Indirect inference only:** nutrition signals are confounded by sleep, stress, overtraining, and illness.
4. **Lab values unavailable:** ferritin, transferrin, B12, Vitamin D, testosterone, cortisol — all relevant, none available.
