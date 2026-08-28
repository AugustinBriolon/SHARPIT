# ADR-028: Animation technology choice and press feedback calibration

**Status:** Accepted
**Date:** 2026-08-27
**Author:** Principal Architect
**Supersedes:** N/A
**Superseded by:** N/A

---

## Context

SHARPIT already ships `motion` (Framer Motion API) for a narrow set of state-driven surfaces — expand/collapse, mount/unmount, stagger lists, coach/agent UI — and CSS utilities (`pressable`, `pressable-lg`, `chip-surface`, `chip-surface-lg`) for press feedback on interactive surfaces.

Two problems were left implicit:

1. **Technology choice.** Agents and contributors had no written rule for when to reach for CSS, Motion, or a heavier library such as GSAP. The default drift is to import Motion for every hover or press — adding bundle weight and coupling animation to React lifecycle when CSS would suffice.

2. **Press feedback.** A single `scale(0.96)` was applied broadly via `pressable`, without guidance on when a large card, a high-frequency control, or a gesture-driven surface needs a different response. Universal compression makes large surfaces feel mushy and high-frequency controls feel sluggish.

`docs/design/DESIGN_LANGUAGE.md` §9 governs duration, easing, and reduced motion. It did not yet govern **which technology** to use or **how to calibrate press feedback** by component class.

---

## Decision

### 1. Do not introduce an animation library by default

Use the **simplest technology capable of producing the desired interaction**. No new dependency (Motion, GSAP, or other) without an explicit justification tied to a concrete interaction requirement.

### 2. CSS is the default for simple micro-interactions

Use CSS transitions and pseudo-states for:

- hover
- focus
- active / press (when not gesture-driven)
- opacity
- transform
- color
- border
- simple state transitions

Prefer existing utilities (`pressable`, `pressable-lg`, `chip-surface`, `chip-surface-lg`) and token-backed CSS custom properties before writing bespoke rules.

### 3. Motion is justified when animation is tightly coupled to application state or component lifecycle

Use `motion` (already in the dependency tree) when the interaction requires:

- mount / unmount
- exit animations (`AnimatePresence`)
- layout transitions
- gestures
- springs
- React state-driven transitions

Never use Motion for an effect achievable with equivalent quality via CSS alone.

### 4. GSAP is justified only for advanced choreography

GSAP is **not** a project dependency today. Add it only when a feature requires:

- timelines
- multi-element sequences
- precise synchronization
- complex interaction-driven animations
- scroll-driven animation
- SVG / WebGL / immersive experiences

Never use GSAP or Motion when a CSS transition provides the same result with equivalent quality.

### 5. Never apply a universal press scale to every interactive component

Do not blanket-apply `scale(0.97)` (or any single scale) across buttons, cards, nav items, and high-frequency controls. Calibrate press feedback according to:

- component dimensions
- interactive surface area
- interaction frequency
- component hierarchy
- perceived physicality
- importance of the action

The goal is not to maximize visible movement. The goal is an **immediate, proportional perception of physical feedback**.

### 6. Prefer semantic interaction presets over arbitrary per-component values

Canonical presets live in `src/lib/motion/tokens.ts` (`motionTokens.scale.press*`) and are mirrored as CSS custom properties in `src/app/globals.css`:

| Preset | Token | Scale | Typical use |
| ------ | ----- | ----- | ----------- |
| Micro control | `pressMicro` | 0.95 | Icon buttons, compact toggles |
| Small button | `pressSmall` | 0.96 | Default compact controls (`pressable`, `chip-surface`) |
| Large button | `pressLarge` | 0.98 | Wide CTAs, full-width actions |
| Large surface | `pressSurface` | 0.988 | Clickable cards and list rows (`pressable-lg`, `chip-surface-lg`) |
| High-frequency | `pressMinimal` | 1 (no scale) | Tabs, scrubbers, sliders — color/opacity only |
| Gesture-driven | Motion `whileTap` + `springs.*` | spring | Drag, swipe, morph — not CSS `:active` scale |

Floor: **never below 0.95** on `:active` scale — compression below that reads as a bug, not feedback.

Any deviation from these presets requires an inline comment naming the preset being overridden and why.

---

## Rationale

- **CSS-first** keeps the instrument-fast feel §9.2 protects and avoids shipping React animation overhead on every chip hover.
- **Motion where state-bound** matches existing usage (`MotionExpand`, `AnimatePresence`, coach UI) without pretending every transition needs a component wrapper.
- **GSAP as opt-in** prevents timeline libraries from becoming the default tool for a 150ms opacity fade.
- **Semantic press presets** encode the product rule that large surfaces compress less than small controls — already partially implemented via `pressable-lg` at 0.988 vs `pressable` at 0.96; this ADR names and centralizes that split.

---

## Alternatives considered

### Alternative 1: Motion everywhere for consistency

**Pros:** One API; springs and exit animations in one place.
**Cons:** Heavier bundle; forces React wrappers on static links and chips; couples press feedback to component tree.
**Rejected because:** CSS already delivers equivalent quality for hover, focus, and simple press on static surfaces.

### Alternative 2: Single universal `pressable` scale on all interactives

**Pros:** One utility, zero decisions.
**Cons:** Large cards feel spongy; nav tabs and scrubbers feel laggy; violates proportional physical feedback.
**Rejected because:** `pressable-lg` already proved the product needs at least two tiers; this ADR extends that to a named preset table.

### Alternative 3: Per-component magic numbers in Tailwind classes

**Pros:** Maximum local control.
**Cons:** Drift; untestable; agents copy the first scale they see.
**Rejected because:** tokens + utilities + this ADR give one auditable source of truth.

---

## Consequences

### Positive

- Agents and contributors have an explicit technology ladder: CSS → Motion → GSAP (only when needed).
- Press feedback is calibrated by component class, not copied from the nearest button.
- `motionTokens.scale` and CSS utilities stay aligned via shared custom properties.

### Negative

- Contributors must choose a preset (or justify a deviation) instead of defaulting to `pressable`.
- GSAP remains unavailable until a feature documents a concrete choreography requirement — some spikes may need a one-off CSS or Motion compromise first.

### Neutral

- Existing `motion` usage is unchanged; this ADR does not mandate refactors of working Motion surfaces.
- `docs/design/DESIGN_LANGUAGE.md` §9.7–§9.8 and `DESIGN_SYSTEM_PROMPT.md` carry the agent-facing summary; detail lives here.

---

## Review criteria

Revisit this ADR if:

- GSAP is added to `package.json` — document the triggering feature and scope limit in a follow-up ADR or amend this one.
- Press preset values change — update `motionTokens`, CSS custom properties, and tests in the same commit.
- Motion bundle cost becomes measurable on athlete-facing critical paths — re-audit CSS-eligible surfaces.

---

## References

- `docs/design/DESIGN_LANGUAGE.md` §9.7–§9.8
- `docs/design/DESIGN_SYSTEM_PROMPT.md` — Motion & press feedback
- `src/lib/motion/tokens.ts` — `motionTokens.scale.press*`
- `src/app/globals.css` — `--press-scale-*`, `pressable`, `pressable-lg`, `chip-surface`, `chip-surface-lg`
- [ADR-024](./ADR-024-route-reveal-motion-exception.md) — separate reveal category; unchanged by this ADR
