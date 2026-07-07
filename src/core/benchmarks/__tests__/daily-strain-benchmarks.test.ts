import { describe, expect, it } from 'vitest';
import { dailyTssToStrainScore } from '@/lib/daily-strain';

const SCENARIOS = [
  { id: 'SEDENTARY_DAY', tss: 0 },
  { id: 'WALKING_DAY', tss: 20 },
  { id: 'EASY_RUN', tss: 55 },
  { id: 'TEMPO_RUN', tss: 95 },
  { id: 'LONG_RIDE', tss: 180 },
  { id: 'IRONMAN', tss: 300 },
] as const;

describe('Daily strain race sanity benchmarks', () => {
  it('preserves the expected physiological ordering', () => {
    const scores = Object.fromEntries(
      SCENARIOS.map((scenario) => [scenario.id, dailyTssToStrainScore(scenario.tss) ?? -1]),
    );

    expect(scores.IRONMAN).toBeGreaterThan(scores.LONG_RIDE);
    expect(scores.LONG_RIDE).toBeGreaterThan(scores.TEMPO_RUN);
    expect(scores.TEMPO_RUN).toBeGreaterThan(scores.EASY_RUN);
    expect(scores.EASY_RUN).toBeGreaterThan(scores.WALKING_DAY);
    expect(scores.WALKING_DAY).toBeGreaterThanOrEqual(scores.SEDENTARY_DAY);
  });
});
