import { describe, expect, it } from 'vitest';
import { buildSleepScoreBreakdown, computeSharpitSleepScoreForDay } from './sleep-scoring';
import { mapRestorativeSleepRatioToRaw } from '@/core/inference/recovery/scoring';

describe('mapRestorativeSleepRatioToRaw', () => {
  it('scores 36% restorative as 50 (légèrement sous norme)', () => {
    expect(mapRestorativeSleepRatioToRaw(36)).toBe(50);
  });

  it('scores 55%+ as excellent', () => {
    expect(mapRestorativeSleepRatioToRaw(55)).toBe(100);
  });
});

describe('buildSleepScoreBreakdown', () => {
  it('scores only from restorative ratio — debt does not affect sharpitScore', () => {
    const result = buildSleepScoreBreakdown(105, 28, 366, 300);
    expect(result.restorativeRatio).toBe(36);
    expect(result.rawScore).toBe(50);
    expect(result.sharpitScore).toBe(50);
    expect(result.debtModifier).toBeLessThan(1);
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
    expect(computeSharpitSleepScoreForDay(entries, new Date('2026-07-03'))).toBe(
      buildSleepScoreBreakdown(105, 28, 366, 450 - 366).sharpitScore,
    );
  });
});
