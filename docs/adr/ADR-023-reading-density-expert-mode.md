# ADR-023: Reading density — one athlete preference, gated at the surface

**Status:** Accepted
**Date:** 2026-08-23
**Author:** Principal Architect
**Supersedes:** N/A
**Superseded by:** N/A

---

## Context

SHARPIT was built for an athlete who already speaks the vocabulary. An activity page opens on NP, IF, VI, TSS, efficiency factor and decoupling; the effort drill-down opens on ACWR, TSB and the PMC curves. That reading is correct and it is the reason the product exists — but it is unreadable for anyone who has not been taught it, and it is the first wall a newcomer hits.

Two readings therefore have to coexist: an **essential** one (what happened, what it cost, what comes next) and an **expert** one (the technical layer the essential reading was derived from). Nothing about the Digital Twin changes between them. Every engine computes the same values, every ViewModel carries the same fields; only what reaches the screen differs.

Three questions had to be settled before writing the first gate: where the preference lives, what the gate operates on, and who decides which metric belongs to which reading.

---

## Decision

### 1. The density lives on `AthleteProfile`, not on the device

`AthleteProfile.displayMode` (`'essential' | 'expert'`, default `'essential'`) is a new column, patched through the existing `PATCH /api/athlete-profile` route and read through the existing profile query.

The theme preference — the other display preference in the app — is deliberately device-local (`src/lib/theme/theme.ts`): a dark screen at night is a property of the room, not of the athlete. Reading density is the opposite. It says what the athlete understands, and that does not change when they pick up a tablet. Storing it per device would mean an athlete who set Expert on their phone is handed the beginner reading on desktop, with no signal as to why.

The cost is that the density is not known before paint: it arrives with the profile query rather than with a cookie. `DisplayModeProvider` therefore exposes `isResolved`, and `ExpertOnly` renders **nothing** while the answer is pending. An expert block may appear a beat after the page; it never appears and then disappears. That trade is acceptable precisely because expert blocks are secondary detail — the essential reading is the page.

The migration backfills every existing profile to `'expert'`. Profiles created before this column were built against the expert reading; defaulting them to essential would silently strip metrics from an athlete who never asked for that.

### 2. The gate is a surface concern — `<ExpertOnly>`, not a ViewModel field

Expert metrics are hidden by wrapping the block that renders them. No presentation builder branches on the density, no API route filters its payload, no engine is aware the preference exists.

The alternative — marking each metric's audience inside the ViewModel and letting the builder drop the expert ones — would have pushed a **display preference into the layer that describes the athlete's state**, and made every ViewModel's shape depend on who is reading. Cache keys, offline snapshots and the coach context all consume those ViewModels; a payload that changes shape with a UI toggle would have to be re-keyed everywhere, and the coach would risk reasoning on a truncated twin.

`src/lib/preferences/display-mode.ts` also carries `filterByAudience`, for the case where the expert metrics are _rows inside a shared list_ rather than a whole block. It is a pure list filter applied at render time — same seam, different granularity.

### 3. A metric is expert when its name is the barrier

The line is not "advanced" versus "basic", and it is not about precision. A metric belongs to the expert reading when **understanding its name is a prerequisite to reading its value**:

- Expert: NP, IF, VI, TSS, efficiency factor, decoupling, pace variability, HR/power zone distributions, the power curve, ACWR, TSB, CTL/ATL and the PMC chart, threshold calibration (FTP, LTHR, CSS).
- Essential: distance, duration, elevation, splits, heart rate and pace curves, personal records, body composition, sleep, the narrative and every coach-written sentence. Training load may still appear as a plain figure labelled « charge » — never as the TSS acronym.

Splits and stream charts stay in the essential reading on purpose: a kilometre time and a heart-rate curve are read without training literacy. Records stay because a personal best is self-explanatory.

**Calibration is Expert-only.** A threshold is the yardstick the technical metrics are read against; it means nothing to an athlete who was never shown those metrics. The Progression → Performance calibration panel is wrapped in `<ExpertOnly>`. `/settings/calibration` redirects there. Engines still use whatever thresholds are stored — Essential athletes simply do not edit them until they opt into Expert.

---

## Options considered

### Option A — Device-local preference, mirrored in a cookie like the theme

**Pros:** Resolved before paint, zero migration, no flash of a pending state, exactly the pattern already in the repo.
**Cons:** The density follows the device instead of the athlete; a multi-device athlete gets a different product on each screen and no way to understand why. It also puts a statement about the athlete's literacy in browser storage that is wiped by a cache clear.
**Rejected because:** the preference describes the reader, and the reader is the athlete — the same argument that puts thresholds and goals on the profile.

### Option B — Audience baked into the ViewModels, filtered server-side

**Pros:** One authority per metric, no chance a surface forgets to gate; smaller payloads in the essential reading.
**Cons:** Makes a UI preference part of the twin's description, forks every cached payload and offline snapshot by density, and risks the coach reading a twin that was truncated for display reasons.
**Rejected because:** CORE_ARCHITECTURE.md draws the boundary the other way round — the Presentation layer decides how state is shown; it does not get to change what the state _is_.

### Option C — Per-surface toggles ("show advanced metrics" on each page)

**Pros:** Maximum granularity; the athlete opens exactly the panels they want.
**Cons:** Multiplies the state, gives no single answer to "who is this athlete", and makes the accessible reading something the athlete has to assemble page by page rather than something the product offers.
**Rejected because:** the product should know which athlete it is talking to, not ask again on every screen.

---

## Consequences

### Positive

- The technical layer becomes an opt-in rather than the entry fee, without diluting it for the athlete who wants it.
- One seam to reason about: any new expert metric is gated by wrapping it, and the decision of _whether_ to gate is a single documented question ("is the name the barrier?").
- The engines, the ViewModels and the coach context are untouched — the density cannot cause a computation to differ.

### Negative

- The gate is a convention, not a constraint: nothing prevents a future surface from rendering an expert metric ungated. The audience table in this ADR is the only authority, and it has to be kept honest by review.
- Expert blocks arrive one query after the page. On a cold, offline start the profile may never resolve, and the athlete gets the essential reading — a safe default, but not their chosen one.

### Neutral

- `src/components/settings/preference-radio-group.tsx` was extracted from the theme picker so both preferences share one radio-card pattern. It is a presentational component; no behaviour changed for the theme.

---

## References

- `docs/models/CORE_ARCHITECTURE.md` — the Presentation-layer boundary this decision keeps.
- `docs/design/DESIGN_LANGUAGE.md` §"Progressive disclosure" — secondary information behind an interaction, of which the density is the coarsest form.
- `src/lib/preferences/display-mode.ts`, `src/providers/display-mode-provider.tsx`, `src/components/display-mode/expert-only.tsx` — implementation.
- `prisma/migrations/20260823_athlete_display_mode/migration.sql` — the column and the backfill of existing profiles to `expert`.
