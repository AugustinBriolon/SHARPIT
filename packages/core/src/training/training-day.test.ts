import { describe, expect, it } from 'vitest';
import {
  activityMatchesTrainingDay,
  computeTrainingDayId,
  trainingDayIdForNow,
} from './training-day';

describe('training-day', () => {
  it('assigns pre-4am local activities to the previous training day when cutoff is 4', () => {
    const activityAt0130Paris = new Date('2026-07-02T01:30:00.000Z');

    expect(
      computeTrainingDayId(activityAt0130Paris, {
        timezone: 'Europe/Paris',
        trainingDayStartHour: 4,
      }),
    ).toBe('2026-07-01');
  });

  it('matches activities against training day using athlete timezone', () => {
    const lateEveningNewYork = new Date('2026-07-03T03:30:00.000Z');

    expect(
      activityMatchesTrainingDay(lateEveningNewYork, '2026-07-02', {
        timezone: 'America/New_York',
        trainingDayStartHour: 4,
      }),
    ).toBe(true);
  });

  it('flips the athlete day at local midnight by default (Paris CEST)', () => {
    // Sunday 13 Sep 2026 03:00 Paris (CEST, UTC+2) — still Saturday under the old 04:00 cutoff.
    const sunday0300Paris = new Date('2026-09-13T01:00:00.000Z');
    expect(
      computeTrainingDayId(sunday0300Paris, {
        timezone: 'Europe/Paris',
      }),
    ).toBe('2026-09-13');
    expect(trainingDayIdForNow({ timezone: 'Europe/Paris' }, sunday0300Paris)).toBe('2026-09-13');
  });

  it('keeps the previous calendar day just before local midnight', () => {
    // Saturday 12 Sep 2026 23:59 Paris
    const saturday2359Paris = new Date('2026-09-12T21:59:00.000Z');
    expect(
      computeTrainingDayId(saturday2359Paris, {
        timezone: 'Europe/Paris',
      }),
    ).toBe('2026-09-12');
  });

  it('enters the next calendar day just after local midnight', () => {
    // Sunday 13 Sep 2026 00:01 Paris
    const sunday0001Paris = new Date('2026-09-12T22:01:00.000Z');
    expect(
      computeTrainingDayId(sunday0001Paris, {
        timezone: 'Europe/Paris',
      }),
    ).toBe('2026-09-13');
  });
});
