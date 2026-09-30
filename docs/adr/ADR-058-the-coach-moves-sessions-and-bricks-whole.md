# ADR-058: The coach moves sessions, and moves a brick whole

**Status:** Accepted
**Date:** 2026-09-30
**Author:** Augustin Briolon (with Claude Code)
**Supersedes:** N/A

---

## Context

The athlete asked the coach to swap today's swim with tomorrow's brick (bike then run). The coach:

- deleted three sessions (the swim and both brick legs);
- created a brick and a swim, with rewritten descriptions, durations and loads;
- lost the Google Calendar event of the new swim (`addedToGoogle: false`).

One deletion failed with a Postgres deadlock, and the coach ran a fourth deletion to recover. The athlete
had to approve five cards where three moves would have done.

Four causes, all in the code:

- **The context hid the brick.** Its legs were listed as unrelated sessions. A brick is stored as one row
  per leg, sharing a `brickGroupId`, one day, and start times chained from the first leg.
- **Nothing said how to move a session.** The prompt insisted on `createBrickSession`, and
  `updatePlannedSession` did not say it could change a date.
- **Moving a brick took one update per leg**, kept in step by the model.
- **Approved proposals run together.** Two deletions touching the same brick deadlocked, and the tool,
  which caught nothing, threw.

---

## Decision

1. **Show bricks in the context.** « Déjà planifié » tags each leg (« brick B1 · jambe 1/2 ») and says how a
   brick moves.
2. **Changing a leg's day or time moves the whole brick** (`rescheduleBrickSessions`, in one transaction):
   - every leg takes the new day;
   - a new time becomes the brick's start, and the legs are chained from it with their durations;
   - other fields stay leg by leg;
   - a travel restriction is checked against every leg's sport on the new day;
   - the tool returns the legs it moved, and the brick is pushed to Google in leg order.
3. **Say it in the prompt and in the tool descriptions.**
   - Moving or swapping is one `updatePlannedSession` per session, and one per brick. It is never a
     deletion followed by a creation.
   - A planned brick is moved, not rebuilt.
   - The content stays as it is unless the athlete asks, or the new day requires a change, which the coach
     then explains.
4. **Within one answer, the tools that write run one at a time.** Reads stay concurrent. A tool that throws
   returns `{ ok: false, error }` instead of failing its card.

---

## Rationale

- **The legs of a brick cannot sensibly live on two days.** Letting the model move them one by one left a
  half-moved brick one failed call away. Moving them together in one transaction is the brick's own
  invariant, enforced where the data is written.
- **Moving keeps what recreating loses:** the Google event, the Garmin push state, the link to an
  activity and its analysis, and the content the athlete already saw.
- **Serial writes cost little.** An answer writes a handful of rows. Reads, like exercise searches, keep
  running in parallel.

---

## Alternatives Considered

### Alternative 1: A dedicated `moveSessions` / `swapSessions` tool

**Description:** A tool that takes several ids and target days, and moves them as one operation.

**Pros:**

- A swap becomes one approval card.

**Cons:**

- A second way to move sessions next to `updatePlannedSession`, with its own approval card, tests and
  client rendering on web and iOS.

**Rejected because:** with bricks moving whole, a swap takes two updates, each approved on its own. It
can be revisited if swaps remain frequent and the two cards feel heavy.

### Alternative 2: Keep one update per leg, guided by the prompt only

**Description:** Tell the model to update every leg of a brick with the same day.

**Pros:**

- No change to the update tool.

**Cons:**

- Relies on the model not to split a brick. Legs would still move one by one, outside a transaction.

**Rejected because:** the invariant belongs to the data, not to the prompt.

### Alternative 3: Retry on deadlock

**Description:** Keep concurrent execution and retry a failed transaction.

**Pros:**

- Writes stay concurrent.

**Cons:**

- Keeps the race it retries, and nothing more is gained, since the writes are few.

**Rejected because:** serializing removes the cause.

---

## Consequences

### Positive

- A swap of a session and a brick is two updates, not five cards.
- Moved sessions keep their calendar event, their watch push state, their link and their content.
- A brick is never split across two days by the coach.
- No deadlock between approved writes, and no raw exception on a card.

### Negative

- The approval card of a leg's update does not show that the other legs follow; the coach's text has to
  say so.
- A new time on any leg restarts the brick at that time from its first leg, which may surprise a request
  about the second leg's time alone.
- Approved writes run one after the other, a little slower when many are approved together.

### Scientific debt created

- None.

---

## Review Criteria

- If athletes ask to set one leg's time on its own, let a leg's time move only the legs after it.
- If swaps stay frequent, reconsider Alternative 1.
- If a coach answer still deletes then recreates a session to move it, strengthen the tool description or
  refuse the pattern server-side.
