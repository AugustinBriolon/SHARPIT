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

### Shipped labels

This document is written in English; the application ships in French. The destination names above are concepts, not strings. These are the labels to render, and the items they replace in [`src/lib/app-navigation.ts`](../../src/lib/app-navigation.ts):

| Destination | Shipped label | Replaces       |
| ----------- | ------------- | -------------- |
| Today       | `Aujourd'hui` | `Accueil`      |
| My week     | `Ma semaine`  | `Entraînement` |
| Progress    | `Progression` | `Physiologie`  |
| Coach       | `Coach`       | `Coach`        |
| Profile     | `Profil`      | `Réglages`     |

Two label collisions must be resolved as part of the rename, not left to the implementer:

- **`Ma semaine`** is currently a Coach-menu entry for the Weekly Coaching Brief ([`coach-menu.tsx`](../../src/components/coaching/coach-menu.tsx), [`weekly-brief.tsx`](../../src/components/coach/weekly-brief.tsx), ADR-007). The primary destination takes the name; the Coach entry becomes `Bilan hebdo`. The brief itself does not move — it stays a Coach artefact reachable from My week.
- **`Progression`** was a training route (`/training/progression`) that now only redirects. The word is free to reuse, but the redirect must keep working and must not be mistaken for the new destination.

### Vocabulary

One concept currently carries up to four names across route, label, component, and doc. The rename is the moment to collapse them. Target vocabulary:

| Concept                     | Route      | Label            | Code                | Superseded names                                         |
| --------------------------- | ---------- | ---------------- | ------------------- | -------------------------------------------------------- |
| Body composition and health | `/biology` | `Corps & santé`  | `corps/*`           | `Physiologie`, `Biology`, `Mon corps`, `Body & health`   |
| Physical condition tracking | —          | `Suivi physique` | `physical-health/*` | `physical notes`, `physical conditions`, `Corps (suivi)` |

The API route `/api/physical-notes` and the Prisma model keep their names; this contract governs athlete-facing surfaces and component naming only.

## Navigation principles

### One intention, one canonical destination

A task has one primary home. Alternate URLs may remain as compatible deep links, but they must resolve to the same surface instead of creating competing hubs.

| Intention               | Canonical surface | Where it lives today                                                                              | Remaining dispersion                                             |
| ----------------------- | ----------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Decide today's training | Today             | `/` plus the `/today/*` drill-downs                                                               | None. Rename only.                                               |
| Build or adjust a week  | My week           | `/training` (the thread — already merges calendar, planning and history) and `/training/planning` | `/training/planning` is still a separate page beside the thread. |
| Review development      | Progress          | `/training/history`, `/biology` (composition, suivi, records), `/settings/goals`                  | Three surfaces, two of them under Settings or a data domain.     |
| Discuss with the Coach  | Coach             | `/coach` plus deep links from sessions and planning                                               | Contextual entry points are partial, not duplicated.             |
| Configure the product   | Profile           | `/settings/*`                                                                                     | Holds `goals` and `calibration`, which are not configuration.    |

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

`/settings/calibration` and `/settings/goals` exist today, and calibration was moved into Settings deliberately and recently. Moving it out is a reversal, argued in [ADR-022](../adr/ADR-022-temporal-product-navigation.md). It happens in stage 3, once Progress → Performance exists — not before.

## Reading levels

SHARPIT serves novice and expert athletes through one decision model and two reading levels.

| Level        | Always visible                                                                                                            | Revealed on demand                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **Standard** | Verdict, practical reason, action choices, one relevant trend, and uncertainty in plain language.                         | Technical evidence through an explicit “Understand more” action.                             |
| **Advanced** | The Standard layer plus confidence, source signals, thresholds, CTL/ATL/TSB where relevant, methods, and complete charts. | Raw or historical detail that is useful for interpretation but not for the immediate choice. |

The selected reading level is a presentation preference, not a physiological setting. It must not alter the Digital Twin, DecisionState, safety restrictions, or recommended action.

## Canonical route direction

This map is a target for staged implementation. Existing deep links must continue to work until a deliberate redirect and navigation migration is verified.

The table below lists routes that exist in `src/app/(app)`. Routes that already redirect are marked as such: they are the previous consolidation, not work still to do.

