# Product

<!-- impeccable:product-schema 1 -->

> **Inference note (init):** AskUserQuestion unavailable this session. Facts below are
> inferred from `docs/product/PRODUCT.md`, DESIGN.md, and the running app, then written
> because the user asked to complete `/impeccable init` without a live interview.
> Marked `[inferred]` where not reconfirmed verbally. Canonical long-form constitution
> remains `docs/product/PRODUCT.md`.

## Platform

web

## Users

[inferred] Endurance / multi-sport athletes (triathlon, run, bike, swim, strength) who
already collect wearable and training data and need a continuous model of physiological
state to decide train / hold / recover day to day.

[inferred] Secondary: the same athlete planning a week toward a race goal; human coaches
remain valuable but are not the primary in-app user.

## Product Purpose

SHARPIT exists to give athletes a continuous, honest, evolving representation of their
physiological state — closing the gap between what was measured and what is true about
the athlete right now, and making that truth actionable without concealing its limits.

Success = better **decision quality over time** (train or rest, push or hold, adapt the
plan or trust the process), not engagement metrics or workout volume.

## Positioning

**Athlete State Intelligence** — a persistent intelligence layer between raw wearable
data and human expertise. Not a tracker (records), not a planner identity (prescribes
as the center), not a coach chatbot (improvises). State is estimated; uncertainty is
shown; the Digital Twin is the center of gravity.

## Operating Context

[inferred] Primary daily ritual: **Today** morning orientation (verdict → signals →
session response → trajectory). Secondary: Planning (week calendar), Training history,
Biology / Corps, Coach discuss when the athlete chooses to deepen a question.

[inferred] Mobile-first PWA / web app used on phone in the morning and around sessions;
desktop for denser planning and analysis.

## Capabilities and Constraints

Confirmed in product constitution / codebase:

- Digital Twin / Athlete Snapshot as canonical state
- Today morning instrument; physio drill-downs (sleep, recovery, adaptation, effort)
- Planning with planned sessions, bricks, projection trajectory, scenario compare
- Training activity history and compliance
- Coach conversation as opt-in discuss — not the primary surface of Planning
- Phase: **stabilization** — Core frozen; express the Twin vertically; do not add core
  engines casually

Constraints:

- Augments judgment; does not replace coach or physician
- No live in-session coaching by design
- Instrument-editorial design law (`DESIGN.md` / `docs/design/DESIGN_LANGUAGE.md`)

Open / undecided for Impeccable:

- [undecided] Whether Planning should ever deep-link to Coach from projection (currently
  removed; coach entry via SessionsCoachMenu « Ma semaine » only)

## Brand Commitments

- Name: **SHARPIT**
- Voice: precise, clinical-instrument, French UI copy; no motivational micro-copy,
  streak theater, or chatbot sparkle chrome
- Visual authority: locked in `DESIGN.md` (instrument-editorial) — init does not redefine it

## Evidence on Hand

- Constitution: `docs/product/PRODUCT.md`
- Design system: `DESIGN.md`, `docs/design/DESIGN_LANGUAGE.md`, `docs/design/DESIGN_SYSTEM_PROMPT.md`
- Domain / architecture: `docs/domain/DOMAIN.md`, `docs/models/CORE_ARCHITECTURE.md`,
  `ARCHITECTURE.md`
- Running Next.js app under `src/`

Absences future work must not fabricate: testimonials, benchmarks, pricing claims,
coach-replacement promises.

## Product Principles

1. **State before prescription** — the Twin explains before the calendar commands.
2. **Honesty about limits** — confidence, freins, and empty states are product features.
3. **Instrument, not dashboard** — one causal column; no metric inventory heroes.
4. **Athlete decides** — SHARPIT informs; it does not remove accountability.
5. **Silence in the session** — no live coaching noise; morning and post-session matter.

## Accessibility & Inclusion

[inferred] Touch-first targets (44px mobile), `prefers-reduced-motion` respected,
French primary UI. No separate WCAG target number confirmed in interview — follow
existing app a11y patterns (focus rings, aria on critical controls).
