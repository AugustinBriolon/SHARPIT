# ADR-052: Each coach question carries only the context it needs

**Status:** Accepted
**Date:** 2026-09-27
**Author:** Augustin Briolon (with Claude Code)
**Supersedes:** N/A (refines how [ADR-031](./ADR-031-coach-discuss-server-context-registry.md)'s context reaches the model)

---

## Context

The coach chat felt slow. Every request sent the same prompt whatever the question:

- the whole athlete context;
- the next 14 days of Google Calendar, an external read;
- the schemas of all nine tools.

That was about 6 000 tokens of prefix. On top of it, the model reasoned at `low` before its first word; the
code's own note measured about 14 s to the first visible text. The server also held each word back 12 ms
(`smoothStream`), so a long answer took seconds more to show. The guard (consent, rate limit, budget) and the
context reads ran one after the other.

---

## Decision

1. **A pure module classifies the question** (`packages/server/src/lib/coach/chat/coach-request-scope.ts`)
   into `planning`, `session`, `nutrition`, `recovery` or `general`. It reads, in this order:
   - the words of the latest question, without accents;
   - the screen the conversation was opened from (`discussKind`);
   - whether the last turns proposed calendar changes.

   A calendar request always wins, and so does a thread that proposed calendar changes, so a follow-up such
   as « et jeudi ? » stays in planning.

2. **The scope decides four things.**

   | Intent      | Context                                                | Agenda read                               | Tools                       | Reasoning |
   | ----------- | ------------------------------------------------------ | ----------------------------------------- | --------------------------- | --------- |
   | `planning`  | all                                                    | yes                                       | all                         | `low`     |
   | `general`   | all                                                    | no (pointer to `getCalendarAvailability`) | all                         | `minimal` |
   | `session`   | core + load, recent, realised, upcoming, environment   | no                                        | read-only + watch exercises | `minimal` |
   | `nutrition` | core + fatigue, recent, upcoming                       | no                                        | read-only                   | `minimal` |
   | `recovery`  | core + fatigue, adaptation, recent, realised, upcoming | no                                        | read-only                   | `minimal` |

   The core is always sent: profile, thresholds, sports, PMC, today's decision, health, goals, and physical
   notes, which are always kept for safety.

3. **`formatCoachContext` takes an optional set of sections.** Without the set, the output is byte-identical to
   before. `streamText` receives `activeTools`, so the schemas of unused tools leave the prompt.

4. **The guard and the prompt's reads run together.** Nothing reaches the model before the guard has passed.
   `smoothStream` is removed: clients render the stream as it arrives.

5. **Every answer logs one line** (`[coach-chat] timing`): phase durations, prompt size, time to the first
   text, steps, tokens. A second line (`[coach-chat] scope`) logs the intent.

---

## Rationale

- **Caution first.** A misclassified question falls back to `general`, which keeps the whole context and every
  tool. Only the agenda is left out, and a tool can still read it. The trimmed intents are those whose
  vocabulary is unambiguous, and they cannot write to the calendar.
- **Reasoning is where the first-word latency came from.** A question that places nothing on the calendar needs
  little of it: its facts are already in the context.
- **Pure and tested.** The classification is a function of the messages and has its own tests. The context
  formatter only gains a filter.

---

## Alternatives Considered

### Ask a small model to classify first

**Why not:** it adds a model round trip before the answer, the very latency this ADR removes.

### Trim the context for every question

**Why not:** a broad question such as « comment je progresse ? » needs everything. A wrong trim reads as a
coach who forgot.

### Keep smoothing with a shorter delay

**Why not:** the web's typing cadence is not worth a slower answer. Both clients render bursts well.

---

## Consequences

**Positive:**

- Most questions skip the agenda read, most tool schemas, and part of the context.
- Non-planning answers start after minimal reasoning.
- The timing log turns « it feels slow » into numbers for each phase.

**Negative / to watch:**

- The keyword lists are French and need to grow as real questions show gaps. The timing and scope logs are the
  place to read them.
- A `general` question that should place a session costs one extra tool call (`getCalendarAvailability`).
