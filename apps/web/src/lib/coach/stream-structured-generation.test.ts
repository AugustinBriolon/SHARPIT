import { describe, expect, it } from 'vitest';
import { NoObjectGeneratedError } from 'ai';

import {
  progressListLength,
  recoverObjectFromGenerationFailure,
  shouldEmitCoachPartial,
} from '@/lib/coach/stream-structured-generation';

describe('progressListLength', () => {
  it('reads sessions or changes arrays', () => {
    expect(progressListLength({ sessions: [{}, {}] })).toBe(2);
    expect(progressListLength({ changes: [{}] })).toBe(1);
    expect(progressListLength({})).toBe(0);
  });
});

describe('shouldEmitCoachPartial', () => {
  it('emits when the sessions list grows', () => {
    const decision = shouldEmitCoachPartial({
      previousSnapshot: '{"sessions":[]}',
      nextValue: { sessions: [{ title: 'A' }] },
      previousListLength: 0,
      charsSinceEmit: 10,
      minCharsBetweenEmits: 400,
    });
    expect(decision.emit).toBe(true);
    expect(decision.listLength).toBe(1);
  });

  it('skips tiny identical-growth updates under the stride', () => {
    const decision = shouldEmitCoachPartial({
      previousSnapshot: '{"sessions":[{"title":"A"}]}',
      nextValue: { sessions: [{ title: 'AB' }] },
      previousListLength: 1,
      charsSinceEmit: 40,
      minCharsBetweenEmits: 400,
    });
    expect(decision.emit).toBe(false);
  });
});

describe('recoverObjectFromGenerationFailure', () => {
  it('recovers a parseable object from NoObjectGeneratedError.text', async () => {
    const error = new NoObjectGeneratedError({
      message: 'No object generated: response did not match schema.',
      text: '{"summary":"ok","sessions":[{"title":"EF"}]}',
      response: { id: 'r', timestamp: new Date(), modelId: 'm' },
      usage: {
        inputTokens: 1,
        inputTokenDetails: { noCacheTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 },
        outputTokens: 1,
        outputTokenDetails: { textTokens: 1, reasoningTokens: 0 },
        totalTokens: 2,
      },
      finishReason: 'stop',
    });

    await expect(recoverObjectFromGenerationFailure(error, '')).resolves.toEqual({
      summary: 'ok',
      sessions: [{ title: 'EF' }],
    });
  });

  it('falls back to streamed JSON text when the error carries no text', async () => {
    const error = new Error('No object generated: response did not match schema.');
    await expect(
      recoverObjectFromGenerationFailure(error, '{"summary":"streamed","sessions":[]}'),
    ).resolves.toEqual({ summary: 'streamed', sessions: [] });
  });
});
