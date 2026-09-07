# Coach Immersive Chat Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Ship immersive Coach chat (history sheet, context rail, unbubbled assistant + instrument blocks, tool chips) per `docs/superpowers/specs/2026-09-07-coach-immersive-chat-design.md`.

**Architecture:** Single full-viewport chat above bottom nav; history in sheet; context presets latch into existing discuss flow; theme/transcript/tools updated without Core changes.

**Tech Stack:** Next.js App Router, React client components, Motion (`motion/react`), existing beUI coach primitives, Vitest.

## Global Constraints

- Motion ≤ 300 ms, bounce 0, honor `prefers-reduced-motion`
- No `liquid-gooey` / Beautiful UI package install
- Keep Coach in `bottomNavItems`
- French athlete-facing copy
- English code/docs/commits

---

### Task 1: Theme + instrument markdown

**Files:** `coach-beui-theme.ts`, `markdown.tsx`, tests

- [x] Assistant unbubble + instrument table classes
- [x] Render GFM tables as instrument blocks
- [x] Tests for theme class contracts / markdown table wrapper

### Task 2: Transcript + tools

**Files:** `coach-chat-transcript.tsx`, agent activity / tool chips, message enter motion

- [x] Unbubbled assistant layout; tools as chips under answer
- [x] Align enter motion to tokens

### Task 3: Immersive layout + history sheet

**Files:** `coach-view-layout.tsx`, conversation list sheet, header

- [x] Drop hub chrome / permanent sidebar
- [x] Full-viewport frame; history sheet

### Task 4: Context rail

**Files:** new rail component, wire into composer / discuss latch, last-activity resolve

- [x] Preset chips + Autre sheet
- [x] Attach / dismiss / change before send

### Task 5: Empty state + polish + verify

- [x] Suggestion chips (kept existing empty state)
- [x] Run focused tests / lint
