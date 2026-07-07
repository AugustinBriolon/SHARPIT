import { describe, expect, it } from 'vitest';
import { ActivityType } from '@prisma/client';
import {
  buildPeriodKey,
  computeMetricCurrentValue,
  computePerformanceBest,
  type ActivityRow,
} from '@/lib/goal-activity-progress';
import { isGoalReached } from '@/lib/goals';

function runActivity(
  partial: Partial<ActivityRow> & { id: string; date: string; duration: number },
): ActivityRow {
  const paceSecPerKm = partial.duration / (10_000 / 1000);
  return {
    type: ActivityType.RUN,
    runMetrics: {
      distanceM: 10_000,
      paceSecPerKm,
      elevationM: null,
    },
    bikeMetrics: null,
    swimMetrics: null,
    stream: null,
    ...partial,
    date: new Date(partial.date),
  };
}

describe('buildPeriodKey', () => {
  it('formats ISO week key', () => {
    expect(buildPeriodKey('WEEK', new Date('2026-07-07T12:00:00'))).toBe('2026-W28');
  });

  it('formats month key', () => {
    expect(buildPeriodKey('MONTH', new Date('2026-07-07T12:00:00'))).toBe('2026-07');
  });
});

describe('computePerformanceBest', () => {
  it('picks fastest run within distance tolerance', () => {
    const best = computePerformanceBest(
      [
        runActivity({ id: 'slow', date: '2026-06-01T08:00:00', duration: 3000 }),
        runActivity({ id: 'fast', date: '2026-06-10T08:00:00', duration: 2400 }),
        runActivity({
          id: 'other',
          date: '2026-06-11T08:00:00',
          duration: 2000,
          runMetrics: {
            distanceM: 5000,
            paceSecPerKm: 400,
            elevationM: null,
          },
        }),
      ],
      ActivityType.RUN,
      10_000,
    );
    expect(best?.activityId).toBe('fast');
    expect(best?.seconds).toBe(2400);
  });
});

describe('computeMetricCurrentValue', () => {
  it('counts weekly swims for period goal', () => {
    const value = computeMetricCurrentValue(
      {
        v: 1,
        template: 'period',
        period: 'WEEK',
        measure: 'activity_count',
        sport: ActivityType.SWIM,
      },
      [
        {
          id: 's1',
          type: ActivityType.SWIM,
          date: new Date('2026-07-07T08:00:00'),
          duration: 2400,
          runMetrics: null,
          bikeMetrics: null,
          swimMetrics: { distanceM: 1500 },
          stream: null,
        },
        {
          id: 's2',
          type: ActivityType.SWIM,
          date: new Date('2026-07-06T08:00:00'),
          duration: 2100,
          runMetrics: null,
          bikeMetrics: null,
          swimMetrics: { distanceM: 1200 },
          stream: null,
        },
        {
          id: 'r1',
          type: ActivityType.RUN,
          date: new Date('2026-07-06T08:00:00'),
          duration: 3600,
          runMetrics: { distanceM: 10_000, paceSecPerKm: 360, elevationM: null },
          bikeMetrics: null,
          swimMetrics: null,
          stream: null,
        },
      ],
      new Date('2026-07-07T20:00:00'),
    );
    expect(value).toBe(2);
  });
});

describe('performance goal reached', () => {
  it('detects when best time beats chrono target', () => {
    const best = computePerformanceBest(
      [runActivity({ id: 'ok', date: '2026-07-07T08:00:00', duration: 2400 })],
      ActivityType.RUN,
      10_000,
    );
    expect(
      isGoalReached({
        startValue: 2700,
        currentValue: best?.seconds ?? null,
        targetValue: 2500,
        lowerIsBetter: true,
      }),
    ).toBe(true);
  });
});
