# SHARPIT — Product Experience V2

**Type**: Product Design Specification  
**Date**: 2026-07-02  
**Status**: Authoritative — supersedes all prior UI/UX decisions  
**Audience**: Product designers and engineers implementing the next version of the application

> This document is not a feature list. It is an answer to one question: what should an athlete experience when they open SHARPIT?

---

## Philosophy

### The Old Model

The first version of SHARPIT was built by engineers who had data. They built a dashboard that displayed it. This is the universal default. It is almost always wrong.

A dashboard answers the question: _What happened?_

SHARPIT's purpose is to answer: _What should I do, and why?_

These are fundamentally different interfaces.

### The New Model

Every screen in SHARPIT V2 answers exactly one athlete question. If a screen cannot be described as the answer to a single, urgent athlete question, it does not exist.

The product exposes:

- **Understanding** instead of metrics
- **Decisions** instead of graphs
- **Reasoning** instead of scores

Raw Garmin data, HRV values, power outputs, and training load numbers are evidence — they are never the primary interface. They appear when the athlete asks "why?" and not before.

### The Intelligence Contract

SHARPIT V2 operates on a simple contract with the athlete:

> _I have studied everything available about your body. Here is what I know, what I think it means, and what I recommend. Here is how confident I am. Here is why._

The athlete is never expected to interpret numbers. They are expected to make decisions. SHARPIT provides everything needed to make those decisions correctly.

---

## The One Question Model

Every screen maps to one question. The hierarchy of questions, ordered by urgency:

| Priority | Question                                     | Screen                                   |
| -------- | -------------------------------------------- | ---------------------------------------- |
| 1        | How am I today?                              | **Today** (primary screen)               |
| 2        | What should I do?                            | **Decision** (Today sub-view)            |
| 3        | Why?                                         | **Explanation** (Today sub-view)         |
| 4        | What is limiting me?                         | **Bottleneck** (Today sub-view)          |
| 5        | How am I evolving?                           | **Trajectory**                           |
| 6        | What is improving?                           | **Trajectory** sub-view                  |
| 7        | What should I avoid?                         | **Risk** sub-view within Trajectory      |
| 8        | What happens if I follow the recommendation? | **Simulation**                           |
| 9        | How confident is SHARPIT?                    | **Confidence** (inline across all views) |
| 10       | What did I do?                               | **History** (secondary)                  |

---

## Application Structure

### Primary Navigation

Three destinations. No more.

```
┌─────────────────────────────────────────────────────┐
│                                                       │
│   TODAY          TRAJECTORY          COACH           │
│   ─────          ──────────          ─────           │
│  "How am I"     "Am I growing"     "Ask anything"   │
│                                                       │
└─────────────────────────────────────────────────────┘
```

**TODAY**: The athlete's current physiological state and today's decision.  
**TRAJECTORY**: The athlete's long-term adaptation arc — where they are going.  
**COACH**: The AI interface for everything else.

No Settings in primary navigation. Settings are a detail, not a destination.

---

## Screen 1 — TODAY

### Purpose

Answer the question: _How am I today?_

### Design Principle

The Today screen is not a summary of last night's data. It is SHARPIT's most confident, most current understanding of the athlete's physiological state, expressed as a verdict with reasoning.

The athlete opens the app and in 3 seconds understands: the verdict, the confidence, and the single most important thing to do today. Everything else is an expansion.

### Layout — Three Zones

