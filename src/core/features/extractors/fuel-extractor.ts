/**
 * FUEL EXTRACTOR — NutritionObservation → FuelFeatureSet
 *
 * Pure function. No I/O. No side effects.
 *
 * Restates one logged day against the athlete's own targets and body mass.
 * It draws no conclusion about whether the day was well fuelled: that judgement
 * belongs to an engine the architecture has not approved.
 */

import type { NutritionObservation } from '@/core/observation/types';
import type { FuelFeatureSet } from '../types';

export type FuelExtractorInput = {
  readonly observation: NutritionObservation;
  /** Most recent body weight, used for the per-kilogram ratios. Null when unknown. */
  readonly weightKg: number | null;
};

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function perKg(grams: number, weightKg: number | null): number | null {
  if (weightKg == null || weightKg <= 0) return null;
  return round(grams / weightKg, 2);
}

/**
 * Confidence reflects how much of the day the athlete actually recorded, not how
 * good the day was.
 *
 * An unlogged day is worth nothing downstream, so it scores 0 rather than a low
 * number that could still be averaged in. A day the athlete closed is the only
 * one we can call complete.
 */
function deriveConfidence(observation: NutritionObservation): number {
  if (observation.entryCount === 0) return 0;
  if (observation.diaryComplete) return 0.9;
  return 0.6;
}

export function extractFuelFeatures(input: FuelExtractorInput): FuelFeatureSet {
  const { observation, weightKg } = input;

  const goal = observation.goalEnergyKcal ?? null;
  const exercise = observation.exerciseEnergyKcal ?? null;
  const budget = goal == null ? null : goal + (exercise ?? 0);
  const logged = observation.entryCount > 0;

  // Balance and ratio describe intake against the allowance, so they are
  // meaningless on a day with no food behind the totals.
  const balance = budget == null || !logged ? null : Math.round(observation.energyKcal - budget);
  const ratio =
    budget == null || budget <= 0 || !logged ? null : round(observation.energyKcal / budget, 2);

  return {
    trainingDayId: observation.trainingDayId,
    observationId: observation.id,

    logged,
    entryCount: observation.entryCount,

    energyKcal: observation.energyKcal,
    proteinG: round(observation.proteinG),
    carbohydratesG: round(observation.carbohydratesG),
    fatG: round(observation.fatG),

    energyGoalKcal: goal,
    exerciseEnergyKcal: exercise,
    energyBudgetKcal: budget,
    energyBalanceKcal: balance,
    energyBudgetRatio: ratio,

    proteinGPerKg: logged ? perKg(observation.proteinG, weightKg) : null,
    carbohydratesGPerKg: logged ? perKg(observation.carbohydratesG, weightKg) : null,

    diaryComplete: observation.diaryComplete ?? false,

    confidence: deriveConfidence(observation),
    algorithmId: 'fuel-features-v1',
    sourceObsIds: [observation.id],
  };
}
