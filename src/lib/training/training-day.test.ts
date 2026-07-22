import { describe, expect, it } from 'vitest';
import { activityMatchesTrainingDay, computeTrainingDayId } from './training-day';

describe('training-day', () => {
  it('assigns pre-4am local activities to the previous training day', () => {
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
});