```
┌─────────────────────────────────────────────────────┐
│                                                       │
│   ZONE A — VERDICT                                    │
│   The single sentence that summarizes today          │
│   + confidence indicator                             │
│                                                       │
│   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│                                                       │
│   ZONE B — STATE SUMMARY                             │
│   Three dimensions: Recovery · Fatigue · Adaptation  │
│   Each shown as a directional signal, not a number   │
│                                                       │
│   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│                                                       │
│   ZONE C — THE DECISION                              │
│   One recommendation, one primary action             │
│   + "Why?" expansion                                 │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### Zone A — Verdict

The single most important output of the Reasoning Engine. Displayed as:

- A **verdict label**: `TRAIN HARD` / `TRAIN SMART` / `TRAIN EASY` / `RECOVER` / `RACE READY` / `CAUTION`
- A **confidence bar**: a thin visual indicator (e.g., three bars) showing how much data was available
- A **one-sentence summary**: written in plain language, generated from the Reasoning Engine's `primaryInsight`

Examples:

- "Your body is ready for a demanding session. Recovery is excellent, fatigue is low." — _TRAIN HARD — High confidence_
- "You're in a productive accumulation phase but fatigue is building. A moderate session is ideal." — _TRAIN SMART — Medium confidence_
- "Autonomic stress detected overnight. Rest or very light movement only." — _RECOVER — Medium confidence_
- "Something is off — your HRV and subjective scores are pulling in opposite directions." — _CAUTION — Low confidence_

The verdict updates when new observations arrive (after Garmin sync, after morning check-in).

**Design constraints:**

- The verdict label uses 2–3 words maximum
- No number is shown in Zone A — only language and color
- Color is used as a state indicator, never as the primary signal (accessibility: color-blind safe)
- Confidence is shown as a visual texture/weight, not a percentage number

### Zone B — State Summary

Three physiological dimensions, each expressed as a **directional signal** — not a score, not a bar, not a number.

```
Recovery        Fatigue          Adaptation
─────────       ───────          ──────────
Restoring  ↗   Functional  →    Growing    ↗
```

Each dimension shows:

- A **label** (one word describing the qualitative state)
- An **arrow or indicator** (direction of trajectory)
- Optionally: a single explanatory phrase (shown on tap)

The vocabulary is fixed and human-readable:

**Recovery states**: Excellent · Restoring · Adequate · Reduced · Depleted  
**Fatigue states**: Fresh · Functional · Building · Accumulated · Critical  
**Adaptation states**: Growing · Maintaining · Plateauing · Maladapting · Detraining

No numbers. No raw HRV. No CTL. The athlete reads the state, not the mechanism.

**Tap behavior**: tapping any dimension expands to an explanation sub-view (see Zone A/B deep-dive below).

### Zone C — The Decision

One recommendation, displayed as:

```
┌─────────────────────────────────────────────────────┐
│                                                       │
│   Today's recommendation                             │
│                                                       │
│   Zone 2 aerobic session, 60–90 minutes              │
│   Keep intensity conversational throughout           │
│                                                       │
│   [ Why this? ]    [ Mark done ]                     │
│                                                       │
└─────────────────────────────────────────────────────┘
```

The recommendation is:

- One activity type
- One intensity guideline
- One duration range
- Two actions: _Why this?_ (expands explanation) and _Mark done_ (records completion)

If a planned session exists: the recommendation is shown alongside the planned session with a compatibility signal ("Your plan aligns well with today's state" or "Consider reducing intensity vs. your plan — here's why").

If no planned session exists: SHARPIT proposes the physiologically optimal session for today.

### Sub-view: Why?

Triggered by tapping "Why this?" in Zone C, or "Why?" anywhere.

Displays the Reasoning Engine's explanation chain:

1. **Primary signal**: the most important factor driving today's verdict
2. **Supporting signals**: up to 3 additional contributing factors
3. **Model confidence**: displayed as a sentence, not a number ("Based on 7 days of continuous data" / "Limited by missing sleep data last night")
4. **Historical context**: one phrase situating today within the recent arc ("This is day 4 of a productive accumulation block")

Examples:

- "Your HRV rose 12% vs. your 30-day baseline, suggesting excellent parasympathetic recovery. Your fatigue has resolved from last Thursday's long ride. This is an ideal window."
- "Two signals are slightly conflicting: your HRV suggests readiness, but your subjective score is below your baseline. Confidence is moderate — we're recommending conservatively."

**Design constraint**: The explanation never references raw numbers as primary information. Numbers appear in parentheses as supporting evidence only: "Your HRV improved significantly (55ms → 62ms)."

### Sub-view: Bottleneck

Triggered by tapping "What is limiting me?"

Displays the **primary limiting factor** from the Reasoning Engine:

```
┌─────────────────────────────────────────────────────┐
│                                                       │
│   What's limiting you today                          │
│                                                       │
│   Sleep quality                                      │
│   ────────────────────────────────────────────       │
│   Your sleep efficiency has averaged 71% this        │
│   week, below your 82% baseline. This is the        │
│   primary drag on your readiness.                    │
│                                                       │
│   Impact: moderate                                   │
│   Duration: 5 days                                   │
│   Action: Earlier sleep onset recommended            │
│                                                       │
└─────────────────────────────────────────────────────┘
```

The bottleneck view shows:

- The **name** of the limiting factor (one of: Recovery · Fatigue · Adaptation · Sleep · Load · Autonomic)
- A **plain language explanation** of what SHARPIT observes
- The **impact** level (minor / moderate / significant)
- The **duration** (how long this has been active)
- One **actionable behavior change** (not a training prescription — a lifestyle recommendation)

### Digital Twin Data Consumed (Today)

| Data                                                   | Source           | Zone       |
| ------------------------------------------------------ | ---------------- | ---------- |
| `ReasoningState.verdict`                               | Reasoning Engine | A          |
| `ReasoningState.confidence`                            | Reasoning Engine | A          |
| `ReasoningState.primaryInsight`                        | Reasoning Engine | A          |
| `RecoveryState.readinessCategory`                      | Recovery Model   | B          |
| `FatigueState.fatigueLevel`, `FatigueState.trajectory` | Fatigue Model    | B          |
| `AdaptationState.adaptationTrajectory`                 | Adaptation Model | B          |
| `ReasoningState.recommendation`                        | Reasoning Engine | C          |
| `ReasoningState.primaryLimitingSystem` + explanation   | Reasoning Engine | Bottleneck |
| `ReasoningState.explanationChain`                      | Reasoning Engine | Why        |
| `ReasoningState.physiologicalConsistency`              | Reasoning Engine | Why        |

### User Actions (Today)

| Action                     | Effect                                            |
| -------------------------- | ------------------------------------------------- |
| Tap a dimension (Zone B)   | Expands to explanation sub-view                   |
| Tap "Why this?"            | Opens Why sub-view                                |
| Tap "What is limiting me?" | Opens Bottleneck sub-view                         |
| Tap "Mark done"            | Records session completion, triggers re-inference |
| Pull to refresh            | Forces Garmin sync + re-inference                 |
| Tap confidence indicator   | Opens data availability summary                   |

---

## Screen 2 — TRAJECTORY

### Purpose

Answer the question: _Am I growing as an athlete?_

### Design Principle

Trajectory is not a graph screen. It is a story screen. The story is: over the past 30–90 days, has the athlete been improving, stagnating, or regressing? And what is the current projection?

The primary consumer of this screen is the athlete asking "is this training block working?" — not "what was my CTL on July 14?"

### Layout

```
┌─────────────────────────────────────────────────────┐
│                                                       │
│   ZONE A — ADAPTATION ARC                            │
│   "Is the training block working?"                   │
│   Verdict + qualitative arc description              │
│                                                       │
│   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│                                                       │
│   ZONE B — DIMENSION TRENDS                          │
│   4 cards: Load · Efficiency · Autonomic · Recovery  │
│   Each as directional qualitative signal             │
│                                                       │
│   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│                                                       │
│   ZONE C — RISK SIGNALS                              │
│   Active warnings (if any) surfaced here             │
│                                                       │
│   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│                                                       │
│   ZONE D — HISTORY (optional expansion)              │
│   Scrollable timeline of past 30 days (secondary)   │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### Zone A — Adaptation Arc

