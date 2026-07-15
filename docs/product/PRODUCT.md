# SHARPIT — Product

> **Canonical product document.** Constitution, execution doctrine, and athlete journey.
> **Read order:** Part I → Part II → Part III.
> **Aspirational depth:** [`docs/archive/USER_JOURNEYS.md`](../archive/USER_JOURNEYS.md) · [`docs/archive/PRODUCT_EXPERIENCE_V2.md`](../archive/PRODUCT_EXPERIENCE_V2.md)

---

# Part I — Constitution

# SHARPIT Product Manifesto

## Version 2 — Foundational Document

This document answers one question:

**What does SHARPIT become over the next five years?**

It is not a roadmap. It is not a feature list. It is not marketing.

It is the constitution against which every future product, design, and engineering decision is measured.

If a decision contradicts this document, the decision is wrong — regardless of how compelling the short-term argument may be.

---

## 1. Mission

### The problem beneath the problem

Athletes do not suffer from a lack of data. They suffer from a lack of **continuity**.

Every device, every application, every coach conversation produces a fragment: a workout, a sleep score, a feeling, a plan, a result. These fragments arrive without context, without memory, without reconciliation. The athlete is asked to assemble a picture of themselves from pieces that were never designed to fit together.

The deeper problem is not measurement. It is **self-modeling under uncertainty**.

An athlete cannot directly observe fatigue, adaptation, readiness, or risk. They can only infer them — usually intuitively, inconsistently, and with hindsight. When intuition fails, they oscillate between overreaching and undertraining. When data arrives without interpretation, they substitute numbers for judgment. When recommendations arrive without explanation, they follow blindly or ignore entirely.

Neither path produces durable performance.

### Why SHARPIT exists

SHARPIT exists to give every athlete a **continuous, honest, evolving representation of their physiological state** — one they can reason with across days, seasons, and years.

Not to collect more observations.

Not to display more charts.

Not to automate coaching.

To close the gap between **what was measured** and **what is true about the athlete right now** — and to make that truth actionable without concealing its limits.

### What we solve

We solve the problem of **decision quality over time**.

Performance is not the sum of workouts. It is the accumulation of thousands of decisions made under incomplete information: train or rest, push or hold, adapt the plan or trust the process, recognize a signal or dismiss noise. SHARPIT exists so those decisions become more informed, more consistent, and more aligned with long-term development — not today's engagement metric.

---

## 2. Vision

### Five years from now

In five years, SHARPIT is not remembered as an application athletes open.

It is remembered as the **reference system for athlete state** — the place where an athlete's physiological reality is modeled, challenged, updated, and made legible.

SHARPIT becomes a new category: **Athlete State Intelligence**.

This category sits between raw wearable data and human expertise. It is not a tracker (which records). It is not a planner (which prescribes). It is not a coach chatbot (which improvises). It is a **persistent intelligence layer** that maintains a living model of the athlete and reasons from that model with scientific discipline.

An athlete in 2031 does not ask "what does my app say?" They ask "what does my model say?" — and they understand the answer because the model is theirs: built from their history, transparent in its assumptions, honest about what it does not know.

### The category we create

**Athlete State Intelligence** means:

- State is estimated, not scored for convenience.
- Intelligence is synthesized across systems, not siloed by metric.
- The product remembers; it does not reset every Monday.
- The Twin persists across devices and integrations; evidence changes, the athlete model endures.
- Recommendations are consequences of understanding, not the product itself.
- The athlete develops a relationship with a model of themselves — not with a feed, a leaderboard, or a notification stream.

SHARPIT in five years is the system an athlete trusts to represent them accurately when no one else — including the athlete — has the full picture.

---

## 3. Product Philosophy

These principles are non-negotiable. They outrank roadmap pressure, competitive feature parity, and the temptation of impressive demos.

### I. State before activity

The unit of value is not the workout. It is the athlete's **current state** and how it changes. Activities, sleep logs, and subjective inputs are evidence — not the product. Anything that centers the activity archive over state evolution has misunderstood SHARPIT.

### II. Inference before display

We do not show data because it exists. We infer meaning because decisions require it. A number without a model behind it is noise. A chart without a decision it changes is decoration.

### III. Explanation before prescription

No recommendation ships without a traceable chain: which observations, which models, which assumptions, which confidence, which alternatives were considered. If we cannot explain it, we do not recommend it.

### IV. Uncertainty is a feature, not a defect

Athletes are not served by false precision. When evidence is weak, we say so. When models conflict, we surface the conflict. When data is missing, we degrade gracefully. Certainty manufactured for comfort is a betrayal of trust.

### V. The long horizon wins

We optimize for the athlete the same person becomes in three years — not the session they might complete today. Short-term load maximization, streak mechanics, and fear-based urgency are incompatible with this principle.

### VI. Personalization is structural, not cosmetic

Two athletes with identical workouts on identical days may require opposite guidance. Personalization is not a setting. It is the consequence of a model built from individual history, physiology, constraints, and responses.

### VII. Memory is responsibility

What SHARPIT remembers shapes what it recommends. We treat longitudinal data as a duty: to not forget patterns, to not discard context, to not treat every morning as a blank slate. This includes observations **and** decisions — what was advised, what was chosen, and what followed.

### VIII. Agency remains with the athlete

SHARPIT augments judgment. It does not replace it. The athlete decides. The coach remains valuable. The physician remains authoritative. Our role is to make decisions more informed — not to remove accountability.

### IX. Science is the floor, not the ceiling

Models must be grounded in evidence, documented, testable, and replaceable. We do not borrow scientific language to dress up heuristics. We do not freeze science into dogma — models evolve as evidence evolves. Learning improves calibration; it never becomes an excuse for opaque prediction.

### X. The Twin outlives every integration

Devices, sensors, APIs, and AI models are replaceable. The Digital Twin is not. SHARPIT must never become captive to Garmin, Apple Health, WHOOP, Strava, or any future hardware ecosystem. Integrations supply evidence. The Twin supplies continuity. When a device is swapped or a service disappears, the athlete loses a pipe — not themselves.

### XI. Silence is preferable to noise

If a capability does not improve the athlete's next decision or deepen their understanding, it does not ship. Cognitive load is a cost we charge against ourselves.

---

## 4. The Digital Twin

### What it is

The Digital Twin is not a database table. It is not a cache of API responses. It is not a dashboard backend.

The Digital Twin is **the product**.

It is SHARPIT's continuously maintained answer to the question: _What is happening inside this athlete right now, and how confident are we?_

It holds interpreted state — recovery capacity, fatigue accumulation, adaptation trajectory, limiting factors, constraints, confidence — not raw observations. Observations enter. Understanding remains.

