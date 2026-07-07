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
- No explicit "session brief" tying verdict → planned session → modification suggestion.

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

| Friction                                   | Affected moments | Impact                                     |
| ------------------------------------------ | ---------------- | ------------------------------------------ |
| Wellness check-in hard to discover         | 3, 13            | Subjective dimension underfed              |
| No post-session surface on Today           | 8, 9             | Athlete must hunt activity detail          |
| Planned session compatibility not explicit | 4, 5             | Verdict and plan not fully bridged         |
| Weekly review generated but not shown      | Weekly           | No closure rhythm                          |
| Injury notes disconnected from verdict     | Injury           | Twin constraint not felt in daily decision |

### Medium — erodes delight and coherence

| Friction                                  | Affected moments             | Impact                                    |
| ----------------------------------------- | ---------------------------- | ----------------------------------------- |
| Three metric rings compete with verdict   | 2                            | Cognitive load                            |
| No adaptation drill-down                  | 2                            | Incomplete Twin exposure                  |
| Plan Adapter hidden in Séances, not Coach | Weekly, 4                    | Adaptation hard to find                   |
| Goals strip links generic                 | 4                            | Weak goal-session connection              |
| No race week / taper / off-season modes   | Race week, taper, off-season | Same voice when context radically differs |
| Cron sync UTC vs. local wake              | 7, 0                         | Data may lag behind morning               |

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