```
┌─────────────────────────────────────────────────────┐
│   This training block is working.                    │
│                                                       │
│   Week 3 of 4 — Accumulation phase                  │
│   Your aerobic efficiency has been improving         │
│   consistently. Load progression is on track.        │
│   One more week before scheduled recovery.           │
└─────────────────────────────────────────────────────┘
```

The arc statement is one paragraph. It tells the athlete where they are in their training arc, whether it is working, and what comes next. It comes directly from `AdaptationState.adaptationPhase` + `AdaptationState.adaptationTrajectory` + `AdaptationState.estimatedAdaptationPeak`.

No chart. No CTL line. A sentence.

For athletes who want data: a secondary "Show data" toggle reveals a simplified time-series chart of the Adaptation Index over the past 6 weeks. This is an optional layer, never the default.

### Zone B — Dimension Trends

Four signal cards, each expressing one dimension as a qualitative 30-day direction:

| Dimension                | Good State                              | Warning State | Bad State                              |
| ------------------------ | --------------------------------------- | ------------- | -------------------------------------- |
| Load Progression         | Systematically building ↗               | Plateaued →   | Declining ↘ or Spikes ↑↑               |
| Neuromuscular Efficiency | Improving — less effort for same output | Stable        | Declining — same effort costs more     |
| Autonomic Adaptation     | Strengthening — HRV trending up         | Neutral       | Suppressed — HRV declining chronically |
| Recovery Adequacy        | Consistently restoring                  | Variable      | Chronically insufficient               |

