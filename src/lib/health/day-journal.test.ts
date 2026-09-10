import { describe, expect, it } from 'vitest';
import {
  cycleFactorState,
  emptyDayJournalEntry,
  parseDayJournalStore,
  upsertDayJournalEntry,
} from './day-journal';

describe('day-journal', () => {
  it('cycles ternary factor state unset → yes → no → unset', () => {
    expect(cycleFactorState(undefined)).toBe('yes');
    expect(cycleFactorState('unset')).toBe('yes');
    expect(cycleFactorState('yes')).toBe('no');
    expect(cycleFactorState('no')).toBe('unset');
  });

  it('parses and upserts a day entry', () => {
    const empty = parseDayJournalStore(null);
    expect(empty.byDay).toEqual({});

    const entry = {
      ...emptyDayJournalEntry('2026-09-08'),
      factors: { late_meal: 'yes' as const },
      caffeineMg: 80,
    };
    const next = upsertDayJournalEntry(empty, entry);
    expect(next.byDay['2026-09-08']?.factors.late_meal).toBe('yes');
    expect(next.byDay['2026-09-08']?.caffeineMg).toBe(80);
  });

  it('accepts new journal factor ids and custom ids, ignores unknown ones', () => {
    const parsed = parseDayJournalStore({
      version: 1,
      byDay: {
        '2026-09-08': {
          trainingDayId: '2026-09-08',
          factors: {
            alcohol: 'yes',
            creatine: 'no',
            menstruation: 'yes',
            custom_abc123def456: 'yes',
            not_a_factor: 'yes',
          },
          moodLabel: null,
          hydrationMl: null,
          caffeineMg: null,
          updatedAt: '2026-09-08T12:00:00.000Z',
        },
      },
    });
    expect(parsed.byDay['2026-09-08']?.factors).toEqual({
      alcohol: 'yes',
      creatine: 'no',
      menstruation: 'yes',
      custom_abc123def456: 'yes',
    });
    expect(parsed.byDay['2026-09-08']?.caffeineMg).toBe(0);
  });

  it('defaults empty entry caffeine to 0 mg', () => {
    expect(emptyDayJournalEntry('2026-09-10').caffeineMg).toBe(0);
  });
});
