import { describe, it, expect } from 'vitest';
import { mfpDayToNutritionObservation } from './myfitnesspal-adapter';
import type { MfpDayResult } from '@/lib/integrations/myfitnesspal/myfitnesspal';

const RECEIVED_AT = new Date('2026-08-19T18:30:00Z');

function buildDay(overrides: Partial<MfpDayResult> = {}): MfpDayResult {
  return {
    date: '2026-08-19',
    meals: [
      {
        name: 'lunch',
        entries: [
          {
            name: 'FoodChéri - Nos linguine & meatballs',
            calories: 562.2,
            fat: 21.6,
            carbohydrates: 49.4,
            protein: 40.1,
            sugar: 12.3,
            fiber: 5.1,
          },
        ],
      },
    ],
    totals: {
      calories: 906.2,
      fat: 39.44,
      carbohydrates: 73.51,
      protein: 58.72,
      sugar: 21.5,
      fiber: 7.46,
    },
    complete: false,
    goals: {
      calories: 2400,
      protein: 180,
      carbohydrates: 270,
      fat: 67,
      fiber: null,
      sugar: null,
    },
    exerciseCalories: 81,
    ...overrides,
  };
}

describe('mfpDayToNutritionObservation', () => {
  it('restates a logged diary day as a MyFitnessPal nutrition observation', () => {
    const observation = mfpDayToNutritionObservation(buildDay(), RECEIVED_AT);

    expect(observation).toMatchObject({
      type: 'NUTRITION',
      source: 'MYFITNESSPAL',
      energyKcal: 906,
      proteinG: 58.7,
      carbohydratesG: 73.5,
      fatG: 39.4,
      goalEnergyKcal: 2400,
      exerciseEnergyKcal: 81,
      entryCount: 1,
    });
    expect(observation?.receivedAt).toEqual(RECEIVED_AT);
  });

  it('anchors the observation inside the diary day, clear of any day boundary', () => {
    const observation = mfpDayToNutritionObservation(buildDay(), RECEIVED_AT);

    expect(observation?.timestamp.toISOString()).toBe('2026-08-19T12:00:00.000Z');
  });

  it('returns null for a day with neither food nor goals', () => {
    const untouched = buildDay({
      meals: [],
      totals: { calories: 0, fat: 0, carbohydrates: 0, protein: 0, sugar: 0, fiber: 0 },
      goals: null,
      exerciseCalories: 0,
    });

    expect(mfpDayToNutritionObservation(untouched, RECEIVED_AT)).toBeNull();
  });

  it('keeps a goals-only day, marking that no food backs the totals', () => {
    const goalsOnly = buildDay({
      meals: [],
      totals: { calories: 0, fat: 0, carbohydrates: 0, protein: 0, sugar: 0, fiber: 0 },
    });

    const observation = mfpDayToNutritionObservation(goalsOnly, RECEIVED_AT);

    expect(observation).not.toBeNull();
    expect(observation?.entryCount).toBe(0);
    expect(observation?.energyKcal).toBe(0);
    expect(observation?.goalEnergyKcal).toBe(2400);
  });

  it('counts every food entry across meals', () => {
    const twoMeals = buildDay({
      meals: [
        { name: 'breakfast', entries: [buildEntry(), buildEntry()] },
        { name: 'lunch', entries: [buildEntry()] },
      ],
    });

    expect(mfpDayToNutritionObservation(twoMeals, RECEIVED_AT)?.entryCount).toBe(3);
  });
});

function buildEntry() {
  return {
    name: 'Test food',
    calories: 100,
    fat: 1,
    carbohydrates: 2,
    protein: 3,
    sugar: 0,
    fiber: 0,
  };
}
