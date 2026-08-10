# Offline Guard + Hub Snapshot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When offline, hubs fall back to the IndexedDB Twin snapshot if cold, and network write CTAs are honestly disabled via one shared guard — no mutation outbox.

**Architecture:** Hybrid C from the design spec. Connectivity stays `useOnlineStatus` (`!useOffline()`). Add `useOfflineGuard()` for CTA gating. Reuse `OfflineSnapshotSummary` + `useOfflineSnapshot` on Biology / Training / Coach when offline and no live TanStack data. Gate write surfaces by inventory; leave silent refresh soft-fail.

**Tech Stack:** Next `experimental.useOffline`, React hooks, TanStack Query (read cache), existing PWA snapshot store (ADR-008), Vitest.

**Spec:** [`docs/superpowers/specs/2026-08-10-offline-guard-hub-snapshot-design.md`](../specs/2026-08-10-offline-guard-hub-snapshot-design.md)

## Global Constraints

- No offline mutation outbox / queue.
- No service-worker caching of `/api/**`.
- No client-side ViewModel reconstruction from Snapshot (ADR-008).
- No Core / Twin / Decision Engine changes.
- Keep `useOnlineStatus` as the single connectivity signal (`next/offline`).
- Commits only when the user explicitly requests `/ftn-commit`.
- Artifacts in English; user-facing UI copy stays French (`Hors ligne`, existing snapshot banner copy).
- Warm TanStack cache always wins over Snapshot when data exists.

## File map

| File | Role |
| --- | --- |
| `src/hooks/use-offline-guard.ts` (create) | `useOfflineGuard()` |
| `src/hooks/use-offline-guard.test.ts` (create) | Unit tests with mocked online status |
| `src/components/corps/corps-hub.tsx` | Offline+cold → snapshot in tab body |
| `src/components/training/hub/training-dashboard.tsx` | Offline+cold → snapshot |
| `src/components/coach/coach-view.tsx` | Offline+cold → snapshot in main panel |
| Coach plan/adapt/chat components | Unify / add guard on generate, send, tool approve |
| Integrations hub/modal | Disable sync CTAs |
| Wellness / morning orientation | Disable submit / force sync / apply |
| Today empty refresh | Disable Actualiser when offline |
| Settings profile / calibration | Disable save when offline |
| Coach memory manager | Disable CRUD when offline |
| Activity form / planned session dialog / physical notes | Disable submit when offline |
| `docs/INSTANT_UX_ARCHITECTURE.md` §12 | Document read expansion + write UI guard |

---

### Task 1: `useOfflineGuard`

**Files:**
- Create: `src/hooks/use-offline-guard.ts`
- Create: `src/hooks/use-offline-guard.test.ts`
- Optionally re-export from a hooks barrel if one exists for online status (do not invent a barrel)

**Interfaces:**
- Consumes: `useOnlineStatus` from `@/hooks/use-online-status`
- Produces:

```ts
export function useOfflineGuard(): {
  online: boolean;
  offline: boolean;
  guardDisabled: boolean;
  offlineLabel: string; // 'Hors ligne'
};
```

- [ ] **Step 1: Write failing tests** — mock `useOnlineStatus` to `true` / `false`; assert shape and `offlineLabel === 'Hors ligne'`.

- [ ] **Step 2: Implement hook** as in the spec.

- [ ] **Step 3: Run** `yarn vitest run src/hooks/use-offline-guard.test.ts` — PASS.

- [ ] **Step 4: Do not commit** unless user requested.

---

### Task 2: Hub snapshot read (Biology → Training → Coach)

**Files:**
- Modify: `src/components/corps/corps-hub.tsx`
- Modify: composition / physical hub children only as needed to detect “no live data”
- Modify: `src/components/training/hub/training-dashboard.tsx`
- Modify: `src/components/coach/coach-view.tsx`
- Test: small render tests or extend existing hub tests with mocks for `useOnlineStatus` + `useOfflineSnapshot`

**Interfaces:**
- Consumes: `useOfflineGuard` or `useOnlineStatus`, `useOfflineSnapshot`, `OfflineSnapshotSummary`
- Produces: hub UIs that show snapshot when `offline && !liveContent`

**Live-content rules (exact):**
- **Biology:** offline and the active tab’s data query has no cached data (`isPending` / `data == null` — not background refetch). Keep StickyHeader + tabs; replace only the tab panel with `OfflineSnapshotSummary`.
- **Training:** offline and `isAnyInitialQueryLoad` would show shell **or** all of activities/planned/goals have `data == null`. Prefer: offline && no activities data && no planned data && no goals data → snapshot instead of empty dashboard / instead of infinite shell wait. If `TrainingDashboardShell` would show forever offline, short-circuit to snapshot after detecting offline+cold.
- **Coach:** offline && conversations query has no data && no active thread messages to show → snapshot in main content; keep `CoachPageHeader` when possible.

- [ ] **Step 1: Biology** wire + smoke test.
- [ ] **Step 2: Training** wire + smoke test.
- [ ] **Step 3: Coach** wire + smoke test.
- [ ] **Step 4: Confirm Today path unchanged.

---

### Task 3: Write gating (clustered)

**Files:** (touch only call sites that render primary CTAs)

Cluster A — Coach:
- `src/components/coach/plan/plan-generator.tsx` — migrate existing `!online` to `useOfflineGuard`
- `src/components/coach/plan/plan-adapter.tsx` — same; gate **generate** as well as apply
- Coach chat send / new conversation / tool approval components (locate via grep `CoachChat` / send button)

Cluster B — Integrations + morning/today:
- Integrations hub “Tout synchroniser” + modal sync actions
- Wellness check-in submit
- Morning orientation force sync / apply / keep
- Today empty-state Actualiser

Cluster C — Settings + memory + training writes:
- Personal profile / performance calibration save buttons
- Coach memory CRUD
- Activity form submit
- Planned session dialog primary actions
- Physical notes create/update/check-in

**Pattern at each site:**

```tsx
const { offline, guardDisabled, offlineLabel } = useOfflineGuard();
// ...
<Button disabled={guardDisabled || otherDisabled} ...>
  {offline ? offlineLabel : normalLabel}
</Button>
```

For forms: `disabled={guardDisabled}` on submit; optionally prevent `onSubmit` if offline.

- [ ] **Step 1: Cluster A** + focused manual reasoning / existing tests.
- [ ] **Step 2: Cluster B**.
- [ ] **Step 3: Cluster C**.
- [ ] **Step 4: Grep for remaining high-value sync/LLM buttons without guard; gate or document intentional skip in the task report.

---

### Task 4: Docs + verify

**Files:**
- Modify: `docs/INSTANT_UX_ARCHITECTURE.md` §12
- Optionally mark design spec Status → Implemented

- [ ] **Step 1:** Update §12 — hub snapshot reads; write = UI guard until outbox; still no outbox.
- [ ] **Step 2:** Run `yarn typecheck && yarn lint && yarn test && yarn build`.
- [ ] **Step 3:** Commit only on user `/ftn-commit` request.

---

## Spec coverage

| Spec item | Task |
| --- | --- |
| `useOfflineGuard` | 1 |
| Biology / Training / Coach snapshot | 2 |
| Write inventory gating | 3 |
| Instant UX §12 | 4 |
| No outbox / no SW `/api` / no Core | Global |

## Placeholder scan

None intentional. Exact coach-chat file paths resolved at Task 3 via grep (`send`, `inputLocked`, tool approve).
