import { describe, expect, it } from 'vitest';
import { ActivityType } from '@prisma/client';
import { activitiesMatch, mergedSource } from '@/lib/activity-dedup';

describe('mergedSource', () => {
  it('returns both when garmin and strava', () => {
    expect(mergedSource(true, true)).toBe('both');
    expect(mergedSource(true, false)).toBe('garmin');
    expect(mergedSource(false, true)).toBe('strava');
    expect(mergedSource(false, false)).toBe('manual');
  });
});

describe('activitiesMatch', () => {
  const base = new Date('2026-07-07T18:00:00');

  it('matches same fingerprint within tolerance', () => {
    expect(
      activitiesMatch(
        { type: ActivityType.RUN, date: base, duration: 3600 },
        { type: ActivityType.RUN, date: new Date(base.getTime() + 5 * 60_000), duration: 3650 },
      ),
    ).toBe(true);
  });

  it('rejects different sports', () => {
    expect(
      activitiesMatch(
        { type: ActivityType.RUN, date: base, duration: 3600 },
        { type: ActivityType.BIKE, date: base, duration: 3600 },
      ),
    ).toBe(false);
  });

  it('rejects when start times are too far apart', () => {
    expect(
      activitiesMatch(
        { type: ActivityType.RUN, date: base, duration: 3600 },
        { type: ActivityType.RUN, date: new Date(base.getTime() + 20 * 60_000), duration: 3600 },
      ),
    ).toBe(false);
  });

  it('matches on time only when duration is missing', () => {
    expect(
      activitiesMatch(
        { type: ActivityType.STRENGTH, date: base, duration: null },
        {
          type: ActivityType.STRENGTH,
          date: new Date(base.getTime() + 2 * 60_000),
          duration: null,
        },
      ),
    ).toBe(true);
  });
});
