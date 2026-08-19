/**
 * Reasoning stream policy for the coach transcript.
 *
 * `gemini-3-flash` is a reasoning model: on a real coaching question it streams
 * several thousand characters of deliberation before the first character of the
 * answer. Measured on this app, reasoning starts at ~3.2s and the first text
 * delta lands at ~14s. Dropping those parts is what made the athlete stare at a
 * spinner for eleven seconds while content was already arriving.
 *
 * We still surface the reasoning (summary line + expandable panel), but the
 * panel stays collapsed by default so the answer remains the primary focus.
 * Pure helpers so the policy is testable without a stream.
 */

/**
 * Split raw reasoning text into displayable sentences for the trace view.
 * Splits on sentence-ending punctuation followed by whitespace, or on newlines.
 */
export function splitReasoningSentences(text: string): string[] {
  if (!text.trim()) return [];
  return text
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

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

/**
 * Whether the reasoning panel opens on its own.
 *
 * Always closed by default — the athlete can open the summary line manually.
 * Kept as a pure helper so the closed-by-default policy stays testable.
 */
export function shouldAutoExpandReasoning(_input: {
  streaming: boolean;
  hasAnswerText: boolean;
}): boolean {
  return false;
}

/**
 * Header label for the reasoning panel. Present tense while the coach is still
 * deliberating, past tense with elapsed duration once the turn has produced an answer.
 */
export function reasoningSummaryLabel(input: {
  streaming: boolean;
  hasAnswerText: boolean;
  elapsedSeconds?: number | null;
}): string {
  if (input.streaming && !input.hasAnswerText) return 'Le coach réfléchit…';
  if (input.elapsedSeconds != null && input.elapsedSeconds > 0) {
    return `A réfléchi pendant ${input.elapsedSeconds}s`;
  }
  return 'Raisonnement du coach';
}
