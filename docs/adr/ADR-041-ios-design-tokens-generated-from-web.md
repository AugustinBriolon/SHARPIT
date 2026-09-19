# ADR-041: The iOS design system is generated from the web design system

**Status:** Accepted  
**Date:** 2026-09-19  
**Author:** Augustin Briolon (with Claude Code)  
**Related:** [ADR-039](./ADR-039-ios-system-edge-fade.md), [ADR-040](./ADR-040-ios-product-canonical-api-v1.md)  
**Supersedes:** the token and typography sections (§4.1, §4.2, §4.3) of SHARPIT-APP `docs/superpowers/specs/2026-09-16-ios-design-system-design.md`

---

## Context

`design.md` and `docs/design/DESIGN_LANGUAGE.md` define one design law for SHARPIT, with
values held in `src/lib/brand/brand-tokens.ts` and `src/app/globals.css`. The law states
that pages within a family share the family's shape and that diversification across themes
is forbidden — same product, same system.

The iOS client was built under a different assumption. Its foundation spec (2026-09-16)
decided that the instrument feel should come from "hierarchy and tabular figures, not
custom fonts yet", explicitly declining to embed Syne / IBM Plex Sans / JetBrains Mono,
and left color to be defined in Swift. The result drifted:

| Role        | Web (`brand-tokens.ts`) | iOS (`SharpitTheme.swift`)                 |
| ----------- | ----------------------- | ------------------------------------------ |
| Ink         | Forest Depths `#1c3a13` | `ink` `rgb(0.07, 0.09, 0.11)` — blue-black |
| Interactive | `#2f6b28`               | `Color.accentColor` — system blue          |
| Highlight   | Lime Pulse `#d3fa99`    | `iris` `rgb(0.39, 0.59, 0.97)` — blue      |
| Canvas      | Snow White `#fcfcf7`    | `mist` mint + radial washes                |
| Headings    | Syne 500/600/700        | SF system                                  |

Two systems, one product. The app reads as a generic iOS fitness app rather than as
SHARPIT, and every new screen widens the gap because nothing mechanically ties the two
repositories together. The drift is not a series of implementation mistakes — it is the
predicted outcome of two independent authorings of the same system.

A second forcing function: ADR-040 made iOS the product client. The surface that leads the
product cannot be the one carrying the weakest expression of the brand.

---

## Decision

1. **The web design system is the single source of truth for design values.** The iOS
   client derives its tokens from it and never authors a parallel palette, radius scale or
   type ramp.
2. **Tokens are generated, not transcribed.** A script in this repository
   (`scripts/export-ios-tokens.ts`) reads `brand-tokens.ts` and the `:root` / `.dark`
   blocks of `globals.css` and emits
   `SHARPIT-APP/DesignSystem/SharpitTokens.generated.swift`. The generated file is
   committed to the app repository so that it builds without the sibling checkout. It is
   never hand-edited.
3. **The three brand typefaces are embedded in the app bundle** — Syne (500/600/700),
   IBM Plex Sans (400/500/600), JetBrains Mono (400/500), all SIL OFL 1.1 — and mapped to
   the web's semantic ramp (`text-verdict`, `text-page-title`, `text-section-title`,
   `text-card-title`, `text-data`, `text-instrument`, `text-label`) with Dynamic Type
   scaling.
4. **Spatial values stay native.** The spacing ladder follows the Apple 4/8 pt grid and
   system layout margins. φ (`SharpitRatio`) is demoted from a spacing law to what it
   always usefully was: an optical ratio for divisions _inside_ a component.
5. **Apple chrome stays Apple.** Liquid Glass, the tab bar and navigation remain system
   material. Brand expression lives in the content: flat surfaces, hairline borders,
   elevation by luminosity, semantic color only.

---

## Rationale

Design values are knowledge, and the codebase already holds one authoritative
representation of them. A second hand-authored copy in Swift is duplicated knowledge that
diverged exactly as duplicated knowledge does — silently, and in the direction of whatever
the platform defaults happen to be.

Generation rather than discipline is the operative part. The 2026-09-16 spec did not fail
for lack of care; it failed because nothing made the correct value cheaper to reach for
than `Color.accentColor`. A generated file makes the branded value the default and the
improvised one visibly out of place.

