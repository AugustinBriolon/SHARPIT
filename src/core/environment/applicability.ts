/**
 * Environmental applicability — when context should influence a target.
 */

import type { EnvironmentalApplicability, ExposureSetting } from './types';
import { isSet } from '@/lib/util/value';

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
const OUTDOOR_SPORTS = new Set(['RUN', 'BIKE', 'TRIATHLON']);
const OUTDOOR_LOCATIONS = new Set(['ROAD', 'TRACK']);
const INDOOR_LOCATIONS = new Set(['GYM', 'TRAINER', 'POOL']);

function isIndoorContext(input: ApplicabilityInput): boolean {
  if (input.indoorFlag === true || input.athleteDeclaredExposure === 'INDOOR') {
    return true;
  }
  return isSet(input.locationType) && INDOOR_LOCATIONS.has(input.locationType);
}

function isOutdoorContext(input: ApplicabilityInput): boolean {
  if (input.athleteDeclaredExposure === 'OUTDOOR' || input.indoorFlag === false) {
    return true;
  }
  return OUTDOOR_SPORTS.has(input.sportType) || OUTDOOR_LOCATIONS.has(input.locationType ?? '');
}

function indoorSportApplicability(input: ApplicabilityInput): EnvironmentalApplicability | null {
  if (!INDOOR_SPORTS.has(input.sportType) || input.indoorFlag === false) {
    return null;
  }
  if (input.locationType === 'ROAD' || input.locationType === 'TRAIL') {
    return 'OUTDOOR';
  }
  return 'INDOOR';
}

function partialExposureApplicability(
  input: ApplicabilityInput,
): EnvironmentalApplicability | null {
  if (PARTIAL_EXPOSURE_SPORTS.has(input.sportType) || input.locationType === 'TRAIL') {
    return 'PARTIALLY_EXPOSED';
  }
  return null;
}

export function resolveEnvironmentalApplicability(
  input: ApplicabilityInput,
): EnvironmentalApplicability {
  if (isIndoorContext(input)) {
    return 'INDOOR';
  }

  const indoorSport = indoorSportApplicability(input);
  if (indoorSport) {
    return indoorSport;
  }

  const partialExposure = partialExposureApplicability(input);
  if (partialExposure) {
    return partialExposure;
  }

  if (isOutdoorContext(input)) {
    return 'OUTDOOR';
  }

  return 'UNKNOWN';
}

export function isEnvironmentApplicable(applicability: EnvironmentalApplicability): boolean {
  return applicability === 'OUTDOOR' || applicability === 'PARTIALLY_EXPOSED';
}

export function applicabilityToExposure(
  applicability: EnvironmentalApplicability,
): ExposureSetting {
  if (applicability === 'OUTDOOR' || applicability === 'PARTIALLY_EXPOSED') {
    return 'OUTDOOR';
  }
  if (applicability === 'INDOOR') {
    return 'INDOOR';
  }
  return 'UNKNOWN';
}
