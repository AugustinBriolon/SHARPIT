import { ActivityType } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { buildActivityUpdateData } from '@/lib/activity/activity-service';

describe('buildActivityUpdateData', () => {
  it('updates feeling and rpe without touching sport metrics', () => {
    const data = buildActivityUpdateData({
      type: ActivityType.RUN,
      rpe: 7,
      feeling: 'Bien',
    });

    expect(data).toEqual({
      type: ActivityType.RUN,
      rpe: 7,
      feeling: 'Bien',
    });
    expect(data).not.toHaveProperty('runMetrics');
    expect(data).not.toHaveProperty('bikeMetrics');
  });

  it('upserts run metrics only when provided', () => {
    const data = buildActivityUpdateData({
      type: ActivityType.RUN,
      runMetrics: { distanceM: 10_000 },
    });

    expect(data.runMetrics).toEqual({
      upsert: { create: { distanceM: 10_000 }, update: { distanceM: 10_000 } },
    });
  });

  it('partial feeling patch without type does not add metric relations', () => {
    const data = buildActivityUpdateData({
      rpe: 5,
      feeling: 'Correct',
    });

    expect(data).toEqual({ rpe: 5, feeling: 'Correct' });
  });
});
