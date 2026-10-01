import { describe, expect, it } from 'vitest';
import {
  customFoodSchema,
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
});
