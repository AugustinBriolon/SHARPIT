# ADR-056: The coach chat survives what breaks it

**Status:** Accepted
**Date:** 2026-09-30
**Author:** Augustin Briolon (with Claude Code)
**Supersedes:** N/A (builds on [ADR-052](./ADR-052-coach-chat-request-scope.md))

---

## Context

Athletes reported a slow coach that often « crashes ». The evidence, gathered on 2026-09-30:

- **Langfuse, `coach-chat`, since 2026-09-16.** On DeepSeek v4 Flash, the production model: 19.8 s at p50,
  55.8 s at p90, and a maximum of 56.6 s. On Gemini 3 Flash, over the weeks before: 2.9 s at p50 and 8.1 s
  at p90.
- **The route stopped at 60 s** (`maxDuration`). A turn Vercel kills never flushes its Langfuse trace, so
  the crashes left no record. Langfuse held no error-level observation.
- **An empty answer.** One production turn ran 13 s and spent 1 024 of its 1 025 output tokens reasoning.
  It never emitted a text delta, so the athlete got an empty bubble. The prompt also told the model its
  reasoning was shown to the athlete, while `includeThoughts: false` throws it away.
- **The history belongs to the clients.** Web and iOS each store the conversation and send all of it
  back. The route passed it to the model as it came:
  - a malformed body threw before any stream;
  - a calendar proposal ignored on iOS reached the provider as a tool call without a result, which
    the provider rejects. The web composer already closed ignored proposals; iOS did not;
  - a tool call left unfinished by a cut connection failed the same way.
- **The guard took 839 ms.** Consent, rate limit, then the budget's tier and token sum ran one after the
  other, before the model was even called.
- **Errors in the stream were silent.** No `onError` was set, and the athlete read the SDK's English
  « An error occurred. ».

---

## Decision

Make every known failure of the coach chat either recoverable or visible:

1. **Retry an empty answer, once, on another model.** A turn with neither text nor a tool call is
   answered again in the same stream by `anthropic/claude-haiku-4.5`, with reasoning `none`
   (`COACH_EMPTY_ANSWER_RETRY_MODEL`). The first attempt's chunks are copied one by one, so the turn's
   finish never overtakes them. Each attempt logs its own outcome.
2. **Stop trusting the history the client sends.**
   - `safeValidateUIMessages` checks it, and a malformed conversation gets a 400 with a French message.
   - A new question closes the calendar proposals left unanswered, as the web composer already does.
   - `convertToModelMessages` drops tool calls that never got a result (`ignoreIncompleteToolCalls`).
3. **Raise the chat's `maxDuration` from 60 s to 300 s**, as plan and adapt already have.
4. **Run the guard's reads at once.** Consent, rate limit and budget start together, and so do the
   budget's tier and token sum. The answer order stays the same: consent, then rate limit, then budget.
5. **Log how each turn ends.** Every turn logs its finish reason, the model that actually answered and an
   empty-answer flag. Stream errors log their error class and HTTP status. The athlete reads a French
   message when the stream breaks. Each uncached context build logs how long each of its sources took.
6. **Serve the chat with `google/gemini-3-flash` again** (`COACH_MODEL` in the Vercel environment).
7. **Tell the model its reasoning is not shown.** The prompt now says so, and that everything the athlete
   must read goes in the answer.

---

## Rationale

- **Each fix answers a measured failure.** The timeout comes from Langfuse's latency, the empty answer
  from a production log, and the guard's cost from the route's timing line. The history failures follow
  directly from how the code handled the conversation.
- **The retry uses another provider.** The empty answer came from the default model's reasoning.
  Retrying the same model with the same prompt would probably fail the same way. Haiku without
  reasoning has every fact it needs in the prompt, and it is already the gateway's first fallback.
- **The server owns safety, whatever the client does.** Fixing iOS as well would still leave the route
  open to the next client or an old app version. Closing ignored proposals is idempotent with the web
  composer, which already did it.
- **The model change is where the latency was.** DeepSeek cost about 17 s at p50 and Gemini about
  3 s. The guard and context reads together are around 1.3 s.

---

## Alternatives Considered

### Alternative 1: Share the coach context cache through Redis

**Description:** Replace the single-slot, in-process cache (30 s) with an Upstash key per athlete and
day, so that `/api/coach/prepare` actually warms the chat.

**Pros:**

- Around 400 ms off a chat turn whose context was built recently.
- The warm-up call becomes useful across serverless instances.

**Cons:**

- Invalidation lives in process memory today (`invalidateCoachContext`). The coach's own calendar tools
  invalidate nothing, and about ten write paths feed the context.
- A shared cache with a longer lifetime would serve stale sessions right after the athlete approved a
  change.

**Rejected because:** the gain is small next to the model's latency, and the risk is a coach that forgets
what was just planned. The materialized context of the next phase, rebuilt on events, replaces it.

### Alternative 2: Never rebuild the athlete snapshot on the chat path

**Description:** Read the last persisted snapshot even when it is due for a rebuild.

**Pros:**

- Removes the one read that can run the snapshot pipeline in the middle of a chat turn.

**Cons:**

- The coach could contradict Today, which reads a fresh snapshot. The product forbids that (see
  `formatPrescriptiveDecisionLines`).

**Rejected because:** consistency with Today comes first. The per-source timing will show whether the
snapshot is actually the slow read.

### Alternative 3: A larger output cap instead of a retry

**Description:** Raise `maxOutputTokens` so that reasoning leaves room for text.

**Pros:**

- One call, no second model.

**Cons:**

- A model can still stop after reasoning, and a larger cap means a longer wait for exactly those turns.

**Rejected because:** it does not guarantee text, and it makes the failing turn slower.

### Alternative 4: Retry on the same model

**Description:** Ask the default model again, without reasoning.

**Pros:**

- Same voice and the same provider for the whole turn.

**Cons:**

- Gemini 3 Flash does not accept a reasoning level of `none` (`minimal` is its floor), so the retry
  would keep the behaviour that failed.

**Rejected because:** the retry must not share the first attempt's failure mode.

---

## Consequences

### Positive

- A turn that used to end in an empty bubble now ends with an answer, a few seconds later.
- Ignored proposals, malformed or cut conversations no longer reach the provider: a malformed one
  gets a clear 400.
- Planning turns can run past 60 s instead of being killed with no trace.
- The guard costs its slowest read rather than the sum of four.
- `[coach-chat] empty answer`, `[coach-chat] stream error` and `[coach-context] sources` turn « it
  crashed » into a named cause.

### Negative

- A retried turn is billed twice, and may read slightly differently (another model).
- A refused consent still spends one rate-limit token.
- The route now changes the history it receives (closed proposals) before persisting nothing itself: the
  client's stored copy keeps the open proposal until the next save.

### Scientific debt created

- None.

---

## Review Criteria

- If `[coach-chat] empty answer` shows up in more than 1 % of turns on Gemini 3 Flash, revisit the reasoning
  level of answer intents rather than relying on the retry.
- If Langfuse `coach-chat` p90 on Gemini exceeds 15 s, revisit the model choice (`yarn api bench:coach-models`).
- If `[coach-context] sources` shows one read above 300 ms at p50, act on that read, or bring forward the
  materialized context.
- When the server owns conversation history (planned next phase), fold the history checks into it.
