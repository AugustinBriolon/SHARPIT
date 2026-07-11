/**
 * ActivityEnvironmentalCorrection — explainability layer (environment-v1.1).
 *
 * Phase 3: attribution algorithm distributes performance penalty across stressors.
 * Does not modify observations or raw performance metrics.
 */

import {
  isMetricAvailable,
  type ActivityEnvironmentalCorrection,
  type ActivityEnvironmentalCorrectionFactor,
  type EnvironmentalExplanation,
  type EnvironmentalImpact,
  type EnvironmentalStress,
  type EnvironmentalStressor,
  type EnvironmentalStressorId,
  type MetricValue,
} from './types';
import {
  calibratedIntensity,
  ENVIRONMENTAL_IMPACT_CURVES,
  ENVIRONMENTAL_SIGNIFICANCE_THRESHOLDS,
  isWithinImpactNeutralZone,
  roundImpact,
} from './calibration';
import { getEnvironmentalStressor } from './stress';

function unavailableEffect(explanation: string): MetricValue<number> {
  return {
    available: false,
    quality: 'MISSING',
    confidence: 0,
    reason: 'METHOD_NOT_APPLICABLE',
    explanation,
  };
}

function neutralEffect(method: string): MetricValue<number> {
  return {
    available: true,
    value: 0,
    quality: 'ESTIMATED',
    confidence: 1,
    method,
    basedOn: [],
  };
}

export type BuildActivityEnvironmentalCorrectionInput = {
  readonly activityId: string;
  readonly stress: EnvironmentalStress;
  readonly impact: EnvironmentalImpact;
};

function readMultiplier(metric: MetricValue<number>): number | null {
  return metric.available ? metric.value : null;
}

function intensityOf(stressor: EnvironmentalStressor | undefined): number {
  if (!stressor?.intensity.available) return 0;
  return stressor.intensity.value;
}

function impactIsMaterial(impact: EnvironmentalImpact): boolean {
  const recovery = readMultiplier(impact.recovery.demandMultiplier);
  const fatigue = readMultiplier(impact.fatigue.accumulationMultiplier);
  const performance = readMultiplier(impact.performance.expectedOutputRatio);
  const hydration = readMultiplier(impact.hydration.demandMultiplier);
  const thresholds = ENVIRONMENTAL_SIGNIFICANCE_THRESHOLDS;

  return (
    (recovery != null && recovery >= thresholds.recoveryDemand) ||
    (fatigue != null && fatigue >= thresholds.fatigueAccumulation) ||
    (performance != null && performance <= thresholds.performanceRatio) ||
    (hydration != null && hydration >= thresholds.hydrationDemand)
  );
}

function performancePenalty(impact: EnvironmentalImpact): number {
  const ratio = readMultiplier(impact.performance.expectedOutputRatio);
  if (ratio == null || ratio >= 1) return 0;
  return roundImpact(1 - ratio);
}

function calibratedStressorWeight(
  stressorId: EnvironmentalStressorId,
  stress: EnvironmentalStress,
): number {
  const curve = ENVIRONMENTAL_IMPACT_CURVES.performance;
  switch (stressorId) {
    case 'THERMAL':
      return calibratedIntensity(
        intensityOf(getEnvironmentalStressor(stress, 'THERMAL')),
        curve.thermalActivation,
        curve.exponent,
      );
    case 'WIND':
      return calibratedIntensity(
        intensityOf(getEnvironmentalStressor(stress, 'WIND')),
        curve.windActivation,
        curve.exponent,
      );
    case 'HYDRATION': {
      const hydrationCurve = ENVIRONMENTAL_IMPACT_CURVES.hydration;
      return calibratedIntensity(
        intensityOf(getEnvironmentalStressor(stress, 'HYDRATION')),
        hydrationCurve.activation,
        hydrationCurve.exponent,
      );
    }
    default:
      return 0;
  }
}

const PERFORMANCE_WEIGHTS: Partial<Record<EnvironmentalStressorId, number>> = {
  THERMAL: ENVIRONMENTAL_IMPACT_CURVES.performance.thermalWeight,
  WIND: ENVIRONMENTAL_IMPACT_CURVES.performance.windWeight,
};

function buildFactor(
  stressor: EnvironmentalStressor,
  attributedEffect: number,
  explanation: string,
): ActivityEnvironmentalCorrectionFactor {
  const quality = stressor.intensity.available ? stressor.intensity.quality : 'ESTIMATED';

  return {
    stressorId: stressor.id,
    attributedEffect: {
      available: true,
      value: roundImpact(attributedEffect),
      quality,
      confidence: stressor.confidence,
      method: 'ENVIRONMENTAL_ATTRIBUTION_V1',
      basedOn: [stressor.id],
    },
    explanation,
    confidence: stressor.confidence,
    quality,
  };
}

