import { describe, it, expect } from 'vitest';
import { buildDayResult } from './myfitnesspal';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures — shaped exactly like MFP's real read_diary response.
// ─────────────────────────────────────────────────────────────────────────────

function buildEntry(overrides: {
  meal_name?: string;
  description?: string;
  energy?: number;
  fat?: number | null;
  carbohydrates?: number | null;
  protein?: number | null;
  sugar?: number | null;
  fiber?: number | null;
}) {
  return {
    meal_name: overrides.meal_name ?? 'Lunch',
    food: { description: overrides.description ?? 'Test food' },
    nutritional_contents: {
      energy: { value: overrides.energy ?? 0, unit: 'calories' },
      fat: overrides.fat ?? null,
      carbohydrates: overrides.carbohydrates ?? null,
      protein: overrides.protein ?? null,
      sugar: overrides.sugar ?? null,
      fiber: overrides.fiber ?? null,
    },
  };
}

describe('buildDayResult', () => {
  it('groups entries by meal and sums totals across meals', () => {
    const entries = [
      buildEntry({
        meal_name: 'Lunch',
        description: 'FoodChéri - Nos linguine & meatballs',
        energy: 562.2,
        fat: 21.6,
        carbohydrates: 49.4,
        protein: 39.6,
        sugar: 5.9,
        fiber: 5.3,
      }),
      buildEntry({
        meal_name: 'Dinner',
        description: 'Chicken breast',
        energy: 165,
        fat: 3.6,
        carbohydrates: 0,
        protein: 31,
        sugar: 0,
        fiber: 0,
      }),
    ];

    const result = buildDayResult(entries, { status: null }, '2026-08-19');

    expect(result.date).toBe('2026-08-19');
    expect(result.meals).toHaveLength(2);
    expect(result.meals.map((m) => m.name)).toEqual(['lunch', 'dinner']);
    expect(result.totals.calories).toBeCloseTo(727.2);
    expect(result.totals.fat).toBeCloseTo(25.2);
    expect(result.totals.carbohydrates).toBeCloseTo(49.4);
    expect(result.totals.protein).toBeCloseTo(70.6);
    expect(result.totals.sugar).toBeCloseTo(5.9);
    expect(result.totals.fiber).toBeCloseTo(5.3);
  });

  it('defaults null nutrient fields to 0', () => {
    const entries = [buildEntry({ energy: 100 })];

    const result = buildDayResult(entries, { status: null }, '2026-08-19');

    expect(result.meals[0].entries[0]).toEqual({
      name: 'Test food',
      calories: 100,
      fat: 0,
      carbohydrates: 0,
      protein: 0,
      sugar: 0,
      fiber: 0,
    });
  });

  it('merges multiple entries within the same meal into one group', () => {
    const entries = [
      buildEntry({ meal_name: 'Breakfast', description: 'Toast', energy: 120 }),
      buildEntry({ meal_name: 'Breakfast', description: 'Coffee', energy: 5 }),
    ];

    const result = buildDayResult(entries, { status: null }, '2026-08-19');

    expect(result.meals).toHaveLength(1);
    expect(result.meals[0].entries).toHaveLength(2);
    expect(result.totals.calories).toBe(125);
  });

  it('marks the day complete only when the day-status endpoint reports a status', () => {
    const entries = [buildEntry({ energy: 100 })];

    expect(buildDayResult(entries, { status: null }, '2026-08-19').complete).toBe(false);
    expect(buildDayResult(entries, { status: 'complete' }, '2026-08-19').complete).toBe(true);
    expect(buildDayResult(entries, null, '2026-08-19').complete).toBe(false);
  });

  it('returns empty meals and zeroed totals for an empty day', () => {
    const result = buildDayResult([], { status: null }, '2026-08-19');

    expect(result.meals).toEqual([]);
    expect(result.totals).toEqual({
      calories: 0,
      fat: 0,
      carbohydrates: 0,
      protein: 0,
      sugar: 0,
      fiber: 0,
    });
  });
});
