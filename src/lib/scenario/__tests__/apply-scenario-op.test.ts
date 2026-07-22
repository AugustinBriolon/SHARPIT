import { describe, expect, it } from 'vitest';
import type { ScenarioDefinition, ScenarioSessionSlice } from '@/core/scenario/types';
import {
  buildScenarioApplyOp,
  optimisticSessionFieldsForKind,
  stepDownIntensity,
} from '@/lib/scenario/apply-scenario-op';

function slice(
  partial: Partial<ScenarioSessionSlice> & Pick<ScenarioSessionSlice, 'sessionId'>,
): ScenarioSessionSlice {
  return {
    trainingDayId: '2026-07-22',
    tss: 80,
    environmentalImpact: 'MODERATE',
    exposureSetting: 'OUTDOOR',
    intensity: 'TEMPO',
    title: 'Seuil',
    type: 'RUN',
    ...partial,
  };
}

function definition(
  partial: Partial<ScenarioDefinition> & Pick<ScenarioDefinition, 'kind' | 'id'>,
): ScenarioDefinition {
  return {
    label: 'test',
    rationale: 'test',
    targetSessionId: 's1',
    modifiedSessions: [],
    triggeredByDomain: 'FATIGUE',
    ...partial,
  };
}

describe('buildScenarioApplyOp', () => {
  it('returns none for KEEP_PLAN', () => {
    expect(
      buildScenarioApplyOp(
        definition({
          id: 'keep-plan',
          kind: 'KEEP_PLAN',
          targetSessionId: null,
          modifiedSessions: [slice({ sessionId: 's1' })],
        }),
      ),
    ).toEqual({ op: 'none' });
  });

  it('maps REMOVE_SESSION to remove', () => {
    expect(
      buildScenarioApplyOp(
        definition({
          id: 'remove-s1',
          kind: 'REMOVE_SESSION',
          modifiedSessions: [],
        }),
      ),
    ).toEqual({ op: 'remove', sessionId: 's1' });
  });

  it('maps REDUCE_INTENSITY to intensity + load update', () => {
    const modified = slice({ sessionId: 's1', intensity: 'ENDURANCE', tss: 60 });
    expect(
      buildScenarioApplyOp(
        definition({
          id: 'reduce-s1',
          kind: 'REDUCE_INTENSITY',
          modifiedSessions: [modified],
        }),
      ),
    ).toEqual({
      op: 'update',
      sessionId: 's1',
      data: { intensity: 'ENDURANCE', load: 60 },
    });
  });

  it('maps INDOOR to exposureSetting', () => {
    expect(
      buildScenarioApplyOp(
        definition({
          id: 'indoor-s1',
          kind: 'INDOOR',
          modifiedSessions: [slice({ sessionId: 's1', exposureSetting: 'INDOOR' })],
        }),
      ),
    ).toEqual({
      op: 'update',
      sessionId: 's1',
      data: { exposureSetting: 'INDOOR' },
    });
  });

  it('maps DELAY_SESSION to date from training day', () => {
    const op = buildScenarioApplyOp(
      definition({
        id: 'delay-s1',
        kind: 'DELAY_SESSION',
        modifiedSessions: [slice({ sessionId: 's1', trainingDayId: '2026-07-23' })],
      }),
    );
    expect(op.op).toBe('update');
    if (op.op !== 'update') return;
    expect(op.data.date?.getFullYear()).toBe(2026);
    expect(op.data.date?.getMonth()).toBe(6);
    expect(op.data.date?.getDate()).toBe(23);
  });
});

describe('optimisticSessionFieldsForKind', () => {
  const current = {
    date: new Date(2026, 6, 22, 12),
    intensity: 'TEMPO' as const,
    load: 80,
  };

  it('steps intensity and load for REDUCE_INTENSITY', () => {
    expect(optimisticSessionFieldsForKind('REDUCE_INTENSITY', current)).toEqual({
      intensity: 'ENDURANCE',
      load: 60,
    });
  });

  it('returns remove for REMOVE_SESSION', () => {
    expect(optimisticSessionFieldsForKind('REMOVE_SESSION', current)).toBe('remove');
  });

  it('shifts date for DELAY_SESSION', () => {
    const fields = optimisticSessionFieldsForKind('DELAY_SESSION', current);
    expect(fields).not.toBeNull();
    expect(fields).not.toBe('remove');
    if (fields == null || fields === 'remove') return;
    expect(fields.date?.getDate()).toBe(23);
  });
});

describe('stepDownIntensity', () => {
  it('steps down one level', () => {
    expect(stepDownIntensity('TEMPO')).toBe('ENDURANCE');
    expect(stepDownIntensity('RECOVERY')).toBe('RECOVERY');
    expect(stepDownIntensity(null)).toBeNull();
  });
});