### The Twin as platform

The Digital Twin is not only the product. It is the **stable platform** around which everything else evolves.

Inference models will be replaced as science improves. AI systems will be swapped as capabilities advance. Wearables will change. Sync providers will come and go. User interfaces will be redesigned. None of this may fracture the athlete's continuity.

SHARPIT is architected so that:

- **The Twin is permanent.** It is the authoritative, portable representation of the athlete across years.
- **Evidence is ephemeral in origin but permanent in effect.** A Garmin file and a Strava file are interchangeable inputs to the same inference pipeline — not competing identities of the athlete.
- **Integrations are adapters, not foundations.** We build against athlete state abstractions, not vendor schemas.
- **Model upgrades do not reset memory.** Replacing a fatigue model must not erase what was learned about this athlete's responses.

This is why SHARPIT must never become dependent on any single ecosystem. Products that anchor identity to a device manufacturer inherit amnesia when the athlete switches watches. Products that anchor identity to a social platform inherit distortion when performance becomes content. Products that anchor identity to a proprietary score inherit fragility when the score's definition changes.

The Twin is the athlete's permanent representation. Everything else — Garmin, Apple Health, WHOOP, Strava, and whatever follows — is only evidence arriving from the outside world.

Vendor relationships are tactics. Platform continuity is strategy.

### How it evolves

The Twin evolves through a closed loop:

1. **Observe** — new evidence arrives from training, sleep, subjective input, environment, body composition, injury notes.
2. **Extract** — structured features are derived from observations without contaminating the Twin with raw data.
3. **Infer** — independent models estimate distinct dimensions of athlete state.
4. **Reason** — cross-model synthesis identifies alignment, conflict, limiting factors, and opportunities.
5. **Record** — Decision Records preserve what was concluded, when, with what confidence, and why.
6. **Act** — recommendations and adaptations flow from the Twin, never around it.
7. **Validate** — outcomes refine future inference. The Twin learns whether it was right.

Each cycle makes the Twin more specific to this athlete. Not more generic. More specific.

### How it learns

The objective of learning is not opaque AI. It is **calibrated physiological understanding** — a Twin that becomes increasingly accurate about this athlete, not increasingly impressive in the abstract.

Learning is not black-box machine learning trained on engagement signals. It is not hidden weight adjustment the athlete cannot interrogate. It is **structured individualization** within scientifically grounded models:

- **Personal responses to load** — how this athlete absorbs and expresses training stress relative to their own history.
- **Recovery speed** — how quickly autonomic and subjective markers normalize after given stimuli.
- **Adaptation patterns** — which training structures produce progress for this athlete, and which produce stagnation or harm.
- **Recurring mistakes** — systematic tendencies toward overreaching, under-recovery, plan churn, or ignored warning signals.
- **Recurring successes** — conditions under which this athlete reliably performs and adapts well.

Each adjustment must be traceable: what changed, what evidence triggered it, what assumption it modifies, and with what confidence. If learning cannot be explained, it does not belong in the Twin.

Learning is **calibrated correction**:

- When predicted recovery timelines are wrong, confidence models adjust.
- When repeated conflicts appear between load and autonomic signals, the Twin weights that athlete's patterns.
- When injury precursors precede breakdown, structural memory strengthens.
- When the athlete consistently overrides a recommendation class, the system asks why — it does not silently comply or silently ignore.

The Twin learns by accumulating **decision outcomes**, not by optimizing click-through. Future models improve because past recommendations were recorded, compared to actions taken, and validated against what happened next — not merely because new observations arrived.

### Decision Memory

The Twin must remember more than measurements. It must remember **decisions**.

Decision Memory is the longitudinal record of how intelligence met reality:

- **What SHARPIT recommended** — the verdict, the rationale, the confidence, the models invoked.
- **What the athlete actually did** — compliance, modification, override, or rejection.
- **What happened afterwards** — physiological response, performance outcome, injury interruption, or subjective consequence.
- **Whether the recommendation proved correct** — in hindsight, calibrated against what the Twin predicted.

Decision Records are the architectural foundation of this memory. They are not audit logs for engineering. They are **the athlete's decision history** — the raw material from which recommendation quality improves over time.

Decision Memory makes a capability explicit that most products leave implicit: **decision quality through time**. SHARPIT does not only ask "what is true today?" It asks "how good were our judgments yesterday, last month, last season — for this athlete specifically?" A Twin that remembers observations but forgets its own advice is a Twin that cannot learn from experience.

This memory compounds. An athlete who has trained with SHARPIT for five years carries five years of validated and invalidated guidance — not five years of disconnected files from devices they no longer own.

### What it remembers

The Twin remembers:

- How this athlete responds to load — not population averages.
- Seasonal patterns, injury history, constraint periods, goal arcs.
- When models were wrong and in which direction.
- What was recommended, what was chosen, and what happened next — the full arc of Decision Memory.
- Which classes of guidance proved reliable for this athlete — and which repeatedly failed.

The Twin does not remember for nostalgia. It remembers because **athlete development is longitudinal** and amnesia is a failure mode. Losing Decision Memory means losing the ability to improve judgment — the most valuable asset SHARPIT accumulates.

### How it helps the athlete

The Twin helps by making the invisible visible:

- Fatigue the athlete feels but cannot quantify.
- Adaptation the athlete hopes for but cannot confirm.
- Risk the athlete dismisses until it becomes injury.
- Opportunity the athlete misses because signals aligned on a day they felt ordinary.

It helps by **reducing the gap between sensation and reality** — without claiming reality is ever fully known.

### How it becomes the primary interface

Today, athletes interact with screens: dashboards, charts, lists. Tomorrow, they interact with **state**.

The interface question shifts from "show me my data" to "what is my state, what changed, what does it mean, what is the best next move?" The Twin is the conversational anchor — not a chatbot persona, but the underlying model that every surface expresses.

Over time, surfaces become views on the Twin. The activity list becomes evidence. The plan becomes intent. The recommendation becomes a verdict with provenance. The athlete's relationship migrates from navigating software to **consulting their model** — through whatever interface exists that year.

When the Twin is mature, removing SHARPIT means losing not a logbook but a **memory of how your body works** — and a memory of which guidance earned the right to be trusted.

---

## 5. The Five Product Pillars

These are not screens. They are **capabilities** — permanent responsibilities of the platform.

### Pillar I — Represent

**Maintain the most accurate possible model of athlete state.**

Represent is the foundation. Without a Twin worth trusting, every other pillar collapses. This pillar owns observation integration, feature extraction, inference models, confidence, Decision Records, and the platform abstractions that keep the Twin independent of any vendor. Its success is measured by calibration and specificity — not model count.

