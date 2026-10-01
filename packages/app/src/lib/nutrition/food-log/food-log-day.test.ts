import { describe, expect, it } from 'vitest';
import {
  defaultPortionGrams,
  entryRecreateInput,
  foodLogDisplay,
  groupEntriesByMeal,
  mealForHour,
  portionPresets,
  rescaleEntry,
  type FoodLogEntryPayload,
  type FoodProductPayload,
} from './food-log-day';

const SKYR: FoodProductPayload = {
  id: 'skyr',
  source: 'OFF',
  name: 'Skyr',
  brand: 'Isey',
  kcalPer100g: 62,
  proteinPer100g: 11,
  carbsPer100g: 4,
  fatPer100g: 0.2,
  servingGrams: 150,
  servingLabel: '1 pot (150 g)',
};

function entry(id: string, meal: FoodLogEntryPayload['meal'], kcal: number): FoodLogEntryPayload {
  return {
    id,
    date: '2026-10-01T00:00:00.000Z',
    meal,
    productId: 'skyr',
    name: 'Skyr',
    grams: 150,
    kcal,
    protein: 16.5,
    carbs: 6,
    fat: 0.3,
    fiber: null,
    sugar: 6,
  };
}

describe('groupEntriesByMeal', () => {
  it('lists the four meals breakfast → snacks, each with its entries in logged order', () => {
    const groups = groupEntriesByMeal([
      entry('a', 'SNACKS', 93),
      entry('b', 'BREAKFAST', 93),
      entry('c', 'BREAKFAST', 100.4),
    ]);

    expect(groups.map((group) => group.meal)).toEqual(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS']);
    expect(groups[0]).toMatchObject({ label: 'Petit-déjeuner', kcal: 193, protein: 33 });
    expect(groups[0].entries.map((item) => item.id)).toEqual(['b', 'c']);
    expect(groups[1]).toMatchObject({ label: 'Déjeuner', kcal: 0, entries: [] });
    expect(groups[3].entries.map((item) => item.id)).toEqual(['a']);
  });
});

describe('portionPresets', () => {
  it('offers 100 g, the serving, then the last portion logged', () => {
    expect(portionPresets(SKYR, 200)).toEqual([
      { label: '100 g', grams: 100 },
      { label: '1 pot (150 g)', grams: 150 },
      { label: 'Dernière fois · 200 g', grams: 200 },
    ]);
  });

  it('keeps one chip per weight and names a serving without a label', () => {
    const plain = { ...SKYR, servingGrams: 100, servingLabel: null };
    expect(portionPresets(plain, 100)).toEqual([{ label: '100 g', grams: 100 }]);
    expect(portionPresets({ ...SKYR, servingLabel: null })).toEqual([
      { label: '100 g', grams: 100 },
      { label: '1 portion · 150 g', grams: 150 },
    ]);
  });
});

describe('defaultPortionGrams', () => {
  it('opens on the last portion, else the serving, else 100 g', () => {
    expect(defaultPortionGrams(SKYR, 180)).toBe(180);
    expect(defaultPortionGrams(SKYR)).toBe(150);
    expect(defaultPortionGrams({ ...SKYR, servingGrams: null })).toBe(100);
  });
});

describe('mealForHour', () => {
  it('suggests the meal of the hour', () => {
    expect(mealForHour(7)).toBe('BREAKFAST');
    expect(mealForHour(12)).toBe('LUNCH');
    expect(mealForHour(16)).toBe('SNACKS');
    expect(mealForHour(20)).toBe('DINNER');
  });
});

describe('rescaleEntry', () => {
  it('scales the snapshot to the new weight, optional nutrients included', () => {
    expect(rescaleEntry(entry('a', 'LUNCH', 93), 300)).toMatchObject({
      grams: 300,
      kcal: 186,
      protein: 33,
      carbs: 12,
      fat: 0.6,
      fiber: null,
      sugar: 12,
    });
  });
});

describe('entryRecreateInput', () => {
  it('logs a product entry again from its product', () => {
    expect(entryRecreateInput(entry('a', 'LUNCH', 93), '2026-10-01')).toEqual({
      trainingDayId: '2026-10-01',
      meal: 'LUNCH',
      grams: 150,
      productId: 'skyr',
    });
  });

  it('logs a quick add again with its typed nutrients', () => {
    const quick = { ...entry('q', 'DINNER', 650), productId: null, name: 'Pizza' };
    expect(entryRecreateInput(quick, '2026-10-01')).toEqual({
      trainingDayId: '2026-10-01',
      meal: 'DINNER',
      grams: 150,
      quick: { name: 'Pizza', kcal: 650, protein: 16.5, carbs: 6, fat: 0.3 },
    });
  });
});

describe('foodLogDisplay', () => {
  it('shows the log when it has entries, even over imported meals', () => {
    expect(foodLogDisplay(2, 3)).toBe('log');
  });

  it('shows the imported meals of a day only MyFitnessPal filled', () => {
    expect(foodLogDisplay(0, 3)).toBe('imported');
  });

  it('invites a first meal on an empty day', () => {
    expect(foodLogDisplay(0, 0)).toBe('empty');
  });
});
