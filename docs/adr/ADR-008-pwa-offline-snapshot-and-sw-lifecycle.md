# ADR-008: PWA Offline Snapshot Persistence and Service-Worker Update Lifecycle

**Status:** Accepted
**Date:** 2026-07-15
**Author:** Principal Architect
**Supersedes:** N/A
**Superseded by:** N/A

---

## Context

SHARPIT's PWA shell (Serwist, `src/sw.ts`) precaches static assets and explicitly routes `/api/**` and `/__clerk/**` through `NetworkOnly` — no mutation has ever been servable stale or queueable offline. Two gaps remained for "feels like a high-quality installed iOS app": (1) the service worker activated a new version unconditionally (`skipWaiting: true`), able to swap cached assets under an athlete mid-form or mid-coaching-dialog; (2) there was no offline experience at all — closing the app without connectivity showed a static "no connection" page even seconds after a perfectly good `AthleteSnapshot` had been fetched.

This ADR records two decisions with real trust and privacy weight: persisting a subset of physiological inference data on-device, and changing when a new app version takes effect.

---

## Decision

### 1. Persist the canonical `AthleteSnapshot` itself, in IndexedDB, ownership-scoped and expiring

`src/lib/pwa/snapshot-store.ts` writes one record per signed-in athlete (`ownerKey` = Clerk `user.id`) containing the **exact same `AthleteSnapshot` object** already served by the existing `GET /api/athlete-state/snapshot` endpoint — no raw health observations, no activity payloads, no coach chat/LLM content, nothing beyond what that endpoint already returns to the browser on every normal visit. `src/lib/pwa/snapshot-store-validation.ts` (pure) rejects the record on read — clearing it rather than serving something questionable — whenever it's malformed, from an incompatible schema version, owned by a different `ownerKey` than the currently signed-in athlete, or older than 48 hours (`OFFLINE_SNAPSHOT_MAX_AGE_HOURS`).

This is acceptable as a privacy boundary because: (a) it is strictly a mirror of data the browser already legitimately received and would otherwise have discarded on reload; (b) it never leaves the device — no new server endpoint, no new sync target; (c) it is read-only — no mutation path exists that could act on the cached copy; (d) it is scoped and time-bounded, not an unbounded local database of the athlete's history.

### 2. IndexedDB directly, no persistence library

No `idb`/`dexie`/`localforage`/query-persister dependency existed in this codebase, and none is added. `snapshot-store.ts` is a thin ~90-line wrapper around three IndexedDB calls (`put`/`get`/`delete` against a single object store). A library would add a dependency and an abstraction layer to solve a problem three native calls already solve cleanly, and would risk becoming a second caching abstraction alongside Serwist — which the task driving this ADR explicitly ruled out.

### 3. `skipWaiting: false` — the athlete confirms before a new version activates

`src/sw.ts` no longer activates a newly-installed worker automatically. It waits (`skipWaiting: false`) until it receives a `{ type: 'SKIP_WAITING' }` message, which only `UpdateAvailableBanner` sends, which only fires after an explicit tap. `clientsClaim: true` is unchanged — it only matters once activation has already been confirmed, at which point immediately claiming the reloading tab is correct and harmless. The state machine (`src/lib/pwa/sw-update-state.ts`, pure) is deliberately one-directional: `WAITING_DETECTED` → `AVAILABLE`, and only an explicit `UPDATE_REQUESTED` can move it to `ACTIVATING` — there is no path from `NONE` to `ACTIVATING` that skips the athlete's confirmation.

No emergency bypass (a mechanism to force-activate a critical fix without waiting for confirmation) is built. None is needed yet — no incident or known bad-cache scenario motivates one — and speculative infrastructure for a hypothetical future emergency is exactly the kind of premature complexity this project's engineering principles rule out. If a real need arises, it gets its own ADR with its own rationale.

---

## Options considered

### Option A (for #1) — Persist a page-specific ViewModel instead of the raw Snapshot

