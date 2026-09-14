# ADR-039: iOS system edge — safe content + scroll-only progressive blur

**Status:** Accepted  
**Date:** 2026-09-14  
**Author:** Augustin Briolon (with Cursor)  
**Supersedes:** N/A  
**Related:** [ADR-028](./ADR-028-animation-technology-and-press-feedback.md), [PWA_TESTING.md](../PWA_TESTING.md), [DESIGN_LANGUAGE.md](../design/DESIGN_LANGUAGE.md)

---

## Context

We want an Apple-like top edge on iPhone (Dynamic Island / status bar): the canvas feels continuous under the system UI, with a soft progressive blur when content scrolls, without an opaque dead band and without clipping the first heading.

On-device Safari 26 Liquid Glass behaviour (verified against field notes and a Plan-tab screenshot):

1. At `scrollY = 0`, Safari paints a **solid/soft tint from `body` / `--background`** under the status chrome — not live page pixels from an app overlay.
2. `position: fixed` / `sticky` layers are clipped to the visual viewport; they **cannot** paint inside the status strip, and a sticky blur over the first heading creates a second band that fights the native tint.
3. An inner `h-dvh` + `overflow` scroller prevents document bleed; AppShell therefore uses **document scroll** (`min-h-dvh`).

---

## Decision

**Use a Safari-tab floor for page top inset, and mount progressive blur only after scroll.**

1. AppShell uses `min-h-dvh` and document vertical scroll (no inner `overflow-y-auto` on `<main>`).
2. The reading column uses `safe-page-top`: `max(var(--safe-page-top-floor), env(safe-area-inset-top))` with `--safe-page-top-floor: 3.5rem`. This is required because Safari tabs often report `safe-area-inset-top` as `0` while Liquid Glass still overlaps ~50px — a `max(1rem, env(...))` then equals the old `py-4` and titles stay clipped (observed on device).
3. At `lg`, `safe-page-top` resets to `1.5rem` (aligned with `lg:p-6`). Coach immersive keeps `p-0`.
4. `SystemEdgeBlur` is a zero-height sticky sentinel; the absolute `system-edge-fade` child holds tint + `backdrop-filter` + mask (never on the sticky box).
5. The fade child mounts only when `scrollY > 4` (never `opacity: 0` — Safari still samples those styles).
6. Same contract in Safari tabs and standalone PWAs. Keep `viewport-fit=cover`, `black-translucent`.
7. Fullscreen scroll-runway shells remain out of scope (BottomNav / Coach cost).

---

## Rationale

- Fighting Safari’s native status tint with a second always-on glass caused the clipped “Ton cap…” heading and a hard dark seam.
- Safe-area padding fixes readability immediately; scroll-only blur restores the progressive soft edge when content actually moves under the top.
- Document scroll keeps the door open for better Liquid Glass sampling without an inner scroller trap.

---

## Consequences

### Positive

- First viewport headings remain fully readable under the Dynamic Island / status bar.
- Scrolling softens content at the top without a permanent opaque strip.
- Contract tests lock `safe-page-top`, scroll-gated glass, and transparent fade tokens.

### Negative / accepted limits

- At rest in Safari tabs, the status strip still shows the native body tint — that is OS-owned.
- Live content blur _inside_ the status glyph zone at `scrollY = 0` is out of scope without a runway shell.
- Changing `statusBarStyle` still requires reinstalling the Home Screen icon on iOS.

### Follow-ups

- Manual check: Plan / Today at rest (title clear) and after a short scroll (soft blur).

---

## References

- `src/app/globals.css` — `safe-page-top`, system-edge tokens
- `src/components/layout/shell/system-edge-blur.tsx` — scroll-gated glass
- `src/components/layout/shell/app-shell.tsx` — document scroll + safe page top
- `docs/PWA_TESTING.md` — device checklist
