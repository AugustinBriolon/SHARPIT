import { describe, expect, it } from 'vitest';
import {
  DEMO_JOURNAL_DAYS,
  demoJournalCaffeineMg,
  demoJournalDayHabits,
  demoJournalFactors,
  demoJournalNightOutcomes,
  demoJournalPrefs,
} from '@/lib/demo/demo-journal-seed';
import { isJournalAnalysisReady } from '@/lib/health/journal-limits';

describe('demoJournalSeed', () => {
  it('covers enough days to unlock analyses', () => {
    expect(DEMO_JOURNAL_DAYS).toBeGreaterThanOrEqual(7);
    expect(isJournalAnalysisReady(DEMO_JOURNAL_DAYS)).toBe(true);
  });

  it('creates intermittent late_meal and device_in_bed contrast', () => {
    const habits = Array.from({ length: DEMO_JOURNAL_DAYS }, (_, ago) => demoJournalDayHabits(ago));
    const lateYes = habits.filter((h) => h.lateMeal === 'yes').length;
    const lateNo = habits.filter((h) => h.lateMeal === 'no').length;
    const deviceYes = habits.filter((h) => h.deviceInBed === 'yes').length;
    const deviceNo = habits.filter((h) => h.deviceInBed === 'no').length;
    expect(lateYes).toBeGreaterThanOrEqual(3);
    expect(lateNo).toBeGreaterThanOrEqual(3);
    expect(deviceYes).toBeGreaterThanOrEqual(3);
    expect(deviceNo).toBeGreaterThanOrEqual(3);
  });

  it('drops sleep and recovery on rough nights', () => {
    const rough = demoJournalNightOutcomes(0, true);
    const calm = demoJournalNightOutcomes(0, false);
    expect(rough.sleepMinutes).toBeLessThan(calm.sleepMinutes);
    expect(rough.recoveryScore).toBeLessThan(calm.recoveryScore);
    expect(rough.bodyBattery).toBeLessThan(calm.bodyBattery);
  });

  it('keeps daily stack on and alcohol off', () => {
    const factors = demoJournalFactors('yes', 'no');
    expect(factors.creatine).toBe('yes');
    expect(factors.alcohol).toBe('no');
    expect(factors.late_meal).toBe('yes');
    expect(factors.device_in_bed).toBe('no');
  });

  it('enables journal prefs for the tracked stack', () => {
    const prefs = demoJournalPrefs();
    expect(prefs.enabled.late_meal).toBe(true);
    expect(prefs.enabled.device_in_bed).toBe(true);
    expect(prefs.enabled.creatine).toBe(true);
    expect(prefs.enabled.metric_caffeine).toBe(true);
    expect(demoJournalCaffeineMg(0)).toBeGreaterThanOrEqual(80);
    expect(demoJournalCaffeineMg(0)).toBeLessThanOrEqual(100);
  });
});
