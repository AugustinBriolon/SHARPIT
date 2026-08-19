import { describe, it, expect } from 'vitest';
import { extractFuelFeatures } from '../fuel-extractor';
import type { NutritionObservation } from '@/core/observation/types';

function buildObservation(overrides: Partial<NutritionObservation> = {}): NutritionObservation {
  return {
    id: 'obs-nutrition-1',
    athleteId: 'default',
    quality: 'MANUAL',
    qualityFlags: [],
    trainingDayId: '2026-08-19',
    normalizedAt: new Date('2026-08-19T18:30:00Z'),
    type: 'NUTRITION',
    source: 'MYFITNESSPAL',
    timestamp: new Date('2026-08-19T12:00:00Z'),
    receivedAt: new Date('2026-08-19T18:30:00Z'),
    energyKcal: 2310,
    proteinG: 148.6,
    carbohydratesG: 240.2,
    fatG: 78.4,
    goalEnergyKcal: 2400,
    goalProteinG: 180,
    goalCarbohydratesG: 270,
    goalFatG: 67,
    exerciseEnergyKcal: 81,
    diaryComplete: false,
    entryCount: 13,
    ...overrides,
  } as NutritionObservation;
}

describe('extractFuelFeatures', () => {
  it('measures intake against goal plus the exercise credit', () => {
    const features = extractFuelFeatures({ observation: buildObservation(), weightKg: 81.1 });

    expect(features.energyBudgetKcal).toBe(2481);
    expect(features.energyBalanceKcal).toBe(-171);
    expect(features.energyBudgetRatio).toBe(0.93);
  });

  it('expresses macros per kilogram of body mass', () => {
    const features = extractFuelFeatures({ observation: buildObservation(), weightKg: 81.1 });

    expect(features.proteinGPerKg).toBe(1.83);
    expect(features.carbohydratesGPerKg).toBe(2.96);
    expect(features.referenceWeightKg).toBe(81.1);
  });

  it('leaves per-kilogram ratios null when no weight is known', () => {
    const features = extractFuelFeatures({ observation: buildObservation(), weightKg: null });

    expect(features.proteinGPerKg).toBeNull();
    expect(features.carbohydratesGPerKg).toBeNull();
    expect(features.referenceWeightKg).toBeNull();
  });

  it('refuses to score a day the athlete never logged', () => {
    const features = extractFuelFeatures({
      observation: buildObservation({ entryCount: 0, energyKcal: 0, proteinG: 0 }),
      weightKg: 81.1,
    });

    expect(features.logged).toBe(false);
    expect(features.confidence).toBe(0);
    expect(features.energyBalanceKcal).toBeNull();
    expect(features.energyBudgetRatio).toBeNull();
    expect(features.proteinGPerKg).toBeNull();
  });

  it('keeps the goal visible on an unlogged day so intent survives', () => {
    const features = extractFuelFeatures({
      observation: buildObservation({ entryCount: 0, energyKcal: 0 }),
      weightKg: 81.1,
    });

    expect(features.energyGoalKcal).toBe(2400);
    expect(features.energyBudgetKcal).toBe(2481);
  });

  it('reads a day with no goal as budget-less rather than as a miss', () => {
    const features = extractFuelFeatures({
      observation: buildObservation({ goalEnergyKcal: undefined }),
      weightKg: 81.1,
    });

    expect(features.energyGoalKcal).toBeNull();
    expect(features.energyBudgetKcal).toBeNull();
    expect(features.energyBalanceKcal).toBeNull();
    expect(features.energyKcal).toBe(2310);
  });

  it('trusts a closed diary more than an open one', () => {
    const open = extractFuelFeatures({ observation: buildObservation(), weightKg: 81.1 });
    const closed = extractFuelFeatures({
      observation: buildObservation({ diaryComplete: true }),
      weightKg: 81.1,
    });

    expect(closed.confidence).toBeGreaterThan(open.confidence);
  });
});
