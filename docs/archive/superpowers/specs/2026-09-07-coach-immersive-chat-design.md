# Coach immersive chat — design spec

**Status:** Approved — implementing  
**Date:** 2026-09-07  
**Surface:** `/coach` (auth shell)  
**Does not change:** Frozen Core, Digital Twin contracts, plan mutation semantics

## Goal

Make Coach feel like a **native chat destination** inside SHARPIT: immersive transcript, in-place context attachment, instrument-grade answers, and Emil-style micro-interactions — without fighting the floating bottom nav or the design language.

## Non-goals

- Installing third-party “liquid / gooey” packages (`liquid-gooey`, etc.).
- Copying Beautiful UI wholesale (shimmer loaders, generic AI chrome, bounce).
- Changing whether Coach is a bottom-tab destination (see Navigation).
- Rewriting LLM prompts except where a preset label requires a stable discuss target.

## Navigation (clarification)

`INFORMATION_ARCHITECTURE.md` historically said Coach is **not** a primary tab. The **shipped** shell currently includes Coach in `bottomNavItems` (athlete already lands on `/coach` from the bar).

**This redesign keeps Coach in the bottom nav as shipped.** Immersion means the chat fills the space _above_ the floating bar (`--bottom-nav-offset`), not that we remove or hide the bar. Any future IA sync (tab vs contextual-only) is a separate product decision.

## Design read