Embedding the typefaces is what makes the app recognisable rather than merely correctly
coloured. Syne carries the verdict and every heading on the web; JetBrains Mono with
tabular figures carries every number. Substituting SF removes the two strongest identity
signals and keeps only the weakest. All three families are SIL OFL 1.1, which permits
embedding in an application bundle.

Keeping spacing native is the reciprocal concession. The φ ladder (13 / 21 / 34 pt) fought
UIKit's 4/8 pt grid and the system's own layout margins, producing the optical
misalignments that made the screens read as unfinished. Fidelity is owed to color, type
and surface language — the things a user recognises — not to the metric grid, which a user
only notices when it is wrong.

---

## Alternatives Considered

### Alternative 1: Keep the iOS system independent, aligned by review

**Description:** Leave `SharpitTheme.swift` hand-authored, correct the palette once to
match the brand, and rely on code review plus the design law documents to keep the two in
step.

**Pros:**

- No build step, no generated artefact, no cross-repository coupling.
- The iOS system stays free to diverge where the platform genuinely demands it.

**Cons:**

- This is the status quo, and the status quo produced the drift table above.
- Every web token change becomes a silent, unnoticed regression on iOS.
- Correctness depends on a reviewer holding both palettes in their head.

**Rejected because:** it is the arrangement that failed, and nothing about repeating it
with better intentions changes the mechanism.

### Alternative 2: Runtime token delivery from the API

**Description:** Serve the token set from `/api/v1/design-tokens` and have the app resolve
colors at runtime, so a web palette change reaches shipped builds without a release.

**Pros:**

- Zero drift by construction, including for versions already in the App Store.
- Enables per-athlete theming later.

**Cons:**

- Colors become a network dependency: first paint must either block or flash defaults.
- Untestable in previews and snapshot tests without a stub server.
- Type ramps and typeface files cannot travel this way, so the problem is only half solved.
- A palette regression on the server instantly breaks every installed client.

**Rejected because:** it buys freshness nobody asked for at the cost of launch
determinism. Design tokens change on the order of months; app releases are faster than
that need.

### Alternative 3: Full web fidelity, including materials

**Description:** Reproduce the web surfaces exactly — no Liquid Glass, no system list
chrome, custom navigation.

**Pros:**

- Maximum cross-platform consistency.
- One visual specification to maintain.

**Cons:**

- The app would feel foreign on iOS and would age badly against each OS release.
- Forfeits accessibility and behaviour that system components provide for free.

**Rejected because:** consistency is owed to the design language, not to the chrome. The
athlete should recognise SHARPIT and still feel an iPhone app.

---

## Consequences

### Positive

- A web token change propagates to iOS by re-running one script; a reviewer sees the
  diff in `SharpitTokens.generated.swift` instead of discovering the gap in a screenshot.
- The app becomes recognisable as SHARPIT at a glance — same ink, same lime, same Syne
  verdict, same tabular instrument figures.
- Dark mode arrives for free and correct, since `.dark` is exported alongside `:root`.
- Feature work stops making design decisions: there is no plausible reason to write a raw
  `Color(...)` in a view any more.

### Negative

- A generated file is committed, so a stale regeneration is possible; CI must verify that
  re-running the exporter produces no diff.
- Bundle size grows by the three embedded families (~1.5 MB, subset to Latin).
- OKLCH is converted to sRGB at export time, so iOS cannot render the wide-gamut values a
  P3 browser can. The difference is below the perceptual threshold for this palette, but
  it is a real one-way narrowing.
- The iOS repository now depends on this one for a build-time artefact, even though the
  committed output keeps the build itself independent.

### Scientific debt created

- None. This decision carries no physiological claim.

---

## Review Criteria

Revisit this decision if any of the following holds:

- The exporter diff-check fails more than twice in a quarter, indicating the generated
  artefact is being worked around rather than regenerated.
- A second native client (watchOS, Android) is added, at which point a
  platform-independent token interchange format (W3C Design Tokens JSON) likely replaces
  the direct Swift emission.
- The wide-gamut narrowing becomes visible — for example if the palette gains a chroma
  value outside sRGB — in which case the exporter should emit `Color(.displayP3, …)`.
- Apple ships a system type ramp or material that makes an embedded-typeface heading
  actively hostile to platform accessibility features.