Each card:

- Shows the qualitative direction (a word and an arrow)
- Shows a one-sentence observation ("Your HR at threshold has dropped 4 bpm over 3 weeks")
- Tappable for deeper explanation

No raw HRV values in the default view. The observation sentence uses comparisons ("vs. your baseline", "over the past 3 weeks") — never absolute numbers as primary information.

### Zone C — Risk Signals

Active risks surfaces here, ordered by severity. Empty state is a positive signal:

```
┌─────────────────────────────────────────────────────┐
│   No active risks detected.                          │
│   Your load and adaptation trajectory are healthy.  │
└─────────────────────────────────────────────────────┘
```

When risks exist, each is shown as:

- **Risk name** (plain language: "Overreaching risk", "Detraining risk", "Load spike risk")
- **Severity** (color + word: Moderate / High / Critical)
- **Observation** (one sentence of evidence)
- **Recommended action** (one phrase)

Risk signals come from `FatigueState.functionalOverreachingRisk`, `AdaptationState.maladaptationDetected`, `AdaptationState.overreachingWithoutAdaptationDetected`.

### Zone D — History

The history timeline is an **expansion**, not the default view. The athlete can scroll through the past 30 days and read qualitative daily summaries:

```
Tuesday July 1        TRAIN SMART    Productive fatigue after interval session
Monday June 30        RECOVER        Rest day — recovery progressing well
Sunday June 29        TRAIN HARD     Excellent readiness — long ride completed
```

Each day links to its full Decision Record — the complete reasoning chain from that day.

**Design constraint**: The history is text-first. No colored dot grid. No heatmap. A sentence per day.

### Digital Twin Data Consumed (Trajectory)

| Data                                           | Source                     | Zone |
| ---------------------------------------------- | -------------------------- | ---- |
| `AdaptationState.adaptationPhase`              | Adaptation Model           | A    |
| `AdaptationState.adaptationTrajectory`         | Adaptation Model           | A    |
| `AdaptationState.estimatedAdaptationPeak`      | Adaptation Model           | A    |
| `AdaptationState.loadProgressionScore`         | Adaptation Model           | B    |
| `AdaptationState.neuromuscularEfficiencyScore` | Adaptation Model           | B    |
| `AdaptationState.chronichrvTrendScore`         | Adaptation Model           | B    |
| `AdaptationState.recoveryAdequacyScore`        | Adaptation Model           | B    |
| `FatigueState.functionalOverreachingRisk`      | Fatigue Model              | C    |
| `AdaptationState.maladaptationDetected`        | Adaptation Model           | C    |
| Decision Records (last 30 days)                | Decision Record Repository | D    |

---

## Screen 3 — COACH

### Purpose

