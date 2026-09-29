import { describe, expect, it } from 'vitest';
import { buildJournalDayData } from '@sharpit/app/lib/journal/journal-day-signals';

describe('buildJournalDayData', () => {
  it('sends the day values the checklist is derived from', () => {
    const day = buildJournalDayData(
      {
        totalSteps: 11_234,
        stress: 28,
        napMinutes: 20,
        sleepMinutes: 432,
        bodyBattery: 64,
        sleepScore: 82,
        sleepBedtimeMin: 1_390,
        sleepWakeMin: 405,
        hrv: 61,
        restingHr: 47,
        recoveryScore: 74,
      },
      [{ duration: 3_600 }, { duration: 1_800 }, { duration: null }],
    );

    expect(day.sleep).toEqual({ minutes: 432, score: 82, bedtimeMin: 1_390, wakeMin: 405 });
    expect(day).toMatchObject({ hrv: 61, restingHr: 47, readiness: 74, steps: 11_234 });
    expect(day.activities).toEqual({ count: 3, minutes: 90 });
  });

  it('says nothing was measured rather than zero on a day without a device', () => {
    const day = buildJournalDayData(null, []);

    expect(day.sleep.minutes).toBeNull();
    expect(day.steps).toBeNull();
    expect(day.activities).toEqual({ count: 0, minutes: 0 });
  });
});
