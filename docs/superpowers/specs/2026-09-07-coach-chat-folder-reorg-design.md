# Coach chat folder reorganization — design spec

**Status:** Implemented  
**Date:** 2026-09-07  
**Surfaces:** `src/components/coach/chat/`, `src/lib/coach/chat/`  
**Does not change:** Runtime behavior, public APIs, frozen Core, Digital Twin contracts

## Goal

Make `coach/chat` navigable again by replacing flat dumps (~34 component files + ~36 lib files) with mirrored responsibility folders, matching existing domain patterns such as `training/activity/{detail,form,list,insights}`.

## Non-goals

- Refactoring logic inside large files (`coach-tools.ts`, `coach-prompt-bar-parts.tsx`, etc.)
- Renaming exported symbols or file basenames
- Adding barrel `index.ts` re-exports at `chat/` root
- Moving `src/app/api/coach/chat/route.ts` (API route path stays)
- Changing UI, UX, or Coach transport behavior

## Decisions (approved)

| Decision   | Choice                                                    |
| ---------- | --------------------------------------------------------- |
| Scope      | Both `src/components/coach/chat` and `src/lib/coach/chat` |
| Taxonomy   | Approach 1 — six mirrored folders by responsibility       |
| Imports    | Update all call sites to new paths (no root re-exports)   |
| File names | Unchanged; `git mv` only                                  |

## Target structure

```
src/components/coach/chat/          src/lib/coach/chat/
├── shell/                          ├── shell/
├── composer/                       ├── composer/
├── transcript/                     ├── transcript/
├── conversations/                  ├── conversations/
├── tools/                          ├── tools/
└── discuss/                        └── discuss/
```

No flat source files remain at either `chat/` root after the move.

### Folder roles

| Folder           | Responsibility                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------- |
| `shell/`         | Chat frame, chrome, primary hook, transport errors, session cache/persist/lock/auto-send |
| `composer/`      | Prompt bar, submit, input draft, context/budget chips                                    |
| `transcript/`    | Messages, markdown, reasoning, provenance, scroll/progress                               |
| `conversations/` | Conversation list/picker, known sessions, session thread                                 |
| `tools/`         | Tool activity UI, tool display/parts, `coach-tools`                                      |
| `discuss/`       | Discuss context, href, prompts, presets                                                  |

### File mapping

#### `shell/`

**components:** `coach-chat.tsx`, `coach-chat-panel-shell.tsx`, `coach-immersive-chrome.tsx`, `coach-composer-chrome.tsx`, `use-coach-chat.ts`, `humanize-coach-transport-error.ts` (+ test)

**lib:** `coach-chat-cache.ts` (+ test), `coach-chat-persist.ts` (+ test), `coach-chat-request-lock.ts` (+ test), `coach-chat-auto-send.ts` (+ test)

#### `composer/`

**components:** `coach-prompt-bar.tsx`, `coach-prompt-bar-parts.tsx`, `coach-prompt-bar-keyboard.ts`, `coach-chat-submit.ts`, `coach-context-chip.tsx`, `coach-budget-warning-chip.tsx`

**lib:** `coach-input-draft.ts` (+ test)

#### `transcript/`

**components:** `coach-chat-transcript.tsx`, `coach-chat-scroller-content.tsx`, `coach-message.tsx` (+ test), `coach-chat-empty-state.tsx` (+ test), `coach-reasoning.tsx`, `markdown.tsx` (+ test), `coach-provenance-chips.tsx`

**lib:** `coach-message-structure.ts` (+ test), `markdown-render.ts` (+ test), `coach-reasoning.ts` (+ test), `coach-provenance.ts` (+ test), `coach-progress-stream.ts` (+ test), `scroll-anchor.ts` (+ test)

#### `conversations/`

**components:** `coach-conversation-list.tsx` (+ test), `coach-conversation-list-body.tsx`, `coach-conversation-list-parts.tsx`, `coach-conversation-list-helpers.ts`, `coach-conversation-mobile-picker.tsx`

**lib:** `coach-chat-known-sessions.ts`, `coach-session-thread.ts`

#### `tools/`

**components:** `tool-activity.tsx`, `tool-activity-list.tsx`, `tool-activity-views.tsx`, `tool-activity-describe.ts`, `coach-chat-tool-invalidation.ts`

**lib:** `coach-tools.ts`, `coach-tool-display.ts` (+ test), `coach-tool-parts.ts` (+ test)

#### `discuss/`

**components:** empty mirror folder (`.gitkeep` only)

**lib:** `coach-discuss-context.ts` (+ test), `coach-discuss-href.ts` (+ test), `coach-discuss-prompts.ts`, `coach-context-presets.ts` (+ test)

## Import policy

- Replace every import that targets the old flat paths with the new folder path.
- Prefer keeping absolute `@/` imports where already used; fix relative imports inside moved files to the new depth (`../` → `../../` or sibling folder paths as needed).
- External callers (Coach view, beui, API routes, today/training discuss links, hooks) must point at the new locations.

Example:

```ts
// before
import { useCoachChat } from '@/components/coach/chat/use-coach-chat';
// after
import { useCoachChat } from '@/components/coach/chat/shell/use-coach-chat';
```

## Execution order

1. Create subfolders under both trees; `git mv` lib files, then component files.
2. Fix relative imports inside `chat/`.
3. Update absolute imports across the repo.
4. Run targeted coach/chat tests and TypeScript check.
5. Leave behavior unchanged; fix only path breakages.

## Success criteria

- Both `chat/` roots contain only the six folders (plus `discuss/.gitkeep` on components).
- No remaining imports of the old flat paths.
- Existing coach/chat unit tests pass; `tsc` / project typecheck clean for affected paths.
- Diff is move + import path edits only (no logic churn).

## Out of scope follow-ups

- Splitting oversized modules
- Adding public barrels later if a stable facade is desired
- Moving discuss UI into `components/.../discuss/` when such UI appears
