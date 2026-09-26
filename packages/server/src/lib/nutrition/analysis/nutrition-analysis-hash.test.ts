import { describe, expect, it } from 'vitest';
import {
  buildNutritionAnalysisFacts,
  type NutritionAnalysisInput,
} from './nutrition-analysis-facts';
import { nutritionAnalysisInputHash } from './nutrition-analysis-hash';

const INPUT: NutritionAnalysisInput = {
  day: '2026-09-10',
  complete: true,
  totals: { calories: 2000, protein: 100, carbohydrates: 250, fat: 70, fiber: 30, sugar: 60 },
  meals: [
    {
      label: 'Déjeuner',
      calories: 700,
      protein: 40,
      carbs: 80,
      fat: 20,
      entries: [{ name: 'Riz', calories: 300, protein: 6, carbs: 65, fat: 1 }],
    },
  ],
  energyBudgetKcal: null,
  weightKg: 68,
  targetWeightKg: null,
  diet: { ids: [], labels: [] },
  sessions: [],
  nextDayPlanned: [],
};

describe('nutritionAnalysisInputHash', () => {
  it('is stable for the same inputs', () => {
    const a = nutritionAnalysisInputHash(buildNutritionAnalysisFacts(INPUT));
    const b = nutritionAnalysisInputHash(buildNutritionAnalysisFacts({ ...INPUT }));
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes when a meal, the diet or the weight goal changes', () => {
    const base = nutritionAnalysisInputHash(buildNutritionAnalysisFacts(INPUT));
    const withDiet = { ...INPUT, diet: { ids: ['vegan'], labels: ['Végétalien'] } };
    const withGoal = { ...INPUT, targetWeightKg: 65 };
    const withSnack = {
      ...INPUT,
      meals: [...INPUT.meals, { ...INPUT.meals[0], label: 'Collations' }],
    };
    for (const changed of [withDiet, withGoal, withSnack]) {
      expect(nutritionAnalysisInputHash(buildNutritionAnalysisFacts(changed))).not.toBe(base);
    }
  });
});
