/**
 * Reasoning stream policy for the coach transcript.
 *
 * The backend no longer streams a reasoning summary (`includeThoughts` in
 * `src/lib/ai.ts` — generating it cost output tokens for content the athlete
 * mostly skipped past). This file now only extracts whatever reasoning parts
 * a message still carries, in case a fallback provider ever emits some; the
 * UI never renders that text, only a "thinking" indicator while it streams.
 */

/** Minimal shape of the reasoning parts the AI SDK puts on a UI message. */
export type ReasoningPartLite = {
  type: string;
  text?: string;
};

/** Concatenated reasoning text carried by one assistant message. */
export function reasoningTextOf(parts: readonly ReasoningPartLite[]): string {
  return parts
    .filter((part) => part.type === 'reasoning')
    .map((part) => part.text ?? '')
    .join('');
}
