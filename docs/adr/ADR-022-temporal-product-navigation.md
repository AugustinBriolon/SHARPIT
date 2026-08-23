# ADR-022: Adopt temporal product navigation

**Status:** Accepted

**Date:** 2026-08-22

**Author:** Product team

**Supersedes:** N/A

---

## Context

SHARPIT currently exposes product areas through domain-led destinations: Accueil, Entraînement, Physiologie, Coach, and Réglages. A single athlete intention can span several of those areas: goals and threshold calibration live in Réglages even though they govern the plan and describe the athlete; records sit under Physiologie while activity history sits under Entraînement; and physiological evidence competes with the day-level decision instead of consistently explaining it.

Part of the problem has already been solved under a different name. `/training` is a unified thread that merges calendar, planning, and history; `/training/sessions` and `/training/progression` are redirects into it and into Réglages. There is no `/training/calendar`. So the remaining defect is not duplicate planning hubs — it is that the destinations are named after data domains, and that longitudinal athlete development has no home at all.

The product's primary use is a daily orientation based on sleep, recovery, environmental context, training load, and other athlete observations. Secondary needs are planning a week, reviewing progress, discussing a question with the Coach, and maintaining the athlete profile. The frozen Core already produces the necessary state and decisions; this is a product-surface problem, not an inference problem.

## Decision

Adopt a temporal, decision-led information architecture with five primary destinations: Today, My week, Progress, Coach, and Profile. Keep the Coach both as a free-conversation destination and as a contextual action. Treat physiological domains, weather, nutrition, goals, and physical conditions as decision context or progressive detail rather than competing primary destinations.

The complete surface contract and route direction are defined in [INFORMATION_ARCHITECTURE.md](../design/INFORMATION_ARCHITECTURE.md).

## Rationale

The chosen structure follows the athlete's actual rhythm: decide today, organise the week, evaluate progress, seek reflection, and maintain the model. It expresses the Digital Twin vertically without introducing a new Core engine, gives longitudinal development the home it currently lacks, and supports novice-to-expert progressive disclosure without changing the underlying decision.

The training thread already proved the principle for the week horizon: one surface, view state instead of sibling hubs. This decision applies the same rule to the remaining horizons rather than inventing a new one.

## Alternatives considered

### Alternative 1: Keep the domain-led navigation

**Description:** Retain Accueil, Entraînement, Physiologie, Coach, and Réglages as the primary navigation and improve individual pages locally.

**Pros:**

- Requires less navigation migration in the short term.
- Keeps existing URL ownership unchanged.

**Cons:**

- The athlete must infer which technical domain contains an answer to a time-based decision.
- Goals and calibration stay filed as configuration, and longitudinal development keeps no home of its own.
- Contextual evidence continues to compete with the primary decision.

**Rejected because:** local page refinement cannot resolve a navigation model that is organised around the system instead of the athlete's moment.

### Alternative 2: Make the Coach the primary application surface

**Description:** Use a conversational Coach as the default entry point for daily state, planning, and progression.

**Pros:**

- Provides a flexible interface for diverse questions.
- Can carry context from many product areas.

**Cons:**

- Hides the daily decision and its evidence behind a conversation.
- Is less scannable than an instrumented state surface in the morning.
- Risks making the Coach a black-box authority instead of an optional partner.

**Rejected because:** SHARPIT is an Athlete State Intelligence product. Conversation augments athlete judgment but must not replace the visible Digital Twin and its decision evidence.

### Alternative 3: Use four primary destinations with Profile hidden in an overflow menu

**Description:** Keep Today, My week, Progress, and Coach in primary navigation; move Profile and Settings to an overflow menu.

**Pros:**

- Reduces mobile navigation density.
- Emphasises product activity over configuration.

**Cons:**

- Makes integrations, equipment, and maintenance harder to discover when needed.
- Introduces a different mobile and desktop information architecture.

**Rejected because:** five destinations fit the existing mobile navigation capacity while keeping the utility destination visibly distinct and consistent across devices.

## Consequences

### Positive

- Daily, weekly, and longitudinal athlete questions have a single primary home.
- Goals, body trends, health constraints, records, and calibration become discoverable as parts of athlete development rather than settings or isolated data domains.
- The Coach can be opened without context or from the exact decision being discussed.
- Standard and Advanced reading levels can share one decision model and one safety contract.

### Negative

- Implementing the decision requires a staged migration of routes, navigation matching, prefetching, back-links, empty states, and offline surface mappings.
- Existing users and internal documentation will need transitional labels and compatible deep links.
- Progress becomes a broad surface and needs strict progressive disclosure to avoid becoming a dashboard.
- Threshold calibration and records move again, having been placed in their current homes only recently. See below.
- `/biology` stops being one hub: its three tabs split across two Progress sections, so `?tab=` deep links must be preserved by hand.

### Decisions this reverses

No prior ADR covers them, so there is nothing to formally supersede — but two placements made deliberately in code are undone here, and the reasoning must not be lost:

| Placement                                    | Original reasoning                     | Why it changes                                                                                             |
| -------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Calibration moved to `/settings/calibration` | "Calibration is a settings panel."     | It is a description of the athlete, not a product preference. It belongs with the performance it explains. |
| Records moved to `/biology?tab=records`      | "Records are a physiological reading." | Records are a performance reading. Body composition and conditions are the physiological ones.             |

Both moves were correct against the old destination set, where the only alternatives were a training hub and a data domain. They are wrong against a set that contains Progress. Neither reversal happens before Progress exists; until then, both routes stay where they are.

### Scientific debt created

- None. The decision changes product expression only and does not alter the Core, the Digital Twin, or inference models.

## Review criteria

Revisit this decision if any of the following occurs:

- Athlete research shows that daily orientation, weekly planning, and progress do not match the five temporal destinations.
- The fifth mobile destination causes repeated navigation errors or materially reduces access to a primary athlete task.
- A new Core capability requires a persistent athlete task that cannot be placed in Today, My week, Progress, Coach, or Profile without creating a misleading concept.
- Contextual Coach entry points reduce evidence visibility or lead athletes to treat Coach output as an unchallengeable prescription.

## References

- [PRODUCT.md](../product/PRODUCT.md)
- [DESIGN_LANGUAGE.md](../design/DESIGN_LANGUAGE.md)
- [ATHLETE_SNAPSHOT.md](../ATHLETE_SNAPSHOT.md)
- [INSTANT_UX_ARCHITECTURE.md](../INSTANT_UX_ARCHITECTURE.md)
- [INFORMATION_ARCHITECTURE.md](../design/INFORMATION_ARCHITECTURE.md)
