# SHARPIT — User Journeys

**Type**: Behavioral Specification  
**Date**: 2026-07-02  
**Status**: Authoritative — defines the intended human experience for every future feature  
**Audience**: Product designers, engineers, and AI prompt authors building SHARPIT

> This document does not describe screens. It describes experiences. It does not describe what the athlete sees. It describes what the athlete understands, feels, and decides. Every future feature implemented in SHARPIT should be evaluated against these journeys.

---

## Foundational Premise

An athlete's relationship with SHARPIT is not a series of interactions with an app.

It is a continuous, ambient relationship with an intelligence that studies the athlete while they sleep, trains, recover, and compete — and that progressively understands them better than they understand themselves.

The product is present at the right moments and silent at all others. It speaks when it has something meaningful to say. It withholds when it has nothing to add. It is never decorative.

The emotion the athlete should feel when opening SHARPIT is not curiosity about their metrics. It is confidence that their next decision is well-informed.

---

## Journey 1 — Morning

### The moment this journey begins

The athlete's alarm fires. Before they've looked at their phone, before they've formed an intention about the day, SHARPIT has already been running.

### What happened overnight

While the athlete slept, SHARPIT did not sleep.

At approximately 3am — after sleep data has fully accumulated and Garmin has recorded the overnight HRV measurements — the system begins its inference cycle. This is not triggered by a user action. It is triggered by the arrival of new physiological evidence.

The Observation Engine ingests the sleep session: total duration, sleep efficiency, HRV across sleep stages, resting heart rate, respiratory rate. It validates each value against the athlete's historical plausible range. It normalizes across the athlete's timezone and training-day boundary convention.

The Feature Engine extracts recovery signals: HRV delta from the 30-day baseline, sleep debt accumulation, subjective wellness components (if a prior-evening check-in was completed), autonomic tone estimate. These are not stored as raw data — they become typed signals with quality ratings and confidence weights.

The Recovery Model runs first: it synthesizes the four dimensions (autonomic, sleep, subjective, load context) into a `ReadinessScore` and updates the Digital Twin's `RecoveryState`. The Fatigue Model runs second, incorporating the now-current `RecoveryState` alongside the rolling load history. The Adaptation Model runs third, using both and the 30-day HRV trend.

Finally, the Reasoning Engine runs across all three updated model states. It produces today's `ReasoningState`: a verdict, a recommendation, a primary limiting factor, an explanation chain, and a confidence level.

The entire pipeline completes before 5am for most athletes. The Digital Twin is updated. Decision Records are written.

This is the work SHARPIT does every night, without being asked.

### The notification