### Pillar II — Interpret

**Translate state into meaning for this athlete, in this context.**

Interpret connects physiology to significance. A readiness score is not interpretation. Interpretation is: "your autonomic recovery is adequate but cumulative load is accelerating; given your race in eleven days, this matters because…" Interpret owns narrative, conflict surfacing, limiting factors, and contextual framing against goals and constraints.

### Pillar III — Decide

**Support the athlete's next decision with explicit verdicts and traceable rationale.**

Decide is where understanding becomes action. It owns daily verdicts, session guidance, plan adjustments, and trade-off articulation. Every decision it produces enters Decision Memory — recommendation, athlete action, outcome, and retrospective judgment. A decision without rationale is a guess. A rationale without a decision is academia. Decide must do both.

### Pillar IV — Anticipate

**Estimate what is likely to happen before it happens.**

Anticipate is forward-looking intelligence: recovery timelines, adaptation trajectories, performance windows, emerging risk, goal feasibility. It is not fortune-telling. It is **conditional forecasting with stated uncertainty**. Simulation — exploring "what if" scenarios — lives here, but only in service of decisions the athlete faces. Anticipation without interpretability is speculation; we refuse that.

### Pillar V — Endure

**Preserve and compound athlete development across years.**

Endure is the pillar competitors ignore because it does not spike quarterly metrics. It owns longitudinal memory, Decision Memory, goal arcs, periodization coherence, injury prevention logic, return-to-play continuity, and the prevention of chronic error patterns (repeated overreaching, neglected recovery, plan churn). SHARPIT is built for the athlete still training in ten years — not the athlete who churns after twelve weeks.

---

## 6. Product Evolution

### Today — The Kernel Exists

SHARPIT has built what most products never build: a scientifically grounded intelligence core. Observations flow through features into independent inference models. The Digital Twin persists. Reasoning synthesizes across models. Decision Records create auditability. The AI Coach speaks from context, not from templates.

What changes now: the product must **express** the Kernel, not **prove** it. Engineering is no longer the bottleneck. Clarity of expression is.

The athlete should feel that SHARPIT knows something true about them — not that SHARPIT has many capabilities.

### One Year — Trusted Daily Judgment

Within one year, SHARPIT becomes the first application the athlete opens to answer: **"What should I do today?"**

Not because of habit loops. Because the daily verdict has been right often enough to earn trust. The Twin is visible — not as engineering architecture, but as felt understanding. Plans adapt before they break. Post-session interpretation closes the loop between execution and model update.

What fundamentally changes: SHARPIT shifts from **system athletes explore** to **system athletes rely on**.

### Three Years — Anticipatory Partnership

Within three years, SHARPIT sees around corners the athlete cannot. It flags risk before injury. It identifies adaptation windows before they close. It challenges plans that are physiologically incoherent — even when the athlete wants to push.

The relationship deepens from reliance to **partnership**: SHARPIT disagrees when disagreement serves long-term development. The athlete learns their own patterns through the Twin's memory.

What fundamentally changes: SHARPIT shifts from **reactive intelligence** to **prospective intelligence**.

### Five Years — Athlete State Infrastructure

Within five years, SHARPIT is the authoritative layer of athlete state — potentially interfacing with coaches, physicians, and devices not as another data source, but as **the integrated model**.

The category is established. Competitors may copy features. They cannot easily copy a decade of calibrated, athlete-specific state memory with scientific provenance.

What fundamentally changes: SHARPIT shifts from **product** to **infrastructure for athlete self-understanding** — portable, owned by the athlete, independent of any single device ecosystem. The Twin survives every hardware transition. Decision Memory survives every model upgrade.

---

## 7. What SHARPIT Refuses to Become

### A vendor captive

Products that embed athlete identity inside a manufacturer's ecosystem confuse evidence with self. SHARPIT ingests from Garmin, Apple, WHOOP, Strava, and others — but the athlete's Twin does not belong to any of them. We will not build features that only function with a single provider. We will not let a sync dependency become a strategic vulnerability.

### A social network

Performance is personal. Social proof distorts training decisions toward comparison, visibility, and external validation. Strava owns social. SHARPIT owns state.

### A generic fitness tracker

Trackers record. SHARPIT infers. If we become a prettier activity log, we have failed.

### A notification machine

Urgency is not intelligence. Pushing athletes toward daily opens through fear, streaks, or artificial alerts trains the wrong habit: engagement with the app instead of engagement with their development.

### An engagement-first product

Metrics that exist to increase session time — infinite scroll, gamified recovery scores, leaderboard anxiety — are hostile to athlete welfare. We measure success by outcomes, not opens.

### A black-box oracle

If the athlete cannot understand why SHARPIT said what it said, we have built superstition — not intelligence. LLMs may phrase; they may not decide without traceable model provenance.

### A medical device by stealth

We surface risk signals. We do not diagnose. We do not replace clinical judgment. Pretending otherwise endangers athletes and destroys institutional trust.

### A replacement for human coaches

Coaches provide relationship, accountability, and context machines cannot fully access. SHARPIT makes coaches more effective by giving them a rigorous model — it does not make them obsolete.

### A certainty engine

We will never tell an athlete they are ready when models conflict, data is sparse, and confidence is low — simply because a confident answer feels better. False certainty causes preventable harm.

### A feature factory

Shipping capabilities because competitors did, because demos impress, or because code is easy — without improving Represent, Interpret, Decide, Anticipate, or Endure — is how products die with bloated UIs and hollow cores.

---

## 8. Success Metrics

We do not measure success in downloads, DAU, or subscription conversion alone. We measure success in **athlete outcomes** — the changes in a human life that indicate the Twin is working.

### Decision quality

Athletes make fewer decisions they regret within forty-eight hours: pushing through when rest was indicated, resting when adaptation required stimulus, changing plans without physiological cause. Over seasons, SHARPIT's recommendations for this specific athlete become better calibrated — measurable through Decision Memory, not claimed through marketing.

### Consistency

Athletes complete more of the training that matters — not more training overall. Consistency is measured against intent, not volume vanity.

### Injury reduction

Fewer preventable interruptions: overuse patterns caught early, load incoherence corrected, return-to-play managed without premature escalation.

### Goal attainment

Athletes reach race and performance objectives at higher rates — not by peaking once, but by arriving prepared without destroying the months that follow.

### Self-knowledge

Athletes articulate their own limits, responses, and patterns with greater accuracy. They depend less on external scores and more on informed self-assessment — augmented by SHARPIT, not replaced.

### Calibrated trust

Athletes trust SHARPIT most when it says "I don't know" — because when it does know, it has earned the right to speak clearly.

### Longitudinal presence

