/**
 * Athlete Environmental Sensitivity Profile — design only (Phase 2.5).
 *
 * Future personalization layer. NOT applied in inference today.
 * Default profile is neutral (1.0 on all axes).
 *
 * @see docs/models/ENVIRONMENTAL_SENSITIVITY_PROFILE.md
 */

import type { EnvironmentalImpact } from '@/core/environment';

/** Profile version for forward-compatible persistence. */
export const ATHLETE_ENVIRONMENTAL_SENSITIVITY_PROFILE_VERSION = 1 as const;

/**
 * Per-axis sensitivity multiplier.
 *   1.0 = population-neutral (default)
 *   > 1.0 = athlete experiences greater physiological effect
 *   < 1.0 = athlete tolerates condition better
 *
 * Learned over months of athlete history — not implemented in Phase 2.5.
 */
export type EnvironmentalSensitivityAxis = {
  readonly multiplier: number;
  readonly confidence: number;
  readonly sampleCount: number;
  readonly lastUpdatedAt: string | null;
};

export type AthleteEnvironmentalSensitivityProfile = {
  readonly version: typeof ATHLETE_ENVIRONMENTAL_SENSITIVITY_PROFILE_VERSION;
  readonly athleteId: string;
  readonly thermal: EnvironmentalSensitivityAxis;
  readonly humidity: EnvironmentalSensitivityAxis;
  readonly altitude: EnvironmentalSensitivityAxis;
  readonly wind: EnvironmentalSensitivityAxis;
  readonly isDefault: boolean;
  readonly computedAt: string | null;
};

export const NEUTRAL_SENSITIVITY_AXIS: EnvironmentalSensitivityAxis = {
  multiplier: 1,
  confidence: 1,
  sampleCount: 0,
  lastUpdatedAt: null,
};

export function createNeutralEnvironmentalSensitivityProfile(
  athleteId: string,
): AthleteEnvironmentalSensitivityProfile {
  return {
    version: ATHLETE_ENVIRONMENTAL_SENSITIVITY_PROFILE_VERSION,
    athleteId,
    thermal: NEUTRAL_SENSITIVITY_AXIS,
    humidity: NEUTRAL_SENSITIVITY_AXIS,
    altitude: NEUTRAL_SENSITIVITY_AXIS,
    wind: NEUTRAL_SENSITIVITY_AXIS,
    isDefault: true,
    computedAt: null,
  };
}

/**
 * Future integration point — personalize EnvironmentalImpact before downstream models.
 *
 * NOT IMPLEMENTED. Signature frozen for Phase 3+ learning pipeline.
 *
 * Example future usage:
 *   const personalized = applyEnvironmentalSensitivityProfile(baseImpact, profile);
 *   recoveryModel.run(features, { environmentalImpact: personalized });
 */
export type EnvironmentalImpactPersonalizationInput = {
  readonly baseImpact: EnvironmentalImpact;
  readonly profile: AthleteEnvironmentalSensitivityProfile;
};

export function applyEnvironmentalSensitivityProfile(
  input: EnvironmentalImpactPersonalizationInput,
): EnvironmentalImpact {
  // Phase 2.5: neutral passthrough — personalization not yet enabled.
  void input.profile;
  return input.baseImpact;
}

/**
 * Repository port placeholder — learning pipeline will persist profiles separately
 * from Twin environmental cache and outside environment-v1.1 public API.
 */
export interface AthleteEnvironmentalSensitivityProfileRepository {
  findByAthleteId(athleteId: string): Promise<AthleteEnvironmentalSensitivityProfile>;
}
