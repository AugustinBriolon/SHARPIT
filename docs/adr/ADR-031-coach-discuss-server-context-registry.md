# ADR-031: Coach discuss server context via per-kind registry

**Status:** Accepted  
**Date:** 2026-09-10  
**Author:** Augustin Briolon (with Cursor)  
**Supersedes:** N/A  
**Related:** [ADR-030](./ADR-030-coach-discuss-context-as-message-metadata.md)

---

## Context

ADR-030 established user-message metadata (`discussKind` + kind-specific ids) as the channel for contextual coach conversations, and enforced the Pro gate for `journal-analyses`.

The review criterion in ADR-030 said: when a second discuss kind starts injecting server-side context, extract a per-kind registry instead of branching in `POST /api/coach/chat`.

That moment arrived immediately: Today, planned session, activity, planning, goal, record, and physical-condition each needed a short system-prompt block so the chip is not cosmetic.

---

## Decision

Use a **typed per-kind registry** in `src/lib/coach/chat/discuss/coach-discuss-server-context.ts`:

1. Parse discuss metadata defensively from the last user message (`lastCoachDiscussMetadata`).
2. Look up `DISCUSS_HANDLERS[kind]` with optional `authorize(athleteId)` then `loadBlock(...)`.
3. Return either `{ status: 'forbidden', error }` or `{ status: 'allowed', loadBlock }` so the route never loads paid/target data before entitlement checks.
4. Keep block formatters/loaders in `coach-discuss-target-blocks.ts` (and the journal gate module) — the registry only wires them.

The chat route stays thin: resolve context → refuse or inject the block into the system prompt.

---

## Rationale

- Satisfies ADR-030's review criterion without growing the route into a switchyard.
- Every kind shares the same security shape: client metadata is untrusted; athlete id comes from the server; authorize runs before load.
- Adding a new discuss surface is a registry entry + loader, not a route edit.

---

## Alternatives Considered

### Alternative 1: Inline branches in the chat route

**Rejected because:** the route already carries rate-limit / budget / stream concerns; kind logic would obscure them and duplicate authorize-before-load.

### Alternative 2: One mega-loader that always hydrates every kind

**Rejected because:** would load unused data and blur entitlement boundaries.

---

## Consequences

### Positive

- All eight discuss kinds can inject real server context.
- Journal Pro gate remains the only `authorize` today; the pattern is ready for more.

### Negative

- Each turn of a contextual conversation may hit DB for the target block (no cache yet).
- Registry and `CoachDiscussMetadata` union must stay in lockstep (TypeScript enforces this).

### Scientific debt created

- None. Blocks restate existing presentation readings; they do not invent new physiology.

---

## Review Criteria

- When a kind's loader shows up in coach chat p95 latency: cache per athlete/day/target id.
- If a second kind needs an entitlement check: reuse the `authorize` slot, do not special-case in the route.