Athletes remain in productive relationship with training across years — not cycles of obsession and abandonment driven by burnout or distrust of their own data.

**The athlete's progress is the product's success.** If the Twin improves but the athlete does not, we have failed.

---

## 9. Competitive Positioning

We do not compete on features. We compete on **what each product believes the athlete is**.

### Garmin

**Belief:** The athlete is a person wearing our device.

Garmin's worldview begins with hardware. State is derived to sell ecosystem loyalty. Scores are optimized for daily glance convenience across millions of users — not longitudinal specificity for one athlete. Garmin answers "what did my watch measure?" SHARPIT answers "what is true about me given everything we know?" When the athlete changes devices, Garmin's model of them resets. SHARPIT's Twin does not.

### TrainingPeaks

**Belief:** The athlete is a training plan to be executed and accounted for.

TrainingPeaks excels at load accounting, coach workflow, and plan structure. Its center of gravity is the workout file and the calendar. State inference exists in service of planning compliance — not as a living Twin that persists and reasons independently. SHARPIT treats the plan as one input to state — not the identity of the athlete.

### WHOOP

**Belief:** The athlete is a recovery score to be optimized daily.

WHOOP compresses complex physiology into strain and recovery budgets designed for behavioral loops. Its genius is simplicity; its limit is reduction. SHARPIT refuses to reduce an athlete to a single daily score because we believe reduction hides the conflicts that drive bad decisions. WHOOP's intelligence is also bound to its hardware lifecycle. SHARPIT's is not.

### Strava

**Belief:** The athlete is a story to be shared.

Strava's center of gravity is social proof and activity identity. Performance is performed as much as pursued. SHARPIT has no interest in performance as content. We are interested in performance as **development** — often invisible, often unshareable, often boring.

### Apple Health

**Belief:** The athlete is a collection of permissions and aggregations.

Apple Health collects. It does not model. It does not remember athlete-specific inference. It does not reason. It is infrastructure without intelligence — valuable as a pipe, not a partner. SHARPIT may ingest from Apple; SHARPIT does not aspire to be a repository. The Twin persists even when permissions change or platforms shift.

### SHARPIT's worldview

**The athlete is a developing system whose internal state must be estimated, remembered, challenged, and made legible over time.**

The Twin is the permanent center. Devices are evidence. Decisions are memory. Learning is calibration — never opacity.

We are building the only category that treats this as the entire point — not a feature among many.

---

## 10. The Ultimate Question

If an athlete opens SHARPIT every morning for ten years…

### What should they feel?

They should feel **oriented** — not managed, not hyped, not guilty.

They should feel that someone competent has been paying attention to their body while they slept — not to sell them something, but to help them train well today and still be training well next year.

### What relationship should they have with the product?

A relationship of **earned trust**, closer to a rigorous training journal written by a scientifically literate version of themselves than to a coach, a friend, or a boss.

They consult SHARPIT the way a pilot consults instruments: not because the instruments fly the plane, but because flying without them in complex conditions is negligence.

### What should they trust?

They should trust that SHARPIT will **tell the truth as far as evidence allows** — including uncomfortable truths about rest, risk, and misalignment between ambition and state.

They should trust that when SHARPIT is confident, confidence has meaning — because when it is not confident, SHARPIT says so.

### What should they never doubt?

They should never doubt that SHARPIT **prioritizes their long-term health and development over any metric of product success**.

They should never doubt that a recommendation can be traced to reasoning they are allowed to see.

They should never doubt that SHARPIT remembers who they are — not as a user ID, but as an athlete with a history that matters.

They should never doubt that this history **survives** — device changes, model upgrades, and years of training compounding in Decision Memory, not scattered across platforms that treat them as interchangeable users.

---

## Closing

The Kernel is built.

What remains is to build a company worthy of the Kernel — one that refuses to dilute athlete state intelligence into another fitness application with better charts.

Every future decision is measured here:

Does this make the Twin more accurate, more legible, more honest, and more useful across the athlete's full horizon?

Does it strengthen the Twin as platform — independent of vendors, enriched by Decision Memory, improved through explainable learning?

If yes, proceed.

If no, stop — regardless of how good it looks in a demo.

---

_This document supersedes informal product direction where conflicts arise. It does not replace scientific specifications in `docs/models/` or architectural law in `ARCHITECTURE.md`. It binds them to purpose._

_Last updated: July 2026 — strengthened: Twin as platform, Decision Memory, learning philosophy._

---

# Part II — Execution

# SHARPIT — Product Execution Phase

> Operational doctrine for the post-Kernel era.
> Constitutional purpose lives in [`PRODUCT_MANIFESTO_V2.md`](./PRODUCT_MANIFESTO_V2.md).
> Visual law lives in [`design/DESIGN_LANGUAGE.md`](./design/DESIGN_LANGUAGE.md).

---

## The shift

The Kernel is no longer the bottleneck.

Architecture is stable. Scientific models are established. The Digital Twin, Feature Engine, and Inference pipeline exist.

**The challenge has changed.**

Stop thinking like a software architect. Stop optimizing internal systems.

Think like the Product Director of a company whose core technology already exists.

Engineering is no longer the differentiator. **Product quality is.**

Our objective is no longer to prove that SHARPIT works.

Our objective is to make athletes feel that **SHARPIT understands them**.

---

## The single objective

Every future decision must maximize one thing:

**Transform the existing intelligence into an exceptional athlete experience.**

Do not create new engines unless absolutely necessary.

Prefer exposing, refining, and orchestrating the intelligence that already exists.

---

## The Digital Twin is the center

Every screen, interaction, animation, visualization, and recommendation must **express the Digital Twin**.

Avoid feature accumulation.

Favor:

- **Coherence** — one system, one voice, one model of the athlete
- **Simplicity** — fewer surfaces, clearer intent
- **Clarity** — understanding before metrics
- **Trust** — explanation, uncertainty, provenance
- **Beauty** — craft worthy of daily use

When multiple solutions exist, choose the one that best reinforces SHARPIT's identity as the **operating system for athlete state**.

---

## The seven questions

Before implementing anything, ask:

1. Does this make the athlete **understand themselves** better?
2. Does this **reduce cognitive load**?
3. Does this **increase trust**?
4. Does this **expose more of the Digital Twin**?
5. Does this **improve decision quality**?
6. Does this **create delight**?
7. Would an athlete **naturally want to open SHARPIT every morning**?

If most answers are no, do not ship — regardless of engineering elegance.

---

## Default posture

| Before (Kernel era)  | Now (Product era)     |
| -------------------- | --------------------- |
| Build the pipeline   | Express the Twin      |
| Add models           | Refine surfaces       |
| Prove correctness    | Earn trust            |
| Optimize internals   | Reduce cognitive load |
| Feature completeness | Coherent experience   |