Answer the question: _What do I need to understand right now?_

### Design Principle

COACH is a conversation interface. It is not a chatbot demo. It is not a generic AI assistant. It is an interface to SHARPIT's understanding of this specific athlete, on this specific day, with full access to the Digital Twin.

The Coach knows everything the Kernel knows. Every response is grounded in `ReasoningState`, `AthleteState`, and the full Decision Record history.

### Layout

```
┌─────────────────────────────────────────────────────┐
│   SHARPIT Coach                                      │
│   ─────────────────────────────────────────────     │
│                                                       │
│   What would you like to understand?                 │
│                                                       │
│   [ Suggested prompts ]                              │
│   • "Why is my HRV still low after rest?"           │
│   • "What would happen if I skipped this week?"     │
│   • "Am I ready for my race in 3 weeks?"            │
│   • "What is the biggest thing holding me back?"    │
│                                                       │
│   ─────────────────────────────────────────────     │
│   [conversation area]                                │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### Suggested Prompts

Suggested prompts are **dynamically generated** from the current `ReasoningState` and `AthleteState`. They reflect what SHARPIT already knows the athlete should be asking:

- If `adaptationPhase = TRANSFORMATION`: "What should I focus on this week?"
- If `functionalOverreachingRisk = HIGH`: "Am I training too much?"
- If race date approaching within 14 days: "Am I ready for [race name]?"
- If `physiologicalConsistency = CONFLICTING`: "Why is SHARPIT uncertain about my state?"
- If `limitingSystem = SLEEP`: "How is my sleep affecting my training?"

### Coach Responses

Coach responses always include:

1. A direct answer
2. The evidence behind it (from the Digital Twin)
3. The confidence level ("I'm confident because..." / "I have limited data on this because...")
4. An action or follow-up question

The Coach cannot make things up. If the Digital Twin does not have data for a question, it says so: "I don't have enough information about your nutrition to answer this. If you start logging meals, I can incorporate that."

### Coach Memory

The Coach maintains conversation context across the session. It can reference prior exchanges: "Earlier you mentioned you felt tired — that aligns with what I see in your autonomic data."

The Coach remembers past interactions and can track open questions: "Last week you asked about your race preparation. Based on how the past 7 days went, here's an update."

### User Actions (Coach)

| Action                                         | Effect                                             |
| ---------------------------------------------- | -------------------------------------------------- |
| Tap suggested prompt                           | Pre-fills the input field                          |
| Type any question                              | Coach responds using Digital Twin context          |
| Tap an entity in a response (e.g., "your HRV") | Opens inline explanation card                      |
| "How confident are you?"                       | Triggers confidence breakdown                      |
| "Show me the data"                             | Coach provides the raw values behind its statement |

---

## Interaction Philosophy

### Progressive Disclosure

The product has three disclosure levels:

**Level 1 — Verdict** (always visible): The verdict and recommendation. One sentence. No numbers.  
**Level 2 — Explanation** (one tap): The reasoning chain behind the verdict. Plain language, with numbers as supporting evidence.  
**Level 3 — Evidence** (two taps): The raw underlying data — HRV values, fatigue scores, training load numbers. Available to athletes who want it but never surfaced by default.

The default experience is Level 1. The expert experience is Level 3. The product never forces Level 3 on an athlete who is seeking Level 1.

### Language Rules

SHARPIT V2 speaks in the first person about the athlete:

- ✅ "Your recovery is excellent"
- ✅ "Your fatigue has built over 4 days"
- ❌ "Recovery score: 82"
- ❌ "ATL: 68.4"

Comparative statements are preferred over absolute statements:

- ✅ "Your HRV is 12% above your 30-day baseline"
- ✅ "Your aerobic efficiency has improved since the start of the block"
- ❌ "HRV: 62ms"
- ❌ "Efficiency factor: 0.83"

Verbs of understanding are preferred over verbs of displaying:

- ✅ "SHARPIT detects...", "based on...", "this suggests..."
- ❌ "Showing...", "displaying...", "your data shows..."

### Confidence Communication

Confidence is always present, never intrusive. Three tiers:

| Tier   | Display                                | Meaning                                               |
| ------ | -------------------------------------- | ----------------------------------------------------- |
| High   | Full color, standard weight            | ≥ 7 days of continuous data, all dimensions available |
| Medium | Slightly muted, lighter weight         | Some dimensions unavailable, limited history          |
| Low    | Clearly marked with "limited data" tag | < 3 days of data, major gaps, conflicting signals     |

When confidence is low, SHARPIT says so explicitly: "Based on limited data" or "I'm less certain today because your Garmin didn't sync last night."

SHARPIT never pretends to know more than it does.

### Notifications Philosophy

SHARPIT sends notifications only for three categories:

**Category 1 — Safety signals** (always delivered, cannot be turned off):

- Overreaching risk detected: "Your body shows signs of cumulative fatigue. A rest day is recommended."
- Injury risk elevated: "Your load spiked 40% this week. Today's session should be light."

**Category 2 — Daily verdict** (delivered once per day, opt-out available):

- "Good morning. Today you're [verdict]. [One sentence]."
- Delivered when the morning Garmin sync completes (typically 6–9am)
- Content adapts to the verdict — not a template notification

**Category 3 — Significant changes** (delivered only for material changes):

- "Something changed overnight. Check your state." (triggered if verdict changes from yesterday by ≥ 2 levels)
- "Your adaptation trajectory has shifted." (triggered when `adaptationTrajectory` changes direction)

**Zero promotional notifications.** No streaks. No "you haven't logged in." The relationship is physiological, not behavioral.

---

## Empty States

Empty states are not error states. They are honest states.

### New user (day 1)

```
SHARPIT needs to learn your baseline.

