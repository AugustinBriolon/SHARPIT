/**
 * Validation helpers — read stress/impact outputs without modifying the environment pipeline.
 */

import {
  buildEnvironmentalImpact,
  buildEnvironmentalStress,
  getEnvironmentalStressor,
  type EnvironmentalImpact,
  type EnvironmentalStress,
  type EnvironmentalStressorId,
  type WeatherMeasurements,
} from '@/core/environment';
import type { EnvironmentalApplicability } from '@/core/environment';
import { environmentalImpactIsSignificant } from './apply-impact';

export type ScenarioOutput = {
  readonly stress: EnvironmentalStress;
  readonly impact: EnvironmentalImpact;
};

export function buildScenarioOutput(input: {
  weather: WeatherMeasurements;
  applicability?: EnvironmentalApplicability;
}): ScenarioOutput {
  const applicability = input.applicability ?? 'OUTDOOR';
  const stress = buildEnvironmentalStress({ applicability, weather: input.weather });
  const impact = buildEnvironmentalImpact({ stress });
  return { stress, impact };
}

export function stressorIntensity(
  stress: EnvironmentalStress,
  id: EnvironmentalStressorId,
): number | null {
  const stressor = getEnvironmentalStressor(stress, id);
  if (!stressor?.intensity.available) {
    return null;
  }
  return stressor.intensity.value;
}

export function compositeIntensity(stress: EnvironmentalStress): number | null {
  if (!stress.compositeIntensity.available) {
    return null;
  }
  return stress.compositeIntensity.value;
}

function readAvailableMetricValue(metric: { available: boolean; value?: number }): number | null {
  return metric.available ? (metric.value ?? null) : null;
}

export function readImpactMultiplier(
  impact: EnvironmentalImpact,
  field: 'recovery' | 'fatigue' | 'performance' | 'hydration',
): number | null {
  const readers: Record<typeof field, () => number | null> = {
    recovery: () => readAvailableMetricValue(impact.recovery.demandMultiplier),
    fatigue: () => readAvailableMetricValue(impact.fatigue.accumulationMultiplier),
    performance: () => readAvailableMetricValue(impact.performance.expectedOutputRatio),
    hydration: () => readAvailableMetricValue(impact.hydration.demandMultiplier),
  };

  return readers[field]();
}

export function isImpactSignificant(impact: EnvironmentalImpact): boolean {
  return environmentalImpactIsSignificant(impact);
}

export function intensityBand(
  value: number | null,
): 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' | 'SUPPRESSED' | 'UNKNOWN' {
  if ((value === undefined || value === null)) {
    return 'SUPPRESSED';
  }
  if (value < 0.35) {
    return 'LOW';
  }
  if (value < 0.55) {
    return 'MODERATE';
  }
  if (value < 0.8) {
    return 'HIGH';
  }
  return 'EXTREME';
}

export function assertMonotonicIncreasing(values: readonly (number | null)[]): boolean {
  const available = values.filter((v): v is number => (v !== undefined && v !== null));
  for (let i = 1; i < available.length; i++) {
    if (available[i] < available[i - 1]) {
      return false;
    }
  }
  return available.length >= 2;
}