| Current route                                                                            | Status today                                         | Target surface           | Migration intent                                                                                |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------- |
| `/`                                                                                      | Live                                                 | Today                    | Keep `/` as the canonical daily entry.                                                          |
| `/today/sleep`, `/today/recovery`, `/today/effort`, `/today/adaptation`                  | Live                                                 | Today evidence           | Preserve as drill-downs; never promote to destinations.                                         |
| `/training`                                                                              | Live — the thread (calendar + planning + history)    | My week                  | This is already the week hub. Rename and absorb the remaining planning page; do not rebuild it. |
| `/training/planning`                                                                     | Live                                                 | My week                  | Fold into the thread as view state, or keep as a deep link into it.                             |
| `/training/sessions`                                                                     | Redirects to `/training`                             | My week                  | Leave the redirect in place.                                                                    |
| `/training/manual`                                                                       | Live                                                 | My week action           | Activity authoring; reached from the week hub, not from navigation.                             |
| `/training/[id]`, `/training/[id]/edit`                                                  | Live                                                 | Shared detail            | Session/activity detail reached from Today, My week and Progress alike.                         |
| `/training/history`                                                                      | Live                                                 | Progress → Performance   | Becomes the activity-history view inside Performance.                                           |
| `/training/trips/*`                                                                      | Live                                                 | Progress → Performance   | An activity-history grouping, not a destination.                                                |
| `/training/progression`                                                                  | Redirects (`?tab=` splits to calibration/records)    | Progress                 | Retarget the redirect once Progress exists; keep both query cases working.                      |
| `/biology`                                                                               | Live — `CorpsHub`, tabs: composition, suivi, records | Progress (split)         | The three tabs do not move together. See below.                                                 |
| `/settings/goals`                                                                        | Live                                                 | Progress → Goals         | Goals govern the plan; they are not configuration.                                              |
| `/settings/calibration`                                                                  | Live                                                 | Progress → Performance   | Reverses a recent move into Settings. See ADR-022.                                              |
| `/nutrition`                                                                             | Live                                                 | Today or Progress detail | Keep the direct route; reach it contextually, not through primary navigation.                   |
| `/coach`                                                                                 | Live                                                 | Coach                    | Retain as the canonical free-conversation destination.                                          |
| `/settings/*` (account, equipment, integrations, memory, appearance, maintenance, about) | Live                                                 | Profile                  | Retain utility routes as-is.                                                                    |

There is no `/training/calendar` route. The calendar is a rendering mode inside the thread.

### Splitting `/biology`

`CorpsHub` currently mounts three tabs under one route. Progress separates them by purpose, so this is a genuine migration and not a relabel:

| Current tab    | Target Progress section | Note                                                             |
| -------------- | ----------------------- | ---------------------------------------------------------------- |
| Composition    | Body & health           | Body composition trends.                                         |
| Suivi physique | Body & health           | Active conditions, condition history, and training implications. |
| Records        | Performance             | Records are a performance reading, not a body reading.           |

`/biology?tab=records` must keep resolving — `/training/progression?tab=records` already redirects to it, so breaking it breaks two links.

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

The week hub already exists as the training thread, so stage 1 is a rename and not a consolidation. Progress is the one destination with no current surface, and carries most of the work.

1. **Navigation foundation (small) — shipped.** The five labels are live in `app-navigation.ts` and in the route registry that feeds every back-link. The Coach menu's weekly brief became `Bilan hebdo` so the destination could take `Ma semaine`. `/nutrition` now lights Today instead of leaving the bar unmarked. No route moved, and no deep link changed.

   Two consequences of renaming before moving, visible until stage 3: `Progression` is served by the body hub, whose page still reads `Forme & bien-être` and holds no goals; and `Ma semaine` is served by the training thread, which spans more than a week.

2. **Daily loop (medium):** complete the Today phase transitions and contextual Coach/session actions.
3. **Longitudinal space (large):** create Progress; assemble Goals, Performance, and Body & health; split `/biology` across two sections; move goals and calibration out of Settings and retarget the `/training/progression` redirect.
4. **Reading levels (medium):** add progressive Advanced evidence after the Standard hierarchy is stable.

No stage introduces a new inference engine. Each stage must be released with route, loading, mobile, accessibility, and Instant UX coverage.
