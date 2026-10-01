import { describe, expect, it } from 'vitest';
import {
  buildCustomFood,
  buildEntryUpdate,
  buildPortionEntry,
  buildQuickEntry,
  buildTargets,
  parseDecimal,
  portionPreview,
  targetFieldValue,
} from './food-log-forms';
import type {
  FoodLogEntryPayload,
  FoodProductPayload,
} from '@sharpit/app/lib/nutrition/food-log/food-log-day';

const SKYR: FoodProductPayload = {
  id: 'skyr',
  source: 'OFF',
  name: 'Skyr',
  brand: 'Isey',
  kcalPer100g: 62,
  proteinPer100g: 11,
  carbsPer100g: 4,
  fatPer100g: 0.2,
};
const CONTEXT = { meal: 'BREAKFAST' as const, trainingDayId: '2026-10-01' };

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  Object.entries(fields).forEach(([name, value]) => data.set(name, value));
  return data;
}

describe('parseDecimal', () => {
  it('reads a comma as a decimal point and a blank as unset', () => {
    expect(parseDecimal('12,5')).toBe(12.5);
    expect(parseDecimal('  ')).toBeNull();
    expect(parseDecimal(null)).toBeNull();
    expect(parseDecimal('abc')).toBeNaN();
  });
});

describe('portionPreview', () => {
  it('follows the typed weight, and waits for one that reads as a weight', () => {
    expect(portionPreview(SKYR, '150')).toMatchObject({ kcal: 93, protein: 16.5 });
    expect(portionPreview(SKYR, '')).toBeNull();
    expect(portionPreview(SKYR, '0')).toBeNull();
  });
});

describe('buildPortionEntry', () => {
  it('logs the product at the weight, with the nutrients the row shows meanwhile', () => {
    const result = buildPortionEntry(SKYR, '150', CONTEXT);
    expect(result).toEqual({
      ok: true,
      value: {
        input: { ...CONTEXT, grams: 150, productId: 'skyr' },
        preview: {
          name: 'Skyr',
          brand: 'Isey',
          kcal: 93,
          protein: 16.5,
          carbs: 6,
          fat: 0.3,
          fiber: null,
          sugar: null,
        },
      },
    });
  });

  it('refuses a blank weight rather than logging zero', () => {
    expect(buildPortionEntry(SKYR, '', CONTEXT)).toEqual({
      ok: false,
      message: 'Vérifie le champ « Quantité ».',
    });
  });
});

describe('buildQuickEntry', () => {
  it('needs a name and calories; macros default to zero', () => {
    const result = buildQuickEntry(form({ name: 'Pizza', kcal: '650', grams: '300' }), CONTEXT);
    expect(result.ok && result.value.input.quick).toEqual({
      name: 'Pizza',
      kcal: 650,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
    expect(buildQuickEntry(form({ name: 'Pizza', grams: '300' }), CONTEXT)).toEqual({
      ok: false,
      message: 'Vérifie le champ « Calories ».',
    });
  });
});

describe('buildEntryUpdate', () => {
  const entry = { id: 'e1', grams: 150, meal: 'LUNCH' } as FoodLogEntryPayload;

  it('sends only what changed', () => {
    expect(buildEntryUpdate(entry, { grams: '200', meal: 'LUNCH' })).toEqual({
      ok: true,
      value: { id: 'e1', grams: 200 },
    });
    expect(buildEntryUpdate(entry, { grams: '150', meal: 'DINNER' })).toEqual({
      ok: true,
      value: { id: 'e1', meal: 'DINNER' },
    });
  });

  it('sends nothing when nothing changed, and refuses a blank weight', () => {
    expect(buildEntryUpdate(entry, { grams: '150', meal: 'LUNCH' })).toEqual({
      ok: true,
      value: null,
    });
    expect(buildEntryUpdate(entry, { grams: '', meal: 'LUNCH' }).ok).toBe(false);
  });
});

describe('buildCustomFood', () => {
  it('reads a food per 100 g, the brand and serving optional', () => {
    const result = buildCustomFood(
      form({
        name: 'Granola maison',
        brand: '',
        kcalPer100g: '450',
        proteinPer100g: '12',
        carbsPer100g: '55,5',
        fatPer100g: '18',
        servingGrams: '',
      }),
    );
    expect(result).toEqual({
      ok: true,
      value: {
        name: 'Granola maison',
        brand: null,
        kcalPer100g: 450,
        proteinPer100g: 12,
        carbsPer100g: 55.5,
        fatPer100g: 18,
        servingGrams: null,
      },
    });
  });
});

describe('buildTargets', () => {
  it('clears a blank target and checks the others', () => {
    expect(buildTargets(form({ kcal: '2600', proteinG: '150', carbsG: '', fatG: '70' }))).toEqual({
      ok: true,
      value: { kcal: 2600, proteinG: 150, carbsG: null, fatG: 70 },
    });
    expect(buildTargets(form({ kcal: '200', proteinG: '', carbsG: '', fatG: '' }))).toEqual({
      ok: false,
      message: 'Vérifie le champ « Calories ».',
    });
  });

  it('opens each field on the saved target, blank when unset', () => {
    expect(targetFieldValue(2600)).toBe('2600');
    expect(targetFieldValue(null)).toBe('');
  });
});
