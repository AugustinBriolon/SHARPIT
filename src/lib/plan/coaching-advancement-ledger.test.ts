import { describe, expect, it } from 'vitest';
import {
  adaptedSessionsThisWeek,
  appendCoachingAdvancementEntry,
  buildCoachingAdvancementEntry,
  localWeekStartDayKey,
  sumAdaptedSessionsInRange,
} from '@/lib/plan/coaching-advancement-ledger';

describe('coaching-advancement-ledger', () => {
  it('builds an entry with local dayKey', () => {
    const now = new Date(2026, 8, 12, 15, 0, 0);
    const entry = buildCoachingAdvancementEntry({
      goalLabel: ' Semi Paris ',
      changeCount: 2,
      now,
    });
    expect(entry).toEqual({
      appliedAt: now.toISOString(),
      dayKey: '2026-09-12',
      goalLabel: 'Semi Paris',
      changeCount: 2,
    });
  });

  it('prepends and caps ledger length', () => {
    const now = new Date(2026, 8, 12);
    const seed = Array.from({ length: 12 }, (_, i) =>
      buildCoachingAdvancementEntry({
        goalLabel: `G${i}`,
        changeCount: 1,
        now: new Date(2026, 8, 1 + i),
      }),
    );
    const next = appendCoachingAdvancementEntry(
      seed,
      buildCoachingAdvancementEntry({ goalLabel: 'Newest', changeCount: 3, now }),
    );
    expect(next).toHaveLength(12);
    expect(next[0]?.goalLabel).toBe('Newest');
    expect(next[0]?.changeCount).toBe(3);
  });

  it('sums adapted sessions in an inclusive day range', () => {
    const entries = [
      buildCoachingAdvancementEntry({
        goalLabel: 'A',
        changeCount: 2,
        now: new Date(2026, 8, 10),
      }),
      buildCoachingAdvancementEntry({
        goalLabel: 'B',
        changeCount: 1,
        now: new Date(2026, 8, 8),
      }),
      buildCoachingAdvancementEntry({
        goalLabel: 'C',
        changeCount: 5,
        now: new Date(2026, 8, 1),
      }),
    ];
    expect(sumAdaptedSessionsInRange(entries, '2026-09-08', '2026-09-12')).toBe(3);
  });

  it('counts adapts for the local ISO week', () => {
    // Friday 2026-09-11 → week starts Monday 2026-09-07
    const friday = new Date(2026, 8, 11, 10, 0, 0);
    expect(localWeekStartDayKey(friday)).toBe('2026-09-07');
    const entries = [
      buildCoachingAdvancementEntry({
        goalLabel: 'A',
        changeCount: 2,
        now: new Date(2026, 8, 9),
      }),
      buildCoachingAdvancementEntry({
        goalLabel: 'old',
        changeCount: 4,
        now: new Date(2026, 8, 6),
      }),
    ];
    expect(adaptedSessionsThisWeek(entries, friday)).toBe(2);
  });
});
