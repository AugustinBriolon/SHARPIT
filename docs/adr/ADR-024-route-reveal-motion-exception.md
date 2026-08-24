# ADR-024: Route reveal — a narrow exception to the 300ms motion cap

**Status:** Accepted
**Date:** 2026-08-24
**Author:** Principal Architect
**Supersedes:** N/A
**Superseded by:** N/A

---

## Context

An activity page shows a GPS track as a static polyline the instant the map loads. Nothing on screen communicates that the line is a record of movement through time — start, middle, finish — the way a Strava flyover or a heart-rate curve sweeping in does. The athlete asked for the track to draw itself in, start to finish, on arrival.

Two rules in `docs/design/DESIGN_LANGUAGE.md` stand in the way as written:

- §9.1 — "Animation exists only to communicate that something changed. It does not decorate, celebrate, or entertain."
- §9.2 — "Nothing in SHARPIT exceeds 300ms. Longer durations feel slow and self-important."

A route reveal is not obviously a state change — nothing about the athlete's data changes when the line finishes drawing — and reading as a full point-to-point trace at a pace slow enough to follow needs more than 300ms. Both rules would have to be read literally to reject this outright, and §9's own duration table (150/250/300ms) is scoped to interface chrome: tooltips, expand/collapse, page transitions, skeletons. A one-time reveal of a dataset is a different kind of thing, already anticipated by §12.2, which grants data visualization an exception to the "no illustration" rule precisely because "it communicates something that text cannot." This ADR extends that same reasoning from _what is drawn_ to _how it is drawn_.

## Decision

### 1. A route reveal is a narrow, separate motion category — not a relaxation of §9.2

`REVEAL_DURATION_MS` (`src/lib/motion/config.ts`) is defined next to, not inside, `motionTokens.duration`. `motionTokens.duration`'s 300ms hard cap is untouched and still governs every chrome transition — tooltips, expand/collapse, page transitions, skeletons. Nothing in this ADR raises that cap or licenses a slower badge, a slower expand, or a slower page transition.

A reveal animation is defined narrowly: it runs **once**, on the first mount of a specific, non-interactive, already-complete dataset, and it does not gate any interaction — the map is fully usable (pan, zoom, hover) before the trace finishes drawing. Today exactly one thing qualifies: the GPS polyline on `RouteMap`. A chart draw-in, a list stagger, or any future candidate must be argued on its own terms — this ADR is not a blanket license for "animations that take a while."

### 2. What it communicates, answering §9.1 literally

The reveal is not decoration bolted onto a static line. It communicates that **the polyline is a trace of movement through time** — exactly the fact a static line erases. An activity's route is not a shape; it is the record of the athlete moving from one point to another over the duration of the session. Rendering it all at once tells the athlete "here is a shape." Drawing it start-to-finish tells them "this happened, in this order, over this time" — the same information §12.2 already grants a chart line: precise, data-exact, communicating something text cannot.

### 3. Reduced motion and low-end devices skip it entirely — §9.5, unchanged

`motionConfig.shouldAnimate({ essential: false })` gates the reveal. When `prefers-reduced-motion` is set, or the device is judged low-end, the full polyline is set in a single `source.setData()` call — the same code path a completed reveal ends on. §9.5's rule holds exactly as written: "the state change still happens; only the animation is removed."

### 4. Implementation reveals coordinates, not a MapLibre paint trick

The route is drawn by incrementally growing the GeoJSON `LineString` fed to the existing `MapRoute` source (`src/components/ui/map/map.tsx`) via `requestAnimationFrame`, easing through the coordinate array over `REVEAL_DURATION_MS`. `MapLibre`'s `line-trim-offset` paint property could do the same with less code, but its browser/version support was not something to gamble a first-paint animation on without testing across the pinned `maplibre-gl` version; growing the already-known coordinate array is portable and uses the source-update path `MapRoute` already had.

---

## Options considered

### Option A — Treat this as covered by existing §9 durations, capped at 300ms

**Pros:** No new category, no ADR needed.
**Cons:** 300ms across a multi-kilometre track reads as a flicker, not a trace — the effect the athlete asked for requires being able to follow the line as it extends, which needs closer to a second.
**Rejected because:** it would ship a compromised version of the actual ask to avoid writing this document.

### Option B — Raise `motionTokens.duration`'s cap instead of creating a separate category

**Pros:** One duration system instead of two.
**Cons:** `motionTokens.duration` is read by every chrome transition in the app. Raising its cap to accommodate one map reveal would silently license slower tooltips, expands and page transitions everywhere else — exactly the "slow and self-important" feel §9.2 was written to prevent.
**Rejected because:** the reveal and interface chrome are different kinds of motion and must not share a knob.

### Option C — Animate via MapLibre's `line-trim-offset` paint property

**Pros:** Less imperative code; the animation lives entirely in the paint layer.
**Cons:** Requires verifying support and behaviour on the pinned `maplibre-gl` version and every basemap style in use; a paint-property animation that silently no-ops on an unsupported build fails invisibly (the line simply never draws, with no error).
**Rejected for now:** the coordinate-growing approach reuses `MapRoute`'s existing, already-tested `source.setData()` path. Revisit if `line-trim-offset` is confirmed to work well and the imperative loop shows jank on low-end devices under real load.

---

## Consequences

### Positive

- The athlete gets the requested trace-in without touching the 300ms chrome cap that keeps the rest of the interface feeling instrument-fast.
- The category is narrow and named, so a future contributor reaching for "just make this animation longer" has to argue a new case rather than pattern-match on this one.
- Reduced motion and low-end devices get the exact same end state as everyone else, immediately.

### Negative

- Two duration systems now exist in `src/lib/motion/`: `motionTokens.duration` (chrome, ≤300ms) and `REVEAL_DURATION_MS` (reveal, single value today). If a second reveal case appears, it should get its own named constant rather than reusing this one by coincidence of similar duration.
- The coordinate-growing implementation re-renders the GeoJSON source on every animation frame rather than letting the GPU interpolate a paint property — acceptable for a single reveal on activity-page load, worth revisiting if it is reused somewhere with many concurrent maps.

### Neutral

- §9 of `docs/design/DESIGN_LANGUAGE.md` gains a short §9.6 pointing here rather than restating the reasoning inline — the detail belongs in one place.

---

## References

- `docs/design/DESIGN_LANGUAGE.md` §9 "Motion Principles" — the cap this ADR carves a named exception out of, and §12.2 "The Exception: Data Visualization" — the existing precedent this ADR extends from _what is drawn_ to _how it is drawn_.
- `src/lib/motion/config.ts` — `REVEAL_DURATION_MS` and `motionConfig.shouldAnimate`.
- `src/components/ui/map/map.tsx` (`MapRoute`), `src/components/training/activity/insights/route-map-inner.tsx` — implementation.