This philosophy guides every future implementation unless explicitly instructed otherwise.

---

_Last updated: July 2026_

---

# Part III — Athlete Journey

# SHARPIT — Athlete Journey

> **Type:** Experience specification  
> **Status:** Authoritative — every future screen must improve a moment defined here  
> **Audience:** Product, design, engineering  
> **Constitutional context:** [`PRODUCT_MANIFESTO_V2.md`](./PRODUCT_MANIFESTO_V2.md) · [`PRODUCT_EXECUTION.md`](./PRODUCT_EXECUTION.md) · [`design/DESIGN_LANGUAGE.md`](./design/DESIGN_LANGUAGE.md)

This document does not describe pages. It describes an athlete's life.

It maps every meaningful interaction with SHARPIT across a day, a week, and the exceptional periods that define long-term development. Each moment is defined by what the athlete needs to understand, decide, and feel — not by where they tap in the application.

**How to use this document:** Before designing or building anything, locate the athlete moment it serves. If it serves no moment, do not build it. If it serves a low-priority moment while a high-priority moment remains broken, reorder the work.

---

## The arc of a single day

```
Sleep ──► Wake ──► Morning consultation ──► Prepare session ──► Before training
    ▲                                                              │
    │                                                              ▼
Pre-sleep ◄── Evening review ◄── Afternoon (optional) ◄── After training
```

Between these moments, SHARPIT works in the background: sync, ingestion, inference, narrative generation, Twin update. The athlete may never see that work. They should always feel its consequences.

---

## Moment 0 — While the athlete sleeps

### Athlete context

The athlete is unconscious. Training stress from prior days is resolving — or not. HRV, sleep stages, and resting heart rate accumulate on the wearable. No decisions are being made.

### Athlete question

None conscious. The question exists only in retrospect: _Did my body recover overnight?_

### SHARPIT objective

Ingest overnight evidence as it becomes available. Prepare tomorrow's state estimate before the athlete wakes. Write Decision Records. Do not disturb sleep.

### Digital Twin role

Recovery, fatigue, and adaptation models update as sleep and autonomic data arrive. The Twin holds the best available estimate of readiness before morning — not a blank slate at wake.

### Decision produced

None for the athlete. Internally: today's provisional verdict, confidence level, and primary limiting factor.

### Emotional outcome

None yet. The athlete does not know SHARPIT worked. That is correct.

**Current friction:** Inference runs on demand when Today opens, not reliably overnight after sync. Morning state may lag behind data already in the system.

---

## Moment 1 — Wake

### Athlete context

Consciousness returns. The body has an opinion before the mind does: heavy, light, stiff, eager. The day has a shape — work, family, a session planned or not. The athlete has not yet consulted any tool.

### Athlete question

_How am I? Can I train today?_

Often half-formed, felt in the body before articulated in language.

### SHARPIT objective

Meet the athlete at consciousness with a single, honest answer — before they drown in Garmin, messages, or guilt about yesterday.

### Digital Twin role

The Twin is the overnight conclusion made legible: recovery capacity, fatigue residue, adaptation trajectory, cross-model verdict.

### Decision produced

A provisional orientation: train hard, train smart, recover, caution — not yet the full prescription.

### Emotional outcome

**Oriented** — not managed, not hyped. The athlete begins the day with a direction, not a dashboard.

**Current friction:** No morning notification carrying the verdict. The athlete must open the app to receive orientation Garmin does not provide.

---

## Moment 2 — Morning consultation

### Athlete context

Coffee, shower, checking the phone. Five to ninety minutes after wake. The athlete opens SHARPIT deliberately — or should want to.

### Athlete question

_What should I do today, and why?_

This is the highest-frequency question in the product's lifetime.

### SHARPIT objective

Answer in under ten seconds of reading: verdict, state summary, today's decision, one path to "why." Reduce the gap between sensation and physiological reality.

### Digital Twin role

Full expression of Represent + Interpret + Decide: readiness dimensions, fatigue trajectory, adaptation status, reasoning conflicts, limiting factor, top action with provenance.

### Decision produced

Today's primary training decision: execute planned session, modify intensity, swap session, rest, or recover actively.

### Emotional outcome

**Understood** — the recommendation resonates with or respectfully challenges how they feel. **Informed** — they could explain their plan to someone else. **Calm** — complexity resolved, not hidden.

**Current friction:**

- Dashboard blocked entirely when verdict is `INSUFFICIENT_DATA` — no partial guidance.
- Narrative header is strong but the full "Daily Brief" (three-paragraph physiological narrative) is not surfaced; briefing is generated in background but not shown.
- Three metric rings compete with verdict for attention — cognitive load above ideal.
- Adaptation dimension has no dedicated drill-down; only sleep, recovery, effort are explorable.

---

## Moment 3 — Subjective morning check-in

### Athlete context

The athlete feels something the models may not yet see: mood, soreness, poor sleep quality despite duration, life stress, incipient illness.

### Athlete question

_Does SHARPIT know how I actually feel?_

### SHARPIT objective

Close the subjective gap in one low-friction interaction. Re-run recovery and reasoning with new evidence. Record the input in Decision Memory.

### Digital Twin role

Subjective dimension of recovery updates. Confidence may rise or fall. Discrepancies between felt state and inferred state become explicit signals.

### Decision produced

Revised verdict if warranted. Athlete sees that their voice changed the model — not that it was ignored.

### Emotional outcome

**Heard** — the system incorporates their interior state. **Trust** — when they override later, SHARPIT already knew why.

**Current friction:**

- Wellness is a small opt-in button, not a natural morning ritual.
- No prompt when subjective data is missing and would materially change the verdict.
- Athlete may not discover the dialog without exploration.

---

## Moment 4 — Preparing today's session

### Athlete context

The athlete knows they will train. They need to translate today's verdict into a concrete session: duration, intensity, structure, equipment, timing.

### Athlete question

_What exactly am I doing — and does it match my state and my plan?_

### SHARPIT objective

Bridge verdict and execution. Surface planned session compatibility with current Twin state. Connect to goals (J-*, progression).

### Digital Twin role

Compatibility assessment: planned load vs. training capacity, fatigue trajectory vs. session demands, adaptation window vs. stimulus type.

### Decision produced

Execute as planned, modify (intensity, duration, sport), swap with another planned session, or defer.

### Emotional outcome

**Prepared** — no ambiguity at the gym door or trailhead. **Aligned** — plan and physiology are in conversation, not conflict.

**Current friction:**

