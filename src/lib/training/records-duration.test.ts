import { ActivityType } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { buildMetricPrCategories } from './records';

function metricActivity(input: {
  id: string;
  type: ActivityType;
  duration: number;
  title?: string;
}) {
  return {
    id: input.id,
    type: input.type,
    date: new Date('2026-01-15T10:00:00.000Z'),
    title: input.title ?? input.id,
    duration: input.duration,
    runMetrics:
      input.type === ActivityType.RUN
        ? { distanceM: 5000, paceSecPerKm: 300, elevationM: 50 }
        : null,
    bikeMetrics:
      input.type === ActivityType.BIKE
        ? { normalizedPower: 200, avgPower: 180, elevationM: 100 }
        : null,
    swimMetrics:
      input.type === ActivityType.SWIM ? { distanceM: 1500, avgPaceSecPer100m: 90 } : null,
  };
}

describe('buildMetricPrCategories duration PRs', () => {
  it('scopes longest-duration records to each sport (not cross-sport)', () => {
    const metrics = [
      metricActivity({ id: 'long-run', type: ActivityType.RUN, duration: 7200 }),
      metricActivity({ id: 'short-bike', type: ActivityType.BIKE, duration: 1800 }),
      metricActivity({ id: 'mid-swim', type: ActivityType.SWIM, duration: 3600 }),
    ];

    const prs = buildMetricPrCategories(metrics);

    const runDuration = prs.run.find((c) => c.key === 'run-duration');
    const bikeDuration = prs.bike.find((c) => c.key === 'bike-duration');
    const swimDuration = prs.swim.find((c) => c.key === 'swim-duration');

    expect(runDuration?.entries[0]?.activityId).toBe('long-run');
    expect(bikeDuration?.entries[0]?.activityId).toBe('short-bike');
    expect(swimDuration?.entries[0]?.activityId).toBe('mid-swim');

    // Same session must not appear as #1 duration across every sport tab.
    expect(bikeDuration?.entries[0]?.activityId).not.toBe('long-run');
    expect(swimDuration?.entries[0]?.activityId).not.toBe('long-run');
  });

  it('uses sport-specific labels for duration categories', () => {
    const prs = buildMetricPrCategories([]);
    expect(prs.run.find((c) => c.key === 'run-duration')?.label).toBe(
      'Plus longue durée de course',
    );
    expect(prs.bike.find((c) => c.key === 'bike-duration')?.label).toBe('Plus longue durée à vélo');
    expect(prs.swim.find((c) => c.key === 'swim-duration')?.label).toBe(
      'Plus longue durée de nage',
    );
  });
});
