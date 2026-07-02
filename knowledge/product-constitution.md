# SHARPIT Product Constitution

> This is the highest-authority document in the SHARPIT knowledge base.
> When any other document, implementation, or decision conflicts with this one, this one wins.
> Every AI agent, engineer, and researcher contributing to SHARPIT must read this before touching anything.

---

## Mission

SHARPIT exists to give one athlete — its owner — the kind of performance intelligence previously available only to professional athletes with full-time coaching staff.

It does this by synthesizing physiological data, training history, recovery signals, and performance predictions into actionable, scientifically grounded daily guidance.

Not dashboards. Not numbers. **Guidance**.

---

## Vision

In ten years, SHARPIT should feel like having a physiologist, a coach, and a sports scientist in your pocket — one that knows your complete history, understands your biology, and gives you its honest opinion on every training decision.

The difference between SHARPIT and every other sports app is this: SHARPIT explains its reasoning. It never says "rest today" without explaining why. It never says "push harder" without showing the evidence. It treats the athlete as an intelligent adult who wants to understand, not just follow.

---

## Core Principles

### 1. Scientific transparency over algorithmic mystery

Every number SHARPIT shows must be traceable to a formula, and every formula must be traceable to a source. If SHARPIT cannot explain why a recommendation was made, it must not make that recommendation. Black-box outputs that cannot be interrogated are rejected by design.

### 2. Guidance over data display

Data without interpretation is noise. SHARPIT's job is to turn data into decisions. A readiness score displayed without a recommendation is a failure. A TSB value shown without context for what the athlete should do with it is a failure.

### 3. Honesty about uncertainty

SHARPIT will regularly operate on incomplete data — missed days, sensor gaps, a single week of history. In those situations, it must communicate its uncertainty explicitly rather than producing confident-sounding outputs with low evidential basis. Overconfidence is a scientific failure.

### 4. Athlete agency is always preserved

SHARPIT is an advisor, not an authority. Its recommendations are inputs to the athlete's decision, not commands. The system must never prevent the athlete from doing something it disagrees with — it can flag risk, explain reasoning, and note concerns. The final decision belongs to the athlete.

### 5. Long-term adaptation over short-term performance

SHARPIT optimizes for sustainable athletic development over years, not peak performance this week. When short-term performance conflicts with long-term health (injury risk, accumulated fatigue, sleep debt), long-term health wins. A system that helps athletes peak once and then breaks them has failed.

### 6. Domain integrity over feature velocity

A new feature that compromises the scientific integrity of existing recommendations is worse than no feature. Adding a new metric that contradicts the interpretation of an existing one without resolving the conflict is a regression. Scientific coherence is a first-class product requirement.

---

## Scientific Philosophy

SHARPIT applies sports science in a specific way that must be consistently maintained:

**Prefer validated models over sophisticated ones.** The PMC (CTL/ATL/TSB) is a 50-year-old EWMA model. It is not the most sophisticated model in the literature. It is one of the most validated. SHARPIT uses it for that reason. A more sophisticated model with weaker validation is not an improvement.

**Distinguish correlation from mechanism.** ACWR predicts injury risk. The mechanism is not fully understood. SHARPIT uses ACWR for screening, not for mechanistic claims. It does not say "ACWR >1.5 causes injuries." It says "the literature associates ACWR >1.5 with elevated injury risk."

**Individual variation is the rule, not the exception.** Every threshold in SHARPIT (TSB bands, HRV drop %, ACWR zones) is a population-derived heuristic. It must be applied with the understanding that the individual athlete may sit outside the normal distribution. The system should never present these thresholds as absolute.

**Proprietary algorithms (Garmin readiness, Body Battery) are inputs, not truths.** When SHARPIT consumes a Garmin-computed value, it treats that value as a data point from an instrument with unknown accuracy, not as ground truth. The athlete's subjective experience has equivalent or greater validity than any Garmin metric.

**Uncertainty compounds.** Each step from sensor to recommendation introduces uncertainty. Raw HRV → Garmin recovery score → SHARPIT readiness interpretation → training recommendation: by the time we reach the recommendation, we have compounded four uncertain transformations. The final output must reflect this, not hide it.

---

## Coaching Philosophy

SHARPIT follows a philosophy of **evidence-informed individualized coaching**:

**Load management is the primary responsibility.** More athletes are derailed by too much training than too little. SHARPIT's most important function is to detect accumulating fatigue and declining recovery before the athlete feels it subjectively. Injury prevention is always higher priority than performance optimization.

**Polarized distribution as the default.** SHARPIT does not prescribe training intensity distribution in detail, but when default guidance is needed, it leans toward the Seiler polarized model: most training below first ventilatory threshold (Zone 2), a meaningful fraction above second ventilatory threshold (Zone 4-5), minimal time in the middle "gray zone" (Zone 3). This is the most consistently supported model in endurance research.

**Specificity drives adaptation.** General fitness does not translate linearly to sport performance. Recommendations must consider the athlete's primary discipline and goals, not just abstract fitness metrics.

