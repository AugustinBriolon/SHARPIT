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
      factors: { sick: 'yes' as const },
      caffeineMg: 80,
    };
    const next = upsertDayJournalEntry(empty, entry);
    expect(next.byDay['2026-09-08']?.factors.sick).toBe('yes');
    expect(next.byDay['2026-09-08']?.caffeineMg).toBe(80);
  });
});
