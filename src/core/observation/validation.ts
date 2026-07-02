/**
 * OBSERVATION ENGINE — Validation
 *
 * Pure functions. No I/O. No side effects. No framework dependencies.
 *
 * Each validator returns either:
 *   - { valid: true, flags: QualityFlag[] }   → accepted, possibly with concerns
 *   - { valid: false, reason: RejectionReason } → permanently rejected
 *
 * Rejection means the observation is biologically impossible, structurally broken,
 * or carries no meaningful data. Flags mean the observation is accepted but
 * downstream consumers should apply reduced confidence.
 */

import type { RawObservation, QualityFlag, RejectionReason } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Result types
// ─────────────────────────────────────────────────────────────────────────────

export type ValidationSuccess = { readonly valid: true; readonly flags: QualityFlag[] };
export type ValidationFailure = { readonly valid: false; readonly reason: RejectionReason };
export type ValidationResult = ValidationSuccess | ValidationFailure;

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

function outOfRange(field: string, value: number, min: number, max: number): ValidationFailure {
  return {
    valid: false,
    reason: { code: 'OUT_OF_PLAUSIBLE_RANGE', field, value, min, max },
  };
}

function missingField(field: string): ValidationFailure {
  return { valid: false, reason: { code: 'REQUIRED_FIELD_MISSING', field } };
}

