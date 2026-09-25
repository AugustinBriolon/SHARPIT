import { describe, expect, it } from 'vitest';
import { formatMealLabel, mealSortIndex } from '@/lib/nutrition/meal-display';

describe('meal-display', () => {
  it('maps known MFP meal names to French labels', () => {
    expect(formatMealLabel('breakfast')).toBe('Petit-déjeuner');
    expect(formatMealLabel('Lunch')).toBe('Déjeuner');
    expect(formatMealLabel('DINNER')).toBe('Dîner');
    expect(formatMealLabel('snacks')).toBe('Collations');
  });

  it('orders meals in standard diary sequence', () => {
    expect(mealSortIndex('dinner')).toBeLessThan(mealSortIndex('snacks'));
    expect(mealSortIndex('breakfast')).toBeLessThan(mealSortIndex('lunch'));
  });
});
