# SHARPIT docs

Quick map so agents and humans do not treat historical material as law.

## Law (read first)

| Area             | Document                                                                                                                                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product          | [`product/PRODUCT.md`](./product/PRODUCT.md) · near-term [`product/ROADMAP_NEXT_4_WEEKS.md`](./product/ROADMAP_NEXT_4_WEEKS.md)                                                                                  |
| Design           | [`design/DESIGN_LANGUAGE.md`](./design/DESIGN_LANGUAGE.md) · [`design/DESIGN_SYSTEM_PROMPT.md`](./design/DESIGN_SYSTEM_PROMPT.md) · [`design/INFORMATION_ARCHITECTURE.md`](./design/INFORMATION_ARCHITECTURE.md) |
| Domain           | [`domain/DOMAIN.md`](./domain/DOMAIN.md)                                                                                                                                                                         |
| Core / models    | [`models/CORE_ARCHITECTURE.md`](./models/CORE_ARCHITECTURE.md) · [`models/README.md`](./models/README.md)                                                                                                        |
| Code conventions | [`../ARCHITECTURE.md`](../ARCHITECTURE.md)                                                                                                                                                                       |

## Supporting (when the task needs them)

| Area                            | Location                                                                                                                                                                                                                                                   |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ADRs                            | [`adr/`](./adr/)                                                                                                                                                                                                                                           |
| Engineering                     | [`engineering/`](./engineering/) · [`EVENT_DRIVEN_ARCHITECTURE.md`](./EVENT_DRIVEN_ARCHITECTURE.md) · [`INSTANT_UX_ARCHITECTURE.md`](./INSTANT_UX_ARCHITECTURE.md) · [`ATHLETE_SNAPSHOT.md`](./ATHLETE_SNAPSHOT.md) · [`PWA_TESTING.md`](./PWA_TESTING.md) |
| Science corpus                  | [`../knowledge/`](../knowledge/)                                                                                                                                                                                                                           |
| Legal drafts                    | [`legal/`](./legal/)                                                                                                                                                                                                                                       |
| Product verticals (implemented) | [`product/SCENARIO_ENGINE.md`](./product/SCENARIO_ENGINE.md) · [`product/PROJECTED_ATHLETE_STATE.md`](./product/PROJECTED_ATHLETE_STATE.md) · [`product/INTELLIGENT_PLANNED_SESSIONS.md`](./product/INTELLIGENT_PLANNED_SESSIONS.md)                       |

## Historical (do not drive product or design)

| Area                 | Location                                                    |
| -------------------- | ----------------------------------------------------------- |
| Archive index        | [`archive/README.md`](./archive/README.md)                  |
| Point-in-time audits | [`audits/`](./audits/)                                      |
| Redirect stubs       | Many root `docs/*.md` files say `# Moved` — follow the link |

**Rule:** if a doc lives under `archive/` or is labeled historical / sprint / capture, it yields to Product + Design + Core law above.
