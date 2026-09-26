/**
 * Progress protocol for the long-running coach endpoints (plan, adapt).
 *
 * Both routes used to answer with a single JSON blob after the model had fully
 * finished — measured at 37s and 55s of blank screen. The model is a reasoning
 * model: it emits several thousand characters of deliberation, then the object.
 * Streaming lets the athlete watch that happen instead of waiting on nothing.
 *
 * The final `result` event carries exactly the payload the endpoints returned
 * before, so consumers that only care about the outcome are unaffected.
 */

/** One frame on the wire. `result` is terminal and mutually exclusive with `error`. */
export type CoachProgressEvent<TResult, TPartial> =
  | { type: 'reasoning'; delta: string }
  | { type: 'partial'; value: TPartial }
  | { type: 'result'; value: TResult }
  | { type: 'error'; message: string };

/** SSE frame. One JSON object per `data:` line, blank line terminated. */
export function encodeCoachProgressEvent<TResult, TPartial>(
  event: CoachProgressEvent<TResult, TPartial>,
): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Splits a growing SSE buffer into decoded events plus the incomplete tail.
 *
 * Network chunks cut anywhere, including mid-JSON, so the caller must feed the
 * returned `rest` back in with the next chunk. Unparseable frames are dropped
 * rather than thrown: a malformed keep-alive must not kill a running generation.
 */
export function parseCoachProgressChunk<TResult, TPartial>(
  buffer: string,
): { events: CoachProgressEvent<TResult, TPartial>[]; rest: string } {
  const frames = buffer.split('\n\n');
  const rest = frames.pop() ?? '';
  const events: CoachProgressEvent<TResult, TPartial>[] = [];

  for (const frame of frames) {
    const line = frame.split('\n').find((l) => l.startsWith('data: '));
    if (!line) {
      continue;
    }
    try {
      events.push(JSON.parse(line.slice(6)) as CoachProgressEvent<TResult, TPartial>);
    } catch {
      // Malformed frame — skip it and keep consuming the stream.
    }
  }

  return { events, rest };
}

/** Headers that keep SSE from being buffered by proxies or the Next.js dev server. */
export const COACH_PROGRESS_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
} as const;

/**
 * Drains a progress response and resolves with the terminal `result`.
 *
 * Rejects on an `error` event, and on a stream that ends without either — a
 * truncated generation must surface as a failure, not as a silent empty result.
 */
function dispatchCoachProgressEvent<TResult, TPartial>(
  event: ReturnType<typeof parseCoachProgressChunk<TResult, TPartial>>['events'][number],
  handlers: {
    onReasoning?: (delta: string) => void;
    onPartial?: (value: TPartial) => void;
  },
  result: { value: TResult } | null,
): { value: TResult } | null {
  switch (event.type) {
    case 'reasoning':
      handlers.onReasoning?.(event.delta);
      return result;
    case 'partial':
      handlers.onPartial?.(event.value);
      return result;
    case 'result':
      return { value: event.value };
    case 'error':
      throw new Error(event.message);
  }
}

export async function consumeCoachProgressStream<TResult, TPartial>(
  response: Response,
  handlers: {
    onReasoning?: (delta: string) => void;
    onPartial?: (value: TPartial) => void;
  } = {},
): Promise<TResult> {
  if (!response.body) {
    throw new Error('Réponse du coach vide.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: { value: TResult } | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });

    const parsed = parseCoachProgressChunk<TResult, TPartial>(buffer);
    buffer = parsed.rest;

    for (const event of parsed.events) {
      result = dispatchCoachProgressEvent(event, handlers, result);
    }
  }

  if (!result) {
    throw new Error('La génération a été interrompue. Réessaie dans un instant.');
  }
  return result.value;
}
