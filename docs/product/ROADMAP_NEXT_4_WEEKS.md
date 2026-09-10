# SHARPIT — Next 4 weeks (frozen slice)

**Status:** Binding for near-term sequencing  
**Frozen on:** 2026-09-10  
**Horizon:** ~4 weeks from freeze date  
**Doctrine:** Express the Twin; do not add Core engines (`PRODUCT.md` Part II).  
**Source map:** [`PRODUCT.md`](./PRODUCT.md) friction map · [`PRODUCT_AUDIT_AND_ROADMAP_2026-08.md`](../audits/PRODUCT_AUDIT_AND_ROADMAP_2026-08.md)

This is not a five-year vision. It is the ordered work that prevents another “what next?” stall.

---

## North star for this slice

Close the last Critical gap in the morning contract (**verdict delivery before open**), while making the training day loop honest (session ↔ Twin ↔ after).

Everything else waits unless it unblocks these.

---

## Week 1 — Stabilize + observe

| #   | Work                                                                              | Done when                                                       |
| --- | --------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 1.1 | Journal–coach discuss (ADR-030/031) treated as **Accepted** and regression-tested | ADRs Accepted; habit-bridge + discuss tests green               |
| 1.2 | Daily Briefing remounted under Today verdict                                      | Athlete can open/collapse « Briefing du jour » after cold start |
| 1.3 | Dogfood 3 mornings: verdict + briefing + journal bridge                           | Written notes: fold competition? redundant with verdict?        |

**Exit gate:** no open P0 on journal Pro gate or Today crash; briefing does not invent copy while pending.

---

## Week 2 — Foundations the next feature needs

August audit Phase 2 — cheap correctness before push:

| #   | Work                                                                 | Effort |
| --- | -------------------------------------------------------------------- | ------ |
| 2.1 | Presentation query keys → `src/lib/query/keys.ts` (ban inline drift) | S      |
| 2.2 | Move `ensureMorningRecalibration` off `GET /api/presentation/today`  | M      |
| 2.3 | E2E smoke: cold Today → verdict → wellness → revised verdict         | M      |

**Exit gate:** Today read path has no write side-effect; morning journey has one E2E.

---

## Week 3 — Morning verdict delivery (Tier 1 remaining Critical)

| #   | Work                                                                         | Constraint                                           |
| --- | ---------------------------------------------------------------------------- | ---------------------------------------------------- |
| 3.1 | Web Push infra: VAPID, subscription store, SW `pushManager`, Settings opt-in | Athlete-controlled; silenceable                      |
| 3.2 | One morning notification: **verdict sentence only** at local wake time       | No streaks, no re-engagement, no “open the app” nags |

**Constitutional test:** does this replace an app-open with an answer? If it manufactures an open, it does not ship.

**Exit gate:** opt-in athlete receives one silenceable morning verdict without opening the app.

---

## Week 4 — Training-loop slice (pick ONE)

Choose based on Week 1 dogfood; do not start both.

| Option          | Work                                                                                        | Serves      |
| --------------- | ------------------------------------------------------------------------------------------- | ----------- |
| **A (default)** | Post-session surface on Today when a new activity syncs (narrative + one subjective prompt) | Moments 8–9 |
| **B**           | Planned-session compatibility narrative (modify / execute / rest explicit vs Twin)          | Moments 4–5 |

**Exit gate:** the chosen option is live for the primary athlete path, with tests.

---

## Explicitly out of this freeze

Do **not** start these in the next four weeks unless the Critical push is done and Week 4 option is shipped:

- Race week / taper / off-season voice modes (Phase 4)
- Injury → verdict pipeline (Tier 4)
- Evening pre-sleep check-in
- Body view model greenfield UI (decide surface vs delete only if cheap)
- Multi-tenant beyond ADR-025 foundation
- New inference / Core engines
- Engagement notifications, streaks, badges

---

## Decision log (keep short)

| Date       | Decision                                                                                                   |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| 2026-09-10 | Remount Daily Briefing under verdict despite #78 fold concern — progressive disclosure + dogfood in Week 1 |
| 2026-09-10 | Accept ADR-030 + ADR-031; journal discuss + multi-kind server registry are product law                     |
| 2026-09-10 | Next Critical = morning push, not more Coach surfaces                                                      |

---

## How to use this doc

1. Before starting work, check it is in Weeks 1–4 above.
2. If a shiny idea is not listed, park it — update this freeze only with an explicit product decision.
3. After Week 4, rewrite this file for the next slice from the live friction map.