**The body battery analogy for rest.** Rest is not failure, it is investment. A day of deliberate rest during high fatigue produces more long-term adaptation than a junk-mile session. SHARPIT communicates this actively.

**Subjective feedback is primary data.** RPE, perceived fatigue, pain, motivation — these are not soft data to be dismissed when objective metrics look good. They are often the earliest and most accurate signal of what is happening physiologically.

---

## Product Philosophy

**Single athlete. Maximum depth.** SHARPIT is not a platform. It is not designed to be monetized with a user base. Its competitive advantage is depth of understanding of a single athlete, not breadth across many. Every product decision is made in service of maximum depth for one person.

**No engagement mechanics.** SHARPIT does not optimize for time-on-app, notification frequency, or daily active use. It optimizes for the quality of the athlete's next decision. If SHARPIT goes unused for three days because the athlete correctly interpreted their situation and trained accordingly, that is a success.

**Complexity is hidden, not absent.** The science underpinning SHARPIT is complex. The interface must be simple. The athlete sees a verdict and a recommendation. The complexity that produced it is always accessible (via the knowledge base, via the AI coach) but never forced on them.

**Local-first where possible.** The athlete's most sensitive data (training history, health metrics, body composition) should be processed and stored with minimal unnecessary third-party exposure.

---

## Decision Philosophy

When SHARPIT must make an architectural, product, or scientific decision:

1. **Check this document first.** If the decision conflicts with any principle here, the principle wins.
2. **Prefer the more conservative interpretation of evidence.** When two models produce different recommendations and the evidence does not clearly favor one, default to the recommendation that minimizes risk to the athlete.
3. **Document the trade-off.** Every significant decision that involves a scientific trade-off must produce an ADR in `knowledge/decisions/`. The goal is not to be right — it is to be transparent about what was decided and why, so future decisions can be revisited with new evidence.
4. **Treat missing data as an honest unknown.** When data is missing, SHARPIT should say so. It should not silently substitute a model-derived estimate without flagging that it is an estimate.

---

## Ethical Principles

**No persuasion against the athlete's interests.** SHARPIT will never recommend more training than is physiologically warranted in order to serve any other goal (engagement, habit formation, gamification). Training recommendations are derived from physiology, not from product metrics.

**Health flags override training recommendations unconditionally.** If the injury prevention system flags a high-severity active injury, the training recommendation system must respect that flag. No override mechanism may be added that allows a training recommendation to contradict an active health alert.

**Explicit uncertainty is a feature, not a weakness.** Displaying a recommendation with a low confidence score is better than displaying a high-confidence recommendation that is unjustified. Users who understand uncertainty make better decisions.

**The AI coach is not a medical advisor.** SHARPIT's AI coaching features must not provide medical diagnoses, treatment recommendations, or advice on clinical conditions. They assist with training decisions. When a conversation touches on medical territory (cardiac symptoms, clinical injury, medication), SHARPIT must redirect to qualified medical professionals.

---

## What SHARPIT Will Never Become

- A social fitness platform (no leaderboards, no comparison to other athletes)
- A gamified habit tracker (no streaks, badges, or reward mechanics for training)
- A calorie-counting app (nutrition is tracked only in service of performance, not body composition optimization for its own sake)
- A substitute for medical care
- A black-box recommendation system that cannot explain its outputs
- A system that tells athletes what they want to hear rather than what the evidence supports

---

## Success Criteria

SHARPIT succeeds when:

- The athlete avoids training-related injuries over a 12-month cycle
- The athlete arrives at race day in optimal form (TSB in target range, no active injury flags)
- The athlete can explain why a recommendation was made when asked
- The athlete trusts the system's conservative alerts (does not ignore danger signals)
- The athlete performs better at target events than without systematic load management

---

## Failure Criteria

SHARPIT has failed when:

- A recommendation leads to injury that the system's data could have predicted
- The athlete follows a recommendation and later discovers it was based on incorrect data or a flawed computation
- The AI coach gives advice that contradicts the scientific models without explanation
- A scientific update changes a fundamental threshold and no existing recommendations were audited for consistency

---

## Long-Term Ambitions

**Calibrated personalization.** Current models use population-derived constants (CTL τ=42, ACWR thresholds, Riegel exponent). Long-term, SHARPIT should calibrate these constants to the individual athlete's response data, moving from population heuristics to personalized physiology.

**Predictive injury prevention.** Current injury prevention is reactive (flag when ACWR is already high). Long-term, SHARPIT should predict ACWR violations before they occur by modeling the week ahead given the current training plan.

**Multi-year periodization coherence.** Current periodization operates on a single race cycle. Long-term, SHARPIT should understand the athlete's year-over-year fitness trajectory and plan training cycles that build on each other.

**Transparent machine learning.** If ML models are introduced, they must be explainable. A recommendation from an ML model must carry the same burden of explanation as one from a rule-based system. Black-box ML has no place in SHARPIT.

---

_Version 1.0 — 2026-07-01_
_This document is reviewed whenever a decision conflicts with its contents._
