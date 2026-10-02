import { describe, expect, it } from 'vitest';
import { additiveRisk } from './additives-risk';
import {
  FOOD_HEALTH_SCORE_VERSION,
  computeFoodHealth,
  levelFromAmount,
  type FoodHealthInput,
} from './food-health-score';

const base: FoodHealthInput = {
  nutriScore: 'c',
  nova: 3,
  nutrientLevels: { sugars: 'moderate', salt: 'low', saturatedFat: 'moderate' },
  additiveTags: [],
};

describe('computeFoodHealth', () => {
  it('scores a complete OFF product across nutrition, NOVA and additives', () => {
    const health = computeFoodHealth({
      ...base,
      nutriScore: 'a',
      nova: 1,
      nutrientLevels: { sugars: 'low', salt: 'low', saturatedFat: 'low' },
      additiveTags: ['en:e300'],
    });
    expect(health.coverage).toBe('full');
    expect(health.scoreVersion).toBe(FOOD_HEALTH_SCORE_VERSION);
    expect(health.score).toBeGreaterThanOrEqual(85);
    expect(health.grade).toBe('excellent');
    expect(health.additives).toEqual([{ code: 'E300', name: expect.any(String), risk: 'none' }]);
  });

  it('penalises Nutri-Score E, NOVA 4 and high-risk additives', () => {
    const health = computeFoodHealth({
      nutriScore: 'e',
      nova: 4,
      nutrientLevels: { sugars: 'high', salt: 'high', saturatedFat: 'high' },
      additiveTags: ['en:e621', 'en:e150d'],
    });
    expect(health.coverage).toBe('full');
    expect(health.score).toBeLessThan(30);
    expect(health.grade).toBe('poor');
    expect(health.additives.map((item) => item.risk)).toContain('high');
  });

  it('falls back to nutrient levels when Nutri-Score is missing', () => {
    const withLevels = computeFoodHealth({
      nutriScore: null,
      nova: 2,
      nutrientLevels: { sugars: 'low', salt: 'low', saturatedFat: 'low' },
      additiveTags: [],
    });
    expect(withLevels.coverage).toBe('full');
    expect(withLevels.score).not.toBeNull();

    const empty = computeFoodHealth({
      nutriScore: null,
      nova: null,
      nutrientLevels: { sugars: 'unknown', salt: 'unknown', saturatedFat: 'unknown' },
      additiveTags: null,
    });
    expect(empty.coverage).toBe('none');
    expect(empty.score).toBeNull();
    expect(empty.grade).toBeNull();
  });

  it('scores a custom food only from typed sugar, salt and saturated fat', () => {
    const health = computeFoodHealth({
      kind: 'custom',
      sugarPer100g: 2,
      saltPer100g: 0.2,
      saturatedFatPer100g: 1,
    });
    expect(health.coverage).toBe('partial');
    expect(health.score).toBeGreaterThanOrEqual(70);
    expect(health.additives).toEqual([]);
    expect(health.nutriScore).toBeNull();
    expect(health.nova).toBeNull();
  });

  it('returns no score for a custom food without those nutrients', () => {
    const health = computeFoodHealth({ kind: 'custom' });
    expect(health.coverage).toBe('none');
    expect(health.score).toBeNull();
  });
});

describe('levelFromAmount', () => {
  it('uses EU solid thresholds for sugars, salt and saturated fat', () => {
    expect(levelFromAmount('sugars', 4)).toBe('low');
    expect(levelFromAmount('sugars', 8)).toBe('moderate');
    expect(levelFromAmount('sugars', 20)).toBe('high');
    expect(levelFromAmount('salt', 0.2)).toBe('low');
    expect(levelFromAmount('salt', 2)).toBe('high');
    expect(levelFromAmount('saturatedFat', 1)).toBe('low');
    expect(levelFromAmount('saturatedFat', 6)).toBe('high');
    expect(levelFromAmount('sugars', null)).toBe('unknown');
  });
});

describe('additiveRisk', () => {
  it('classifies known E-codes and defaults unknown ones to limited', () => {
    expect(additiveRisk('en:e300').risk).toBe('none');
    expect(additiveRisk('en:e621').risk).toBe('high');
    expect(additiveRisk('en:e150d')).toEqual({
      code: 'E150D',
      name: 'Caramel au sulfite d’ammonium',
      risk: 'high',
    });
    expect(additiveRisk('en:e330').risk).toBe('none');
    expect(additiveRisk('en:e9999').risk).toBe('limited');
  });
});
