# ADR-059: The athlete rates a brick as one effort

**Status:** Accepted
**Date:** 2026-10-01
**Author:** Augustin Briolon (with Claude Code)
**Supersedes:** N/A

---

## Context

A brick (bike then run, for instance) is stored as one `PlannedSession` row per leg, sharing a
`brickGroupId`. Each leg links to its own `Activity`, and each activity already carries the athlete's
`rpe` (1–10, Foster CR10), `feeling` and `notes`.

What the athlete cannot say anywhere is how the **chain** went:

- the effort of the brick as a whole is not the mean of each leg's RPE — the run after the bike is the
  point of the session;
- the transitions (T2, …) have no subjective rating at all, although they are what a brick trains;
- the coach's brick analysis (`analyzeBrick`) reads the numbers of each leg but never hears the athlete
  about the whole.

The iPhone app already shows a done brick as one session (`DoneBrickDrawer`), with no place to answer.

---

## Decision

1. **A `BrickEvaluation` table, one row per `brickGroupId`** (the primary key, like `BrickAnalysis`):
   `rpe` (1–10, whole brick), `transitionRating` (1–5), `feeling` (the shared
   `ACTIVITY_FEELING_SCALE` label), `notes` (≤ 2000 chars). Every field is nullable: an unanswered
   scale stays empty, never zero.
2. **`GET /api/planned-sessions/brick/evaluation?groupId=…` and `PUT` (upsert)**, validated by
   `brickEvaluationSchema` (`@sharpit/app/lib/validators/brick-evaluation`). `PUT` refuses a group the
   athlete does not own (fewer than two of their legs carry it). Mirrored at `/api/v1/…` and listed in
   `NATIVE_V1_SURFACES`.
3. **Deleted with the brick.** When deleting a leg demotes the brick, `deletePlannedSession` drops its
   evaluation with its analysis, in the same transaction.
4. **The brick analysis hears it.** `analyzeBrick` appends « Évaluation de l'athlète » to the prompt when
   one exists, and the system prompt tells the coach to confront it with the numbers.
5. **`/api/v1/today` sessions carry `brickGroupId`** on brick lines. A done brick line's `id` is its first
   activity (for installed apps older than brick legs), so the group needed its own field.
6. **Web:** the brick analysis panel shows the evaluation once every leg is linked, and edits it in a
   four-step dialog built on `ScalePicker` (feeling, RPE, transitions, notes). The RPE and feeling
   scales move to `components/ui/instruments/session-scales.ts`, shared with the session feeling dialog.

---

## Rationale

- One row per group mirrors `BrickAnalysis`: the brick has no row of its own, and the group id is
  already how every brick surface addresses it.
- Separate columns rather than JSON: the fields are few, stable and typed, and the coach and future
  load models read them directly.
- A distinct table keeps per-leg `Activity` fields meaning exactly what they mean on any other session.

---

## Alternatives Considered

### Alternative 1: Store the evaluation on the first leg's `Activity`

- **Pros:** no migration.
- **Cons:** the first leg's RPE would mean two things (the leg, or the brick) depending on context; the
  transition rating has no column; demoting the brick would leave a stray verdict on a plain session.
- **Why rejected:** overloads a field every load computation reads.

### Alternative 2: Columns on `PlannedSession` (first leg)

- **Pros:** no new table.
- **Cons:** the planned session is the prescription, not what happened; a brick done without any plan
  link could never be rated; leg reorder moves the verdict.
- **Why rejected:** wrong owner.

### Alternative 3: A JSON `content` column like `BrickAnalysis`

- **Pros:** one shape for both brick tables.
- **Cons:** loses the database types and range checks on four simple fields.
- **Why rejected:** nothing about these fields is open-ended.

---

## Consequences

### Positive

- The athlete can rate the chain and its transitions, on the web and on iPhone.
- Brick analyses can tell « the numbers say the run held, you say the legs were gone ».

### Negative

- One more table and endpoint to keep in step with brick demotion.
- The brick RPE does not feed Foster session load: the leg RPEs still do.

### Scientific debt created

- Whether the whole-brick RPE should replace leg RPEs in session load is left open.

---

## Review Criteria

- If athletes rate bricks but not their legs, consider deriving leg load from the brick RPE.
- If transition ratings correlate with measured T2 heart-rate drift, surface the pairing in the analysis.
