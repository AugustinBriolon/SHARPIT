import { describe, expect, it } from 'vitest';
import { ActivityType } from '@prisma/client';

import {
  formatStrengthListMetric,
  getActivityListMetric,
  shouldShowActivityListLoad,
} from './activity-list-summary';

const base = {
  load: null as number | null,
  runMetrics: null,
  bikeMetrics: null,
  swimMetrics: null,
  strengthSets: [] as { exercise: string }[],
};

describe('formatStrengthListMetric', () => {
  it('returns undefined for empty sets', () => {
    expect(formatStrengthListMetric([])).toBeUndefined();
  });

  it('counts unique exercises, not set rows', () => {
    expect(
      formatStrengthListMetric([
        { exercise: 'Squat' },
        { exercise: 'Squat' },
        { exercise: 'Fente' },
      ]),
    ).toBe('2 exercices');
  });

  it('singular for one exercise', () => {
    expect(formatStrengthListMetric([{ exercise: 'Planche' }])).toBe('1 exercice');
  });
});

describe('getActivityListMetric', () => {
  it('never dumps strength exercise names', () => {
    const metric = getActivityListMetric({
      ...base,
      type: ActivityType.STRENGTH,
      strengthSets: [
        { exercise: 'Squat' },
        { exercise: 'Fente' },
        { exercise: 'Curl' },
        { exercise: 'Inconnu' },
      ],
    });
    expect(metric).toBe('4 exercices');
    expect(metric).not.toContain('Squat');
  });

  it('formats run distance when present', () => {
    expect(
      getActivityListMetric({
        ...base,
        type: ActivityType.RUN,
        runMetrics: { distanceM: 5010 },
      }),
    ).toBe('5.01 km');
  });
});

describe('shouldShowActivityListLoad', () => {
  it('hides load when bike TSS is already the metric', () => {
    expect(
      shouldShowActivityListLoad({
        ...base,
        type: ActivityType.BIKE,
        load: 80,
        bikeMetrics: { tss: 80 },
      }),
    ).toBe(false);
  });

  it('shows load for run and strength', () => {
    expect(shouldShowActivityListLoad({ ...base, type: ActivityType.RUN, load: 51 })).toBe(true);
    expect(shouldShowActivityListLoad({ ...base, type: ActivityType.STRENGTH, load: 17 })).toBe(
      true,
    );
  });
});
