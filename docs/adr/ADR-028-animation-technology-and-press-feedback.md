# ADR-028: Animation technology, enter/exit motion, and interaction feedback

**Status:** Accepted
**Date:** 2026-08-27
**Author:** Principal Architect
**Supersedes:** N/A
**Superseded by:** N/A

---

## Context

SHARPIT already ships `motion` (Framer Motion API) for state-driven surfaces — expand/collapse, mount/unmount, stagger lists, coach/agent UI — CSS utilities for press feedback, and TanStack Query optimistic helpers (`listOptimistic`, `setQueryData`) for Instant mutations per [`INSTANT_UX_ARCHITECTURE.md`](../INSTANT_UX_ARCHITECTURE.md).

Four problems were left implicit:

1. **Technology choice.** No written rule for when to reach for CSS, Motion, or GSAP. Default drift: import Motion for every hover or press.

2. **Enter / exit motion.** Shared primitives exist (`FadePresence`, `MotionExpand`, `stagger-list`, `fadeVariants`) but no decision doc tied them to the technology ladder or forbade ad-hoc `AnimatePresence` + magic durations.

3. **Press feedback.** A single `scale(0.96)` via `pressable` with no guidance for large surfaces, high-frequency controls, or gesture-driven feedback.

4. **Optimistic UX + motion coupling.** Instant mutations must update cache and close modals/sheets **before** server ack, while exit animations play. Many dialogs still `await mutateAsync` or show save spinners on SAFE writes — animation and latency stack instead of feeling native.

`docs/design/DESIGN_LANGUAGE.md` §9 governed duration and easing but not technology choice, enter/exit patterns, press calibration, or the optimistic-motion contract.

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

### 7. Enter / exit motion — use shared primitives, token durations

Enter and exit animations are **state-bound** — they require Motion (or CSS `max-height` + `opacity` for expand only). Never invent one-off durations; use `motionTokens` and `src/lib/motion/variants.ts`.

| Interaction | Primitive | Variants / transition | When |
| ----------- | --------- | --------------------- | ---- |
| Conditional mount + exit | `FadePresence` | `fadeVariants` + `fadeTransition` | Panel swap, inline confirm, integration hub states |
| One-shot appear after mount | `FadeIn` | `fadeVariants` | Content already in DOM; fade once client-side |
| Expand / collapse | `MotionExpand` | `collapseVariants` | Sections, meal blocks, coach guide — §9.3 grid pattern |
| List stagger on enter | `StaggerList` / `StaggerItem` | `staggerContainer` + `staggerItem` | Threshold cards, agent lists — not on every table row |
| Dialog / morph surface | `MorphPopover`, motion `Dialog` wrappers | `dialogTransition` (`springs.gentle`) | Sheets, morphing popovers |
| Label swap on action | `ActionSwap` / `ActionSwapRollText` | token durations | Button text change during background work |
| Raw `AnimatePresence` | Last resort only | Must import variants from `@/lib/motion` | When no shared primitive fits — comment why |

Rules:

- **Exit ≤ 80% of enter duration** (DESIGN_LANGUAGE §9.3). `fadeTransition` uses `motionTokens.duration.fast` (150ms).
- **`initial={false}`** on `AnimatePresence` when children may already be mounted (avoid replay on navigation).
- **`useShouldAnimate` / `useReducedMotion`** — skip motion; keep DOM state change instant (§9.5).
- **No enter animation on data the athlete is waiting for** — skeleton → content crossfade only; do not stagger a blocking load.
- **Reveal category** (route trace, etc.) stays separate per [ADR-024](./ADR-024-route-reveal-motion-exception.md); not a license for slower chrome.

### 8. Optimistic updates must lead; motion follows — never the reverse

Per [`INSTANT_UX_ARCHITECTURE.md`](../INSTANT_UX_ARCHITECTURE.md), every **SAFE** / **SAFE_WITH_ROLLBACK** mutation in a modal, sheet, drawer, or inline action must feel Instant:

```
user confirms  →  optimistic cache patch (onMutate)  →  close surface + play exit  →  mutate in flight  →  reconcile or rollback
```

**Required for dialog / modal / sheet actions (SAFE class):**

1. Patch TanStack Query cache in `onMutate` via `listOptimistic()` or targeted `setQueryData` — UI outside the dialog reflects the new state immediately.
2. Call `mutate(vars)` — **not** `await mutateAsync(vars)` — before or while closing. Close on confirm, not on HTTP 200.
3. Let exit animation run on the closing surface; do not block close on animation end.
4. Rollback cache + toast on `onError` (`listOptimistic` already does this).
5. No full-dialog `"Enregistrement…"` spinner for reversible writes. Use `ActionSwap` on the trigger if subtle in-flight feedback is needed.

**Blocking UX is allowed only** for BLOCKING class interactions (auth, OAuth, payment, missing preview payload, irreversible external side-effects). See INSTANT_UX §5.4.

**Anti-patterns (eliminate on touch):**

- `await mutation.mutateAsync()` then `onOpenChange(false)` on a SAFE form save
- Closing the dialog only after exit animation completes with no optimistic patch
- `invalidateQueries()` without a prior optimistic shape when `setQueryData` is deterministic
- Enter animation on a list item that was already optimistically inserted — it is already visible; animate siblings only if needed

Existing good references: `use-goals`, `use-planned-sessions`, `use-physical`, `use-activities` (list optimistic); `use-planned-session-actions` (one-press + undo toast, no confirm dialog).

---

## Rationale

- **CSS-first** keeps the instrument-fast feel §9.2 protects and avoids shipping React animation overhead on every chip hover.
- **Motion where state-bound** matches existing usage (`MotionExpand`, `AnimatePresence`, coach UI) without pretending every transition needs a component wrapper.
- **GSAP as opt-in** prevents timeline libraries from becoming the default tool for a 150ms opacity fade.
- **Semantic press presets** encode proportional physical feedback by component class.
- **Enter/exit primitives** stop ad-hoc `AnimatePresence` drift and keep durations under the §9.2 cap.
- **Optimistic-first modal contract** unifies motion with Instant UX — the athlete sees the outcome immediately; exit motion confirms dismissal, not server latency.

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
- `docs/design/DESIGN_LANGUAGE.md` §9.7–§9.10 and `DESIGN_SYSTEM_PROMPT.md` carry the agent-facing summary; detail lives here.

---

## Review criteria

Revisit this ADR if:

- GSAP is added to `package.json` — document the triggering feature and scope limit in a follow-up ADR or amend this one.
- Press preset values change — update `motionTokens`, CSS custom properties, and tests in the same commit.
- Motion bundle cost becomes measurable on athlete-facing critical paths — re-audit CSS-eligible surfaces.
- A new shared enter/exit primitive is added — document it in this ADR's §7 table.

---

## References

- `docs/design/DESIGN_LANGUAGE.md` §9.7–§9.10
- `docs/design/DESIGN_SYSTEM_PROMPT.md` — Motion, enter/exit, optimistic coupling
- [`docs/INSTANT_UX_ARCHITECTURE.md`](../INSTANT_UX_ARCHITECTURE.md) — Instant / Background / Blocking taxonomy
- `src/lib/motion/tokens.ts` — durations, scales, springs
- `src/lib/motion/variants.ts` — `fadeVariants`, `collapseVariants`, `staggerContainer`, `dialogTransition`
- `src/components/motion/` — `FadePresence`, `MotionExpand`, `StaggerList`, `ActionSwap*`
- `src/lib/query/optimistic.ts` — `listOptimistic()`
- `src/app/globals.css` — `--press-scale-*`, `pressable`, `pressable-lg`, `chip-surface`, `chip-surface-lg`
- [ADR-024](./ADR-024-route-reveal-motion-exception.md) — separate reveal category; unchanged by this ADR
