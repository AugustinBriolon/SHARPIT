/**
 * EnvironmentalImpact — physiological adjustments for downstream models (environment-v1.1).
 *
 * Phase 2.6 calibration: neutral zone + progressive curves.
 * @see docs/models/ENVIRONMENTAL_CALIBRATION.md
 */

import type {
  EnvironmentalImpact,
  EnvironmentalStress,
  EnvironmentalStressor,
  FatigueAdjustment,
  HeatAcclimationDemand,
  HydrationAdjustment,
  MetricValue,
  PerformanceAdjustment,
  RecoveryAdjustment,
} from './types';
import {
  benefitFromCalibratedIntensity,
  calibratedIntensity,
  demandMultiplierFromCalibratedIntensity,
  ENVIRONMENTAL_IMPACT_CURVES,
  isWithinImpactNeutralZone,
  performanceRatioFromCalibratedIntensity,
} from './calibration';
import { getEnvironmentalStressor } from './stress';

function neutralMultiplier(method: string): MetricValue<number> {
  return {
    available: true,
    value: 1,
    quality: 'ESTIMATED',
    confidence: 1,
    method,
    basedOn: [],
  };
}

function zeroBenefit(method: string): MetricValue<number> {
  return {
    available: true,
    value: 0,
    quality: 'ESTIMATED',
    confidence: 1,
    method,
    basedOn: [],
  };
}

function unavailableMultiplier(explanation: string): MetricValue<number> {
  return {
    available: false,
    quality: 'MISSING',
    confidence: 0,
    reason: 'NOT_APPLICABLE',
    explanation,
  };
}

function unavailableImpact(): EnvironmentalImpact {
  const missing = unavailableMultiplier('Ajustements physiologiques non applicables.');

  return {
    recovery: { demandMultiplier: missing },
    fatigue: { accumulationMultiplier: missing },
    performance: { expectedOutputRatio: missing },
    hydration: { demandMultiplier: missing },
    heatAcclimation: { exposureBenefit: missing },
    confidence: 0,
  };
}

function neutralImpact(stress: EnvironmentalStress): EnvironmentalImpact {
  return {
    recovery: { demandMultiplier: neutralMultiplier('RECOVERY_NEUTRAL_ZONE') },
    fatigue: { accumulationMultiplier: neutralMultiplier('FATIGUE_NEUTRAL_ZONE') },
    performance: { expectedOutputRatio: neutralMultiplier('PERFORMANCE_NEUTRAL_ZONE') },
    hydration: { demandMultiplier: neutralMultiplier('HYDRATION_NEUTRAL_ZONE') },
    heatAcclimation: { exposureBenefit: zeroBenefit('HEAT_ACCLIMATION_NEUTRAL_ZONE') },
    confidence: aggregateImpactConfidence(stress),
  };
}

function intensityOf(stressor: EnvironmentalStressor | undefined): number | null {
  if (!stressor?.intensity.available) {
    return null;
  }
  return stressor.intensity.value;
}

function confidenceOf(stressor: EnvironmentalStressor | undefined): number {
  return stressor?.confidence ?? 0;
}

type CalibratedMetricInput = {
  value: number;
  method: string;
  basedOn: readonly string[];
  confidence: number;
  quality?: MetricValue<number>['quality'];
};

function calibratedMetric(input: CalibratedMetricInput): MetricValue<number> {
  return {
    available: true,
    value: input.value,
    quality: input.quality ?? 'ESTIMATED',
    confidence: input.confidence,
    method: input.method,
    basedOn: input.basedOn,
  };
}

function buildRecoveryAdjustment(stress: EnvironmentalStress): RecoveryAdjustment {
  const thermal = getEnvironmentalStressor(stress, 'THERMAL');
  const thermalIntensity = intensityOf(thermal);
  const curve = ENVIRONMENTAL_IMPACT_CURVES.recovery;

  if (thermalIntensity === null) {
    return { demandMultiplier: neutralMultiplier('RECOVERY_NEUTRAL_NO_THERMAL') };
  }

  const effective = calibratedIntensity(thermalIntensity, curve.activation, curve.exponent);

  return {
    demandMultiplier: calibratedMetric({
      value: demandMultiplierFromCalibratedIntensity(effective, curve.maxScale),
      method: 'THERMAL_RECOVERY_DEMAND_CALIBRATED',
      basedOn: ['THERMAL'],
      confidence: confidenceOf(thermal),
      quality: thermal!.intensity.quality,
    }),
  };
}

