import { describe, expect, it } from 'vitest';
import { buildGoalsProgress, formatRemainingCalories } from '@/lib/nutrition/goals-progress';

describe('buildGoalsProgress', () => {
  it('computes remaining calories with exercise bonus in the budget', () => {
    const progress = buildGoalsProgress({
      consumedCalories: 562,
      consumedProtein: 40,
      consumedCarbohydrates: 49,
      consumedFat: 22,
      goalCalories: 2400,
      goalProtein: 180,
      goalCarbohydrates: 270,
      goalFat: 67,
      exerciseCalories: 12,
    });

    expect(progress?.calorieBudget).toBe(2412);
    expect(progress?.calories.remaining).toBe(1850);
    expect(progress?.protein.remaining).toBe(140);
    expect(progress?.carbohydrates.remaining).toBe(221);
    expect(progress?.fat.remaining).toBe(45);
  });

  it('returns null when no calorie goal is available', () => {
    expect(
      buildGoalsProgress({
        consumedCalories: 100,
        consumedProtein: 10,
        consumedCarbohydrates: 10,
        consumedFat: 3,
        goalCalories: null,
        goalProtein: 180,
        goalCarbohydrates: 270,
        goalFat: 67,
      }),
    ).toBeNull();
  });
});

describe('formatRemainingCalories', () => {
  it('formats positive, zero, and over-goal states', () => {
    expect(formatRemainingCalories(120)).toBe('120 kcal restantes');
    expect(formatRemainingCalories(0)).toBe('Objectif atteint');
    expect(formatRemainingCalories(-80)).toBe('80 kcal au-dessus');
  });
});
