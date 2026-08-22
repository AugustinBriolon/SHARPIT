# SHARPIT — Information Architecture

> **Status:** Accepted product direction
>
> **Date:** 2026-08-22
>
> **Scope:** Product-surface navigation, hierarchy, and contextual entry points.
>
> **Does not change:** The frozen Core, the Digital Twin, inference, or the data contracts.

## Purpose

SHARPIT is an Athlete State Intelligence product. Its information architecture must help an athlete move from present state to an appropriate decision with minimal cognitive effort.

The application is organised around the athlete's time horizon, not around internal data domains:

1. **Today** — make the right decision now.
2. **My week** — organise the next seven days.
3. **Progress** — understand long-term development.
4. **Coach** — discuss freely or with relevant context.
5. **Profile** — maintain the athlete model, data sources, and application preferences.

This is a product-surface contract. It complements [PRODUCT.md](../product/PRODUCT.md), [DESIGN_LANGUAGE.md](./DESIGN_LANGUAGE.md), and [ATHLETE_SNAPSHOT.md](../ATHLETE_SNAPSHOT.md). When they conflict, the product constitution and frozen Core contracts prevail.

## Design decision

Use a temporal, decision-led navigation model with five primary destinations:

| Destination  | Athlete question                       | Primary horizon  | What belongs there                                                                            |
| ------------ | -------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------- |
| **Today**    | What should I do now?                  | This day         | State, decision, check-in, today's session, day-specific context, and tomorrow preview.       |
| **My week**  | How should I organise the coming days? | 7–14 days        | Weekly brief, plan, calendar, planned sessions, capacity projection, and plan adjustments.    |
| **Progress** | Am I moving in the right direction?    | Weeks to seasons | Goals, training history, performance, records, calibration, body trends, and physical health. |
| **Coach**    | I want to discuss this.                | Any              | Free conversations and conversations initiated with visible contextual evidence.              |
| **Profile**  | How does SHARPIT know and support me?  | Persistent       | Account, equipment, integrations, coach memory, preferences, and maintenance.                 |

On desktop these destinations form the primary sidebar. On mobile they form the bottom navigation. `Profile` is a utility destination; it must not compete visually with the daily decision.

## Navigation principles

### One intention, one canonical destination

A task has one primary home. Alternate URLs may remain as compatible deep links, but they must resolve to the same surface instead of creating competing hubs.

| Intention               | Canonical surface | Current duplicate or dispersed locations                        |
| ----------------------- | ----------------- | --------------------------------------------------------------- |
| Decide today's training | Today             | Home, Training, and individual physiology routes                |
| Build or adjust a week  | My week           | Training, Planning, Calendar, and Sessions                      |
| Review development      | Progress          | Training progression, History, Biology, and Goals in Settings   |
| Discuss with the Coach  | Coach             | Coach route plus implicit deep links from sessions and planning |
| Configure the product   | Profile           | Settings subpages                                               |

### Context is evidence, not navigation

Weather, nutrition, sleep, recovery, fatigue, adaptation, active physical conditions, and goal proximity are inputs to an athlete decision. They appear where they materially change that decision; none earns a primary navigation item solely because it is a data domain.

### Details answer “why?”

The sleep, recovery, load, and adaptation drill-downs remain available from Today, My week, and relevant activity/session views. They provide evidence for a decision; they are not competing destinations.

### Safety crosses the hierarchy

An active physical-health restriction is always visible when it constrains Today or My week. Its complete history and management live under Progress.

## Surface contracts

### Today

**Job:** orient the athlete in under ten seconds, then give a clear route to act or investigate.

**Default order:**

1. State and confidence: a single verdict, limiting factor, and confidence.
2. Decision: execute, adapt, defer, recover, or obtain more information.
3. Today's session: compatibility with the present state, objective, and conditions.
4. Relevant context: weather, fuelling, health constraint, or schedule only when it changes the decision.
5. Evidence and trajectory: compact signals with progressive links to drill-downs.

**Daily phases:** the same route changes emphasis without becoming a different dashboard.

| Phase           | Dominant need                       | Required outcome                                                                                        |
| --------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Morning         | Can I train, and how?               | A clear daily orientation plus a low-friction wellness check-in when it can alter confidence or advice. |
| Before training | Is this session still appropriate?  | Execute, adapt, move, or discuss the planned session.                                                   |
| After training  | What did that session mean?         | Capture perceived effort, reveal the session story, and make its likely effect on tomorrow legible.     |
| Evening         | What should I protect for tomorrow? | A brief closure, recovery priority, and provisional next-day outlook.                                   |

### My week

**Job:** make a planned week coherent with the athlete's state, goal, available capacity, and changing context.

**Default order:**

1. Weekly brief: phase, priority goal, planned versus tolerable load, and a limiting factor.
2. Week plan: a single canonical calendar/list representation of planned and completed sessions.
3. Projection: expected effect of the next 7–14 days and an alternative only when it is actionable.
4. Actions: add a session, generate a plan, adapt a plan, create a macro plan, or ask the Coach.

