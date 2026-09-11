# Product

<!-- impeccable:product-schema 1 -->

> **Inference note (init):** AskUserQuestion unavailable this session. Facts below are
> inferred from `docs/product/PRODUCT.md`, DESIGN.md, and the running app, then written
> because the user asked to complete `/impeccable init` without a live interview.
> Marked `[inferred]` where not reconfirmed verbally. Canonical long-form constitution
> remains `docs/product/PRODUCT.md`.
>
> **Direction (2026-09-11):** Digital Twin coach — Twin = foundation; coaching +
> programme + suivi toward a goal = product. Core stays frozen; express vertically.

## Platform

web

## Users

[inferred] Endurance / multi-sport athletes (triathlon, run, bike, swim, strength) who
already collect wearable and training data and need a continuous Twin that analyses,
programmes, follows, and rearranges toward a performance or health goal.

[inferred] Secondary: the same athlete with optional human-coach coexistence later;
SHARPIT coaches the athlete in-product — human coaches are not the primary in-app user.

## Product Purpose

SHARPIT exists to maintain a continuous, honest Digital Twin of the athlete — and to
**coach from that Twin**: best analyses, best programme for an objective, suivi of
progress and habits, rearrange when evidence changes. Twin = foundation; coaching +
programme + suivi = product.

Success = better **decision quality and programme coherence over time** (train or rest,
push or hold, fill the week, adjust the plan), not engagement metrics or workout volume.

## Positioning

**Athlete State Intelligence** expressed as a **Digital Twin coach** — a persistent Twin
between raw wearable data and credible training guidance. Not a tracker (records), not a
calendar-only planner, not an improvising chatbot. State is estimated; uncertainty is
shown; analyses and programme changes are consequences of the Twin, with athlete approval.

## Operating Context

[inferred] Primary daily ritual: **Today** morning orientation (verdict → why → session
response → rearrange CTA when needed). Secondary: **Plan** (Coacher mon objectif —
macro / Remplir / Ajuster), Activité, Moi; Coach discuss as contextual deepening — not
the whole coaching product.

[inferred] Mobile-first PWA / web app used on phone in the morning and around sessions;
desktop for denser planning and analysis.

## Capabilities and Constraints

Confirmed in product constitution / codebase:

- Digital Twin / Athlete Snapshot as canonical state (**foundation**)
- Today morning instrument; physio drill-downs; why / habit coaching signals; feedback→rearrange proposals
- Plan hub: Coacher mon objectif (macro + Remplir + Ajuster) with athlete-approved mutation
- Training activity history and compliance
- Coach conversation as contextual / free discuss — one coaching expression, not the only one
- Phase: **stabilization** — Core frozen; express the Twin vertically as coach; do not add
  core engines casually

Constraints:

- Athlete agency: proposals require approval; no silent plan mutation
- Does not replace clinical / physician judgment (not a medical device)
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
or claims that SHARPIT replaces physicians / medical care.

## Product Principles

1. **Twin before improvisation** — coaching and programme flow from the Twin, not from a free-form chat.
2. **Honesty about limits** — confidence, freins, and empty states are product features.
3. **Instrument, not dashboard** — one causal column; no metric inventory heroes.
4. **Athlete decides** — SHARPIT coaches and proposes; approval stays with the athlete.
5. **Silence in the session** — no live coaching noise; morning, Plan, and post-session matter.

## Accessibility & Inclusion

[inferred] Touch-first targets (44px mobile), `prefers-reduced-motion` respected,
French primary UI. No separate WCAG target number confirmed in interview — follow
existing app a11y patterns (focus rings, aria on critical controls).