function buildFatigueAdjustment(stress: EnvironmentalStress): FatigueAdjustment {
  const thermal = getEnvironmentalStressor(stress, 'THERMAL');
  const wind = getEnvironmentalStressor(stress, 'WIND');
  const curve = ENVIRONMENTAL_IMPACT_CURVES.fatigue;

  const thermalEff = calibratedIntensity(
    intensityOf(thermal) ?? 0,
    curve.thermalActivation,
    curve.exponent,
  );
  const windEff = calibratedIntensity(intensityOf(wind) ?? 0, curve.windActivation, curve.exponent);
  const combined = Math.min(1, thermalEff * curve.thermalWeight + windEff * curve.windWeight);

  if (combined === 0) {
    return { accumulationMultiplier: neutralMultiplier('FATIGUE_NEUTRAL_CALIBRATED') };
  }

  return {
    accumulationMultiplier: calibratedMetric({
      value: demandMultiplierFromCalibratedIntensity(combined, curve.maxScale),
      method: 'COMPOSITE_FATIGUE_ACCUMULATION_CALIBRATED',
      basedOn: ['THERMAL', 'WIND'],
      confidence: Math.max(confidenceOf(thermal), confidenceOf(wind)),
    }),
  };
}

function buildPerformanceAdjustment(stress: EnvironmentalStress): PerformanceAdjustment {
  const thermal = getEnvironmentalStressor(stress, 'THERMAL');
  const wind = getEnvironmentalStressor(stress, 'WIND');
  const curve = ENVIRONMENTAL_IMPACT_CURVES.performance;

  const thermalEff = calibratedIntensity(
    intensityOf(thermal) ?? 0,
    curve.thermalActivation,
    curve.exponent,
  );
  const windEff = calibratedIntensity(intensityOf(wind) ?? 0, curve.windActivation, curve.exponent);
  const combined = Math.min(1, thermalEff * curve.thermalWeight + windEff * curve.windWeight);

  if (combined === 0) {
    return { expectedOutputRatio: neutralMultiplier('PERFORMANCE_NEUTRAL_CALIBRATED') };
  }

  return {
    expectedOutputRatio: calibratedMetric({
      value: performanceRatioFromCalibratedIntensity(combined, curve.maxPenalty),
      method: 'COMPOSITE_PERFORMANCE_PENALTY_CALIBRATED',
      basedOn: ['THERMAL', 'WIND'],
      confidence: Math.max(confidenceOf(thermal), confidenceOf(wind)),
    }),
  };
}

function buildHydrationAdjustment(stress: EnvironmentalStress): HydrationAdjustment {
  const hydration = getEnvironmentalStressor(stress, 'HYDRATION');
  const intensity = intensityOf(hydration);
  const curve = ENVIRONMENTAL_IMPACT_CURVES.hydration;

  if (intensity === null) {
    return { demandMultiplier: neutralMultiplier('HYDRATION_NEUTRAL') };
  }

  const effective = calibratedIntensity(intensity, curve.activation, curve.exponent);

  if (effective === 0) {
    return { demandMultiplier: neutralMultiplier('HYDRATION_NEUTRAL_ZONE') };
  }

  return {
    demandMultiplier: calibratedMetric({
      value: demandMultiplierFromCalibratedIntensity(effective, curve.maxScale),
      method: 'HYDRATION_DEMAND_CALIBRATED',
      basedOn: ['HYDRATION'],
      confidence: confidenceOf(hydration),
      quality: hydration!.intensity.quality,
    }),
  };
}

function buildHeatAcclimationDemand(stress: EnvironmentalStress): HeatAcclimationDemand {
  const thermal = getEnvironmentalStressor(stress, 'THERMAL');
  const intensity = intensityOf(thermal);
  const curve = ENVIRONMENTAL_IMPACT_CURVES.heatAcclimation;

  if (intensity === null) {
    return { exposureBenefit: zeroBenefit('HEAT_ACCLIMATION_NEUTRAL') };
  }

  const effective = calibratedIntensity(intensity, curve.activation, curve.exponent);

  return {
    exposureBenefit: calibratedMetric({
      value: benefitFromCalibratedIntensity(effective, curve.maxBenefit),
      method: 'THERMAL_ACCLIMATION_BENEFIT_CALIBRATED',
      basedOn: ['THERMAL'],
      confidence: confidenceOf(thermal),
    }),
  };
}

function aggregateImpactConfidence(stress: EnvironmentalStress): number {
  const available = stress.stressors.filter((s) => s.intensity.available);
  if (available.length === 0) {
    return 0;
  }
  return (
    Math.round((available.reduce((sum, s) => sum + s.confidence, 0) / available.length) * 100) / 100
  );
}

function compositeIntensityValue(stress: EnvironmentalStress): number | null {
  if (!stress.compositeIntensity.available) {
    return null;
  }
  return stress.compositeIntensity.value;
}

export function buildEnvironmentalImpact(input: {
  stress: EnvironmentalStress;
}): EnvironmentalImpact {
  const { stress } = input;

  if (stress.suppressionReason !== null) {
    return unavailableImpact();
  }

  if (isWithinImpactNeutralZone(compositeIntensityValue(stress))) {
    return neutralImpact(stress);
  }

  return {
    recovery: buildRecoveryAdjustment(stress),
    fatigue: buildFatigueAdjustment(stress),
    performance: buildPerformanceAdjustment(stress),
    hydration: buildHydrationAdjustment(stress),
    heatAcclimation: buildHeatAcclimationDemand(stress),
    confidence: aggregateImpactConfidence(stress),
  };
}
