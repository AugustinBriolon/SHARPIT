# Decision Engine

> How SHARPIT makes decisions when data is ambiguous, signals conflict, or confidence is low. The meta-level reasoning layer above individual algorithms.

---

## What the Decision Engine Is

The decision engine is not a single system. It is the set of rules, priorities, and fallback behaviors that govern how SHARPIT behaves when the world is uncertain. Every algorithm in SHARPIT assumes clean, complete data and returns a result. The decision engine governs what happens when:

- Data is missing or stale
- Signals contradict each other
- Confidence is too low to make a specific recommendation
- Safety signals are present

Individual algorithm documentation (`training-load.md`, `recovery.md`, `sleep.md`) covers what each model computes. This document covers how outputs are combined, how conflicts are resolved, and when SHARPIT should say less rather than more.

---

## Conflict Resolution Framework

When signals disagree, SHARPIT applies this resolution hierarchy:

### 1. Safety overrides everything

**Rule:** any active safety signal (active injury ≥6, extreme ACWR, danger-level alert) overrides all positive signals.

**Rationale:** the cost of recommending training during a dangerous condition exceeds the cost of recommending rest when the athlete was actually fine. Conservative bias is intentional. See `product-constitution.md`.

**Implementation:** `buildTrainingVerdict()` checks safety signals before computing normal recommendations.

### 2. Physiological signals > load-derived signals

**Rule:** when readiness/HRV/recovery signals disagree with TSB/CTL-derived signals, the physiological signals win.

**Rationale:** TSB is a model of training-induced fatigue. It does not capture illness, psychological stress, inadequate nutrition, or sleep debt. When the athlete's body says it is fatigued (HRV down, readiness low) and the model says it should be fresh (TSB positive), trust the body.

**Example:** athlete has TSB +10 after a rest week but HRV is significantly below baseline and readiness is 45. SHARPIT recommends rest or active recovery, not an intense session.

### 3. The 24-hour window

**Rule:** SHARPIT's recommendations are always for the current day. It does not recommend sessions for future days without explicit planning context.

**Rationale:** physiological state is measured daily. A recommendation for three days from now is uninformative.

---

## Confidence Thresholds

Before generating a specific recommendation, SHARPIT evaluates data sufficiency.

### Minimum data requirements by recommendation type

| Recommendation               | Minimum data                                                        |
| ---------------------------- | ------------------------------------------------------------------- |
| Daily training verdict       | Readiness or TSB or sleep (any one sufficient, but all three ideal) |
| HRV trend alert              | 10 days of HRV values                                               |
| RHR trend alert              | 17 days of RHR values                                               |
| Sleep analysis               | 7 days of sleep data                                                |
| ACWR warning                 | 28 days of activity load data                                       |
| ACWR danger                  | 28 days of activity load data                                       |
| Periodization recommendation | Training plan active                                                |

When data is below minimum, SHARPIT should degrade gracefully:

- Not produce an alert it cannot support with evidence
- Display a "Données insuffisantes" state instead of a fabricated recommendation
- Inform the user when data gaps affect recommendation quality

See `confidence-scoring.md` for the implementation framework.

### What "degrading gracefully" means in practice

**Wrong approach:**

- `acwr = 0.1` because there are only 3 days of data → fire "under-training" alert
- `hrvTrend = moderate` when only 2 days available → display as if reliable

**Correct approach:**

- Fewer than 28 days of data → ACWR computed but labeled "estimate, low confidence"
- Fewer than 10 days of HRV → HRV trend alert disabled entirely

---

## Conflicting Signal Patterns

### Pattern 1: TSB positive, readiness low

**What it means:** the athlete is mathematically fresh (low recent load) but physiological sensors indicate impaired recovery.

**Probable causes:**

- Illness or sub-clinical infection (HRV most sensitive)
- Significant psychological/life stress
- Accumulated sleep debt not yet reflected in training load
- Detraining following a long rest period (sensors calibrating)

**SHARPIT's behavior:** readiness takes priority. Recommend rest or easy training. The positive TSB is context, not permission.

