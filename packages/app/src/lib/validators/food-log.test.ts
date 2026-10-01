import { describe, expect, it } from 'vitest';
import {
  customFoodSchema,
  customFoodUpdateSchema,
  foodLogEntryCreateSchema,
  foodLogEntryUpdateSchema,
  nutritionTargetsSchema,
} from './food-log';

describe('foodLogEntryCreateSchema', () => {
  const base = { trainingDayId: '2026-10-01', meal: 'LUNCH', grams: 150 };

  it('takes a product or a quick add, never both nor neither', () => {
    expect(foodLogEntryCreateSchema.safeParse({ ...base, productId: 'p1' }).success).toBe(true);
    expect(
      foodLogEntryCreateSchema.safeParse({ ...base, quick: { name: 'Pâtes', kcal: 350 } }).success,
    ).toBe(true);
    expect(foodLogEntryCreateSchema.safeParse(base).success).toBe(false);
    expect(
      foodLogEntryCreateSchema.safeParse({
        ...base,
        productId: 'p1',
        quick: { name: 'x', kcal: 1 },
      }).success,
    ).toBe(false);
  });

  it('refuses an unknown meal, a bad day or a portion of zero', () => {
    const parse = (patch: object) =>
      foodLogEntryCreateSchema.safeParse({ ...base, productId: 'p', ...patch }).success;
    expect(parse({ meal: 'BRUNCH' })).toBe(false);
    expect(parse({ trainingDayId: '1/10' })).toBe(false);
    expect(parse({ grams: 0 })).toBe(false);
  });
});

describe('foodLogEntryUpdateSchema', () => {
  it('needs something to change', () => {
    expect(foodLogEntryUpdateSchema.safeParse({}).success).toBe(false);
    expect(foodLogEntryUpdateSchema.safeParse({ grams: 80 }).success).toBe(true);
  });
});

describe('customFoodSchema', () => {
  it('requires a name and the four main nutrients per 100 g', () => {
    expect(
      customFoodSchema.safeParse({
        name: 'Gâteau maison',
        kcalPer100g: 380,
        proteinPer100g: 6,
        carbsPer100g: 50,
        fatPer100g: 17,
      }).success,
    ).toBe(true);
    expect(customFoodSchema.safeParse({ name: '', kcalPer100g: 1 }).success).toBe(false);
  });
});

describe('nutritionTargetsSchema', () => {
  it('accepts plausible targets and nulls that clear them', () => {
    expect(
      nutritionTargetsSchema.safeParse({ kcal: 2600, proteinG: 140, fatG: null }).success,
    ).toBe(true);
    expect(nutritionTargetsSchema.safeParse({ kcal: 200 }).success).toBe(false);
  });

  it('takes a percent split of the calories only when it adds up to exactly 100', () => {
    const split = { mode: 'PERCENT', kcal: 2600, proteinPct: 25, carbsPct: 50, fatPct: 25 };
    expect(nutritionTargetsSchema.safeParse(split).success).toBe(true);

    const off = nutritionTargetsSchema.safeParse({ ...split, fatPct: 30 });
    expect(off.success).toBe(false);
    expect(off.error?.issues[0]?.message).toBe('La répartition fait 105 %, elle doit faire 100 %.');
    expect(nutritionTargetsSchema.safeParse({ ...split, kcal: null }).success).toBe(false);
    expect(nutritionTargetsSchema.safeParse({ ...split, carbsPct: undefined }).success).toBe(false);
    expect(nutritionTargetsSchema.safeParse({ ...split, proteinPct: 25.5 }).success).toBe(false);
  });
});

describe('customFoodUpdateSchema', () => {
  it('takes any field of an own food, but something', () => {
    expect(customFoodUpdateSchema.safeParse({ kcalPer100g: 120 }).success).toBe(true);
    expect(customFoodUpdateSchema.safeParse({}).success).toBe(false);
    expect(customFoodUpdateSchema.safeParse({ name: '' }).success).toBe(false);
  });
});
