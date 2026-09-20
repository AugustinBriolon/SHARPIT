# ADR-042: `/api/v1/today` links the day's activities to their planned sessions

**Status:** Accepted  
**Date:** 2026-09-20  
**Author:** Augustin Briolon (with Claude)  
**Supersedes:** N/A  
**Related:** [ADR-040](./ADR-040-ios-product-canonical-api-v1.md)

---

## Context

A finished activity is paired with the planned session of the same day and sport by
`autoLinkActivities`. The web triggers it when an activity is created and when the app is
opened and providers sync (`ApplicationOpened`).

The native client does neither. It only reads `GET /api/v1/today`. An athlete who uses the
iPhone app alone therefore never gets a session marked as done, even though the activity
and the plan are both in the database.

## Decision

`GET /api/v1/today` runs `autoLinkActivitiesOfDay` for the requested training day before it
builds the view. It links the day's activities that have no planned session, using the same
matching rule as the web (same day, same sport, closest duration, one activity per session).
The compliance analysis of the sessions it linked is scheduled with `after()`, as the manual
link route does.

The step is best effort: a failure is logged and the payload is still returned.

## Rationale

The matching already exists and is tested. Calling it from the read path reuses it, and a
native client gets the same behaviour as the web without re-implementing the score in Swift
and drifting from it. The step is idempotent: an already linked activity is not a candidate,
so repeated reads change nothing.

## Alternatives Considered

### Alternative 1: A separate `POST /api/v1/today/reconcile`

**Description:** The client calls a dedicated write endpoint before reading Today.

**Pros:**

- The read stays free of side effects.
- The client decides when to pay for the write.

**Cons:**

- One more round trip on every launch, before the screen can paint.
- Every client has to remember to call it; a forgotten call brings the bug back.

**Rejected because:** it moves the problem to the client. The route already performs a write
(the morning recalibration is ensured there), so this does not introduce a new kind of
side effect.

### Alternative 2: Match on the device

**Description:** The app fetches the activities and planned sessions, scores them in Swift and
calls `POST /api/planned-sessions/:id/link`.

**Pros:**

- No server change.

**Cons:**

- Duplicates the scoring rule in a second language.
- Depends on web-internal routes that are not a versioned contract.

**Rejected because:** it would fork the matching rule, and ADR-040 keeps the domain
server-side.

## Consequences

### Positive

- The iPhone app marks sessions as done without the web being opened.
- One matching rule for both clients.

### Negative

- A GET has a write side effect, and the first read after an activity arrives is slightly
  slower (one query for unlinked activities, plus one per candidate).
- Only the requested day is covered. An activity synced after midnight for the previous day
  is not linked by a Today read, on purpose: adjacent-day matching produced false links for
  spontaneous sessions.

### Scientific debt created

- None.

---

## Review Criteria

- If the added latency on `/api/v1/today` exceeds 100 ms at p95, move the step to a
  separate call or to the sync path.
- If the native client gains its own provider sync, link on that path and remove this step.
