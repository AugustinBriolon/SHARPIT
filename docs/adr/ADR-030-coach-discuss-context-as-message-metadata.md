# ADR-030: Coach discuss context travels as message metadata; entitlements re-checked server-side

**Status:** Accepted  
**Date:** 2026-09-10  
**Author:** Augustin Briolon (with Claude Code)  
**Supersedes:** N/A  
**Follow-up:** [ADR-031](./ADR-031-coach-discuss-server-context-registry.md) — per-kind server registry

---

## Context

Every athlete surface named in the Information Architecture can open a contextual coach conversation (`coachDiscussHref`, 8 kinds: `today`, `planned-session`, `activity`, `planning`, `goal`, `record`, `physical-condition`, `journal-analyses`). The coach view shows a context chip naming what the conversation carries.

That chip was **purely visual**. `submitCoachChatMessage` sent only `{ text }`; the chip was detached after sending. `POST /api/coach/chat` receives `{ messages }` only and never knew which surface a conversation came from.

Two concrete problems followed for the « Lecture coach · journal » perk, listed as Pro in `pro-perks.ts`:

1. **Client-only gate.** `CoachReadingCta` on `/journal/analyses` showed FREE athletes an upsell, but `/coach?discussJournalAnalyses=1` opened the same conversation for anyone. The perk registry claimed a `hasProAccess()` gate that did not exist.
2. **No paid value delivered.** The coach system context (`buildCoachContext`) never contained journal habit findings, so even a Pro athlete got an ordinary conversation with a label.

Constraint: Core is frozen (`CORE_ARCHITECTURE.md`); the findings come from the existing deterministic presentation reading (`buildJournalHabitReading`), not a new engine.

---

## Decision

Use **user-message metadata** as the channel for the discuss context, and **re-check entitlements on the server** before loading any kind-specific data.

1. **Client** — `coachDiscussMetadata(context)` (`src/lib/coach/chat/discuss/coach-discuss-context.ts`) returns `{ discussKind }` for the attached chip. `coach-chat-submit.ts` sends it on both paths: `sendMessage({ text, metadata })` for a stored conversation, and `metadata` on the first message of a new (ephemeral) conversation.
2. **Persistence** — the metadata lives on the user message in `Conversation.messages`. `sanitizeConversationMessages` only rewrites assistant text parts, so every later turn of that conversation still carries it.
3. **Server** — `src/lib/coach/chat/discuss/journal-analyses-coach-gate.ts` reads the metadata defensively (user role only, shape-checked). In `src/app/api/coach/chat/route.ts`:
   - `journal-analyses` + FREE tier (`getAthleteProfile` + `hasProAccess`) → **HTTP 403** `« La lecture coach du journal est réservée à Pro. »`, returned before any finding is loaded or any model call is made.
   - `journal-analyses` + PRO → `loadJournalHabitFindings` → `buildJournalHabitReading` → a system-prompt block (priority association, other associations, « associations, not causes », 1–2 experiments over 7 days, honest « not enough data » below 7 days).
   - No metadata → unchanged behaviour, no tier lookup.
4. `pro-perks.ts` keeps the perk in `PRO_ONLY_PERKS` with `status: 'pro'` — now true.

---

## Rationale

- **Security boundary on the server.** The discuss kind is client-supplied and therefore untrusted. Gating on it is safe in one direction only: the server _withholds_ the paid data unless the stored tier allows it. Omitting or forging the metadata can never yield more than an ordinary conversation.
- **Message metadata over a request-body field.** The AI SDK (`ai` 7.x) natively supports `sendMessage({ text, metadata })` and persists it with the message. A separate body field would be lost on reload and on every later turn of a stored conversation.
- **Deliver the value the perk names.** Without the findings block, a server gate would only protect a label. Reusing `buildJournalHabitReading` keeps one source of truth with the `/journal/analyses` page and adds no Core engine.
- **Existing patterns.** The 403 mirrors `requireProAthlete` in `api/coach/weekly-review/route.ts`; the client already surfaces a JSON `error` field through `humanizeCoachTransportError`, so no UI change was needed.

---

## Alternatives Considered

### Alternative 1: Mark the perk `included` and keep chips cosmetic

**Description:** Move « Lecture coach · journal » to `INCLUDED_FOR_EVERYONE`, drop the `· Pro` upsell.

**Pros:**

- Smallest change; registry and UI become consistent immediately.
- No new request surface.

**Cons:**

- The coach still never sees the findings; the perk description remains unbuilt.
- Loses a Pro differentiator.

**Rejected because:** product owner decided the perk stays Pro and must be real.

### Alternative 2: Dedicated request-body field (`{ messages, discussKind }`)

**Description:** Extend the transport body via `prepareSendMessagesRequest`.

**Pros:**

- Explicit, not tied to message shape.

**Cons:**

- Not persisted: a reloaded or resumed conversation loses its context on the next turn.
- Needs extra client state to re-send the kind on every request.

**Rejected because:** metadata persists with the conversation for free.

### Alternative 3: Keep the client-side gate only

**Description:** Rely on `CoachReadingCta` hiding the entry point.

**Pros:**

- Zero server work.

**Cons:**

- Not a security boundary — the deep link bypasses it.

**Rejected because:** entitlements must be enforced where the data is served.

---

## Consequences

### Positive

- The perk is enforced server-side: a FREE athlete sending `discussKind: 'journal-analyses'` gets a 403 and no finding is read from the database.
- Pro athletes' coach receives their journal reading, matching the perk description on `/settings/pro`.
- A single, typed channel (`CoachDiscussMetadata`) now exists for the other 7 discuss kinds.
- Covered by `journal-analyses-coach-gate.test.ts`, `api/coach/chat/route.test.ts` (FREE 403 / PRO block / plain conversation untouched) and `coach-chat-submit.test.ts`.

### Negative

- FREE athletes can still talk about their journal in an ordinary conversation; the gate protects the findings, not the topic.
- One extra profile read on each turn of a `journal-analyses` conversation, and one findings load per Pro turn (no caching yet).
- `POST /api/coach/chat` stays thin; kind wiring lives in the ADR-031 registry.

### Scientific debt created

- None new. The block restates the existing deterministic reading and explicitly forbids causal claims; confidence labels (« Association nette » / « À confirmer ») are unchanged.

---

## Review Criteria

- ~~When a second discuss kind starts injecting server-side context: extract a per-kind registry~~ — done in ADR-031.
- If the findings load shows up in coach chat latency (p95) or DB load: cache the reading per athlete/day.
- When real billing replaces the manual `AthleteProfile.tier` toggle: confirm `hasProAccess` remains the only gate call.
