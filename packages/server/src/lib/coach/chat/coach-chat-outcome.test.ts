import { describe, expect, it } from 'vitest';
import {
  describeCoachChatError,
  describeCoachChatOutcome,
  type CoachChatEnd,
} from '@sharpit/server/lib/coach/chat/coach-chat-outcome';

function end(overrides: Partial<CoachChatEnd> = {}): CoachChatEnd {
  return {
    finishReason: 'stop',
    rawFinishReason: 'STOP',
    steps: [{ text: 'Ta nuit était courte.', toolCalls: [] }],
    finalStep: { response: { modelId: 'google/gemini-3-flash' } },
    ...overrides,
  };
}

describe('describeCoachChatOutcome', () => {
  it('reports the finish reason and the model the gateway served', () => {
    expect(
      describeCoachChatOutcome(
        end({ finalStep: { response: { modelId: 'anthropic/claude-haiku-4.5' } } }),
      ),
    ).toEqual({
      finishReason: 'stop',
      rawFinishReason: 'STOP',
      servedModel: 'anthropic/claude-haiku-4.5',
      emptyAnswer: false,
    });
  });

  it('flags an answer with neither text nor tool call as empty', () => {
    const outcome = describeCoachChatOutcome(
      end({ finishReason: 'length', steps: [{ text: '  \n', toolCalls: [] }] }),
    );
    expect(outcome.emptyAnswer).toBe(true);
    expect(outcome.finishReason).toBe('length');
  });

  it('does not flag a turn that only proposed a calendar change', () => {
    const outcome = describeCoachChatOutcome(
      end({ steps: [{ text: '', toolCalls: [{ toolName: 'createPlannedSession' }] }] }),
    );
    expect(outcome.emptyAnswer).toBe(false);
  });

  it('does not flag a turn whose text came in a later step', () => {
    const outcome = describeCoachChatOutcome(
      end({
        steps: [
          { text: '', toolCalls: [{ toolName: 'listPlannedSessions' }] },
          { text: 'Jeudi est libre.', toolCalls: [] },
        ],
      }),
    );
    expect(outcome.emptyAnswer).toBe(false);
  });

  it('reads a missing raw reason as null', () => {
    expect(
      describeCoachChatOutcome(end({ rawFinishReason: undefined })).rawFinishReason,
    ).toBeNull();
  });
});

describe('describeCoachChatError', () => {
  it('keeps the class, the message and the HTTP status of a provider error', () => {
    const error = Object.assign(new Error('Service Unavailable'), {
      name: 'AI_APICallError',
      statusCode: 503,
    });
    expect(describeCoachChatError(error)).toEqual({
      name: 'AI_APICallError',
      message: 'Service Unavailable',
      statusCode: 503,
    });
  });

  it('truncates a long message', () => {
    const summary = describeCoachChatError(new Error('x'.repeat(2_000)));
    expect(summary.message).toHaveLength(500);
    expect(summary.statusCode).toBeNull();
  });

  it('describes a thrown value that is not an Error', () => {
    expect(describeCoachChatError('timeout')).toEqual({
      name: 'NonError',
      message: 'timeout',
      statusCode: null,
    });
  });
});
