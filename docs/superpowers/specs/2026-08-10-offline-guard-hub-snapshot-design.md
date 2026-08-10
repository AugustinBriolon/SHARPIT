# Offline guard + hub snapshot read (v1)

**Date:** 2026-08-10  
**Status:** Implemented (2026-08-10)  
**Related:** [ADR-008](../../adr/ADR-008-pwa-offline-snapshot-and-sw-lifecycle.md) · [INSTANT_UX_ARCHITECTURE.md](../../INSTANT_UX_ARCHITECTURE.md) §12 · Next `experimental.useOffline`

---

## Problem

`useOffline` / `useOnlineStatus` already powers `OfflineBanner` and two coach-plan apply buttons. Today can fall back to the IndexedDB `AthleteSnapshot` when offline with no live ViewModel.

Everywhere else, athlete-facing network writes stay clickable offline: they either fail after an optimistic flash (rollback jank) or stream/LLM/sync fail loudly. Biology / Training / Coach hubs have no Twin read path when cold and offline.

Instant UX §12 forbids an offline mutation outbox in this phase. The gap is therefore **honest gating** + **broader read fallback**, not sync.

---

## Goal

When offline:

1. **Read** — warm TanStack cache still paints; if a hub has no usable live data, show the same read-only `OfflineSnapshotSummary` as Today.
2. **Write** — no CTA that needs the network lets the athlete believe a write succeeded. Disable / block submit with a clear “Hors ligne” affordance.
3. **One helper** — `useOfflineGuard()` so gating is consistent and discoverable.

Non-goals:

- Offline mutation outbox / queue.
- Service-worker caching of `/api/**`.
- Client-side ViewModel reconstruction from Snapshot (ADR-008).
- Core / Twin / Decision Engine changes.
- Changing `useOffline` itself (Next experimental — keep as the single connectivity signal).

---

## Approach (hybrid C — approved)

| Layer | Behaviour |
| --- | --- |
| Connectivity | Keep `useOnlineStatus` → `!useOffline()` from `next/offline` |
| Awareness | Keep global `OfflineBanner` |
| Read | Cache first; hub cold+offline → `OfflineSnapshotSummary` via `useOfflineSnapshot` |
| Write | Disable network-required actions; Instant CRUD submits also disabled until outbox exists |
| Helper | `useOfflineGuard()` for buttons / submits |

---

## Design

### 1. `useOfflineGuard`

**File:** `src/hooks/use-offline-guard.ts` (name may stay next to `use-online-status.ts`)

```ts
export function useOfflineGuard(): {
  online: boolean;
  offline: boolean;
  /** Spread onto Button: disabled when offline (compose with other disables). */
  guardDisabled: boolean;
  /** French label fragment for primary CTAs when offline. */
  offlineLabel: string; // "Hors ligne"
} {
  const online = useOnlineStatus();
  return {
    online,
    offline: !online,
    guardDisabled: !online,
    offlineLabel: 'Hors ligne',
  };
}
```

Optional tiny presentational helper later (`OfflineAwareButton`) — **YAGNI** until a third call-site pattern appears; prefer composing `disabled={guardDisabled \|\| …}` and swapping label when `offline`.

### 2. Hub snapshot read

**Reuse** `OfflineSnapshotSummary` + `useOfflineSnapshot(active)` — no new Twin projection.

| Hub | Trigger (`active`) | Placement |
| --- | --- | --- |
| Today | Already: `!online && hasNoLiveContent` | Unchanged |
| Biology (`CorpsHub`) | `!online &&` composition/suivi query cold (no data, not merely refetching) | Replace main tab body; keep StickyHeader + tabs chrome |
| Training (`TrainingDashboard`) | `!online &&` activities+planned+goals all without data (same gate as cold shell / `valuesLoading` with empty cache) | Replace dashboard body |
| Coach (`CoachView`) | `!online &&` no usable conversation list cache **and** no active thread content | Show summary in main panel; keep header chrome where possible |

**Rule:** if TanStack still has data from a prior visit, **paint that data** (SWR / Instant UX). Snapshot is only for empty live content while offline — not a second UI over warm cache.

**Banner copy** inside `OfflineSnapshotSummary` stays: lecture seule / non synchronisable.

### 3. Write gating inventory (v1 must-gate)

Disable or block submit when `offline` (use `useOfflineGuard`):

| Surface | Actions |
| --- | --- |
| Coach chat | Send / lock composer; new conversation; tool approve/reject that hits network |
| Coach plan / adapt | Generate (LLM); insert/apply already partially gated — unify on helper |
| Integrations | “Tout synchroniser” + per-provider sync / backfill |
| Wellness check-in | Submit |
| Morning orientation | Force sync / refresh evidence; apply / keep recalibration |
| Today empty | “Actualiser” refetch |
| Settings | Profile save, calibration save/import/apply-estimates |
| Coach memory | Create / update / delete |
| Activity form | Create / update submit |
| Planned session dialog | Create / update / delete / brick analyze |
| Physical notes | Create / update / check-in |

**Explicit keep soft-fail (no new gate):**

- Silent `AthleteStateInitializer` / snapshot polling — already fail soft.
- Optimistic hook internals — leave apply/rollback code; UI simply does not call mutate while offline.

### 4. Banner

No change to `OfflineBanner` copy unless a one-line tweak clarifies “lectures possibles, actions désactivées” — optional polish, not required for v1.

### 5. Documentation

- Update Instant UX §12: offline **read** expanded to hubs; offline **write** = UI guard until outbox; still no outbox implementation.
- Cross-link ADR-008 (Snapshot read-only contract unchanged).

---

## Testing

- Unit: `useOfflineGuard` returns expected shape (mock `useOnlineStatus` / `useOffline`).
- Unit / smoke: hub components render `OfflineSnapshotSummary` when offline + empty data (mock hooks).
- Existing Today offline path stays green.
- No E2E auth dependency required; optional Playwright later with bypass.

---

## Implementation order

1. Add `useOfflineGuard` + thin tests.
2. Wire hub snapshot fallbacks (Biology → Training → Coach).
3. Gate write CTAs by surface clusters (coach → integrations → wellness/morning → settings/memory → activity/planned/physical).
4. Doc Instant UX §12.
5. Verify `yarn typecheck && yarn lint && yarn test && yarn build`; commit via `/ftn-commit` when requested.

---

## Success criteria

- Offline + warm cache → existing UI, mutations disabled where gated.
- Offline + cold hub → Twin snapshot summary, chrome intact, no blank main.
- Online → no behavioural change.
- No Core changes; no `/api` SW caching; no mutation outbox.

---

## Out of scope / deferred

- Persisted outbox for Instant CRUD.
- Biology-specific offline charts from Snapshot (Snapshot lacks composition series — summary only).
- Training history list offline beyond warm RQ cache + Twin summary.