Connect your Garmin (or other device) and give it
7 days of data. After that, I'll have enough to
understand your physiology.

[Connect Garmin]

In the meantime, tell me about yourself.
[Answer 3 questions]
```

### Missing today's data (sync not completed)

```
Waiting for today's data.

Your Garmin hasn't synced yet. Your verdict
from yesterday is still available.

[Yesterday's verdict]  [Sync now]
```

### Insufficient history for a specific dimension

In Zone B of Today: instead of showing a dimension card, show:

```
Adaptation — building model
I need 14 more days of data to estimate your
adaptation trajectory accurately.
```

### Coach with insufficient data for a question

```
I don't have enough information to answer this
with confidence. Here's what I can tell you
from what I do have: [partial answer]

To improve this, I'd need: [specific data]
```

---

## Onboarding Flow

### Design Principle

Onboarding is not a form. It is a first conversation. The athlete should feel, at the end of onboarding, that SHARPIT has already started understanding them — not that they've completed a registration process.

### Step 1 — The promise (30 seconds)

One screen. One promise.

```
SHARPIT will learn to understand your body.

You've never had a coach that knew exactly
how you felt every morning.

Now you do.

[Get started]
```

### Step 2 — Connect a device (2 minutes)

```
First, connect your training data.

Garmin, Strava, or Apple Health — wherever
you train. I'll analyze the past 90 days
if available.

[Connect Garmin]  [Connect Strava]  [Other sources]
```

### Step 3 — Four questions (3 minutes)

No multi-page forms. Four questions, one per screen, conversational tone:

**Question 1**: "What best describes your current training?"
(options: Structured training with specific goals / Regular training without specific races / Recreational — I move for health / Returning after a break)

**Question 2**: "What's your next important event?" (date picker, or "I don't have one")

**Question 3**: "How would you describe yourself as an athlete?"
(options: Just starting out / Building my base / Competitive athlete / Elite / Veteran — been at this for years)

**Question 4**: "In the morning, how do you usually feel about training?"
(options: Eager — I want to do more / Balanced — I do what's planned / It depends / Often unmotivated)

These four questions set the athlete profile, the training context, and the subjective baseline. They feed directly into model priors.

### Step 4 — The first analysis (1 day wait)

```
I'm building your baseline.

I've connected to your [device] and found
[N] weeks of training history.

I'll have your first real assessment ready
by tomorrow morning. Check back then.

[I'll be back]
```

For athletes with no prior data: the first assessment appears after the first night of sleep data.

### Step 5 — The first verdict

The first real interaction. Presented as a reveal, not a dashboard load:

```
Good morning, [name].

This is the first time I've assessed your
complete physiological state.

Here's what I've learned.

[Scroll to reveal verdict]
```

---

## Settings and Profile

Settings are not a primary navigation destination. They are accessible via a secondary menu icon.

### What lives in Settings

**Device connections**: Garmin, Strava, Apple Health, Google Fit, Renpho
**Profile**: athlete background, goals, upcoming races
**Notification preferences**: which categories are on/off, time of day
**Data access**: what data is being used, and why
**Model confidence**: current data quality report ("Your Garmin hasn't synced in 2 days — this is reducing confidence")

### What does NOT live in Settings

Not: threshold values. Not: zone configurations. Not: "customize your metrics."

SHARPIT manages its models internally. Athletes do not configure HRV sensitivity or ACWR thresholds. These are scientific parameters, not personal preferences.

Exception: **athlete profile fields** that affect model priors (training experience level, target race, weekly training availability) are in Profile, not Settings.

---

## Screens That No Longer Exist

The following screens from V1 are eliminated in V2:

| V1 Screen                        | Reason for Elimination                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------------------- |
| Raw Garmin metrics dashboard     | Replaced by interpreted Today verdict. Data still accessible at Level 3 via "Show data." |
| Activity list (default view)     | Replaced by History within Trajectory. Activities are evidence, not destinations.        |
| Alerts banner                    | Replaced by Risk signals in Trajectory and Safety notifications.                         |
| Briefing card with bullet points | Replaced by the verdict sentence in Today Zone A.                                        |
| Proactive actions card           | Absorbed into Today Zone C (The Decision).                                               |
| Separate Recovery card           | Recovery is a dimension in Today Zone B. It is not a separate screen.                    |
| Separate Fatigue card            | Same as Recovery — absorbed into Today Zone B.                                           |

---

## Implementation Notes

### Priority order for implementation

The implementation should proceed in this order, so that the most critical user value is delivered first:

1. **Today — Zone A** (Verdict only, from Reasoning Engine)
2. **Today — Zone B** (State summary — Recovery · Fatigue · Adaptation)
3. **Today — Zone C** (The Decision)
4. **Today — Why?** (Explanation sub-view)
5. **Today — Bottleneck** (Limiting factor)
6. **Trajectory — Zone A** (Adaptation arc statement)
7. **Trajectory — Zone B** (Dimension trends)
8. **Trajectory — Zone C** (Risk signals)
9. **Coach** (Conversation interface)
10. **Trajectory — Zone D** (History timeline)

### Component principles

- No component displays a raw number as its primary information
- Every component that shows a number must show it in comparison context ("vs. your baseline", "vs. last week")
- Every component is tappable and links to an explanation
- Confidence is shown inline — no separate "confidence screen"
- All components have an empty state that provides value rather than showing an error

### Data freshness

The Today verdict shows a freshness indicator: "Updated 2 hours ago." When data is stale (> 24 hours), the verdict is shown with a visible degradation: muted colors, a label "Based on yesterday's data."

The athlete is never shown a verdict without knowing its currency.

### Responsiveness and Performance

The verdict must appear within 1 second of opening the app. Because inference is pre-computed (via the Decision Records architecture), the app does not wait for model execution at open time. The current Decision Record is loaded from cache.

Re-inference is triggered by:

- New Garmin sync (background)
- Morning check-in submission
- Manual "refresh" pull

The app never shows a loading spinner in place of a verdict. It always shows the most recent valid verdict, with a freshness label.

---

## The Product in One Sentence

> SHARPIT is the first product that turns a wearable device into a physiological coach: not by displaying data, but by understanding it.

Every design decision in this document serves that sentence.