When the morning Garmin sync completes (typically 6–9am, depending on the athlete's routine), SHARPIT sends exactly one notification.

The notification is not a push marketing message. It is a direct statement from the intelligence that just analyzed the athlete's body.

Examples:

- "Good morning. You're in an excellent state today. A demanding session would pay dividends."
- "Good morning. Your autonomic system is slightly suppressed this morning. An easy day is recommended."
- "Good morning. Something shifted overnight — your HRV is significantly below your baseline. Worth checking in."
- "Good morning. You're four days into a solid accumulation block. Keep building."

The athlete reads this before opening the app. The notification alone should be enough to inform the day's training decision for an athlete who trusts SHARPIT.

### Opening the application

The athlete opens SHARPIT. There is no loading state for the verdict — it was computed overnight and is waiting. The experience is immediate.

The athlete's first perception is the verdict: a word or short phrase that names today's state. Not a score. Not a bar chart. A verdict — the kind a physician delivers: considered, direct, based on evidence.

In the next few seconds, the athlete reads the one-sentence summary. They understand, without effort, the headline of their physiological state. If the sentence resonates with how they feel, trust deepens. If it surprises them, curiosity triggers.

### Reading the Daily Brief

The Daily Brief is not a list of metrics. It is a structured physiological narrative with three paragraphs:

**Paragraph 1 — How you are today**: The current state across the three dimensions (recovery, fatigue, adaptation), expressed in language. "Your recovery is strong after two days of reduced load. Fatigue from last week has largely resolved. Your adaptation arc is in week 3 of a productive build."

**Paragraph 2 — What's most important right now**: The primary signal driving today's recommendation. The most physiologically relevant observation from last night's data, positioned as the reason behind the verdict. "The main signal is your HRV, which rose 14% above your baseline — the highest reading this block. Your autonomic system is signaling genuine readiness."

**Paragraph 3 — What this means for today**: The specific recommendation, framed as a consequence of the physiological state. "This is an ideal window for a high-quality quality session. A threshold interval workout lasting 75–90 minutes would provide productive stimulus without excessive accumulation."

The brief takes 20–30 seconds to read. When the athlete finishes, they should know exactly what to do today and have a clear mental model of why.

### Understanding today's decision

For most athletes on most days, the brief is sufficient. The recommendation is clear, the reasoning makes sense, and the athlete accepts it.

But sometimes the athlete wants to understand more deeply. They tap "Why?" — and SHARPIT presents the evidence chain:

1. The most important signal: "Your HRV was 67ms overnight, vs. your 30-day baseline of 58ms — a significant positive deviation."
2. The supporting signals: "Sleep quality was excellent (91% efficiency, 8h2m). No subjective concerns from your evening check-in."
3. The integration: "When HRV is elevated above baseline, your body is signaling that sympathetic recovery is complete and parasympathetic dominance is restored. This is the physiological definition of readiness."
4. The confidence: "I'm highly confident in this assessment — you've provided 42 consecutive days of sleep data, and your HRV baseline is well-established."

This is not a screen full of charts. It is a physiological explanation, delivered as consecutive sentences. Each sentence is grounded in evidence. Each sentence can be tapped for deeper elaboration.

The athlete now understands not just what to do, but why their body is telling SHARPIT this. This understanding compounds over weeks and months: the athlete becomes physiologically literate, capable of predicting their own readiness from sensations alone — and using SHARPIT to confirm or challenge their intuition.

### Accepting or modifying the recommendation

Most athletes accept the recommendation. The act of acceptance is simple: they proceed with their day as planned.

If the athlete knows something SHARPIT doesn't — they feel ill, they have an unexpected obligation, their mood is low — they modify the recommendation. This is a two-step interaction:

Step 1: The athlete indicates a change ("I want to do less today").  
Step 2: SHARPIT asks one optional follow-up question: "Is this because of how you feel, or a schedule change?" — and the answer updates the system's understanding of the athlete.

SHARPIT never argues with the athlete. But it notes the discrepancy and tracks it. If the athlete consistently trains less than recommended, that is itself a signal: the recommendations may be too demanding, the athlete's life stress may be undertreported, or the subjective data may be missing.

This discrepancy becomes part of the next adaptation cycle.

---

## Journey 2 — Before Training

### The question the athlete is actually asking

Before every training session, an athlete faces a fork: train as planned, modify the plan, or skip entirely. This decision is rarely made with full information. Athletes guess based on how they feel, which is notoriously unreliable (motivated athletes systematically underreport fatigue; cautious athletes systematically overreport it).

SHARPIT's role in this journey is not to make the decision. It is to give the athlete the best possible information at the moment of decision — so that the decision, whatever it is, is informed.

### What the athlete needs

Three things, in order of urgency:

1. **Permission** (or caution): Is it safe to train hard today? Should anything be held back?
2. **Prescription**: If training, what kind, how long, how intense?
3. **Reason**: Why this prescription?

The athlete who is uncertain about training hard needs to know that SHARPIT has already weighed the risk. The athlete who is eager to push needs to know that their state supports it. The athlete who is tired needs confirmation that rest is productive, not lazy.

### The pre-session experience

If a planned session exists in the athlete's calendar, SHARPIT surfaces a compatibility assessment:

"Your plan calls for a 90-minute threshold ride. Based on your current state, this is well-timed. Your recovery is strong and your fatigue has resolved. Execute as planned."

Or:

"Your plan calls for a 90-minute threshold ride. Your recovery is reduced today — autonomic stress from last night is still active. Consider backing off intensity by one zone. The volume is fine, the intensity is the risk."

Or:

"Your plan calls for a 90-minute threshold ride. Today is not the right day for this session. Your fatigue index has been elevated for 5 days without a meaningful recovery window. Consider swapping this for an easy Z1/Z2 session and moving the threshold work to Thursday."

These are not warnings. They are informed professional opinions, delivered with the confidence of someone who has studied the athlete's body for weeks.

The athlete receives this assessment when they open SHARPIT before training. They do not need to navigate to it. It is the primary content of the Today screen in the pre-training window.

### The athlete who is uncertain

Some athletes open SHARPIT before training specifically because they are uncertain. They feel ambiguous — not clearly tired, not clearly fresh. This ambiguity is physiologically real: the Recovery and Fatigue models often detect it before the athlete consciously acknowledges it.

In this case, SHARPIT does not offer false clarity. It acknowledges the ambiguity:

"Your state today is mixed. Your sleep was excellent, but your HRV is slightly below your baseline — suggesting mild sympathetic activation. This could resolve within an hour of warm-up (often happens when sleep was good but overnight stress was elevated), or it could indicate early fatigue accumulation.

My recommendation: start at your planned intensity and assess after 20 minutes of warm-up. If you feel normal by then, proceed. If effort feels elevated vs. perceived output, back off a zone."

This is what an informed coach says. This is what SHARPIT says.

### The athlete who wants to push harder than recommended

When an athlete's plan is lighter than their current state suggests, SHARPIT identifies the opportunity:

"You've planned an easy day. Your current state could support more. If your schedule allows, this would be an excellent day to either extend today's session or move a quality session forward from later in the week."

SHARPIT does not prescribe unsolicited. It surfaces the opportunity and leaves the decision to the athlete.

---

## Journey 3 — During Training

### The philosophy

SHARPIT is silent during training.

This is deliberate, not a limitation.

### The reasoning

The value of SHARPIT lies in the decisions made before and after training — not during it. During training, the athlete's attention should be on effort, technique, pacing, and sensation. SHARPIT's intelligence operates on minutes and hours of physiological data, not on real-time instructions.

There is no value in SHARPIT saying "slow down" mid-interval that is not better served by a warm-up conversation or a post-session analysis.

### What SHARPIT does use during training

SHARPIT uses Garmin data captured during training — but passively, as evidence for post-session analysis, not as a real-time feedback channel.

Specifically, the data captured during a session that matters most for SHARPIT's models:

- HR drift across the session (efficiency proxy)
- HR vs. power or pace decoupling (aerobic efficiency signal)
- Session RPE if entered after training
- Soreness and perceived effort from the post-session check-in

These become the raw material for the post-session analysis. They are not acted upon in real-time.

### The one exception: safety signals

If a future integration with live Garmin data reveals a safety-relevant pattern during exercise (e.g., extreme HR elevation that is inconsistent with the athlete's typical zones at that intensity), SHARPIT may surface a single, non-urgent notification: "Your HR data from this session looks unusual. Worth reviewing after training."

This is not coaching. It is a flag for a later conversation. The athlete makes their own decision during the session.

### What silence communicates

The decision to stay silent during training is itself a communication to the athlete: _SHARPIT trusts your judgment once the session is underway. The preparation was done. Now execute._

This trust is part of the relationship. An intelligence that interrupts constantly is not intelligent — it is anxious. SHARPIT is neither anxious nor decorative.

---

## Journey 4 — After Training

### The moment the session ends

The athlete finishes training. Garmin records the session end. Within minutes, the activity appears in Garmin Connect and propagates to SHARPIT via sync.

This is the beginning of the post-session inference cycle.

### Observation ingestion

The Observation Engine ingests the raw activity: duration, distance, sport type, HR data, power or pace data, GPS trace. It validates the data against the athlete's plausible physiological ranges (does this HR make sense for this effort level?). It normalizes the activity and assigns it to the correct training day.

The session is now an immutable observation in the SHARPIT record — a permanent, timestamped fact about what happened.

### Feature generation

The Feature Engine extracts the session's physiological meaning:

- TSS (Training Stress Score): how much stress did this session produce?
- Anaerobic load factor: what proportion of the stress was glycolytic vs. aerobic?
- HR drift: did cardiovascular efficiency hold across the session, or did it decay?
- Intensity factor: how intense relative to the athlete's threshold?
- Mechanical load: for running sessions, how much ground impact stress?

These extracted features are not displayed to the athlete. They are the inputs to the models that will update the Digital Twin.

### Digital Twin update

With the new session's features available, the inference pipeline runs:

- Fatigue Model updates: the new session's load and mechanical stress are incorporated into the rolling acute load. If the session was demanding, the fatigue index rises.
- Recovery Model notes: the new load context changes the load-context dimension of tomorrow's readiness estimate.
- Adaptation Model updates its efficiency trend: if HR drift was low for the session's intensity, this is a positive adaptation signal.

The Digital Twin is now updated. The athlete's state as SHARPIT understands it has changed.

### The post-session explanation

Within 30 minutes of session completion, SHARPIT is ready to explain what the session meant. This explanation is offered — not pushed.

The athlete can open SHARPIT after training and read:

"Today's threshold ride was well-executed. Here's what it means:

**Physiological quality**: High. Your HR drift was 2.1%, well within the efficient range for this intensity. You maintained aerobic dominance throughout.

**Training contribution**: This session extended your acute load by 18 TSS. You're now in week 3 of systematic load progression — your chronic fitness base is responding.

**Recovery impact**: This session was demanding but not excessive. You'll need good sleep tonight to complete the recovery cycle. A quality sleep tonight sets up tomorrow well.

**Adaptation signal**: Three straight weeks of well-executed threshold work. Your efficiency is trending upward. The training is working."

The athlete understands, in four sentences, what just happened physiologically and what it means for the rest of the week.

### The optional check-in

After reading the explanation, SHARPIT asks for one optional subjective input:

"How did that feel?"

The athlete answers on a simple scale: Harder than expected / As expected / Easier than expected / I skipped / I modified it.

If the athlete says "harder than expected" when SHARPIT expected a moderate session, this is important data: their subjective experience contradicts the objective prediction. This discrepancy enters the model as a signal — it may indicate that the fatigue model was underestimating the athlete's accumulated load, or that a non-training stressor (sleep, stress, illness) is affecting capacity.

One question. One answer. Enormous informational value.

### Updated recommendations

After the Digital Twin update, SHARPIT revises its forward-looking recommendations. The athlete does not need to ask. If tomorrow's recommended session changes because of today's performance data, SHARPIT surfaces this naturally the following morning.

If today's session was more demanding than planned, tomorrow's recommendation shifts toward recovery. If today's session was lighter than planned, tomorrow's opens a window for slightly more.

The plan adapts to reality. Reality is what SHARPIT observes.

---

## Journey 5 — Evening

### The purpose of the evening

The evening has one physiological purpose: setting up tomorrow.

Sleep is the primary adaptive process. What the athlete does in the two hours before sleep — physical activity, nutrition, blue light exposure, mental stress — directly affects overnight HRV and the quality of the next morning's inference.

SHARPIT's evening interaction is therefore not a recap of the day. It is a preparation for the night.

### The evening check-in

Once per day, in the evening, SHARPIT offers a brief check-in. This is a 60-second interaction, and it is always optional — but its completion significantly improves the next morning's confidence.

Three questions:

1. "How do you feel right now, overall?" (1–5 scale: terrible / below average / normal / good / excellent)
2. "Energy level today?" (1–5 scale)
3. "Any soreness or physical discomfort?" (free text, optional)

These answers become subjective wellness observations. They feed the Recovery Model's subjective dimension and the Fatigue Model's psychological dimension.

The check-in is offered at a consistent time — the athlete sets their preferred evening window (e.g., 9pm). The notification is soft: "Quick check-in for tonight." Not "Log your feelings!" Not "Don't break your streak!"

### The daily close

After the check-in (or at the end of the day regardless), SHARPIT offers a one-paragraph daily close:

"Today was productive. You executed a quality threshold session that contributed meaningfully to your current build. Sleep quality over the past week has been good — this is the primary reason your adaptation is progressing.

Tonight, prioritize sleep. Based on your current recovery pattern, getting to sleep by 10:30pm would optimize tonight's HRV recovery. That's it — nothing else to do."

The daily close is always one paragraph. It always ends with one recommendation or one permission to rest. It is the physiological equivalent of a coach saying "good session today, good night's sleep, see you tomorrow."

### What the athlete feels

The athlete who consistently engages with the evening check-in and reads the daily close develops a qualitatively different relationship with their body. They begin to predict their own morning state based on evening sensations. They understand the direct link between tonight's sleep and tomorrow's readiness.

This is physiological literacy. It is the product's most important long-term contribution to the athlete's life — more valuable than any specific recommendation.

---

## Journey 6 — Weekly Review

### The purpose

Once per week — typically Sunday evening — SHARPIT produces a review of the past 7 days. This is not an activity summary. It is an adaptation report.

The question the weekly review answers: **Is the training week doing what it was supposed to do?**

### Structure of the weekly review

**Opening: The week's verdict** — One paragraph assessing the week as a whole. Did the athlete accumulate the right type of stress? Did recovery keep pace with load? Is the adaptation arc on track?

Examples:

- "This was a well-structured accumulation week. Load increased by 12% vs. last week — within the safe progression window. Recovery held throughout. No overreaching signals detected. Week 3 is complete; week 4 should follow the same pattern."
- "This week was harder than intended. Load spiked on Thursday (the back-to-back days), and recovery has been playing catch-up since. This is not a crisis, but week 4 should prioritize recovery before resuming load."
- "This was a recovery week, and it worked. Your HRV trend reversed its slight downward drift from the prior three weeks. The adaptation signal is strengthening."

**Progress update** — Three observations about adaptation:

1. What is improving (always specific: "Your aerobic efficiency improved — HR drift at threshold pace dropped from 4.8% to 3.1% over the past 3 weeks")
2. What is plateauing or needs attention
3. The trajectory vs. the goal (if a race or goal date is set)

**Fatigue management** — Was this week's fatigue functional or non-functional? Were there any concerning accumulation patterns? If overreaching was detected, this is stated plainly and its recovery prescription is specific.

**Next week's priorities** — Three sentences:

1. The phase (accumulation / transformation / realization / recovery)
2. The single most important type of session for next week
3. One specific thing to watch or monitor

**Confidence statement** — How much does SHARPIT know, and how complete is the picture? This week's data quality assessment: how many Garmin syncs were complete, were subjective check-ins consistent, are there any gaps that reduced confidence?

### The review's tone

The weekly review is retrospective but forward-looking. It does not dwell on what went wrong. It uses what happened to inform what should happen next.

The athlete should finish reading the weekly review with one clear answer to: "What should I focus on next week?" If that answer is not clear, the review has failed.

---

## Journey 7 — Race Week

### The transformation of SHARPIT's communication

Race week is qualitatively different from every other week. The athlete's primary goal has shifted from adaptation to performance expression. The question changes from "am I growing?" to "am I ready?"

SHARPIT recognizes this shift. Seven days before the race, the inference pipeline's priorities recalibrate. The Adaptation Model's assessment becomes less important. The Reasoning Engine's verdict pivots from load prescription to readiness assessment.

### Day 7 before the race

"Seven days to your race. Here's the current picture:

Your fitness level over the past 6 weeks has been the highest of this training season. The adaptation phase has been productive. The taper started yesterday.

Your job this week is to stay out of the way. No new stress. No heroic sessions. Let the fatigue clear.

Today's recommendation: a very easy 45-minute session to maintain neuromuscular priming. Nothing more. The race is won in these 7 days by doing less than you want to do."

### Days 5–3 before the race

The readiness estimate becomes more precise as race day approaches. SHARPIT tracks whether fatigue is resolving at the expected rate. If it is, the communication is reassuring. If it is not (e.g., the athlete did too much on day 6), SHARPIT notes the deviation and recalibrates.

"Day 5. Fatigue is resolving on schedule. Your HRV has recovered from last week's accumulation. The typical profile would place you in an excellent readiness window by race morning.

One note: your last two evenings have shown elevated HRV variability — a sign of mild nervous system activation. This is normal pre-race. Prioritize sleep quality over sleep quantity tonight — quiet room, consistent bedtime, no devices after 9pm."

### Day 1 before the race

"Tomorrow is race day.

Your current state:
Recovery — optimal. Your readiness score is the highest it's been in 6 weeks.
Fatigue — fresh. Load fatigue has fully resolved. You are physiologically ready.
Adaptation — peak. The training block produced measurable fitness gains.

Based on the past 8 weeks of data, your estimated performance potential is at the top of your training season range. This is what months of consistent work has built toward.

Tomorrow, the plan is simple: execute your race. Trust the training. Trust what SHARPIT has observed. Your body is prepared.

One thing: sleep may be difficult tonight — this is physiologically normal before important events. Don't worry about it. One night of reduced sleep does not meaningfully affect performance if the prior week's sleep was good (yours was)."

### Race day

SHARPIT does not coach the race. It has nothing to add in real-time.

The notification on race morning:

"Race day. Your state: Excellent. Today's one job: run (ride / swim) your race. Everything else is already done."

That's it. No analysis. No metrics. Permission to perform.

### The day after the race

"Yesterday was significant. Here's what comes next:

Regardless of the result, your body went through substantial physiological stress. The recovery protocol is the same whether the race went perfectly or not:

- Today and tomorrow: complete rest or very light movement only
- The next 5–7 days: easy aerobic activity only, no intensity
- SHARPIT will track your recovery and tell you when you're ready to resume normal training

On the result: I can see from your Garmin data that you completed the race. Your heart rate data during the event tells me [specific observation from the race data]. I'll give you a full physiological analysis of the race in 48 hours, once your acute fatigue has cleared enough for the numbers to be interpretable.

Well done. Rest now."

### The confidence evolution through race week

On day 7 before the race, SHARPIT's confidence in the performance forecast is moderate — there are 7 days of uncertainty remaining. On race eve, confidence is high — 7 days of clean taper data have refined the model. On race day, the forecast is as accurate as SHARPIT can make it.

This confidence evolution is communicated naturally through language: "current estimate" on day 7 becomes "based on this week's data" on day 3 becomes "your state is confirmed" on race eve.

---

## Journey 8 — Unexpected Events

The real world is not a training plan. SHARPIT must handle disruption honestly, specifically, and without inducing anxiety.

### Illness

The first signal SHARPIT detects: HRV drops sharply below baseline, resting HR elevates, sleep efficiency degrades, subjective wellness falls.

SHARPIT surfaces this pattern early — often before the athlete consciously recognizes they are ill:

"Something changed overnight. Your autonomic metrics show an unusual pattern — your HRV dropped 22% below your baseline while your resting HR rose significantly. This pattern is consistent with either an acute stressor (illness, high mental load) or the onset of an infection.

Today's recommendation: do nothing. No training.

This is not a setback. This is the correct physiological response. Training through this pattern accelerates the timeline to recovery; rest shortens it.

I'll monitor your overnight metrics and update your assessment every morning until the pattern resolves."

During illness, SHARPIT stops counting missed sessions. It tracks recovery trajectory instead. The question shifts from "what should you train?" to "how is your body recovering?"

When autonomic metrics return to baseline, SHARPIT surfaces the clearance:

"Your overnight metrics have returned to your normal range. The acute stress pattern has resolved — 4 days after it first appeared. You're ready to begin easy training. I recommend starting below your prior load for the first 3–5 days. Your fitness has been minimally affected; your immunity reserves have been engaged."

### Injury

When an athlete reports an injury (via the physical notes feature), or when SHARPIT detects movement asymmetry or unusual loading patterns in session data, the entire inference framework recalibrates.

SHARPIT does not diagnose the injury. It acknowledges the limitation clearly:

"You've indicated a left knee issue. I'm not a physician and can't diagnose or prescribe treatment. What I can do is adjust all recommendations to avoid lower-body impact load until you tell me the situation has resolved.

Your cardiovascular fitness can be maintained through low-impact alternatives — swimming, cycling (if pain-free), or pool running. I'll track your physiological state through these options and tell you when your overall readiness is sufficient to return."

The recommendation framework recalibrates around the constraint. SHARPIT does not pretend the injury doesn't exist. It does not minimize it. It adapts.

### Poor sleep

Poor sleep is the most common disruption SHARPIT encounters. Every night of disrupted sleep is a signal — but not every signal is an emergency.

One poor night: SHARPIT notes it and slightly reduces tomorrow's intensity recommendation. The language is calm: "Your sleep was disrupted last night. Nothing to worry about — one night has limited cumulative impact. Slightly back off today's intensity if you feel below par."

Two consecutive poor nights: SHARPIT begins monitoring the pattern. "Two nights of disrupted sleep in a row. This is affecting your readiness. Today's session should be easy. More importantly: what's causing the disruption? If it's behavioral (late screen time, alcohol, irregular bedtime), one behavioral change tonight matters more than any training adjustment."

Four or more nights: SHARPIT escalates its concern. The verdict may shift to RECOVER regardless of other factors. "Chronic sleep disruption is now the primary physiological concern. Training adaptation cannot proceed effectively when sleep is insufficient. The training recommendation is temporarily suspended. Restoring sleep quality is the highest priority."

### Travel

When an athlete travels across time zones, their circadian rhythm disrupts — which disrupts HRV patterns, sleep quality, and the accuracy of all models.

SHARPIT detects this when: sleep onset time shifts significantly vs. baseline, and/or HRV shows the characteristic jet lag suppression pattern.

"You appear to be in a different timezone or experiencing sleep schedule disruption. Your overnight metrics are showing a pattern consistent with circadian disruption. This affects my confidence in today's assessment — I'm working with less reliable data than usual.

For the next 2–3 days, my recommendations will be conservative. I'll recalibrate as your sleep pattern normalizes to the new timezone."

SHARPIT does not panic about travel. It acknowledges the disruption, adjusts its confidence, and continues monitoring until normal patterns resume.

### Missing Garmin sync

The most common technical disruption. When a sync is missing, SHARPIT does not fail — it degrades gracefully and says so.

"Today's assessment is based on yesterday's data — I haven't received a new Garmin sync yet. If you've trained since yesterday, the assessment may not reflect your current state.

Your verdict from yesterday was: [verdict]. This likely still applies, but with reduced confidence."

The athlete knows exactly what they have and what they're missing. No false confidence. No silent failure.

### Contradictory data

Sometimes HRV says excellent. Subjective wellness says poor. The athlete feels one thing; their body measures another.

This happens. It is physiologically real (motivated athletes systematically override their autonomic signals; some athletes are chronically dissociated from their physiological state).

SHARPIT surfaces the contradiction explicitly:

"There's a conflict in today's signals. Your HRV is elevated, suggesting good autonomic recovery. Your subjective rating from last night was low, suggesting you feel unwell or fatigued.

When these signals conflict, I default to the conservative interpretation. Today's recommendation is moderate rather than demanding — a session that would be productive if you feel better than expected, and safe if you feel as unwell as your check-in suggests.

If this pattern continues for 2–3 days, we may be detecting a systematic gap between how you feel and what your body measures. That's worth discussing."

### Skipped workouts

The athlete skips a planned session. No explanation entered.

SHARPIT's response: nothing in the moment.

The next morning, the briefing acknowledges it without judgment: "Yesterday's planned session wasn't completed. No problem — your load for the week is slightly below plan. If you'd like to adjust this week's structure, I can suggest where to make it up, or we can simply continue as planned."

SHARPIT never shames the athlete. It treats skipped sessions as data — not as failures. The adaptation model will correctly register reduced load. The plan will adjust accordingly.

---

## Journey 9 — The Long-Term Relationship

### Month 1 — The calibration period

In the first month, SHARPIT is learning at maximum speed.

Every morning verdict is a calibration event. Every subjective check-in refines the model. Every session provides a data point for the efficiency trend. Every night of sleep extends the HRV baseline.

During this period, the athlete should notice confidence levels improving. Early assessments carry a "limited data" marker. By week 3, the marker disappears from the primary dimensions. By week 4, the adaptation arc is first computable.

What the athlete experiences: a system that is honest about its uncertainty and visibly becoming more accurate. The moment an athlete says "SHARPIT got it exactly right" for the first time is the moment the relationship changes. They begin to trust the system the way they trust a thermometer — not because they understand how it works, but because it has been right consistently.

### Month 3 — Physiological literacy

By three months, the athlete has internalized patterns they did not previously recognize.

They notice that their HRV always drops slightly the day after a long run — and they no longer worry about it. They notice that certain life stress patterns (deadline weeks, travel) consistently affect their morning state — and they begin to schedule their training around it rather than fighting the biology.

SHARPIT has taught them to read their own body.

The daily verdict has become less about "what should I do?" and more about "does SHARPIT agree with what I'm already sensing?" The athlete's physiological intuition has improved because SHARPIT has been naming their internal states in language they can learn from.

### Month 6 — The first inflection point

Six months in, the adaptation model has accumulated enough history to detect long-term trends invisible at shorter timescales.

The athlete may discover, for the first time with any precision: "Your aerobic efficiency peaks in your 5th and 6th week of any build block — and it plateaus in the 7th week. This suggests an 8-week training block with a recovery week in week 7 is your optimal periodization pattern."

This is information that previously required either years of self-coaching or access to a specialized sports physiologist. SHARPIT has derived it from 6 months of consistent data.

The weekly review at the 6-month mark is qualitatively richer than the first-month version. SHARPIT is no longer learning the athlete's patterns — it knows them. The reviews feel less like analysis and more like a conversation with someone who knows the athlete well.

### Year 1 — A complete seasonal archive

After one year, the athlete has a complete seasonal archive: spring build, summer racing, fall recovery, winter base.

SHARPIT has seen every phase. It has modeled each one. The adaptation model's confidence is now high across all dimensions — it has sufficient history to detect even subtle long-term trends.

What becomes possible after year 1:

- **Comparative seasonal analysis**: "You entered this year's build in significantly better base condition than last year. The winter training block made a measurable difference."
- **Pattern prediction**: "Based on the prior two years, your peak form typically arrives 6 weeks into a structured build with your current training frequency. Your race is 7 weeks away — the timing is optimal."
- **Individualized periodization**: The system now knows this athlete's specific optimal training:rest ratios, their resilience to back-to-back intensity days, their response to altitude weeks, their recovery speed from illness.

### Multiple seasons — A permanent physiological record

After multiple seasons, SHARPIT holds something unprecedented: a continuous, longitudinal physiological record of an individual athlete's development.

This record becomes more valuable over time, not less.

When the athlete returns from a serious injury after 6 months, SHARPIT has their pre-injury baseline preserved. The return-to-sport protocol is guided by comparison to a known-healthy state — not a generic protocol.

When the athlete reaches their late thirties or forties and their physiology shifts, SHARPIT detects the shift before they consciously notice it: recovery is taking slightly longer, HRV baseline is slightly lower, training intensity tolerance has changed. The recommendations adapt automatically. The athlete does not experience a sudden performance cliff — they experience a gradual, managed transition supported by precise physiological evidence.

When the athlete eventually mentors or coaches younger athletes, the SHARPIT record becomes a reference artifact: "here is how I built my fitness over 5 seasons — here are the patterns that worked, and the ones that set me back."

### The evolution of the relationship

Month 1: the athlete uses SHARPIT to get information.  
Month 3: the athlete uses SHARPIT to validate intuition.  
Month 6: the athlete uses SHARPIT to understand patterns.  
Year 1: the athlete uses SHARPIT to make plans.  
Year 2+: the athlete and SHARPIT think together.

The relationship does not plateau. The more history the Digital Twin accumulates, the more the system can offer. The athlete who has been with SHARPIT for three years has access to a level of physiological self-knowledge that was previously impossible without a full-time sports scientist on retainer.

This is the product's ultimate value: not the daily verdict, but the permanent, compounding intelligence that the Digital Twin builds over the lifetime of an athletic career.

---

## Behavioral Specification Summary

Every future feature implemented in SHARPIT should be evaluated against these principles, derived from the nine journeys above:

**1. SHARPIT speaks when it has something meaningful to say.**  
Features that generate output only to fill space are wrong. Every message must answer a question the athlete is actually asking.

**2. Uncertainty is stated, not hidden.**  
When SHARPIT does not know, it says so. Degraded confidence is always communicated. False precision is more harmful than acknowledged uncertainty.

**3. Understanding precedes recommendation.**  
The athlete should always know why before being told what. Recommendations without reasoning are instructions, not intelligence.

**4. The athlete's subjective experience is primary data.**  
Objective metrics contextualize subjective experience, but they do not override it. When the athlete says they feel exhausted, SHARPIT does not say "but your HRV looks fine."

**5. SHARPIT adapts to reality, not to the plan.**  
The training plan is a hypothesis. Reality is the evidence. When they diverge, the plan updates — not the reality.

**6. The long-term relationship is the product.**  
Any feature that provides value in week 1 but not year 1 is a feature that will eventually harm the product. SHARPIT is designed for athletes who are with it for years.

**7. Every interaction either builds trust or erodes it.**  
There is no neutral interaction. A wrong verdict, a missed signal, a recommendation that ignores something the athlete told the system — these erode trust. Each correct, specific, and well-timed communication builds it. Trust is the product's most valuable asset and the only one that cannot be reverse-engineered by a competitor.
