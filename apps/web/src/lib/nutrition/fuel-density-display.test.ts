import { describe, expect, it } from 'vitest';

import type { FuelFeatureSet } from '@/core/features/types';

import {
  formatFuelDensityReference,
  formatMacroGPerKg,
  fuelFeatureSetToDensity,
} from './fuel-density-display';

function fuel(overrides: Partial<FuelFeatureSet> = {}): FuelFeatureSet {
  return {
    trainingDayId: '2026-08-19',
    observationId: 'obs-1',
    logged: true,
    entryCount: 5,
    energyKcal: 2300,
    proteinG: 150,
    carbohydratesG: 240,
    fatG: 70,
    energyGoalKcal: 2400,
    exerciseEnergyKcal: null,
    energyBudgetKcal: 2400,
    energyBalanceKcal: -100,
    energyBudgetRatio: 0.96,
    proteinGPerKg: 1.83,
    carbohydratesGPerKg: 2.96,
    referenceWeightKg: 81.1,
    diaryComplete: false,
    confidence: 0.6,
    algorithmId: 'fuel-features-v1',
    sourceObsIds: ['obs-1'],
    ...overrides,
  };
}

describe('fuelFeatureSetToDensity', () => {
  it('maps logged fuel features with weight to presentation density', () => {
    expect(fuelFeatureSetToDensity(fuel())).toEqual({
      proteinGPerKg: 1.83,
      carbohydratesGPerKg: 2.96,
      referenceWeightKg: 81.1,
    });
  });

  it('returns null when the day is unlogged or weight is unknown', () => {
    expect(fuelFeatureSetToDensity(fuel({ logged: false }))).toBeNull();
    expect(fuelFeatureSetToDensity(fuel({ referenceWeightKg: null }))).toBeNull();
  });
});

describe('formatMacroGPerKg', () => {
  it('formats with two decimal places in French locale', () => {
    expect(formatMacroGPerKg(1.83)).toBe('1,83');
  });
});

describe('formatFuelDensityReference', () => {
  it('formats reference weight without float noise', () => {
    expect(formatFuelDensityReference(81.082)).toBe('Réf. 81,1 kg · dernière pesée');
  });
});
