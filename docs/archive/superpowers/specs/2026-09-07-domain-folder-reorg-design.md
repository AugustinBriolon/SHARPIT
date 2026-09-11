# Domain folder reorganization — design notes

**Status:** Implemented  
**Date:** 2026-09-07  
**Follows:** `2026-09-07-coach-chat-folder-reorg-design.md`

## Goal

Apply the same responsibility-folder pattern used for `coach/chat` to other flat domain dumps so navigation matches across components and lib where a mirror is meaningful.

## Applied

| Tree                                           | Folders                                                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `components/coach`                             | `view/`, `discuss/`, `weekly-brief/` (+ existing `chat/`, `beui/`, `plan/`)                            |
| `components/coach-memory` + `lib/coach-memory` | `manager/`, `shell/`, `entries/`, `profile/`, `travel/`, `guide/` · lib: `guide/`, `summary/`, `core/` |
| `components/plan` + `lib/plan`                 | `hub/`, `week/`, `trajectory/`                                                                         |
| `components/onboarding` + `lib/onboarding`     | `wizard/`, `steps/`, `gate/` · lib: `wizard/`, `status/`                                               |
| `components/planning` (root)                   | `view/`, `week/`, `overlays/`, `coach/` (existing `session/` untouched)                                |
| `components/layout`                            | `shell/`, `header/`, `nav/`                                                                            |
| `lib/today`                                    | `dashboard/`, `rich/`, `navigation/` (mirrors `components/today` intent)                               |

Rules: `git mv` only, basename unchanged, all `@/` imports updated, no barrel re-exports.

## Explicitly deferred

- `components/ui`, `components/motion` — design-system primitives, different taxonomy
- `components/agents` — large mixed AI chrome; needs its own split plan
- Already nested dense areas (`today/dashboard`, `training/activity/insights`, `planning/session/*`) — further micro-splits later if needed
- Infra libs (`query/`, `presentation/`, `validators/`, …) — not athlete UI surfaces

## Verification

- `yarn typecheck` clean
- Targeted vitest suites for touched trees green
