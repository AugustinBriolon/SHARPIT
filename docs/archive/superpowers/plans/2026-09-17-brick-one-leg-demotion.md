# Brick one-leg demotion — implementation plan

> **For agentic workers:** execute task-by-task with TDD.

**Goal:** Removing one brick leg demotes the survivor to a simple session and refreshes Today/Plan after coach mutations.

**Architecture:** Pure demotion predicate + server-side clear in `deletePlannedSession`; display grouping falls back to single; coach cache widens invalidation to Today/Plan keys.

**Tech Stack:** Prisma, Vitest, React Query

## Global Constraints

- Brick = 2 chained activities; one leg alone is not a brick
- No demoted/half-brick label
- Invalidate Today/Plan after coach muts; no cross-athlete; do not weaken consent
- FR copy without em dashes

## Tasks

- [ ] Pure demotion helper + tests
- [ ] `deletePlannedSession` demotes + clears BrickAnalysis + tests
- [ ] Grouping demotes <2 legs + tests
- [ ] Optimistic remove clears sibling brick fields
- [ ] Coach cache invalidates Today + trainingPlan + tests
- [ ] Glossary note if needed; commit; PR draft
