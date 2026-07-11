/**
 * Environmental Context Engine — canonical validation scenarios.
 *
 * Phase 2.6: expected impact values calibrated to neutral-zone + progressive curves.
 * Stress intensities unchanged; impact expectations reflect calibration v2.6.
 *
 * Reference: docs/models/ENVIRONMENTAL_CALIBRATION.md
 */

import type { EnvironmentalApplicability, WeatherMeasurements } from '@/core/environment';

export type EnvironmentalValidationScenario = {
  readonly id: string;
  readonly label: string;
  readonly rationale: string;
  readonly applicability: EnvironmentalApplicability;
  readonly weather: WeatherMeasurements;
  readonly expectedBehavior: {
    readonly thermalIntensityMin?: number;
    readonly thermalIntensityMax?: number;
    readonly windIntensityMin?: number;
    readonly windIntensityMax?: number;
    readonly hydrationIntensityMin?: number;
    readonly hydrationIntensityMax?: number;
    readonly recoveryDemandMin?: number;
    readonly recoveryDemandMax?: number;
    readonly fatigueAccumulationMin?: number;
    readonly fatigueAccumulationMax?: number;
    readonly performanceRatioMin?: number;
    readonly performanceRatioMax?: number;
    readonly compositeIntensityMin?: number;
    readonly compositeIntensityMax?: number;
    readonly significanceExpected?: boolean;
    readonly impactNeutral?: boolean;
    readonly suppressed?: boolean;
  };
};

