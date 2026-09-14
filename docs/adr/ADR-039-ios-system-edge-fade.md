# ADR-039: iOS system edge — clear content below Safari Liquid Glass

**Status:** Accepted  
**Date:** 2026-09-14  
**Author:** Augustin Briolon (with Cursor)  
**Related:** [PWA_TESTING.md](../PWA_TESTING.md), [DESIGN_LANGUAGE.md](../design/DESIGN_LANGUAGE.md)

---

## Context

Athletes saw the first Plan/Today heading clipped under a dark strip on iPhone Safari (Dynamic Island / status bar). We tried sticky `backdrop-filter` overlays and CSS `safe-page-top` utilities. On-device results:

1. Safari 26 Liquid Glass **always** tints the status strip from `body` / `--background` at rest. That dark band is not a SHARPIT spacer we can delete.
2. Sticky/fixed overlays **cannot** paint inside that strip; they only sit below it and often clip the first heading.
3. `env(safe-area-inset-top)` is often `0` in Safari **tabs**, so `max(1rem, env(...))` equals the old `py-4` and looks like “nothing changed”.

---

## Decision

**Possible goal (shipped):** keep headings fully readable below the OS status strip.

**Not possible in Safari tabs without a dedicated runway shell:** live page pixels + progressive blur _inside_ the status-glyph zone at `scrollY = 0`, Apple-Maps style.

Shipped mechanics:

1. Document scroll (`min-h-dvh`, no inner main scroller).
2. Reading column uses an **inline** `paddingTop: max(3.5rem, env(safe-area-inset-top, 0px))` (and `data-safe-page-top`) so a stale CSS chunk cannot drop the inset. Coach immersive keeps `p-0`.
3. No `SystemEdgeBlur` overlay in AppShell.
4. `viewport-fit=cover` + `black-translucent` remain for standalone PWA.
5. A fullscreen scroll-runway / stage-bleed redesign (BottomNav + Coach) stays a separate product decision if we later need live bleed under the glyphs in Safari tabs.

---

## Consequences

- Titles must clear the strip; the OS tint under the clock remains.
- Standalone PWA can still feel more edge-to-edge; tabs keep Liquid Glass ownership of the top chrome.
- Contract tests lock the inline padding string and the absence of an AppShell blur overlay.
