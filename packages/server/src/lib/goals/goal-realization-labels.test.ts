import { describe, expect, it } from 'vitest';
import { buildGoalRealizationLabels } from '@sharpit/server/lib/goals/goal-realization-labels';

describe('buildGoalRealizationLabels', () => {
  it('formats a chrono pair and gap without bare percentages', () => {
    expect(
      buildGoalRealizationLabels({
        currentValue: 1360,
        targetValue: 1200,
        unit: 'chrono',
        metricKey: JSON.stringify({
          v: 1,
          template: 'performance',
          sport: 'RUN',
          distanceM: 5000,
        }),
        lowerIsBetter: true,
      }),
    ).toMatchObject({
      pairLabel: expect.stringMatching(/\//),
      gapLabel: expect.stringMatching(/encore à gagner/),
    });
  });

  it('marks reached goals', () => {
    expect(
      buildGoalRealizationLabels({
        currentValue: 12,
        targetValue: 12,
        unit: 'séances',
        metricKey: null,
        lowerIsBetter: false,
      }).gapLabel,
    ).toBe('Cible atteinte');
  });
});
