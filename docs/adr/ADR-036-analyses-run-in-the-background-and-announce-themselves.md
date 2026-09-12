# ADR-036: Coach analyses run in the background and announce themselves

**Status:** Accepted  
**Date:** 2026-09-12  
**Author:** Augustin Briolon (with Claude Code)  
**Supersedes:** N/A  
**Related:** [ADR-035](./ADR-035-nutrition-coach-reading-not-an-engine.md), [ADR-010](./ADR-010-cache-components-and-instant-navigation.md), [INSTANT_UX_ARCHITECTURE.md](../INSTANT_UX_ARCHITECTURE.md)

---

## Context

Every coach analysis (activity narrative, planned vs realised compliance, brick, weekly review) behaved as if the athlete had to stand and watch it:

- **The narrative blocked the request.** The client asked for `wait: true`, so the answer came back only at the end of the model call. Closing the tab lost it.
- **Watching was page-scoped.** The auto-start ("kick") and the polling loops lived in the components of the page that owned the analysis, with per-session flags in `sessionStorage`. Leaving the page stopped the watching, so an analysis that did finish looked like one that never would.
- **Background work could be dropped.** `scheduleBackgroundTasks` fired `void runBackgroundTasks(...)`. A promise not registered with `after()` is frozen with the serverless function once the response is sent — narratives and compliance analyses triggered after a sync could die silently in production while working locally.
- **Nothing announced anything.** There was no surface, anywhere, saying "this is running" or "this is ready".

The athlete's report: "I get the impression the analysis never finishes unless I stay on the page."

---

## Decision

**An analysis is asynchronous by contract, and it tells the athlete when it lands.**

1. **Every background task registers with `after()`.** No bare promise survives a response on serverless. Outside a request scope (scripts, tests) the work runs inline.
2. **Each analysis records a run** in `AnalysisRun` — one row per (athlete, kind, target):
   - `kind`: `ACTIVITY_NARRATIVE` · `SESSION_COMPLIANCE` · `BRICK` · `WEEKLY_REVIEW`
   - `status`: `RUNNING` → `READY` | `FAILED`, with `startedAt` / `finishedAt` / `error`
   - The row is the claim: a second request for the same target does nothing, and a claim still `RUNNING` after 5 minutes is presumed dead and can be taken over.
3. **One endpoint reports them all**: `GET /api/analyses/status` returns what is in flight plus what finished in the last hour.
4. **One watcher, mounted in the app shell** (`AnalysisNotifications`), polls that endpoint **only while a run is in flight**, refreshes the surface that shows the result, and raises a toast with a link — from whatever page the athlete is on. Polling continues while the tab is hidden (`refetchIntervalInBackground`): waiting for an analysis is precisely when the athlete switches app.
5. **Starting an analysis wakes the watcher.** Whatever kicks work off invalidates the watcher's query key, so it refetches at once and begins polling. Without that, a run started after the watcher's last fetch would stay unseen until the next window focus — the common case, since the athlete starts the analysis and then moves on.
6. **A watermark prevents repeats.** The client remembers the last announced `finishedAt`. Runs finished more than 30 minutes ago move the watermark without raising a toast, so returning after a long absence does not produce a stack of stale notifications.
7. **The coach chat is out of scope.** It is a conversation, not an analysis; streaming stays blocking.

---

## Rationale

- **It fixes a real production bug, not just a perception.** The frozen-promise path meant work was genuinely lost on serverless. `after()` is already the proven pattern here (activity narrative's non-wait path, nutrition day reading).
- **State in the database is what makes it visible from anywhere.** A page-local `sessionStorage` flag can only be read by that page; a run row can be read by the shell, and later by any other surface.
- **The claim removes duplicate spend.** Two tabs, or a re-mount, can no longer launch the same model call twice.
- **Polling stays honest.** The client asks again only while something is running, so an idle athlete costs one request per app open and one per window focus.
- **One table beats four sets of columns.** `analyzedAt`, `narrativeAnalyzedAt` and `generatedAt` say what exists, never what is happening now. Adding a status pair to each would have meant four aggregations for the watcher to read; one run table answers in a single query, and gives the toast its label and link.

---

## Alternatives Considered

### Alternative 1: Keep the blocking calls, just add a global spinner

**Description:** Leave `wait: true` and show a persistent indicator in the shell.

**Pros:**

- No schema change.

**Cons:**

- Closing the tab still loses the analysis.
- The indicator cannot survive a reload, because nothing stores the state.

**Rejected because:** it dresses the symptom and leaves the dropped-work bug in place.

### Alternative 2: Server-sent events or websockets

**Description:** Push the completion to the client instead of polling.

**Pros:**

- No polling at all; instant notification.

**Cons:**

- A long-lived connection per athlete on a serverless platform, plus reconnection handling for a PWA that backgrounds constantly.
- Much heavier than the problem: these analyses take 10–40 s, and a 5 s poll while one is in flight is indistinguishable to the athlete.

**Rejected because:** the cost and failure modes are out of proportion for the gain.

### Alternative 3: A generic job queue

**Description:** A worker, a queue table, retries, dead letters.

**Pros:**

- Uniform for future work.

**Cons:**

- An infrastructure layer for four analyses, in a stabilisation phase.

**Rejected because:** `AnalysisRun` is the small half of this — a status ledger, not a scheduler. If a real queue is ever needed, this table is the natural place to grow it.

---

## Consequences

### Positive

- Leaving a page no longer abandons an analysis, and the athlete is told when it lands.
- Background work stopped being silently droppable in production.
- The same model call can no longer run twice in parallel.

### Negative

- One more table, and every analysis producer must remember to wrap its work.
- A failed run stays `FAILED` until something re-runs it; there is no automatic retry (deliberate — the model calls cost money).
- The per-page polls still exist alongside the watcher; they can be removed once the watcher has proven itself.

### Scientific debt created

- None. This is delivery mechanics, not physiology.

---

## Review Criteria

- If a fifth analysis kind appears, or retries become necessary, revisit the "ledger, not scheduler" line.
- If the 5 s poll shows up in cost or battery measurements, move to a longer interval with a push on window focus.
- If athletes report missed notifications after long absences, revisit the 30-minute announce window.
