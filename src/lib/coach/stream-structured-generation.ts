import { Output, parsePartialJson, streamText } from 'ai';
import type { z } from 'zod';
import { COACH_MODEL, COACH_REASONING_LEVEL, coachStructuredGatewayOptions } from '@/lib/ai';

/**
 * Runs a structured coach generation while reporting progress.
 *
 * `plan` and `adapt` both ask the model for one large object. Awaiting it whole
 * meant 37s and 55s of blank screen, most of it spent streaming reasoning the
 * athlete never saw. Reading `fullStream` lets us forward the deliberation as it
 * arrives and rebuild the object incrementally from the JSON deltas.
 *
 * Only `fullStream` is consumed, so there is a single reader on the underlying
 * stream and no ambiguity about which of the SDK's views owns it.
 */

/** Re-parsing on every token is wasted work — wait for a meaningful chunk. */
const PARTIAL_PARSE_STRIDE_CHARS = 48;

/**
 * Resolves with the raw model output. Callers re-validate with their own
 * narrower schema (the generation schema the model sees is deliberately looser
 * than the one the app persists), so widening to `unknown` here loses nothing.
 */
export async function runStructuredCoachStream({
  schema,
  system,
  prompt,
  onReasoning,
  onPartial,
}: {
  schema: z.ZodType;
  system: string;
  prompt: string;
  /** Called with each reasoning fragment, in order. */
  onReasoning: (delta: string) => void;
  /** Called with the object rebuilt so far, only when it actually changed. */
  onPartial: (value: unknown) => void;
}): Promise<unknown> {
  const result = streamText({
    model: COACH_MODEL,
    output: Output.object({ schema }),
    system,
    prompt,
    // No maxOutputTokens here on purpose — see COACH_MAX_OUTPUT_TOKENS.
    reasoning: COACH_REASONING_LEVEL.structured,
    providerOptions: coachStructuredGatewayOptions,
  });

  let jsonText = '';
  let parsedUpTo = 0;
  let lastEmitted = '';

  const emitPartial = async () => {
    const parsed = await parsePartialJson(jsonText);
    if (parsed.state !== 'successful-parse' && parsed.state !== 'repaired-parse') return;
    const snapshot = JSON.stringify(parsed.value);
    if (snapshot === lastEmitted) return;
    lastEmitted = snapshot;
    onPartial(parsed.value);
  };

  for await (const part of result.fullStream) {
    if (part.type === 'reasoning-delta') {
      onReasoning(part.text);
      continue;
    }
    if (part.type !== 'text-delta') continue;

    jsonText += part.text;
    if (jsonText.length - parsedUpTo < PARTIAL_PARSE_STRIDE_CHARS) continue;
    parsedUpTo = jsonText.length;
    await emitPartial();
  }

  return result.output;
}