export const ENVIRONMENTAL_VALIDATION_SCENARIOS: readonly EnvironmentalValidationScenario[] = [
  {
    id: 'COOL_WEATHER',
    label: 'Cool outdoor conditions',
    rationale:
      'Low thermoregulatory load. Composite below neutral zone — stress exists, impact neutral.',
    applicability: 'OUTDOOR',
    weather: { airTemperatureC: 12, relativeHumidityPct: 50, windSpeedMps: 2 },
    expectedBehavior: {
      thermalIntensityMin: 0.15,
      thermalIntensityMax: 0.3,
      compositeIntensityMax: 0.2,
      recoveryDemandMin: 1,
      recoveryDemandMax: 1,
      impactNeutral: true,
      significanceExpected: false,
    },
  },
  {
    id: 'MILD_BASELINE',
    label: 'Mild baseline outdoor',
    rationale:
      'Comfortable training conditions. Reference for monotonic comparisons — impact neutral.',
    applicability: 'OUTDOOR',
    weather: { airTemperatureC: 20, relativeHumidityPct: 55, windSpeedMps: 3 },
    expectedBehavior: {
      thermalIntensityMin: 0.4,
      thermalIntensityMax: 0.5,
      compositeIntensityMin: 0.15,
      compositeIntensityMax: 0.3,
      recoveryDemandMin: 1,
      recoveryDemandMax: 1,
      impactNeutral: true,
      significanceExpected: false,
    },
  },
  {
    id: 'HOT_WEATHER',
    label: 'Hot dry conditions',
    rationale:
      'Elevated thermal strain above neutral zone — recognized as meaningful dry-heat stress (Galloway & Maughan 1997).',
    applicability: 'OUTDOOR',
    weather: { airTemperatureC: 34, relativeHumidityPct: 40, windSpeedMps: 2 },
    expectedBehavior: {
      thermalIntensityMin: 0.65,
      thermalIntensityMax: 0.75,
      hydrationIntensityMin: 0.4,
      recoveryDemandMin: 1.08,
      recoveryDemandMax: 1.11,
      fatigueAccumulationMin: 1.02,
      fatigueAccumulationMax: 1.08,
      performanceRatioMin: 0.94,
      performanceRatioMax: 0.98,
      compositeIntensityMin: 0.4,
      compositeIntensityMax: 0.5,
      significanceExpected: true,
    },
  },
  {
    id: 'HIGH_HUMIDITY',
    label: 'Warm humid conditions',
    rationale:
      'Humidity impairs evaporative cooling — heat index elevates thermal and hydration stress.',
    applicability: 'OUTDOOR',
    weather: { airTemperatureC: 30, relativeHumidityPct: 85, windSpeedMps: 2 },
    expectedBehavior: {
      thermalIntensityMin: 0.85,
      hydrationIntensityMin: 0.65,
      recoveryDemandMin: 1.25,
      recoveryDemandMax: 1.35,
      fatigueAccumulationMin: 1.1,
      performanceRatioMax: 0.9,
      compositeIntensityMin: 0.55,
      significanceExpected: true,
    },
  },
  {
    id: 'STRONG_WIND',
    label: 'Strong wind exposure',
    rationale:
      'Wind increases mechanical work and perceived exertion at constant pace (Davies 1980).',
    applicability: 'OUTDOOR',
    weather: { airTemperatureC: 22, relativeHumidityPct: 50, windSpeedMps: 12 },
    expectedBehavior: {
      windIntensityMin: 0.75,
      fatigueAccumulationMin: 1.04,
      fatigueAccumulationMax: 1.1,
      performanceRatioMin: 0.9,
      performanceRatioMax: 0.96,
      compositeIntensityMin: 0.35,
      compositeIntensityMax: 0.5,
      significanceExpected: true,
    },
  },
  {
    id: 'EXTREME_HEAT',
    label: 'Extreme heat stress',
    rationale:
      'Combined high temperature and humidity — highest hydration stress in weather dimension.',
    applicability: 'OUTDOOR',
    weather: { airTemperatureC: 38, relativeHumidityPct: 70, windSpeedMps: 1 },
    expectedBehavior: {
      thermalIntensityMin: 0.9,
      hydrationIntensityMin: 0.95,
      recoveryDemandMin: 1.25,
      recoveryDemandMax: 1.35,
      performanceRatioMax: 0.9,
      compositeIntensityMin: 0.6,
      significanceExpected: true,
    },
  },
  {
    id: 'ALTITUDE_STUB',
    label: 'Altitude dimension (stub)',
    rationale:
      'Altitude stressor is typed but not yet fed by providers. No fabricated altitude penalty.',
    applicability: 'OUTDOOR',
    weather: { airTemperatureC: 20, relativeHumidityPct: 50, windSpeedMps: 2 },
    expectedBehavior: {
      thermalIntensityMin: 0.4,
      thermalIntensityMax: 0.5,
      recoveryDemandMin: 1,
      recoveryDemandMax: 1,
      impactNeutral: true,
      significanceExpected: false,
    },
  },
  {
    id: 'COMBINED_STRESSORS',
    label: 'Combined heat, humidity, and wind',
    rationale: 'Multiple simultaneous stressors — highest composite intensity in catalog.',
    applicability: 'OUTDOOR',
    weather: { airTemperatureC: 36, relativeHumidityPct: 75, windSpeedMps: 10 },
    expectedBehavior: {
      thermalIntensityMin: 0.9,
      windIntensityMin: 0.6,
      hydrationIntensityMin: 0.95,
      recoveryDemandMin: 1.25,
      recoveryDemandMax: 1.35,
      fatigueAccumulationMin: 1.15,
      performanceRatioMax: 0.87,
      compositeIntensityMin: 0.8,
      significanceExpected: true,
    },
  },
  {
    id: 'INDOOR_TRAINER',
    label: 'Indoor trainer — environmental suppression',
    rationale:
      'Indoor activities must not inherit outdoor weather. All stressors and impact overlays are suppressed.',
    applicability: 'INDOOR',
    weather: { airTemperatureC: 38, relativeHumidityPct: 80, windSpeedMps: 15 },
    expectedBehavior: {
      suppressed: true,
      significanceExpected: false,
    },
  },
] as const;

export const MONOTONIC_COMPARISON_GROUPS = {
  thermalSeverity: ['COOL_WEATHER', 'MILD_BASELINE', 'HOT_WEATHER', 'EXTREME_HEAT'] as const,
  windSeverity: ['MILD_BASELINE', 'STRONG_WIND'] as const,
  humidityVsDryHeat: ['HOT_WEATHER', 'HIGH_HUMIDITY'] as const,
  combinedVsHot: ['HOT_WEATHER', 'COMBINED_STRESSORS'] as const,
} as const;
