import { describe, expect, it } from 'vitest';
import {
  buildSleepScoreBreakdown,
  computeSharpitSleepScoreForDay,
  computeSleepEfficiencyPct,
  mapSleepDurationToRaw,
} from './sleep-scoring';
import { mapRestorativeSleepRatioToRaw } from '@/core/inference/recovery/scoring';

describe('computeSleepEfficiencyPct', () => {
  it('uses bedtime → wake window when available', () => {
    // 23:18 → 07:00 = 462 min in bed; 450 asleep → 97 %
    expect(
      computeSleepEfficiencyPct({
        totalSleepMin: 450,
        bedtimeMin: 23 * 60 + 18,
        wakeMin: 7 * 60,
      }),
    ).toBe(97);
  });

  it('falls back to sleep + awake minutes', () => {
    expect(
      computeSleepEfficiencyPct({
        totalSleepMin: 462,
        awakeMin: 14,
      }),
    ).toBe(97);
  });

  it('returns null without enough inputs', () => {
    expect(computeSleepEfficiencyPct({ totalSleepMin: null })).toBeNull();
    expect(computeSleepEfficiencyPct({ totalSleepMin: 400 })).toBeNull();
  });
});

describe('mapRestorativeSleepRatioToRaw', () => {
  it('scores 36% restorative as 50 (légèrement sous norme)', () => {
    expect(mapRestorativeSleepRatioToRaw(36)).toBe(50);
  });

  it('scores 55%+ as excellent', () => {
    expect(mapRestorativeSleepRatioToRaw(55)).toBe(100);
  });
});

describe('mapSleepDurationToRaw', () => {
  it('scores at or above target as 100', () => {
    expect(mapSleepDurationToRaw(480, 480)).toBe(100);
    expect(mapSleepDurationToRaw(510, 480)).toBe(100);
  });

  it('scales linearly below target without a cliff', () => {
    expect(mapSleepDurationToRaw(432, 480)).toBe(90); // 90% of target
    expect(mapSleepDurationToRaw(479, 480)).toBe(100); // rounds to 100
  });
});

describe('buildSleepScoreBreakdown', () => {
  it('combines duration and architecture — debt does not affect sharpitScore', () => {
    // 366 min vs 480 target → 76 duration; 36% restorative → 50 architecture
    // 0.55*76 + 0.45*50 = 41.8 + 22.5 = 64.3 → 64
    const result = buildSleepScoreBreakdown({
      deepMin: 105,
      remMin: 28,
      totalMin: 366,
      debtMin: 300,
      targetMin: 480,
    });
    expect(result.restorativeRatio).toBe(36);
    expect(result.durationScore).toBe(76);
    expect(result.architectureScore).toBe(50);
    expect(result.sharpitScore).toBe(64);
    expect(result.debtModifier).toBeLessThan(1);
  });

  it('rates an 8h night near target as adequate even with soft architecture', () => {
    // ~36% restorative on 481 min vs 480 target → ~78
    const deep = Math.round(481 * 0.22);
    const rem = Math.round(481 * 0.14);
    const result = buildSleepScoreBreakdown({
      deepMin: deep,
      remMin: rem,
      totalMin: 481,
      debtMin: null,
      targetMin: 480,
    });
    expect(result.durationScore).toBe(100);
    expect(result.architectureScore).toBe(50);
    expect(result.sharpitScore).toBe(78);
    expect(result.sharpitScore).toBeGreaterThanOrEqual(70);
  });
});

describe('computeSharpitSleepScoreForDay', () => {
  it('matches buildSleepScoreBreakdown for the same day', () => {
    const entries = [
      {
        date: new Date('2026-07-03'),
        sleepMinutes: 366,
        sleepDeepMin: 105,
        sleepRemMin: 28,
      },
    ];
    expect(computeSharpitSleepScoreForDay(entries, new Date('2026-07-03'), 480)).toBe(
      buildSleepScoreBreakdown({
        deepMin: 105,
        remMin: 28,
        totalMin: 366,
        debtMin: 450 - 366,
        targetMin: 480,
      }).sharpitScore,
    );
  });
});
