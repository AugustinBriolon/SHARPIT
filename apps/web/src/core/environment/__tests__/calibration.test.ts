/**
 * Phase 2.6 — calibration curve and neutral zone unit tests.
 */

import { describe, expect, it } from 'vitest';
import { buildEnvironmentalImpact, buildEnvironmentalStress } from '@/core/environment';
import { isMetricAvailable, type MetricValue } from '../types';
import {
  calibratedIntensity,
  demandMultiplierFromCalibratedIntensity,
  ENVIRONMENTAL_NEUTRAL_ZONE,
  ENVIRONMENTAL_SIGNIFICANCE_THRESHOLDS,
  isWithinImpactNeutralZone,
} from '../calibration';

function metricValue<T>(metric: MetricValue<T>): T {
  expect(isMetricAvailable(metric)).toBe(true);
  return (metric as Extract<MetricValue<T>, { available: true }>).value;
}

describe('environment calibration — neutral zone', () => {
  it('composite below ceiling is within neutral zone', () => {
    expect(isWithinImpactNeutralZone(0.11)).toBe(true);
    expect(isWithinImpactNeutralZone(0.34)).toBe(true);
    expect(isWithinImpactNeutralZone(ENVIRONMENTAL_NEUTRAL_ZONE.compositeCeiling)).toBe(false);
  });

  it('mild outdoor conditions produce identity impact multipliers', () => {
    const stress = buildEnvironmentalStress({
      applicability: 'OUTDOOR',
      weather: { airTemperatureC: 20, relativeHumidityPct: 55, windSpeedMps: 3 },
    });
    const impact = buildEnvironmentalImpact({ stress });

    expect(metricValue(impact.recovery.demandMultiplier)).toBe(1);
    expect(metricValue(impact.fatigue.accumulationMultiplier)).toBe(1);
    expect(metricValue(impact.performance.expectedOutputRatio)).toBe(1);
    expect(metricValue(impact.hydration.demandMultiplier)).toBe(1);
  });

  it('indoor suppression remains unaffected by calibration', () => {
    const stress = buildEnvironmentalStress({
      applicability: 'INDOOR',
      weather: { airTemperatureC: 38, relativeHumidityPct: 80, windSpeedMps: 15 },
    });
    const impact = buildEnvironmentalImpact({ stress });

    expect(stress.suppressionReason).not.toBeNull();
    expect(impact.recovery.demandMultiplier.available).toBe(false);
    expect(impact.confidence).toBe(0);
  });
});

describe('environment calibration — progressive curves', () => {
  it('calibrated intensity is zero below activation', () => {
    expect(calibratedIntensity(0.4, 0.55, 1.5)).toBe(0);
  });

  it('calibrated intensity grows smoothly above activation', () => {
    const low = calibratedIntensity(0.6, 0.55, 1.5);
    const mid = calibratedIntensity(0.75, 0.55, 1.5);
    const high = calibratedIntensity(0.95, 0.55, 1.5);
    expect(low).toBeGreaterThan(0);
    expect(mid).toBeGreaterThan(low);
    expect(high).toBeGreaterThan(mid);
    expect(high).toBeLessThanOrEqual(1);
  });

  it('demand multiplier stays at 1 for zero effective intensity', () => {
    expect(demandMultiplierFromCalibratedIntensity(0, 0.35)).toBe(1);
  });

  it('dry hot weather (34°C) crosses significance without large recovery jump', () => {
    const stress = buildEnvironmentalStress({
      applicability: 'OUTDOOR',
      weather: { airTemperatureC: 34, relativeHumidityPct: 40, windSpeedMps: 2 },
    });
    const impact = buildEnvironmentalImpact({ stress });
    const recovery = metricValue(impact.recovery.demandMultiplier);
    expect(recovery).toBeGreaterThanOrEqual(ENVIRONMENTAL_SIGNIFICANCE_THRESHOLDS.recoveryDemand);
    expect(recovery).toBeLessThan(1.12);
  });

  it('extreme heat produces recovery demand above significance threshold', () => {
    const stress = buildEnvironmentalStress({
      applicability: 'OUTDOOR',
      weather: { airTemperatureC: 38, relativeHumidityPct: 70, windSpeedMps: 1 },
    });
    const impact = buildEnvironmentalImpact({ stress });
    expect(metricValue(impact.recovery.demandMultiplier)).toBeGreaterThanOrEqual(
      ENVIRONMENTAL_SIGNIFICANCE_THRESHOLDS.recoveryDemand,
    );
  });

  it('combined stressors exceed hot-only recovery demand', () => {
    const hotStress = buildEnvironmentalStress({
      applicability: 'OUTDOOR',
      weather: { airTemperatureC: 34, relativeHumidityPct: 40, windSpeedMps: 2 },
    });
    const combinedStress = buildEnvironmentalStress({
      applicability: 'OUTDOOR',
      weather: { airTemperatureC: 36, relativeHumidityPct: 75, windSpeedMps: 10 },
    });
    const hotImpact = buildEnvironmentalImpact({ stress: hotStress });
    const combinedImpact = buildEnvironmentalImpact({ stress: combinedStress });

    expect(metricValue(combinedImpact.recovery.demandMultiplier)).toBeGreaterThan(
      metricValue(hotImpact.recovery.demandMultiplier),
    );
    expect(metricValue(combinedImpact.fatigue.accumulationMultiplier)).toBeGreaterThan(
      metricValue(hotImpact.fatigue.accumulationMultiplier),
    );
  });
});