- Session block shows planned/completed sessions but limited compatibility narrative ("your threshold ride is well-timed" vs. generic display).
- Goals strip links to `/goals` generically, not to the specific goal today's session serves.
- ~~No explicit "session brief" tying verdict → planned session → modification suggestion.~~ **Addressed** — Session Rationale (ADR-007) surfaces observed/inferred/suggested/chosen for every coach-proposed session from the planned-session detail view.

---

## Moment 5 — Before training

### Athlete context

Thirty to ninety minutes before the session. Kit is out. The athlete may feel ambiguity — not clearly fresh, not clearly tired. Motivation and anxiety coexist.

### Athlete question

_Is it safe to execute as planned? Should I hold back? Am I missing an opportunity to do more?_

### SHARPIT objective

Deliver permission, prescription, and reason at the moment of maximum decision leverage. Acknowledge ambiguity honestly when state is mixed.

### Digital Twin role

Real-time state (within sync freshness limits), planned session match score, risk signals (accumulation, autonomic suppression, illness markers).

### Decision produced

Final go/no-go/modify decision. Warm-up protocol when ambiguous ("assess after 20 minutes").

### Emotional outcome

**Confident** — whatever they choose, it was informed. **Respected** — not patronized with false precision or guilt for resting.

**Current friction:**

- No distinct pre-training mode; same Today layout morning and pre-session.
- Staleness note exists if Twin is >24h old, but no push when new sync arrives mid-day.
- Planned-vs-state compatibility not prominently surfaced at this moment.

---

## Moment 6 — During training

### Athlete context

Full attention on effort, technique, pacing, environment, sensation. The phone is irrelevant or recording passively via wearable.

### Athlete question

Ideally none directed at SHARPIT. Occasionally: _Is something wrong?_ (safety only)

### SHARPIT objective

**Silence.** Capture evidence passively. Do not coach in real time. Trust the preparation.

### Digital Twin role

None in real time. Session streams become future observations.

### Decision produced

None during session. Athlete owns execution.

### Emotional outcome

**Trusted** — SHARPIT does not interrupt. **Present** — attention stays on the sport.

**Current friction:** None by design. Live coaching is out of scope unless safety-critical flags are added with extreme restraint.

---

## Moment 7 — Automatic synchronization

### Athlete context

The athlete finishes, saves the watch, moves on. Minutes to hours later, data propagates. They may not think about SHARPIT at all.

### Athlete question

Unconscious: _Is my training recorded and understood?_

### SHARPIT objective

Ingest, deduplicate, link, interpret — without athlete action. Close the loop before the athlete asks.

### Digital Twin role

New session observations enter the pipeline. Features extract. Fatigue and load context update. Activity linked to planned session. Narrative and compliance analysis queued.

### Decision produced

Internal: updated state, post-session narrative, plan-match score, goal progress. Forward-looking adjustment to tomorrow's recommendation.

### Emotional outcome

**Invisible competence** — when they return, SHARPIT already knows what happened.

**Current friction:**

- Sync runs on cron (3×/day UTC), not necessarily soon after session end.
- **Inference does not run automatically post-sync** — Twin may stay stale until next Today visit.
- Athlete has no signal that sync completed and interpretation is ready.
- Garmin/Strava merge is robust; athlete may not know which source "won."

---

## Moment 8 — Immediately after training

### Athlete context

Endorphins, fatigue, hunger, shower, commute. Memory of the session is fresh. Honest RPE is available now and lost by tomorrow.

### Athlete question

_What did that session mean? Was it good? Did I hit the plan?_

### SHARPIT objective

Meet the athlete while memory is fresh. Confirm or challenge their perception with physiological interpretation.

### Digital Twin role

Session stress incorporated into fatigue and load. Efficiency signals update adaptation estimate. Planned session link and compliance score available.

### Decision produced

Subjective check-in (how it felt vs. expected). Optional note for injury or anomaly. Acceptance or override recorded in Decision Memory.

### Emotional outcome

**Validated or corrected** — objective mirror on subjective experience. **Closure** — the session is integrated into their story, not just logged.

**Current friction:**

- Post-session experience requires navigating to activity detail — not pushed or surfaced on Today.
- No lightweight "how did it feel?" immediately after sync.
- Activity narrative exists but only for recent activities and requires coach IA configuration.
- Today does not transform into "post-session mode" when new activity detected.

---

## Moment 9 — AI interpretation

### Athlete context

Minutes to hours after training. The athlete wants meaning, not metrics — especially if the session felt surprising.

### Athlete question

_What did SHARPIT see that I didn't?_

### SHARPIT objective

Deliver narrative interpretation grounded in facts: quality, load contribution, recovery impact, adaptation signal. Connect to goals and plan.

### Digital Twin role

Interpret pillar: translate session features into causal story. Reference Twin state before and projected state after.

### Decision produced

Understanding — not necessarily a new action today. May imply tomorrow's adjustment.

### Emotional outcome

**Literate** — the athlete learns how to read their own physiology over time. **Delighted** — insight feels personal, not templated.

**Current friction:**

- Activity narrative is strong when present but not universal (date cutoff, coach config).
- Planned session compliance analysis runs on link but is buried in activity/planning views.
- No unified "session story" combining narrative + compliance + goal impact on one surface.

---

## Moment 10 — Digital Twin update (post-session)

### Athlete context

The athlete may not know this moment exists. They care about consequences, not architecture.

### Athlete question

Implicit: _Has my state changed because of what I just did?_

### SHARPIT objective

Propagate session consequences through all models. Revise forward recommendations. Persist Decision Record.

### Digital Twin role

Fatigue index, acute/chronic load, adaptation efficiency, recovery forecast for tonight and tomorrow — all updated.

### Decision produced

Tomorrow's provisional verdict shifts. Athlete sees this next morning, not necessarily now.

### Emotional outcome

**Continuity** — today's work matters for tomorrow without the athlete managing spreadsheets.

**Current friction:**

- Update is lazy, not proactive after sync.
- No optional "here's what changed" summary evening of hard session day.

---

## Moment 11 — Afternoon glance (optional)

### Athlete context

Mid-day check-in: energy crash, unexpected free time, social ride proposed, stress spike at work.

### Athlete question

_Has anything changed? Is the morning verdict still valid?_

### SHARPIT objective

Lightweight re-orientation without full dashboard reload. Surface only if state materially changed.

### Digital Twin role

Compare morning Decision Record to current evidence. Flag stale verdict or new opportunity.

### Decision produced

Maintain morning plan or micro-adjust (move session, split session, add easy spin).

### Emotional outcome

**Agile** — life happened; SHARPIT adapted without drama.

**Current friction:**

