/**
 * Environmental impact calibration (Phase 2.6).
 *
 * Source of truth for tuning: docs/models/ENVIRONMENTAL_CALIBRATION.md
 * Public API types unchanged — only impact curve behavior.
 */

export const ENVIRONMENTAL_CALIBRATION_VERSION = '2.6.1' as const;

/**
 * Neutral zone — stress may exist, but EnvironmentalImpact stays at identity multipliers.
 * Composite intensity below ceiling → engine is invisible to downstream models.
 */
export const ENVIRONMENTAL_NEUTRAL_ZONE = {
  /** Composite stress intensity below this → all impact multipliers = 1.0 */
  compositeCeiling: 0.35,
} as const;

/**
 * Thresholds for declaring environmental impact "significant" (Reasoning, Snapshot trainingImpact).
 * Deliberately above identity to avoid background noise.
 */
export const ENVIRONMENTAL_SIGNIFICANCE_THRESHOLDS = {
  recoveryDemand: 1.08,
  fatigueAccumulation: 1.06,
  performanceRatio: 0.94,
  hydrationDemand: 1.1,
} as const;

export type ImpactCurveSpec = {
  readonly activation: number;
  readonly maxScale: number;
  readonly exponent: number;
};

export const ENVIRONMENTAL_IMPACT_CURVES = {
  recovery: {
    /** Lowered in 2.6.1 so dry heat (~34°C) crosses significance without large demand jump. */
    activation: 0.5,
    maxScale: 0.35,
    exponent: 1.5,
  },
  fatigue: {
    thermalActivation: 0.55,
    windActivation: 0.35,
    thermalWeight: 0.65,
    windWeight: 0.35,
    maxScale: 0.3,
    exponent: 1.5,
  },
  performance: {
    thermalActivation: 0.5,
    windActivation: 0.35,
    thermalWeight: 0.6,
    windWeight: 0.4,
    maxPenalty: 0.25,
    exponent: 1.5,
  },
  hydration: {
    activation: 0.45,
    maxScale: 0.45,
    exponent: 1.2,
  },
  heatAcclimation: {
    activation: 0.65,
    maxBenefit: 1,
    exponent: 1.3,
  },
} as const;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Smooth activation curve — no abrupt thresholds.
 * Returns 0 below activation, progressive growth toward 1 at saturation.
 */
export function calibratedIntensity(
  rawIntensity: number,
  activation: number,
  exponent: number,
): number {
  if (rawIntensity <= activation) return 0;
  const span = 1 - activation;
  if (span <= 0) return 0;
  const normalized = clamp01((rawIntensity - activation) / span);
  return Math.pow(normalized, exponent);
}

export function isWithinImpactNeutralZone(compositeIntensity: number | null): boolean {
  if (compositeIntensity === null) return true;
  return compositeIntensity < ENVIRONMENTAL_NEUTRAL_ZONE.compositeCeiling;
}

export function roundImpact(value: number): number {
  return Math.round(value * 100) / 100;
}

export function demandMultiplierFromCalibratedIntensity(
  effectiveIntensity: number,
  maxScale: number,
): number {
  if (effectiveIntensity <= 0) return 1;
  return roundImpact(1 + effectiveIntensity * maxScale);
}

export function performanceRatioFromCalibratedIntensity(
  effectiveIntensity: number,
  maxPenalty: number,
): number {
  if (effectiveIntensity <= 0) return 1;
  return Math.max(0.5, roundImpact(1 - effectiveIntensity * maxPenalty));
}

export function benefitFromCalibratedIntensity(
  effectiveIntensity: number,
  maxBenefit: number,
): number {
  if (effectiveIntensity <= 0) return 0;
  return roundImpact(effectiveIntensity * maxBenefit);
}