- **Kind:** Product AI chat (athlete coaching), not a marketing page.
- **Vibe:** Precision instrument + calm native chat (iMessage density, ChatGPT immersion), SHARPIT tokens.
- **Motion:** Emil Kowalski craft within `DESIGN_LANGUAGE` §9 / ADR-028 (≤ 300 ms, no bounce, CSS-first, Motion for state-bound).
- **Reference UI:** [Beautiful UI](https://www.beautifului.dev/) primitives mapped below — adopt patterns, not their aesthetic defaults.

### Dial overrides (within SHARPIT law)

| Dial     | Value | Reason                                 |
| -------- | ----- | -------------------------------------- |
| Variance | 4     | Shell-compatible, one composition      |
| Motion   | 5     | Occasional chat events; crisp feedback |
| Density  | 5     | Narrative + instrument blocks          |

## Architecture (Approach 1)

### Shell

- `/coach` is a **full-viewport chat** above the floating tab bar on **all** breakpoints.
- Remove hub chrome: page eyebrow `COACH`, title `Fil & conversations`, memory subtitle, permanent desktop sidebar.
- Single plane: header → transcript → context rail → composer.
- History lives in a **sheet / overlay**, not a persistent split pane.

### Header (minimal)

| Control      | Behavior                                                  |
| ------------ | --------------------------------------------------------- |
| Thread title | Truncated conversation title or « Nouvelle conversation » |
| History      | Icon → sheet with list + new conversation                 |
| New          | Highlight icon button (`pressMicro`)                      |

### Context rail (in-place attach)

Horizontal scroll-snap chips above the composer. Athlete attaches context **without leaving** `/coach`.

| Chip (FR UI)    | Target                                                  |
| --------------- | ------------------------------------------------------- |
| État du jour    | `today`                                                 |
| Dernière séance | `activity` (resolve latest activity id)                 |
| Forme 7 jours   | `planning` with `horizonDays: 7` (athlete-facing label) |
| Semaine         | planning / week entry (same discuss family)             |
| Autre…          | Sheet listing remaining `CoachDiscussTarget` kinds      |

**Contract (IA):** attached context named in plain language; dismiss and change allowed before send. Existing deep links (`DiscussWithCoachButton`, query params) pre-select the same chip / latch.

**Motion:** pill morph via existing `layoutId` / `SharedLayoutBg` / `MorphPopover` patterns — gooey _feeling_ without bounce (springs `snappy`, bounce 0, ≤ 250 ms).

### Composer

Keep `CoachComposerShell` + `PromptInput`. Press feedback on send. Context chip (active attachment) sits in `contextSlot` as today, fed by the rail.

Beautiful UI **Prompt Bar** inspiration: clear focus ring, compact chrome — **no** model picker / `@` sources theater unless product later adds them.

## Response / transcript redesign

### Problem

Assistant answers render as one large `analysis-surface` bubble containing prose, markdown tables, and a collapsed « N outils exécutés » accordion. Feels like an admin card, not a coach thread.

### Principle

Coach speaks as a **causal narrative** (DESIGN_LANGUAGE). Structure is the argument. User stays in a bubble; assistant is mostly **unbubbled prose** plus **instrument blocks**.

### Layout

| Role               | Treatment                                                                                          |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| User               | Right-aligned accent bubble (keep asymmetric radius)                                               |
| Assistant prose    | Left-aligned, no heavy card fill (or very light wash), `max-w-[min(42rem,100%)]`                   |
| Instrument data    | Separate block: `rounded-analysis`, fine border, `text-label` headers, `text-data` numerics        |
| Lists / “Pourquoi” | Section titles + prose via existing `parseCoachMessage` / `CoachMessage`                           |
| Reasoning          | Collapsible above answer (Beautiful UI **Thinking** — quieter, SHARPIT copy)                       |
| Tools              | See Tools below                                                                                    |
| Approvals          | Existing approval card; align visually with Beautiful UI **Approval Card** density, SHARPIT tokens |

### Answer hierarchy (example: regenerate week)

1. Verdict sentence (1–2 lines)
2. Instrument block (today’s session / TSS table → instrument table, not raw markdown table-in-bubble)
3. Short “Pourquoi” prose
4. Rest of week as compact rows / list (not a wall)
5. Tool meta disclosure under the answer

### Streaming

- Block settle: prose → instrument → lists with short stagger (40–60 ms).
- Live tool status as a thin status line while streaming.
- Align message enter motion to `motionTokens` / `springs.snappy` (tone down current spring pop if it exceeds craft caps).
- Never `scale(0)`; start from opacity + small `translateY`.

### Empty state

Short invitation + 2–3 suggestion chips (may deep-link into context presets). No fake transcript.

## Beautiful UI mapping

Source: [beautifului.dev](https://www.beautifului.dev/) — **compose with**, do not import their kit.

| Beautiful UI primitive | SHARPIT Coach treatment                                                             |
| ---------------------- | ----------------------------------------------------------------------------------- |
| Chat                   | Immersive single panel; history sheet instead of always-on sidebar                  |
| Prompt Bar             | Existing composer + context rail                                                    |
| Streaming Text         | Unbubbled assistant stream; optional follow-up chips later (v1.1)                   |
| Thinking               | `CoachReasoning` collapsible — steps language, no decorative shimmer                |
| Tool Chips             | Compact chip row for tool calls (replace “N outils exécutés” as primary affordance) |
| Task Rows              | Optional live rows while tools run (running / done); collapse when idle             |
| Approval Card          | Existing `coach-tool-approval-*` — tighten layout to match card density             |
| Recommendation Card    | Plan-change proposals: clear accept / alternatives affordance (reuse approval flow) |
| Context Cards / chips  | Context rail + attached chip                                                        |
| Diff / Records table   | Plan / session diffs as **instrument tables**, not CRM grids                        |
| Loading State          | Keep pulse skeletons; **no** pixel-grid shimmer (DESIGN_LANGUAGE bans shimmer)      |
| Sidebar Nav            | History sheet only — not a second app nav                                           |

## Motion checklist (Emil × SHARPIT)

| Interaction                | Spec                                           |
| -------------------------- | ---------------------------------------------- |
| User message enter         | opacity + `translateY(8px)`, ease-out ≤ 200 ms |
| Assistant blocks           | fade / settle; stagger 40–60 ms                |
| Tool expand                | enter ~250 ms, exit ~200 ms                    |
| Context chip morph         | ≤ 250 ms, `snappy`, bounce 0                   |
| Press (send, icons, chips) | `pressMicro` / `pressSmall`                    |
| History sheet              | ≤ 300 ms                                       |
| Bottom tab switches        | no open/close animation (high frequency)       |
| `prefers-reduced-motion`   | instant state change                           |

## Implementation sketch (for planning)

1. **Layout** — rewrite `coach-view-layout.tsx` to immersive frame; history sheet; drop hub header.
2. **Theme** — update `coach-beui-theme.ts` (assistant unbubble, instrument block tokens).
3. **Transcript** — `coach-chat-transcript.tsx` + markdown table → instrument block; tools → chips / task rows.
4. **Context rail** — new component; resolve “last activity”; wire latch to existing discuss bootstrap.
5. **Motion** — message enter tokens; chip `layoutId`; sheet enter/exit via shared motion primitives.
6. **Tests** — layout presence, context attach/dismiss, transcript structure, reduced-motion.

## Success criteria

- Opening Coach shows chat immediately; bottom nav remains usable.
- Athlete can attach « Dernière séance » / « Forme 7 jours » without leaving `/coach`.
- Structured answers read as narrative + instrument, not one markdown card.
- Micro-interactions ≤ 300 ms, no bounce, reduced-motion honored.
- Visual language still reads as SHARPIT (tokens, radii, typography), not a generic AI kit.

## Open questions (non-blocking for v1)

- Follow-up suggestion chips after a complete answer (Beautiful UI Streaming Text) — v1.1?
- Exact FR labels for planning horizons (« Forme 7 jours » vs « Les 7 prochains jours »).
- Whether instrument tables should parse GFM tables only or also structured tool payloads.