- No afternoon-specific experience. Full Today reload is the only option.
- No notification when mid-day sync changes verdict.

---

## Moment 12 — Evening review

### Athlete context

Day is closing. Training done or skipped. Mind reviews what happened. Body preparing for sleep — the primary recovery intervention.

### Athlete question

_Did I do what mattered today? What should tonight look like for tomorrow?_

### SHARPIT objective

Shift from execution to preparation. Emphasize sleep, recovery debt, tomorrow preview — not a metrics recap.

### Digital Twin role

Day summary: sessions completed, load accumulated, subjective inputs, recovery debt, projected tomorrow state if sleep is adequate vs. poor.

### Decision produced

Evening behaviors: early bed, avoid hard effort, hydration, stress management. Preview of tomorrow's likely verdict.

### Emotional outcome

**Settled** — the day has a closing chapter. **Forward-looking** — tomorrow already considered.

**Current friction:**

- Narrative header adapts to evening phase but no dedicated evening review surface.
- Daily briefing generated in cron but **not displayed anywhere**.
- Evolution charts show data, not evening-oriented decision ("protect sleep tonight").

---

## Moment 13 — Pre-sleep check-in

### Athlete context

In bed or near it. Optional subjective: stress, soreness, mood, alcohol, late meal. Affects tomorrow's inference quality.

### Athlete question

_Anything SHARPIT should know before tonight's data arrives?_

### SHARPIT objective

One optional input. Minimal friction. High value for tomorrow's subjective dimension.

### Digital Twin role

Stores subjective signal for next inference cycle. Decision Memory records athlete-reported context.

### Decision produced

None tonight. Better tomorrow morning verdict.

### Emotional outcome

**Partnership** — the relationship continues when the app is closed.

**Current friction:**

- No evening check-in flow. Morning wellness is the only structured subjective path.
- USER_JOURNEYS describes this; product does not deliver it.

---

## Moment 14 — Sleep

### Athlete context

Unconscious again. The most important training adaptation occurs.

### Athlete question

None.

### SHARPIT objective

Ingest sleep as it completes. Begin cycle again.

### Digital Twin role

Recovery model prepares. Cycle repeats.

### Decision produced

None until wake.

### Emotional outcome

**Trust** — SHARPIT is working while they rest.

**Current friction:** Same as Moment 0 — pipeline timing vs. athlete wake time.

---

## Extended arc — Weekly review

### Athlete context

End of training week. Fatigue may be high. Progress may be invisible day-to-day. Doubt or overconfidence sets in.

### Athlete question

_Was this a good week? Am I on track? What should next week look like?_

### SHARPIT objective

Synthesize seven days into arc narrative: load, consistency, recovery quality, adaptation signals, goal progress, errors and wins.

### Digital Twin role

Endure pillar: weekly state trajectory, Decision Memory aggregate (recommendations vs. actions vs. outcomes).

### Decision produced

Next week orientation: hold, build, recover, adjust plan. Entry point to Plan Adapter if incoherence detected.

### Emotional outcome

**Perspective** — daily noise resolves into trend. **Motivated or restrained** — appropriately.

**Current friction:**

- Weekly review generated on Sunday cron but **no UI surfaces it**.
- Consistency panel on Today is partial substitute, not weekly narrative.
- Plan Adapter buried in Séances hub, disconnected from weekly reflection moment.

---

## Extended arc — Race week

### Athlete context

Peak anxiety and excitement. Every decision feels magnified. Taper discipline conflicts with fear of losing fitness.

### Athlete question

_Am I ready? What should I cut? What should I protect?_

### SHARPIT objective

Shift from building to arriving. Emphasize freshness, confidence calibration, logistics of stress — not volume.

### Digital Twin role

Anticipate: projected freshness at race day, taper compliance, autonomic trend, goal proximity (J-0).

### Decision produced

Daily taper prescription. Permission to rest without guilt. Flag overreach.

### Emotional outcome

**Ready** — not necessarily fearless, but prepared. **Disciplined** — trust in the process.

**Current friction:**

- Goals show J-* but no race-week mode or taper-specific narrative.
- No simulation or forecast ("if you rest today, readiness Sunday is X").
- Verdict language same as normal training week.

---

## Extended arc — Taper

### Athlete context

Two to three weeks before A-race. Load dropping. Body feels heavy or restless. Identity threatens ("I'm losing fitness").

### Athlete question

_Is this normal? Am I detraining or peaking?_

### SHARPIT objective

Normalize taper physiology. Distinguish productive freshness from maladaptation. Protect from panic training.

### Digital Twin role

Adaptation and fatigue trajectories with taper-aware interpretation. Historical taper patterns from Decision Memory.

### Decision produced

Hold taper. Resist junk miles. Optional sharpener sessions with explicit risk/benefit.

### Emotional outcome

**Reassured** — strange sensations have explanation. **Patient**.

**Current friction:**

- Periodization phases exist in planning but not expressed in daily Twin narrative during taper.
- No taper-specific UX distinct from general Today.

---

## Extended arc — Recovery week

### Athlete context

Planned or forced deload. May follow race, illness, or overreaching signals. Athlete feels guilty resting.

### Athlete question

_Is rest productive right now? How long until I'm building again?_

### SHARPIT objective

Reframe rest as training phase. Show recovery trajectory. Prevent premature return.

### Digital Twin role

Fatigue resolving, autonomic recovery, cumulative load decay — made visible as progress, not absence.

### Decision produced

Recovery week structure: active recovery vs. full rest. Re-entry criteria for next build block.

### Emotional outcome

**Permitted to rest**. **Confident in return timing**.

**Current friction:**

- Recovery drill-down is strong for a single day, not for multi-day recovery arc.
- No "recovery week" framing in Today narrative.

---

## Extended arc — Injury

### Athlete context

Pain, diagnosis, fear, identity loss. Training interrupted. Data incomplete. Athlete may hide severity.

### Athlete question

_What can I do? What must I stop? When can I return?_

### SHARPIT objective

Surface injury notes from Corps. Reduce load recommendations. Track return-to-play conservatively. Never diagnose.

### Digital Twin role

Constraints layer: injury flags alter training capacity, risk signals elevate, load prescriptions narrow.

### Decision produced

Modified training or rest. Cross-training alternatives. Return progression milestones.

### Emotional outcome

**Supported** — not abandoned by the system. **Safe** — pressure to push through is absent.

**Current friction:**

- Physical notes exist in Corps (`suivi`) but weakly connected to Today verdict and planning.
- No injury-specific journey or return-to-play protocol surfacing.
- Twin does not prominently downgrade recommendations when injury logged.

---

## Extended arc — Off-season

### Athlete context

No imminent race. Motivation variable. Risk of unstructured training or complete stop. Identity shift.

