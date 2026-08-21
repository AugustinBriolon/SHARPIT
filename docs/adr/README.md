# SHARPIT — Architecture Decision Records

> Authoritative architectural decisions. When an ADR conflicts with informal docs, the ADR wins for its scope.

| ADR                                                              | Title                                                                        | Status   |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------- |
| [ADR-001](./ADR-001-pmc-time-constants.md)                       | PMC time constants (τ_ctl=42, τ_atl=7)                                       | Accepted |
| [ADR-002](./ADR-002-cross-sport-tss.md)                          | Cross-sport TSS normalization                                                | Accepted |
| [ADR-003](./ADR-003-garmin-primary-source.md)                    | Garmin as primary health source                                              | Accepted |
| [ADR-004](./ADR-004-signal-persistence.md)                       | Signal persistence strategy                                                  | Accepted |
| [ADR-005](./ADR-005-plan-safety-gate-placement.md)               | Plan Safety & Coherence Gate — placement outside frozen Core                 | Accepted |
| [ADR-006](./ADR-006-decision-memory-aggregate.md)                | Decision Memory — a new aggregate, separate from DecisionRecord              | Accepted |
| [ADR-007](./ADR-007-coaching-explainability-presentation.md)     | Coaching Explainability Presentation Layer                                   | Accepted |
| [ADR-008](./ADR-008-pwa-offline-snapshot-and-sw-lifecycle.md)    | PWA offline Snapshot persistence and service-worker update lifecycle         | Accepted |
| [ADR-009](./ADR-009-turbopack-build-and-serwist-configurator.md) | Turbopack builds and Serwist in configurator mode                            | Accepted |
| [ADR-010](./ADR-010-cache-components-and-instant-navigation.md)  | Cache Components and Partial Prefetching for instant navigation              | Accepted |
| [ADR-011](./ADR-011-pmc-state-and-window-semantics.md)           | PMC state and window semantics (window is display, not computation)          | Accepted |
| [ADR-012](./ADR-012-bidirectional-threshold-recency.md)          | Bidirectional threshold revision with 120-day recency window                 | Accepted |
| [ADR-013](./ADR-013-myfitnesspal-authenticated-api.md)           | MyFitnessPal integration via authenticated JSON API                          | Accepted |
| [ADR-014](./ADR-014-myfitnesspal-rolling-session.md)             | MyFitnessPal session kept alive by rolling next-auth's cookie forward        | Accepted |
| [ADR-015](./ADR-015-strength-watch-fidelity-and-scoring.md)      | Strength sessions — full watch push, compliance scored without duration      | Accepted |
| [ADR-016](./ADR-016-endurance-prescription-relative-targets.md)  | Endurance prescriptions — relative targets resolved at watch push time       | Accepted |
| [ADR-017](./ADR-017-endurance-prescription-authoring.md)         | Endurance prescriptions — authored by coach and athlete, prose derived       | Accepted |
| [ADR-018](./ADR-018-swim-css-threshold.md)                       | Swim pace targets anchored on a CSS threshold derived from realised sessions | Accepted |
| [ADR-019](./ADR-019-endurance-compliance.md)                     | Endurance compliance measured per step on a stream-derived segmentation      | Accepted |

**Template:** [ADR-template.md](./ADR-template.md)

**Related:** Engineering audits (non-binding reviews) live in [`docs/audits/`](../audits/).