The calendar is a view of My week, not a competing information architecture. Planned sessions open a shared session detail where the athlete can understand the rationale, adapt it, or start a Coach conversation with that session attached.

### Progress

**Job:** provide longitudinal perspective without turning Today into a dashboard.

Progress has three purpose-led sections:

| Section           | Question                                         | Content                                                                                                         |
| ----------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| **Goals**         | What am I building toward?                       | Race goals, metric goals, priority, proximity, and relevant plan links.                                         |
| **Performance**   | Is my training working?                          | Activity history, records, load trends, performance curves, consistency, and threshold calibration.             |
| **Body & health** | What changes or constraints should I understand? | Body composition trends, active physical conditions, condition history, and health-aware training implications. |

Multi-day hiking trips are an activity-history grouping, not a top-level product destination. Nutrition history remains available as a deeper view from Today or Progress when the data is connected and useful.

### Coach

**Job:** let the athlete ask for reflection without making a chat interface the product's centre of gravity.

Coach supports two equally valid entry points:

- **Free conversation:** start a new question from the Coach destination with no forced topic.
- **Contextual conversation:** start from Today, a planned session, an activity, My week, a goal, a record, or a physical-health constraint.

Every contextual conversation must identify the attached context in plain language, expose the evidence behind the Coach's answer, and allow the athlete to remove or change the context before sending a message. The Coach may inform a decision; it never silently changes the athlete's plan.

### Profile

**Job:** maintain the personal model and the app without polluting athlete decision surfaces.

Profile contains account details, equipment, integrations and synchronisation, Coach memory, appearance, maintenance, and product information. Goals and performance calibration do not belong here: they are athlete-development concepts and live in Progress.

## Reading levels

SHARPIT serves novice and expert athletes through one decision model and two reading levels.

| Level        | Always visible                                                                                                            | Revealed on demand                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **Standard** | Verdict, practical reason, action choices, one relevant trend, and uncertainty in plain language.                         | Technical evidence through an explicit “Understand more” action.                             |
| **Advanced** | The Standard layer plus confidence, source signals, thresholds, CTL/ATL/TSB where relevant, methods, and complete charts. | Raw or historical detail that is useful for interpretation but not for the immediate choice. |

The selected reading level is a presentation preference, not a physiological setting. It must not alter the Digital Twin, DecisionState, safety restrictions, or recommended action.

## Canonical route direction

This map is a target for staged implementation. Existing deep links must continue to work until a deliberate redirect and navigation migration is verified.

| Current route or route group                                                                     | Target surface           | Migration intent                                                                                 |
| ------------------------------------------------------------------------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------ |
| `/` and `/today/*`                                                                               | Today                    | Keep `/` as the canonical daily entry; preserve drill-down routes as evidence views.             |
| `/training`, `/training/planning`, `/training/calendar`, `/training/sessions`                    | My week                  | Consolidate into one week hub with view state rather than multiple competing hubs.               |
| `/training/history`, `/training/progression`, `/training/trips/*`, `/biology`, `/settings/goals` | Progress                 | Group by goals, performance, and body & health while preserving direct links.                    |
| `/nutrition`                                                                                     | Today or Progress detail | Keep a direct route if needed, but reach it contextually rather than through primary navigation. |
| `/coach`                                                                                         | Coach                    | Retain as the canonical free-conversation destination.                                           |
| `/settings/*`                                                                                    | Profile                  | Retain utility routes; move goals and calibration only when their Progress surfaces exist.       |

## States and feedback

Every primary surface must support loading, partial-data, offline, empty, and error states without hiding the available athlete state.

- A partial Snapshot still gives the best honest orientation available; missing domains explain their own limits.
- Background sync never blocks Today or erases already visible evidence.
- A plan adjustment, session modification, wellness check-in, or context attachment confirms immediately and reconciles in the background according to the Instant UX contract.
- Empty states teach the next useful action: connect a provider, create a goal, add a planned session, or start a conversation.

## Implementation guardrails

- Keep the frozen Core and Athlete Snapshot as the only source of product decisions.
- Keep one primary decision per moment; do not create a dashboard of equally weighted scores.
- Preserve the existing instrument-editorial visual language and causal order: state → evidence → recommendation → projection → limit → confidence.
- Treat any route move as a navigation, prefetch, back-link, deep-link, and offline-cache migration—not only a label change.
- Validate each redesigned surface on mobile and desktop, with Standard and Advanced reading levels, including partial-data and active-health-constraint states.

## Delivery sequence

1. **Navigation foundation:** adopt the five labels, retain compatible links, and establish the canonical My week hub.
2. **Daily loop:** complete the Today phase transitions and contextual Coach/session actions.
3. **Longitudinal space:** assemble Goals, Performance, and Body & health under Progress; move calibration and goals out of Profile.
4. **Reading levels:** add progressive Advanced evidence after the Standard hierarchy is stable.

No stage introduces a new inference engine. Each stage must be released with route, loading, mobile, accessibility, and Instant UX coverage.
