import { describe, expect, it } from 'vitest';
import { emptyDayJournalEntry } from '@/lib/health/day-journal';
import { defaultJournalPrefs, setTrackableEnabled } from '@/lib/health/journal-prefs';
import {
  JOURNAL_ANALYSIS_MIN_DAYS,
  JOURNAL_ENABLED_LIMIT_FREE,
  canEnableAnotherTrackable,
  countEnabledTrackables,
  dayHasJournalSignal,
  enforceJournalPrefsLimits,
  isJournalAnalysisReady,
} from '@/lib/health/journal-limits';

describe('journal-limits', () => {
  it('counts enabled trackables and enforces free custom strip + cap', () => {
    let prefs = defaultJournalPrefs();
    expect(countEnabledTrackables(prefs)).toBe(5);
    expect(canEnableAnotherTrackable(prefs, false)).toBe(true);
    expect(canEnableAnotherTrackable(prefs, true)).toBe(true);

    prefs = {
      ...prefs,
      customItems: [{ id: 'custom_abc123def456', label: 'Yoga', enabled: true }],
      enabled: { ...prefs.enabled, alcohol: true, sauna: true, creatine: true },
    };
    const free = enforceJournalPrefsLimits(prefs, false);
    expect(free.customItems).toEqual([]);
    expect(countEnabledTrackables(free)).toBeLessThanOrEqual(JOURNAL_ENABLED_LIMIT_FREE);

    const pro = enforceJournalPrefsLimits(prefs, true);
    expect(pro.customItems).toHaveLength(1);
    expect(countEnabledTrackables(pro)).toBe(countEnabledTrackables(prefs));
  });

  it('trims free prefs down to the enabled limit', () => {
    let prefs = defaultJournalPrefs();
    const extras = [
      'alcohol',
      'sauna',
      'creatine',
      'steps_10k',
      'nap',
      'stress_ok',
      'cardio_20',
      'strength_20',
      'sleep_target',
      'body_battery_ok',
    ] as const;
    for (const id of extras) {
      prefs = setTrackableEnabled(prefs, id, true, true);
    }
    expect(countEnabledTrackables(prefs)).toBeGreaterThan(JOURNAL_ENABLED_LIMIT_FREE);
    const enforced = enforceJournalPrefsLimits(prefs, false);
    expect(countEnabledTrackables(enforced)).toBe(JOURNAL_ENABLED_LIMIT_FREE);
  });

  it('treats null/unset/zero caffeine as no journal signal', () => {
    const empty = emptyDayJournalEntry('2026-09-10');
    expect(dayHasJournalSignal(empty)).toBe(false);
    expect(dayHasJournalSignal({ ...empty, caffeineMg: 0 })).toBe(false);
    expect(dayHasJournalSignal({ ...empty, caffeineMg: 80 })).toBe(true);
    expect(dayHasJournalSignal({ ...empty, hydrationMl: 0 })).toBe(true);
    expect(dayHasJournalSignal({ ...empty, factors: { alcohol: 'unset' } })).toBe(false);
    expect(dayHasJournalSignal({ ...empty, factors: { alcohol: 'no' } })).toBe(true);
  });

  it('unlocks analyses after the min day count', () => {
    expect(isJournalAnalysisReady(JOURNAL_ANALYSIS_MIN_DAYS - 1)).toBe(false);
    expect(isJournalAnalysisReady(JOURNAL_ANALYSIS_MIN_DAYS)).toBe(true);
  });
});
