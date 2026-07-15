import { describe, expect, it } from 'vitest';
import { describeSnapshotContext } from './snapshot-context-labels';
import type { DecisionSnapshotContext } from '@/lib/decision-memory/types';

function baseContext(overrides: Partial<DecisionSnapshotContext> = {}): DecisionSnapshotContext {
  return {
    confidence: null,
    confidenceTier: null,
    overallVerdict: null,
    limitingFactorSystem: null,
    physicalHealthCapacity: null,
    fatigueTrainingCapacity: null,
    ...overrides,
  };
}

describe('describeSnapshotContext', () => {
  it('resolves physicalHealthCapacity (TrainingCapacityLevel) values not shared with fatigue TrainingCapacity', () => {
    // Regression: physicalHealthCapacity uses FULL/REDUCED/LIMITED/UNABLE, a different
    // enum from fatigue's FULL/REDUCED/LIGHT_ONLY/REST_ONLY. LIMITED/UNABLE previously
    // resolved via the wrong (fatigue) label map, silently returning undefined — which
    // JSON.stringify drops entirely, so the field vanished instead of showing null or text.
    expect(
      describeSnapshotContext(baseContext({ physicalHealthCapacity: 'LIMITED' }))
        .physicalHealthCapacityLabel,
    ).toBe('Entraînement limité');
    expect(
      describeSnapshotContext(baseContext({ physicalHealthCapacity: 'UNABLE' }))
        .physicalHealthCapacityLabel,
    ).toBe('Entraînement impossible');
  });

  it('resolves physicalHealthCapacity values shared with fatigue TrainingCapacity too', () => {
    expect(
      describeSnapshotContext(baseContext({ physicalHealthCapacity: 'FULL' }))
        .physicalHealthCapacityLabel,
    ).toBe('Entraînement complet');
  });

  it('never returns undefined for a populated field — always a string or explicit null', () => {
    const result = describeSnapshotContext(baseContext({ physicalHealthCapacity: 'LIMITED' }));
    expect(result.physicalHealthCapacityLabel).not.toBeUndefined();
    expect(Object.keys(result)).toContain('physicalHealthCapacityLabel');
  });

  it('resolves fatigueTrainingCapacity (fatigue TrainingCapacity) values independently', () => {
    expect(
      describeSnapshotContext(baseContext({ fatigueTrainingCapacity: 'LIGHT_ONLY' }))
        .fatigueTrainingCapacityLabel,
    ).toBe('Activité légère uniquement');
  });

  it('returns null for every field on an empty context', () => {
    const result = describeSnapshotContext(baseContext());
    expect(result).toEqual({
      overallVerdictLabel: null,
      confidenceTierLabel: null,
      limitingFactorLabel: null,
      physicalHealthCapacityLabel: null,
      fatigueTrainingCapacityLabel: null,
    });
  });
});
