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

Use a temporal, decision-led navigation model. **Shell V1** (shipped in primary chrome) uses four bottom-tab / sidebar destinations:

| Destination  | Athlete question                       | Primary horizon  | What belongs there                                                                            |
| ------------ | -------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------- |
| **Today**    | What should I do now?                  | This day         | State, decision, check-in, today's session, day-specific context, and tomorrow preview.       |
| **Plan**     | How should I organise the coming days? | 7–14 days        | Week thread, planning, weekly brief, capacity projection, and plan adjustments.               |
| **Activité** | What did I actually do?                | Past → present   | Activity history, trips, manual entry, completed-session detail.                              |
| **Moi**      | How does SHARPIT know and support me?  | Persistent       | Corps, objectifs, Confidentialité (consents / export / delete), account, equipment, prefs.    |

**Coach is not a tab.** It remains a contextual entry (and `/coach` deep link) from Today, Plan, sessions, and related surfaces. Legal (`/consent`, `/privacy`, `/terms`), onboarding, and any future teaser stay **outside** the auth app shell — they must not wrap the tab bar.

On desktop these destinations form the primary sidebar (Moi as the identity footer). On mobile they form the bottom navigation.

### Shipped labels (Shell V1)

This document is written in English; hub copy ships in French. Tab labels in [`src/lib/app-navigation.ts`](../../src/lib/app-navigation.ts):

| Destination | Shipped label | Canonical hub | Replaces (ADR-022 stage) |
| ----------- | ------------- | ------------- | ------------------------ |
| Today       | `Aujourd’hui` | `/`           | Accueil                  |
| Plan        | `Plan`        | `/plan`       | `Ma semaine`             |
| Activité    | `Activité`    | `/activite`   | (history half of week)   |
| Moi         | `Moi`         | `/moi`        | `Profil` / Réglages      |

Moi child surfaces (Shell V1.1 split): `/moi/corps`, `/moi/objectifs`, `/moi/performance` (quiet), `/settings/privacy` (Confidentialité). Legacy `/progress?tab=` redirects onto these.

Coach keeps the label `Coach` on contextual CTAs only — not in `bottomNavItems`.

Deep routes (`/training/*`, `/progress`, `/settings/*`) stay valid and light the matching tab. `/settings` redirects to `/moi`.

Two label collisions from the ADR-022 rename still apply where those surfaces live:

- **`Bilan hebdo`** remains the Coach-menu / Plan-hub name for the Weekly Coaching Brief.
- **`Progression`** still names longitudinal athlete development conceptually; the shipped surfaces are Moi → Corps / Objectifs / Performance. `/training/progression` redirects must keep working.

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

The phase is resolved in `src/lib/daily-phase/`, from session status first, athlete state second, and local time only as a fallback — never from the clock alone. There are five, not four: the window right after a session and the close of the day ask different questions and must not be collapsed.

| Phase (`DailyPhase`) | Dominant need                       | Required outcome                                                                                        |
| -------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `MORNING`            | Can I train, and how?               | A clear daily orientation plus a low-friction wellness check-in when it can alter confidence or advice. |
| `BEFORE_SESSION`     | Is this session still appropriate?  | Execute, adapt, move, or discuss the planned session.                                                   |
| `SESSION_COMPLETED`  | What did that session mean?         | Capture perceived effort, reveal the session story, and make its likely effect on tomorrow legible.     |
| `RECOVERY_WINDOW`    | What maximises adaptation now?      | A recovery priority while the window is still open, not a retrospective.                                |
| `END_OF_DAY`         | What should I protect for tomorrow? | A brief closure, recovery priority, and provisional next-day outlook.                                   |

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

| Level                       | Always visible                                                                                                             | Revealed on demand                                                                           |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **Essential** (_Essentiel_) | Verdict, practical reason, action choices, one relevant trend, and uncertainty in plain language.                          | Technical evidence through an explicit “Understand more” action.                             |
| **Expert** (_Expert_)       | The Essential layer plus confidence, source signals, thresholds, CTL/ATL/TSB where relevant, methods, and complete charts. | Raw or historical detail that is useful for interpretation but not for the immediate choice. |

