import { describe, expect, it } from 'vitest';
import {
  previewStepSets,
  type EndurancePreviewStep,
} from '@sharpit/app/lib/planned-session/endurance/endurance-preview';

function step(key: string, group: string, repeat = 1): EndurancePreviewStep {
  return {
    key,
    kind: 'interval',
    kindLabel: 'Bloc',
    group,
    repeat,
    durationLabel: '3 min',
    targetLabel: null,
    strokeLabel: null,
    notes: null,
  };
}

describe('previewStepSets', () => {
  it('keeps a block and its recovery together, repeated as one set', () => {
    const sets = previewStepSets([
      step('0-0', '0'),
      step('1-0', '1', 5),
      step('1-1', '1', 5),
      step('2-0', '2'),
    ]);

    expect(sets.map((set) => [set.repeat, set.steps.length])).toEqual([
      [1, 1],
      [5, 2],
      [1, 1],
    ]);
  });

  it('keeps two repeated blocks apart when they come from different groups', () => {
    const sets = previewStepSets([step('0-0', '0', 3), step('1-0', '1', 3)]);

    expect(sets).toHaveLength(2);
  });
});