Cache whatever `TodayViewModel` Today's own presentation route returns, so the offline view could reuse Today's existing rendering components directly.

**Rejected because:** `AthleteSnapshot` is this project's explicitly canonical state (`CORE_ARCHITECTURE.md`); a ViewModel is a server-built projection of it for one specific surface. Caching the projection instead of the source would mean the offline experience silently depends on whichever page happened to be open when the last successful fetch occurred, and would require the client to either store multiple ViewModels (scope creep) or accept an incomplete offline picture tied to one page's shape. Caching the canonical object keeps the contract simple and matches the constraint that offline access must never involve client-side recomputation of product state — there is nothing to recompute; the Snapshot **is** the state.

### Option B (for #3) — Keep `skipWaiting: true`, rely on athletes rarely having the app open during a deploy

**Rejected because:** "rarely" is not "never," and the one time it happens is exactly a coaching dialog or plan-review form being silently interrupted by a version swap — the failure mode this ADR exists to prevent. The fix (a `waiting`-state worker plus one explicit user action) is small and standard; there's no real cost to doing it correctly.

---

## Consequences

### Positive

- An athlete who opens the installed app with no connectivity sees the last verified state, clearly labeled read-only, instead of a dead end — directly serving "feels like a native app" without touching Core inference or introducing any new mutation surface.
- A version deploy can never interrupt an open form, dialog, or coaching action — the athlete controls exactly when the new version takes effect.
- Both decisions are testable with plain fixtures: `snapshot-store-validation.ts` and `sw-update-state.ts` are pure, unit-tested without a browser; `snapshot-store.ts`'s IndexedDB round-trip is tested with `fake-indexeddb` (a tiny, dev-only, single-purpose test dependency — not a second caching abstraction, a test polyfill).

### Negative

- IndexedDB storage is one more place athlete state exists, however narrowly scoped — a future engineer touching sign-out/account-switching flows needs to remember `clearSnapshot()` exists and is wired into `SnapshotOfflineSync`. Documented here and at the call site.
- The 48-hour expiry is a judgment call, not a physiologically derived number — chosen to survive a connectivity-free weekend without ever being mistaken for current. Revisit if real usage shows it's wrong in either direction.
- Athletes on browsers without `beforeinstallprompt` and not on iOS (chiefly Firefox) get no install UI at all, by design (`UNSUPPORTED` in `install-prompt-state.ts`) — this is honest rather than a gap to close, since there is no reliable install action to offer them.

### Neutral

- The install experience lives only in Settings (`InstallCard`), not a global banner — see the accompanying implementation plan for the full rationale (avoiding brittle "is a dialog open" detection by placing the entry point somewhere that's never a coaching action by construction).

### Known platform limitation — re-authentication after install

iOS partitions storage (cookies, localStorage, IndexedDB) between a Safari tab and the same site launched standalone from the home screen — they are, from the platform's perspective, different storage contexts. An athlete signed in via Safari who then installs and opens SHARPIT standalone should expect to sign in again once. This is Apple's platform behavior, not a SHARPIT defect, and there is no supported client-side fix (it is not something `SnapshotOfflineSync`, Clerk's session handling, or any code in this repo controls). Documented here so a future "I had to log in twice" report isn't mistaken for a bug — see `docs/PWA_TESTING.md`'s authentication-expiry checklist item.

---

## References

- `docs/models/CORE_ARCHITECTURE.md` — `AthleteSnapshot` as canonical state; no client-side recomputation.
- `docs/SNAPSHOT_QUALITY_V1_AUDIT.md` — the `READY`-classified fields (`todaysDecision`, `confidence`/`confidenceLabel`, `limitingFactor`) the offline summary is built from, and nothing beyond them.
- `src/lib/pwa/snapshot-store.ts`, `snapshot-store-validation.ts`, `sw-update-state.ts` — implementation.
- `src/sw.ts` — the service-worker lifecycle change.