function checkRange(
  field: string,
  value: number | undefined,
  min: number,
  max: number,
  required?: true,
): ValidationFailure | null {
  if (value === undefined || value === null) {
    return required ? missingField(field) : null;
  }
  if (value < min || value > max) {
    return outOfRange(field, value, min, max);
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-type validators
// ─────────────────────────────────────────────────────────────────────────────

function validateSession(raw: Extract<RawObservation, { type: 'SESSION' }>): ValidationResult {
  const flags: QualityFlag[] = [];

  const duration = checkRange('durationSec', raw.durationSec, 1, 86400, true);
  if (duration) return duration;

  if (raw.powerData) {
    const watts = checkRange('powerData.avgWatts', raw.powerData.avgWatts, 10, 3000, true);
    if (watts) return watts;

    if (raw.powerData.normalizedPower !== undefined) {
      const np = checkRange('powerData.normalizedPower', raw.powerData.normalizedPower, 10, 3000);
      if (np) return np;
    }

    if (raw.powerData.quality === 'MEASURED_OPTICAL') flags.push('OPTICAL_SENSOR');
  }

  if (raw.hrData) {
    const hr = checkRange('hrData.avgBpm', raw.hrData.avgBpm, 25, 250, true);
    if (hr) return hr;

    if (raw.hrData.maxBpm !== undefined) {
      const maxHr = checkRange('hrData.maxBpm', raw.hrData.maxBpm, 25, 250);
      if (maxHr) return maxHr;
    }

    if (raw.hrData.quality === 'MEASURED_OPTICAL') flags.push('OPTICAL_SENSOR');
  }

  if (raw.sourceProvidedStress) {
    // TSS of 700 = absolute upper limit (e.g., 12h IRONMAN)
    const stress = checkRange('sourceProvidedStress.value', raw.sourceProvidedStress.value, 0, 700);
    if (stress) return stress;

    flags.push(
      raw.sourceProvidedStress.quality === 'ESTIMATED'
        ? 'ESTIMATED_FROM_HR'
        : 'PROPRIETARY_MODEL_OUTPUT',
    );
  } else if (!raw.powerData && !raw.hrData) {
    // No power, no HR, no source stress → TSS will be estimated from duration only
    flags.push('ESTIMATED_FROM_DURATION');
  }

  return { valid: true, flags };
}

function validateSleep(raw: Extract<RawObservation, { type: 'SLEEP' }>): ValidationResult {
  const flags: QualityFlag[] = [];

  const duration = checkRange('totalMinutes', raw.totalMinutes, 0, 960, true);
  if (duration) return duration;

  if (!raw.wakeTimestamp) return missingField('wakeTimestamp');

  if (raw.wakeTimestamp <= raw.timestamp) {
    return {
      valid: false,
      reason: {
        code: 'TEMPORAL_INCONSISTENCY',
        detail: 'wakeTimestamp must be after sleep onset (timestamp)',
      },
    };
  }

  const derivedDuration = (raw.wakeTimestamp.getTime() - raw.timestamp.getTime()) / 60_000;
  if (Math.abs(derivedDuration - raw.totalMinutes) > derivedDuration * 0.3) {
    // totalMinutes deviates >30% from clock-based duration → flag, but do not reject
    // (Garmin often reports net sleep, not time-in-bed)
    flags.push('UNUSUAL_VALUE');
  }

  if (raw.totalMinutes > 600) flags.push('UNUSUALLY_LONG_SLEEP');

  // Garmin sleep data is always optical sensor + proprietary scoring
  flags.push('OPTICAL_SENSOR');

  return { valid: true, flags };
}

function validateHrv(raw: Extract<RawObservation, { type: 'HRV' }>): ValidationResult {
  const flags: QualityFlag[] = [];

  const hrv = checkRange('valueMsRmssd', raw.valueMsRmssd, 10, 250, true);
  if (hrv) return hrv;

  if (raw.measurementMethod === 'OVERNIGHT_AVERAGE' || raw.measurementMethod === 'MORNING_SHORT') {
    flags.push('OPTICAL_SENSOR');
  }

  return { valid: true, flags };
}

function validateRestingHr(raw: Extract<RawObservation, { type: 'RESTING_HR' }>): ValidationResult {
  const rhr = checkRange('valueBpm', raw.valueBpm, 20, 120, true);
  if (rhr) return rhr;

  return { valid: true, flags: ['OPTICAL_SENSOR'] };
}

function validateSubjective(
  raw: Extract<RawObservation, { type: 'SUBJECTIVE' }>,
): ValidationResult {
  const hasMeaningfulData =
    raw.rpe !== undefined ||
    raw.mood !== undefined ||
    raw.perceivedSoreness !== undefined ||
    raw.energyLevel !== undefined ||
    raw.stressLevel !== undefined;

  if (!hasMeaningfulData) {
    return {
      valid: false,
      reason: {
        code: 'NO_MEANINGFUL_DATA',
        detail:
          'A SubjectiveObservation must contain at least one of: rpe, mood, perceivedSoreness, energyLevel, stressLevel',
      },
    };
  }

  if (raw.rpe !== undefined) {
    const rpe = checkRange('rpe', raw.rpe, 0, 10);
    if (rpe) return rpe;
  }
  if (raw.mood !== undefined) {
    const mood = checkRange('mood', raw.mood, 1, 5);
    if (mood) return mood;
  }
  if (raw.perceivedSoreness !== undefined) {
    const soreness = checkRange('perceivedSoreness', raw.perceivedSoreness, 0, 10);
    if (soreness) return soreness;
  }
  if (raw.energyLevel !== undefined) {
    const energy = checkRange('energyLevel', raw.energyLevel, 1, 5);
    if (energy) return energy;
  }
  if (raw.stressLevel !== undefined) {
    const stress = checkRange('stressLevel', raw.stressLevel, 1, 5);
    if (stress) return stress;
  }

  return { valid: true, flags: [] };
}

function validatePhysicalCondition(
  raw: Extract<RawObservation, { type: 'PHYSICAL_CONDITION' }>,
): ValidationResult {
  const severity = checkRange('severity', raw.severity, 0, 10, true);
  if (severity) return severity;

  if (!raw.bodyRegion || raw.bodyRegion.trim().length === 0) {
    return missingField('bodyRegion');
  }

  return { valid: true, flags: [] };
}

function validateBodyComposition(
  raw: Extract<RawObservation, { type: 'BODY_COMPOSITION' }>,
): ValidationResult {
  const weight = checkRange('weightKg', raw.weightKg, 30, 250, true);
  if (weight) return weight;

  if (raw.fatPercent !== undefined) {
    const fat = checkRange('fatPercent', raw.fatPercent, 1, 60);
    if (fat) return fat;
  }

  if (raw.musclePercent !== undefined) {
    const muscle = checkRange('musclePercent', raw.musclePercent, 1, 70);
    if (muscle) return muscle;
  }

  if (raw.waterPercent !== undefined) {
    const water = checkRange('waterPercent', raw.waterPercent, 20, 80);
    if (water) return water;
  }

  return { valid: true, flags: [] };
}

function validateGarminReadiness(
  raw: Extract<RawObservation, { type: 'GARMIN_READINESS' }>,
): ValidationResult {
  const score = checkRange('score', raw.score, 0, 100, true);
  if (score) return score;

  // Invariant: always PROPRIETARY_MODEL_OUTPUT
  return { valid: true, flags: ['PROPRIETARY_MODEL_OUTPUT'] };
}

function validateGarminBattery(
  raw: Extract<RawObservation, { type: 'GARMIN_BATTERY' }>,
): ValidationResult {
  const peak = checkRange('peakValue', raw.peakValue, 0, 100, true);
  if (peak) return peak;

  if (raw.troughValue !== undefined) {
    const trough = checkRange('troughValue', raw.troughValue, 0, 100);
    if (trough) return trough;
  }

  // Invariant: always PROPRIETARY_MODEL_OUTPUT
  return { valid: true, flags: ['PROPRIETARY_MODEL_OUTPUT'] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dispatch
// ─────────────────────────────────────────────────────────────────────────────

export function validate(raw: RawObservation): ValidationResult {
  switch (raw.type) {
    case 'SESSION':
      return validateSession(raw);
    case 'SLEEP':
      return validateSleep(raw);
    case 'HRV':
      return validateHrv(raw);
    case 'RESTING_HR':
      return validateRestingHr(raw);
    case 'SUBJECTIVE':
      return validateSubjective(raw);
    case 'PHYSICAL_CONDITION':
      return validatePhysicalCondition(raw);
    case 'BODY_COMPOSITION':
      return validateBodyComposition(raw);
    case 'GARMIN_READINESS':
      return validateGarminReadiness(raw);
    case 'GARMIN_BATTERY':
      return validateGarminBattery(raw);
  }
}