The selected reading level is a presentation preference, not a physiological setting. It must not alter the Digital Twin, DecisionState, safety restrictions, or recommended action.

**Where it lives.** The level is `AthleteProfile.displayMode` — an athlete property, not a device one, so it follows the athlete across screens. It is chosen in Profile → Apparence, alongside the theme, and shipped as `essential` by default; profiles that predate the column were backfilled to `expert` so nothing was taken away from the athlete already reading it. [ADR-023](../adr/ADR-023-reading-density-expert-mode.md) records why.

**How a surface honours it.** By wrapping the technical block in `<ExpertOnly>` (`src/components/display-mode/`), or by filtering a shared metric list with `filterByAudience`. Never by branching inside a ViewModel builder, an API route, or an engine: the level decides what is shown, never what is computed.

**What is expert.** A metric belongs to the Expert level when understanding its name is a prerequisite to reading its value — NP, IF, VI, TSS, efficiency factor, decoupling, zone distributions, the power curve, ACWR, TSB, CTL/ATL and the PMC chart, threshold calibration. Distance, duration, elevation, splits, heart-rate and pace curves, records, body composition and every coach-written sentence stay in the Essential level. Training load may appear in Essential as a plain « charge » figure, never as the TSS acronym. Calibration (FTP, LTHR, CSS, …) is Expert-only — a threshold only makes sense beside the metrics it scales; `/settings/calibration` redirects to Progression → Performance behind `<ExpertOnly>`.

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

### How `/biology` was split

`CorpsHub` mounted three tabs under one route. Progress separates them by the question each answers, which made this a migration rather than a relabel — the hub is gone and `/biology` is a redirect:

| Old tab        | Progress section | Why                                                              |
| -------------- | ---------------- | ---------------------------------------------------------------- |
| Composition    | Corps & santé    | Body composition trends.                                         |
| Suivi physique | Corps & santé    | Active conditions, condition history, and training implications. |
| Records        | Performance      | Records are a performance reading, not a body reading.           |

`/biology?tab=records` still resolves, to `/progress?tab=performance` — `/training/progression?tab=records` pointed at it, so breaking it would have broken two links. `recordCategoryHref` was retargeted with it: it built `?tab=records`, which the new hub would have silently dropped onto the default section.

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

2. **Daily loop (medium) — shipped.** The phase transitions were already in place: five phases resolved from session status and athlete state, each driving its own hero narrative, action labels, why-block title, trajectory eyebrow and adaptation hints, with the morning wellness check-in and post-session effort capture already surfaced. The gap was the contextual Coach, and that is what this stage closed.

   Every surface the Coach section names can now start a conversation — Today, a planned session, an activity, My week, a goal, a record, an active physical constraint — and each one arrives with its context named in a chip above the composer, a link back to where it came from, and a control that drops it before sending. The attachment is the athlete's to keep or discard; it is no longer implicit in a wall of prefilled text.

3. **Longitudinal space (large) — shipped.** `/progress` carries Goals, Performance and Corps & santé as sections of one hub. Records left the body hub for Performance and sit next to the thresholds they are read against; goals and calibration left Settings, which keeps a pointer to each rather than the surface. `/biology`, `/settings/goals` and `/settings/calibration` are redirects, and `/training/progression` no longer chains through them.

   The offline gate is at the hub, not in a section: Progress opens on Goals, and an athlete offline with a cold cache must not have to know to switch tabs before the snapshot appears.

   This closes the two incoherences stage 1 knowingly shipped — Progression now holds goals, and nothing calls a body hub by a longitudinal name.

4. **Reading levels (medium):** add progressive Advanced evidence after the Standard hierarchy is stable.

No stage introduces a new inference engine. Each stage must be released with route, loading, mobile, accessibility, and Instant UX coverage.