### Athlete question

_What am I training for now? How do I stay healthy without a target?_

### SHARPIT objective

Shift from peak performance to maintenance, skill, strength, health. Preserve Twin continuity across seasons.

### Digital Twin role

Long-horizon Endure: baseline maintenance, detraining prevention, structural weaknesses from Decision Memory patterns.

### Decision produced

Off-season structure: volume caps, strength emphasis, health markers, optional goal setting for next block.

### Emotional outcome

**Purpose without panic**. **Continuity** — SHARPIT remains relevant without race countdown.

**Current friction:**

- No off-season mode. Goals may be empty; Today feels same as in-season.
- Macro plan dialog exists but not tied to seasonal rhythm in daily experience.

---

## Friction map — current product

Grouped by severity to the daily journey.

### Critical — breaks the morning contract

| Friction                                  | Affected moments | Impact                                                |
| ----------------------------------------- | ---------------- | ----------------------------------------------------- |
| Inference not triggered post-sync         | 0, 7, 10, 1, 2   | Twin stale when athlete opens app; undermines trust   |
| `INSUFFICIENT_DATA` blocks entire Today   | 1, 2             | Athlete gets nothing when partial guidance would help |
| Daily briefing generated but never shown  | 2, 12            | Intelligence exists, experience does not              |
| No morning push notification with verdict | 1                | Athlete must remember to open SHARPIT                 |

### High — weakens decision moments

| Friction                                   | Affected moments | Impact                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wellness check-in hard to discover         | 3, 13            | Subjective dimension underfed                                                                                                                                                                                                                                                                                                                                                               |
| No post-session surface on Today           | 8, 9             | Athlete must hunt activity detail                                                                                                                                                                                                                                                                                                                                                           |
| Planned session compatibility not explicit | 4, 5             | Verdict and plan not fully bridged                                                                                                                                                                                                                                                                                                                                                          |
| Weekly review generated but not shown      | Weekly           | No closure rhythm — **partially addressed**: the deterministic Weekly Coaching Brief (ADR-007) now gives a weekly reflection entry point (plan phase, load, key sessions, limiting factor, learning feedback), reachable from the same Coach menu as Plan Adapter. The cron-generated LLM `WeeklyReview` narrative itself remains unsurfaced — a separate artifact, not shown by this work. |
| Injury notes disconnected from verdict     | Injury           | Twin constraint not felt in daily decision                                                                                                                                                                                                                                                                                                                                                  |

### Medium — erodes delight and coherence

| Friction                                  | Affected moments             | Impact                                                                                                             |
| ----------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Three metric rings compete with verdict   | 2                            | Cognitive load                                                                                                     |
| No adaptation drill-down                  | 2                            | Incomplete Twin exposure                                                                                           |
| Plan Adapter hidden in Séances, not Coach | Weekly, 4                    | Adaptation hard to find — unchanged by ADR-007; the new "Ma semaine" entry sits in the same menu, not a relocation |
| Goals strip links generic                 | 4                            | Weak goal-session connection                                                                                       |
| No race week / taper / off-season modes   | Race week, taper, off-season | Same voice when context radically differs                                                                          |
| Cron sync UTC vs. local wake              | 7, 0                         | Data may lag behind morning                                                                                        |

### Low — polish and completeness

| Friction                                       | Affected moments | Impact                            |
| ---------------------------------------------- | ---------------- | --------------------------------- |
| Activity narrative date-gated and IA-dependent | 9                | Uneven post-session story         |
| No afternoon re-orientation                    | 11               | Minor for most athletes           |
| Legacy route mental model                      | All              | Redirects work; confusion remains |

---

## Prioritization by impact

Ranked by effect on the athlete's lived experience — not engineering effort.

### Tier 1 — Make the morning worth opening

**Moments served:** 0, 1, 2, 7, 10

1. **Close the sync → inference loop** — Twin updates when data arrives, not when app opens.
2. **Surface the daily briefing** — the three-paragraph narrative USER_JOURNEYS describes; already generated.
3. **Graceful Today degradation** — partial state when data incomplete; never a blank wall.
4. **Morning verdict delivery** — notification or widget: one sentence before open.

_Why first:_ If the athlete does not trust the morning, nothing else matters. This is the PRODUCT_EXECUTION seven-questions test in practice.

### Tier 2 — Close the training loop

**Moments served:** 4, 5, 8, 9

5. **Session compatibility narrative** — planned session vs. Twin state, explicit modify/execute/rest.
6. **Post-session mode on Today** — when new activity syncs: narrative, compliance, one subjective question.
7. **Prominent morning wellness** — ritual, not button; explain impact on verdict.

_Why second:_ Morning tells them what to do; this tells them whether they did it right and closes Decision Memory.

### Tier 3 — Weekly and seasonal rhythm

**Moments served:** Weekly, race week, taper, recovery week, off-season

8. **Surface weekly review** — Sunday arc narrative + link to plan adaptation.
9. **Goal-aware session and week framing** — J-*, taper, off-season voice in narrative.
10. **Plan Adapter at moment of reflection** — weekly review → proposed changes.

_Why third:_ Transforms SHARPIT from daily tool to development partner across months.

### Tier 4 — Exception paths

**Moments served:** Injury, 13

11. **Injury → Today constraint pipeline** — physical notes alter verdict and planning.
12. **Evening pre-sleep check-in** — optional, one question, feeds tomorrow.

_Why fourth:_ Critical for affected athletes; smaller population daily.

### Tier 5 — Refinement

**Moments served:** 11, all

13. Adaptation drill-down.
14. Afternoon stale-verdict refresh.
15. Unified session story (narrative + compliance + goals).

---

## The test for every future screen

Before building, complete this sentence:

> This improves **[moment]** by helping the athlete **[understand / decide / feel]** — and it expresses the Digital Twin through **[specific state dimension]**.

If the sentence cannot be completed, the work waits.

---

## Relationship to other documents

| Document                    | Role                                                          |
| --------------------------- | ------------------------------------------------------------- |
| `PRODUCT_MANIFESTO_V2.md`   | Why SHARPIT exists; constitutional law                        |
| `PRODUCT_EXECUTION.md`      | How we build in the post-Kernel era                           |
| `design/DESIGN_LANGUAGE.md` | How moments feel visually                                     |
| `USER_JOURNEYS.md`          | Aspirational behavioral detail (some moments not yet shipped) |
| **This document**           | The map of athlete life — what to improve and in what order   |

When `USER_JOURNEYS.md` and this document diverge on current state, **this document's friction map reflects reality**. When they diverge on intent, **the manifesto decides**.

---

_Last updated: July 2026_
