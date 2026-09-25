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

/** Max age of a weigh-in used for per-kg fuel ratios (body mass moves slowly). */
export const FUEL_BODY_WEIGHT_LOOKBACK_DAYS = 90;

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
  if (weightKg === undefined || weightKg === null || weightKg <= 0) {
    return null;
  }
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
  if (observation.entryCount === 0) {
    return 0;
  }
  if (observation.diaryComplete) {
    return 0.9;
  }
  return 0.6;
}

function computeEnergyBudget(observation: NutritionObservation): number | null {
  const goal = observation.goalEnergyKcal ?? null;
  if (goal === undefined || goal === null) {
    return null;
  }
  const exercise = observation.exerciseEnergyKcal ?? null;
  return goal + (exercise ?? 0);
}

function computeEnergyBalance(
  observation: NutritionObservation,
  budget: number | null,
  logged: boolean,
): number | null {
  if (budget === undefined || budget === null || !logged) {
    return null;
  }
  return Math.round(observation.energyKcal - budget);
}

function computeEnergyBudgetRatio(
  observation: NutritionObservation,
  budget: number | null,
  logged: boolean,
): number | null {
  if (budget === undefined || budget === null || budget <= 0 || !logged) {
    return null;
  }
  return round(observation.energyKcal / budget, 2);
}

function computeEnergyMetrics(
  observation: NutritionObservation,
  weightKg: number | null,
): Pick<
  FuelFeatureSet,
  | 'energyBudgetKcal'
  | 'energyBalanceKcal'
  | 'energyBudgetRatio'
  | 'proteinGPerKg'
  | 'carbohydratesGPerKg'
  | 'referenceWeightKg'
> {
  const budget = computeEnergyBudget(observation);
  const logged = observation.entryCount > 0;

  return {
    energyBudgetKcal: budget,
    energyBalanceKcal: computeEnergyBalance(observation, budget, logged),
    energyBudgetRatio: computeEnergyBudgetRatio(observation, budget, logged),
    proteinGPerKg: logged ? perKg(observation.proteinG, weightKg) : null,
    carbohydratesGPerKg: logged ? perKg(observation.carbohydratesG, weightKg) : null,
    referenceWeightKg: logged ? weightKg : null,
  };
}

export function extractFuelFeatures(input: FuelExtractorInput): FuelFeatureSet {
  const { observation, weightKg } = input;
  const logged = observation.entryCount > 0;
  const energyMetrics = computeEnergyMetrics(observation, weightKg);

  return {
    trainingDayId: observation.trainingDayId,
    observationId: observation.id,
    logged,
    entryCount: observation.entryCount,
    energyKcal: observation.energyKcal,
    proteinG: round(observation.proteinG),
    carbohydratesG: round(observation.carbohydratesG),
    fatG: round(observation.fatG),
    energyGoalKcal: observation.goalEnergyKcal ?? null,
    exerciseEnergyKcal: observation.exerciseEnergyKcal ?? null,
    ...energyMetrics,
    diaryComplete: observation.diaryComplete ?? false,
    confidence: deriveConfidence(observation),
    algorithmId: 'fuel-features-v1',
    sourceObsIds: [observation.id],
  };
}
