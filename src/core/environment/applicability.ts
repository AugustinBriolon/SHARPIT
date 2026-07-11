/**
 * Environmental applicability — when context should influence a target.
 */

import type { EnvironmentalApplicability, ExposureSetting } from './types';

export type ApplicabilityInput = {
  readonly sportType:
    | 'RUN'
    | 'BIKE'
    | 'SWIM'
    | 'STRENGTH'
    | 'OPEN_WATER'
    | 'TRAIL_RUN'
    | 'MTB'
    | 'TRIATHLON'
    | 'YOGA'
    | 'OTHER'
    | string;
  readonly indoorFlag: boolean | null;
  readonly locationType: 'TRACK' | 'ROAD' | 'TRAIL' | 'POOL' | 'GYM' | 'TRAINER' | 'UNKNOWN' | null;
  readonly athleteDeclaredExposure?: ExposureSetting | null;
};

const INDOOR_SPORTS = new Set(['STRENGTH', 'YOGA']);
const PARTIAL_EXPOSURE_SPORTS = new Set(['OPEN_WATER', 'TRAIL_RUN', 'MTB']);

export function resolveEnvironmentalApplicability(
  input: ApplicabilityInput,
): EnvironmentalApplicability {
  if (input.indoorFlag === true) return 'INDOOR';
  if (input.athleteDeclaredExposure === 'INDOOR') return 'INDOOR';
  if (
    input.locationType === 'GYM' ||
    input.locationType === 'TRAINER' ||
    input.locationType === 'POOL'
  ) {
    return 'INDOOR';
  }

  if (INDOOR_SPORTS.has(input.sportType) && input.indoorFlag !== false) {
    return input.locationType === 'ROAD' || input.locationType === 'TRAIL' ? 'OUTDOOR' : 'INDOOR';
  }

  if (PARTIAL_EXPOSURE_SPORTS.has(input.sportType) || input.locationType === 'TRAIL') {
    return 'PARTIALLY_EXPOSED';
  }

  if (
    input.sportType === 'RUN' ||
    input.sportType === 'BIKE' ||
    input.sportType === 'TRIATHLON' ||
    input.locationType === 'ROAD' ||
    input.locationType === 'TRACK'
  ) {
    return 'OUTDOOR';
  }

  if (input.athleteDeclaredExposure === 'OUTDOOR') return 'OUTDOOR';
  if (input.indoorFlag === false) return 'OUTDOOR';

  return 'UNKNOWN';
}

export function isEnvironmentApplicable(applicability: EnvironmentalApplicability): boolean {
  return applicability === 'OUTDOOR' || applicability === 'PARTIALLY_EXPOSED';
}

export function applicabilityToExposure(
  applicability: EnvironmentalApplicability,
): ExposureSetting {
  if (applicability === 'OUTDOOR' || applicability === 'PARTIALLY_EXPOSED') return 'OUTDOOR';
  if (applicability === 'INDOOR') return 'INDOOR';
  return 'UNKNOWN';
}
