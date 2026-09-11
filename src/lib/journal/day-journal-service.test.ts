import { describe, expect, it } from 'vitest';
import { rowToDayJournalEntry } from './day-journal-service';

describe('day-journal-service', () => {
  it('maps a DB row to a day journal entry', () => {
    expect(
      rowToDayJournalEntry({
        trainingDayId: '2026-09-09',
        factors: { coffee: 'yes', late_meal: 'no' },
        moodLabel: 'Bon',
        hydrationMl: 1500,
        caffeineMg: 80,
        updatedAt: new Date('2026-09-09T10:00:00.000Z'),
      }),
    ).toEqual({
      trainingDayId: '2026-09-09',
      factors: { coffee: 'yes', late_meal: 'no' },
      moodLabel: 'Bon',
      hydrationMl: 1500,
      caffeineMg: 80,
      updatedAt: '2026-09-09T10:00:00.000Z',
    });
  });

  it('coalesces null caffeine to 0 mg', () => {
    expect(
      rowToDayJournalEntry({
        trainingDayId: '2026-09-09',
        factors: {},
        moodLabel: null,
        hydrationMl: null,
        caffeineMg: null,
        updatedAt: new Date('2026-09-09T10:00:00.000Z'),
      }).caffeineMg,
    ).toBe(0);
  });
});
