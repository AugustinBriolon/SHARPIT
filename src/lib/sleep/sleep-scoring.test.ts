import { describe, expect, it } from 'vitest';
import {
  buildSleepScoreBreakdown,
  computeSharpitSleepScoreForDay,
  mapSleepDurationToRaw,
} from './sleep-scoring';
import { mapRestorativeSleepRatioToRaw } from '@/core/inference/recovery/scoring';

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
    const result = buildSleepScoreBreakdown(105, 28, 366, 300, 480);
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
    const result = buildSleepScoreBreakdown(deep, rem, 481, null, 480);
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
      buildSleepScoreBreakdown(105, 28, 366, 450 - 366, 480).sharpitScore,
    );
  });
});