function metricNumericValue(metric: MetricValue<number>): number {
  return isMetricAvailable(metric) ? metric.value : 0;
}

function buildNarrative(
  factors: readonly ActivityEnvironmentalCorrectionFactor[],
  totalPenalty: number,
): readonly EnvironmentalExplanation[] {
  if (factors.length === 0 || totalPenalty <= 0) return Object.freeze([]);

  const penaltyPct = Math.round(totalPenalty * 100);
  const [dominant] = [...factors].sort(
    (a, b) => metricNumericValue(b.attributedEffect) - metricNumericValue(a.attributedEffect),
  );

  const items: EnvironmentalExplanation[] = [
    {
      code: 'environment.correction.narrative.performance',
      params: { penaltyPct },
    },
  ];

  if (dominant?.stressorId === 'THERMAL') {
    items.push({ code: 'environment.correction.narrative.thermalDominant' });
  } else if (dominant?.stressorId === 'WIND') {
    items.push({ code: 'environment.correction.narrative.windDominant' });
  } else if (dominant?.stressorId === 'HYDRATION') {
    items.push({ code: 'environment.correction.narrative.hydrationDominant' });
  }

  if (factors.length > 1) {
    items.push({ code: 'environment.correction.narrative.combined' });
  }

  return Object.freeze(items);
}

function stressorExplanation(stressorId: EnvironmentalStressorId): string {
  switch (stressorId) {
    case 'THERMAL':
      return 'Charge thermique attribuée à la performance observée.';
    case 'WIND':
      return 'Effet du vent sur le coût mécanique de la séance.';
    case 'HYDRATION':
      return 'Demande hydratation élevée — stress cardiovasculaire additionnel.';
    default:
      return 'Facteur environnemental attribué.';
  }
}

export function buildActivityEnvironmentalCorrection(
  input: BuildActivityEnvironmentalCorrectionInput,
): ActivityEnvironmentalCorrection {
  const { activityId, stress, impact } = input;

  if (stress.suppressionReason != null) {
    return {
      activityId,
      rawMetricsPreserved: true,
      factors: Object.freeze([]),
      totalAttributedEffect: unavailableEffect(
        'Correction non applicable — environnement supprimé.',
      ),
      narrative: Object.freeze([]),
    };
  }

  const composite = stress.compositeIntensity.available ? stress.compositeIntensity.value : null;

  if (isWithinImpactNeutralZone(composite) || !impactIsMaterial(impact)) {
    return {
      activityId,
      rawMetricsPreserved: true,
      factors: Object.freeze([]),
      totalAttributedEffect: neutralEffect('ENVIRONMENTAL_CORRECTION_NEUTRAL'),
      narrative: Object.freeze([]),
    };
  }

  const totalPenalty = performancePenalty(impact);
  const hydrationDelta = Math.max(0, (readMultiplier(impact.hydration.demandMultiplier) ?? 1) - 1);

  const performanceWeights = (['THERMAL', 'WIND'] as const).map((id) => ({
    id,
    weight: calibratedStressorWeight(id, stress) * (PERFORMANCE_WEIGHTS[id] ?? 0),
  }));
  const performanceWeightSum = performanceWeights.reduce((sum, w) => sum + w.weight, 0);

  const factors: ActivityEnvironmentalCorrectionFactor[] = [];

  for (const { id, weight } of performanceWeights) {
    if (weight <= 0 || totalPenalty <= 0) continue;
    const stressor = getEnvironmentalStressor(stress, id);
    if (!stressor) continue;
    const share = performanceWeightSum > 0 ? (weight / performanceWeightSum) * totalPenalty : 0;
    if (share <= 0) continue;
    factors.push(buildFactor(stressor, share, stressorExplanation(id)));
  }

  const hydrationStressor = getEnvironmentalStressor(stress, 'HYDRATION');
  const hydrationWeight = calibratedStressorWeight('HYDRATION', stress);
  if (hydrationStressor && hydrationWeight > 0 && hydrationDelta > 0) {
    factors.push(
      buildFactor(
        hydrationStressor,
        roundImpact(hydrationDelta * hydrationWeight),
        stressorExplanation('HYDRATION'),
      ),
    );
  }

  const attributedTotal =
    factors.length > 0
      ? roundImpact(factors.reduce((sum, f) => sum + metricNumericValue(f.attributedEffect), 0))
      : totalPenalty;

  return {
    activityId,
    rawMetricsPreserved: true,
    factors: Object.freeze(factors),
    totalAttributedEffect: {
      available: true,
      value: attributedTotal,
      quality: 'ESTIMATED',
      confidence: impact.confidence,
      method: 'COMPOSITE_ENVIRONMENTAL_ATTRIBUTION',
      basedOn: factors.map((f) => f.stressorId),
    },
    narrative: buildNarrative(factors, totalPenalty > 0 ? totalPenalty : attributedTotal),
  };
}
