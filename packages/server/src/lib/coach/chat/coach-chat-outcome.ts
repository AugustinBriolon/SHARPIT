/**
 * How a coach answer ended, for the logs: why the model stopped, which model the gateway actually
 * served, and whether the athlete saw anything at all. Model ids and reasons only — never a message,
 * a prompt or anything about the athlete.
 */

/** The slice of a finished generation this module reads (a subset of the AI SDK end event). */
export type CoachChatEnd = {
  finishReason: string;
  rawFinishReason: string | undefined;
  steps: ReadonlyArray<{ text: string; toolCalls: ReadonlyArray<unknown> }>;
  finalStep: { response: { modelId: string } };
};

export type CoachChatOutcome = {
  finishReason: string;
  rawFinishReason: string | null;
  /** The model that wrote the last step: differs from the configured one after a gateway failover. */
  servedModel: string;
  /** No text and no tool call in any step: the athlete was left with an empty bubble. */
  emptyAnswer: boolean;
};

export function describeCoachChatOutcome(end: CoachChatEnd): CoachChatOutcome {
  const emptyAnswer = end.steps.every(
    (step) => step.text.trim() === '' && step.toolCalls.length === 0,
  );
  return {
    finishReason: end.finishReason,
    rawFinishReason: end.rawFinishReason ?? null,
    servedModel: end.finalStep.response.modelId,
    emptyAnswer,
  };
}

/** Provider messages can be long; the log line only needs enough to recognise the failure. */
const ERROR_MESSAGE_MAX_CHARS = 500;

export type CoachChatErrorSummary = {
  name: string;
  message: string;
  statusCode: number | null;
};

/** A stream error reduced to what identifies it: its class, its message and any HTTP status. */
export function describeCoachChatError(error: unknown): CoachChatErrorSummary {
  if (!(error instanceof Error)) {
    return {
      name: 'NonError',
      message: String(error).slice(0, ERROR_MESSAGE_MAX_CHARS),
      statusCode: null,
    };
  }
  const { statusCode } = error as { statusCode?: unknown };
  return {
    name: error.name,
    message: error.message.slice(0, ERROR_MESSAGE_MAX_CHARS),
    statusCode: typeof statusCode === 'number' ? statusCode : null,
  };
}
