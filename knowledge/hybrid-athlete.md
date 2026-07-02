# Hybrid Athlete

> How SHARPIT handles athletes who pursue significant strength AND endurance capacity simultaneously.

---

## Definition

A hybrid athlete, for SHARPIT's purposes, is an athlete who trains for both high endurance capacity (sustained aerobic output) and meaningful strength/power metrics. This is distinct from:

- An endurance athlete who does maintenance strength work (SHARPIT handles adequately)
- A strength athlete who does some cardio (not SHARPIT's target user)
- A CrossFit athlete (SHARPIT partially handles)
- A triathlete (see `triathlon.md`)

**Examples in SHARPIT's target user base:**

- Cyclist/runner who also trains powerlifting or weightlifting
- Runner with serious strength block programming
- Rower (requires both high aerobic capacity and peak force production)
- Obstacle course racing athletes (OCR)

---

## Why Hybrid Athletes Break Standard Models

PMC was designed for athletes with a single dominant energy system. The assumptions that break for hybrid athletes:

1. **TSS is not cross-modal.** 100 TSS from cycling and 100 TSS from deadlifts do not represent equivalent systemic stress. They stress different systems, have different recovery profiles, and produce different adaptations.

2. **CTL means different things.** A CTL of 80 from cycling means something precise about aerobic fitness. A CTL of 80 mixed with heavy strength sessions means... approximately that the athlete is training moderately. The precision is lost.

3. **Recovery windows differ.** Endurance sessions (Z1/Z2) recover in 12-24h. Hard strength sessions at >85% 1RM recover in 48-72h. Mixing them into a single ATL with τ=7 days produces a misleading picture of readiness.

4. **Concurrent training interference.** The AMPK/mTOR interference effect (see `strength-training.md`) means that hybrid athletes cannot maximize both adaptations simultaneously. SHARPIT's models do not account for this.

---

## How SHARPIT Currently Handles Hybrid Athletes

**What works:**

- Strength sessions get a TSS estimate (duration × 0.7 TSS/min) that contributes to ATL
- Total load (all sessions combined) is tracked in PMC
- Recovery signals (HRV, readiness) capture systemic fatigue regardless of source
- Sleep quality tracking is equally valuable for hybrid athletes

**What doesn't work:**

- No separate strength CTL/ATL tracking
- No injury risk differentiation by training modality
- No concurrent training interference modeling
- TSS estimates for strength sessions are low confidence (see `training-load.md`)
- Training plan generator cannot produce integrated endurance + strength periodization

---

## Periodization for Hybrid Athletes

The goal is compatible periodization: endurance and strength phases should reinforce each other or at minimum not conflict.

### Concurrent Training Research

Evidence level: Level 2-3 (Wilson et al. 2012 meta-analysis on concurrent training; Hickson 1980 original interference study)

**Key findings:**

- Concurrent training does not significantly impair endurance adaptations
- Endurance training _does_ impair hypertrophy and maximal strength gains when volumes are high
- The magnitude of interference depends on: endurance volume, session ordering, recovery between sessions
- Low-to-moderate endurance volume (≤3 sessions/week, <4h total) allows substantial strength progress

**Practical implication for SHARPIT's AI coach:** when a hybrid athlete reports strength goals, the coach should suggest keeping endurance volume moderate during dedicated strength focus periods.

### Phased Hybrid Periodization

For athletes alternating between strength and endurance focus:

```
Phase 1 (Strength emphasis):
  Strength: 3-4 sessions/week, progressive overload
  Endurance: 2-3 sessions/week, Z1/Z2 maintenance

Phase 2 (Endurance emphasis):
  Endurance: 4-6 sessions/week, building CTL
  Strength: 1-2 sessions/week, maintenance (≥80% 1RM to preserve adaptations)

Phase 3 (Event-specific peak):
  Dominant for target event; other modality minimized
```

SHARPIT does not currently generate this type of integrated plan. The training plan generator works per-sport, not across modalities.

### Concurrent Session Ordering

When both modalities train on the same day (unavoidable for many athletes):

- **Endurance before strength** is common practice but produces more muscular fatigue from subsequent strength work
- **Strength before endurance** preserves strength quality but endurance quality suffers less (aerobic adaptations are less sensitive to prior fatigue)
- **Best evidence:** separate by ≥6-8 hours when possible; if same session, prioritize the primary sport's session first

---

## Nutrition for Hybrid Athletes

Hybrid athletes have higher nutritional requirements than pure endurance athletes:

| Nutrient      | Pure endurance         | Hybrid athlete                                      |
| ------------- | ---------------------- | --------------------------------------------------- |
| Protein       | 1.6-2.0 g/kg/day       | 1.8-2.4 g/kg/day                                    |
| Carbohydrates | High periodized        | Moderate-high (muscle glycogen + recovery)          |
| Calories      | Proportional to volume | Higher — supports both aerobic and anabolic demands |

The higher protein requirement reflects the muscle protein synthesis demand from resistance training. Hybrid athletes who maintain endurance athlete protein intakes while training seriously for strength will experience suboptimal muscle development and/or recovery.

SHARPIT does not track nutrition (see `nutrition.md`), but the AI coach should raise protein adequacy as a factor when hybrid athletes report poor strength recovery.

---

## Monitoring Hybrid Athletes in SHARPIT

The most reliable recovery signals for hybrid athletes are the hardware-agnostic ones:

**Most reliable:**

- HRV trend (captures total systemic stress from all sources)
- Resting HR trend (same)
- Garmin readiness score (integrates all stress sources)
- Sleep quality and duration (recovery capacity for all systems)

**Less reliable:**

- TSB (underweights strength-induced fatigue due to TSS estimation problems)
- ACWR (calibrated to endurance athletes; poorly validated for hybrid loads)

**Recommendation:** for hybrid athletes, prioritize HRV and readiness signals over PMC/ACWR signals. Flag when readiness is low and TSB appears positive — this pattern is especially common in hybrid athletes with unrepresented strength fatigue.

---

## Known Limitations for Hybrid Athletes

| Limitation                                   | Impact | Priority                                      |
| -------------------------------------------- | ------ | --------------------------------------------- |
| No separate strength load tracking           | High   | Strength fatigue invisible in PMC             |
| No concurrent training interference modeling | Medium | Schedule quality cannot be assessed           |
| No integrated periodization planner          | High   | Cannot generate hybrid-compatible plans       |
| Strength TSS underestimates heavy sessions   | Medium | ATL underestimated after heavy strength weeks |
| No strength progression tracking             | Medium | 1RM, volume load, RPE not tracked             |
