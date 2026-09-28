import { describe, expect, it } from 'vitest';
import { NoObjectGeneratedError } from 'ai';
import { coachPlanGenerationSchema } from '@sharpit/app/lib/validators/coach';

import {
  isStructuredOutputFailure,
  progressListLength,
  recoverObjectFromGenerationFailure,
  shouldEmitCoachPartial,
  withSchemaInstruction,
} from '@sharpit/server/lib/coach/stream-structured-generation';

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

describe('isStructuredOutputFailure', () => {
  it('retries a reply without a valid object, never a transport or quota error', () => {
    expect(
      isStructuredOutputFailure(
        new NoObjectGeneratedError({
          message: 'No object generated: response did not match schema.',
          text: '{',
          response: { id: 'r', timestamp: new Date(0), modelId: 'm' },
          usage: {} as never,
          finishReason: 'stop',
        }),
      ),
    ).toBe(true);
    expect(isStructuredOutputFailure(new Error('Type validation failed: sessions.0.date'))).toBe(
      true,
    );
    expect(isStructuredOutputFailure(new Error('fetch failed'))).toBe(false);
    expect(isStructuredOutputFailure(new Error('429 rate limit'))).toBe(false);
  });
});

describe('withSchemaInstruction', () => {
  it('hands the model the schema as text, after the system prompt', () => {
    const system = withSchemaInstruction('Tu es un entraîneur.', coachPlanGenerationSchema);
    expect(system.startsWith('Tu es un entraîneur.')).toBe(true);
    expect(system).toContain('JSON Schema');
    expect(system).toContain('endurancePrescription');
  });
});

describe('coachPlanGenerationSchema', () => {
  const base = {
    dayOffset: 1,
    intensity: 'ENDURANCE',
    title: 'Footing',
    durationMin: 45,
    load: 40,
    rationale: 'Base aérobie.',
  };

  it('never takes an endurance session without its steps', () => {
    const week = { summary: 'S', sessions: [{ ...base, type: 'RUN' }] };
    expect(coachPlanGenerationSchema.safeParse(week).success).toBe(false);
  });

  it('takes one with them, and no description', () => {
    const week = {
      summary: 'S',
      sessions: [
        {
          ...base,
          type: 'RUN',
          endurancePrescription: {
            blocks: [
              { steps: [{ kind: 'warmup', minutes: 10, effort: 'RECOVERY' }] },
              { steps: [{ kind: 'interval', minutes: 30, effort: 'ENDURANCE' }] },
              { steps: [{ kind: 'cooldown', minutes: 5, effort: 'RECOVERY' }] },
            ],
          },
        },
      ],
    };
    expect(coachPlanGenerationSchema.safeParse(week).success).toBe(true);
  });
});