### Pattern 2: TSB negative, readiness good

**What it means:** the athlete is carrying training fatigue (high recent load) but physiological sensors indicate good recovery absorption.

**Interpretation:** this is the desired state during a planned BUILD phase. The training is being absorbed.

**SHARPIT's behavior:** if ACWR is within range (<1.5) and readiness is truly good (≥75), moderate-to-good recommendation is appropriate despite negative TSB. The negative TSB is flagged as context ("you're in a training block"), not as a warning.

### Pattern 3: Good readiness, extremely high ACWR

**What it means:** short-term load spike is present but sensors haven't yet reflected the accumulating fatigue.

**Interpretation:** the athlete may feel good but is on a trajectory toward injury or overtraining. HRV suppression from a training spike often lags by 24-48 hours.

**SHARPIT's behavior:** ACWR overrides the good readiness. Recommend load moderation. The ACWR signal is predictive (injury risk); readiness is current state. Both matter.

### Pattern 4: Everything poor, no training load

**What it means:** low readiness, poor sleep, elevated RHR — but TSS has been low or zero for days.

**Interpretation:** not overtraining. Likely illness, extreme life stress, or underlying health issue.

**SHARPIT's behavior:** recommend rest. Optionally suggest the athlete note symptoms and consult a physician if pattern persists >3-5 days. SHARPIT does not diagnose illness but should flag sustained multi-signal degradation without training load as potentially medical.

---

## The AI Coach's Decision Role

The deterministic engine produces standardized recommendations. The AI coach can:

1. **Provide context the engine lacks:** "Your ACWR is elevated but this is expected after last weekend's race."
2. **Incorporate user conversation:** "You mentioned feeling ill yesterday — rest today regardless of your readiness score."
3. **Explain conflicts:** "Your readiness score is 65 (moderate) but your sleep has been excellent. The moderate score likely reflects yesterday's hard workout, not true under-recovery."
4. **Apply multi-day thinking:** "Given your race is in 12 days, today's Z2 session is the right call even though you feel ready to push."

**The AI coach cannot:**

- Override safety rules (severity ≥6 injury → rest, period)
- Recommend training that SHARPIT has flagged as dangerous (ACWR ≥1.8 → load reduction required)
- Generate recommendations from no data (must acknowledge data limitations)

---

## Fallback Behaviors

When the system cannot generate a meaningful recommendation:

### No recent data (>48h since last sync)

Display: "Données non récentes. Dernière synchronisation : [timestamp]."
Do not: attempt a recommendation based on stale data.

### First week of use

Display: "Profil en cours de création. Les recommandations s'affineront avec plus de données."
Do not: fire trend-based alerts (HRV, RHR) before minimum windows are met.

### Training plan not active

SHARPIT can still provide recovery/readiness recommendations. Without a plan, it cannot provide session-specific recommendations. The AI coach fills this gap conversationally.

### Multiple danger-level signals simultaneously

Display all danger signals. Do not attempt to aggregate into a single message that loses signal. A user with ACWR danger + sleep debt danger + low readiness should see all three.

---

## Behavioral Invariants

These behaviors are unconditional. They cannot be overridden by signal combinations, AI coach context, or user preference settings.

1. **Severity ≥6 injury → no training recommendation.** Full stop.
2. **ACWR ≥1.8 → load reduction mandatory in recommendation.** Cannot be suppressed.
3. **SHARPIT never recommends weight loss.** Body composition observations are neutral.
4. **SHARPIT never says an athlete is definitely fine.** "No alerts currently" is the positive case, not "everything is perfect."
5. **Confidence must match language.** Level 6 data cannot produce Level 1 language. See `scientific-methodology.md`.

---

## Decision Audit Trail

Every non-trivial recommendation SHARPIT makes should be traceable to:

- The signal that drove it
- The threshold that triggered it
- The evidence level of that threshold

This is currently partially implemented (alerts have type and message) but the evidence citation chain is not surfaced to the user. Future improvement: "Why is SHARPIT saying this?" explainability feature.
