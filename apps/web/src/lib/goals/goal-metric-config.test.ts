import { describe, expect, it } from 'vitest';
import { ActivityType } from '@prisma/client';
import { computeMetricCurrentValue } from '@/lib/goals/goal-activity-progress';
import {
  buildPeriodGoalFields,
  formatChronoSeconds,
  parseChronoInput,
  parseGoalMetricConfig,
  serializeGoalMetricConfig,
} from '@/lib/goals/goal-metric-config';
import { computeGoalProgress } from '@/lib/goals/goals';

describe('goal-metric-config', () => {
  it('parse et sérialise la config période', () => {
    const config = {
      v: 1 as const,
      template: 'period' as const,
      period: 'WEEK' as const,
      measure: 'distance' as const,
      sport: ActivityType.RUN,
    };
    const raw = serializeGoalMetricConfig(config);
    expect(parseGoalMetricConfig(raw)).toEqual(config);
  });

  it('parse un chrono mm:ss et h:mm:ss', () => {
    expect(parseChronoInput('25:30')).toBe(25 * 60 + 30);
    expect(parseChronoInput('1:05:00')).toBe(3900);
    expect(formatChronoSeconds(3900)).toBe('1:05:00');
  });

  it('construit un objectif période avec horizon mensuel', () => {
    const fields = buildPeriodGoalFields(
      { v: 1, template: 'period', period: 'MONTH', measure: 'activity_count', sport: null },
      8,
    );
    expect(fields.horizon).toBe('MONTHLY');
    expect(fields.unit).toBe('séances');
    expect(fields.targetValue).toBe(8);
  });
});

describe('goal progress', () => {
  it('calcule la progression chrono (lower is better)', () => {
    expect(
      computeGoalProgress({
        startValue: null,
        currentValue: 1400,
        targetValue: 1500,
        lowerIsBetter: true,
      }),
    ).toBe(100);

    const behind = computeGoalProgress({
      startValue: null,
      currentValue: 1800,
      targetValue: 1500,
      lowerIsBetter: true,
    });
    expect(behind).toBe(0);
  });

  it('agrège la distance hebdo course à pied', () => {
    const now = new Date('2026-07-07T12:00:00');
    const config = {
      v: 1 as const,
      template: 'period' as const,
      period: 'WEEK' as const,
      measure: 'distance' as const,
      sport: ActivityType.RUN,
    };
    const total = computeMetricCurrentValue(
      config,
      [
        {
          id: '1',
          type: ActivityType.RUN,
          date: new Date('2026-07-06T08:00:00'),
          duration: 1800,
          runMetrics: { distanceM: 5000, elevationM: 50, paceSecPerKm: 360 },
          bikeMetrics: null,
          swimMetrics: null,
          stream: null,
        },
        {
          id: '2',
          type: ActivityType.RUN,
          date: new Date('2026-06-30T08:00:00'),
          duration: 2400,
          runMetrics: { distanceM: 10000, elevationM: 100, paceSecPerKm: 240 },
          bikeMetrics: null,
          swimMetrics: null,
          stream: null,
        },
      ],
      now,
    );
    expect(total).toBe(5000);
  });
});
