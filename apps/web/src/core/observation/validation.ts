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

type RangeCheckInput = {
  field: string;
  value: number | undefined;
  min: number;
  max: number;
  required?: true;
};

function checkRange(input: RangeCheckInput): ValidationFailure | null {
  const { field, value, min, max, required } = input;
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

function validateOptionalRanges(
  checks: Array<{ field: string; value: number | undefined; min: number; max: number }>,
): ValidationFailure | null {
  for (const check of checks) {
    if (check.value === undefined) {
      continue;
    }
    const error = checkRange(check);
    if (error) {
      return error;
    }
  }
  return null;
}

function validateSessionPower(
  raw: Extract<RawObservation, { type: 'SESSION' }>,
  flags: QualityFlag[],
): ValidationFailure | null {
  if (!raw.powerData) {
    return null;
  }

  const watts = checkRange({
    field: 'powerData.avgWatts',
    value: raw.powerData.avgWatts,
    min: 10,
    max: 3000,
    required: true,
  });
  if (watts) {
    return watts;
  }

  const np = validateOptionalRanges([
    {
      field: 'powerData.normalizedPower',
      value: raw.powerData.normalizedPower,
      min: 10,
      max: 3000,
    },
  ]);
  if (np) {
    return np;
  }

  if (raw.powerData.quality === 'MEASURED_OPTICAL') {
    flags.push('OPTICAL_SENSOR');
  }

  return null;
}

function validateSessionHr(
  raw: Extract<RawObservation, { type: 'SESSION' }>,
  flags: QualityFlag[],
): ValidationFailure | null {
  if (!raw.hrData) {
    return null;
  }

  const hr = checkRange({
    field: 'hrData.avgBpm',
    value: raw.hrData.avgBpm,
    min: 25,
    max: 250,
    required: true,
  });
  if (hr) {
    return hr;
  }

  const maxHr = validateOptionalRanges([
    { field: 'hrData.maxBpm', value: raw.hrData.maxBpm, min: 25, max: 250 },
  ]);
  if (maxHr) {
    return maxHr;
  }

  if (raw.hrData.quality === 'MEASURED_OPTICAL') {
    flags.push('OPTICAL_SENSOR');
  }

  return null;
}

function validateSessionStress(
  raw: Extract<RawObservation, { type: 'SESSION' }>,
  flags: QualityFlag[],
): ValidationFailure | null {
  if (raw.sourceProvidedStress) {
    const stress = checkRange({
      field: 'sourceProvidedStress.value',
      value: raw.sourceProvidedStress.value,
      min: 0,
      max: 700,
    });
    if (stress) {
      return stress;
    }

    flags.push(
      raw.sourceProvidedStress.quality === 'ESTIMATED'
        ? 'ESTIMATED_FROM_HR'
        : 'PROPRIETARY_MODEL_OUTPUT',
    );
    return null;
  }

  if (!raw.powerData && !raw.hrData) {
    flags.push('ESTIMATED_FROM_DURATION');
  }

  return null;
}

function validateSession(raw: Extract<RawObservation, { type: 'SESSION' }>): ValidationResult {
  const flags: QualityFlag[] = [];

  const duration = checkRange({
    field: 'durationSec',
    value: raw.durationSec,
    min: 1,
    max: 86400,
    required: true,
  });
  if (duration) {
    return duration;
  }

  for (const validator of [validateSessionPower, validateSessionHr, validateSessionStress]) {
    const error = validator(raw, flags);
    if (error) {
      return error;
    }
  }

  return { valid: true, flags };
}

function validateSleep(raw: Extract<RawObservation, { type: 'SLEEP' }>): ValidationResult {
  const flags: QualityFlag[] = [];

  const duration = checkRange({
    field: 'totalMinutes',
    value: raw.totalMinutes,
    min: 0,
    max: 960,
    required: true,
  });
  if (duration) {
    return duration;
  }

  if (!raw.wakeTimestamp) {
    return missingField('wakeTimestamp');
  }

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

  if (raw.totalMinutes > 600) {
    flags.push('UNUSUALLY_LONG_SLEEP');
  }

  // Garmin sleep data is always optical sensor + proprietary scoring
  flags.push('OPTICAL_SENSOR');

  return { valid: true, flags };
}

function validateHrv(raw: Extract<RawObservation, { type: 'HRV' }>): ValidationResult {
  const flags: QualityFlag[] = [];

  const hrv = checkRange({
    field: 'valueMsRmssd',
    value: raw.valueMsRmssd,
    min: 10,
    max: 250,
    required: true,
  });
  if (hrv) {
    return hrv;
  }

  if (raw.measurementMethod === 'OVERNIGHT_AVERAGE' || raw.measurementMethod === 'MORNING_SHORT') {
    flags.push('OPTICAL_SENSOR');
  }

  return { valid: true, flags };
}

function validateRestingHr(raw: Extract<RawObservation, { type: 'RESTING_HR' }>): ValidationResult {
  const rhr = checkRange({
    field: 'valueBpm',
    value: raw.valueBpm,
    min: 20,
    max: 120,
    required: true,
  });
  if (rhr) {
    return rhr;
  }

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

  const rangeError = validateOptionalRanges([
    { field: 'rpe', value: raw.rpe, min: 0, max: 10 },
    { field: 'mood', value: raw.mood, min: 1, max: 5 },
    { field: 'perceivedSoreness', value: raw.perceivedSoreness, min: 0, max: 10 },
    { field: 'energyLevel', value: raw.energyLevel, min: 1, max: 5 },
    { field: 'stressLevel', value: raw.stressLevel, min: 1, max: 5 },
  ]);
  if (rangeError) {
    return rangeError;
  }

  return { valid: true, flags: [] };
}

function validatePhysicalCondition(
  raw: Extract<RawObservation, { type: 'PHYSICAL_CONDITION' }>,
): ValidationResult {
  const severity = checkRange({
    field: 'severity',
    value: raw.severity,
    min: 0,
    max: 10,
    required: true,
  });
  if (severity) {
    return severity;
  }

  if (!raw.bodyRegion || raw.bodyRegion.trim().length === 0) {
    return missingField('bodyRegion');
  }

  return { valid: true, flags: [] };
}

function validateBodyComposition(
  raw: Extract<RawObservation, { type: 'BODY_COMPOSITION' }>,
): ValidationResult {
  const weight = checkRange({
    field: 'weightKg',
    value: raw.weightKg,
    min: 30,
    max: 250,
    required: true,
  });
  if (weight) {
    return weight;
  }

  if (raw.fatPercent !== undefined) {
    const fat = checkRange({ field: 'fatPercent', value: raw.fatPercent, min: 1, max: 60 });
    if (fat) {
      return fat;
    }
  }

  if (raw.musclePercent !== undefined) {
    const muscle = checkRange({
      field: 'musclePercent',
      value: raw.musclePercent,
      min: 1,
      max: 70,
    });
    if (muscle) {
      return muscle;
    }
  }

  if (raw.waterPercent !== undefined) {
    const water = checkRange({ field: 'waterPercent', value: raw.waterPercent, min: 20, max: 80 });
    if (water) {
      return water;
    }
  }

  return { valid: true, flags: [] };
}

function validateGarminReadiness(
  raw: Extract<RawObservation, { type: 'GARMIN_READINESS' }>,
): ValidationResult {
  const score = checkRange({ field: 'score', value: raw.score, min: 0, max: 100, required: true });
  if (score) {
    return score;
  }

  // Invariant: always PROPRIETARY_MODEL_OUTPUT
  return { valid: true, flags: ['PROPRIETARY_MODEL_OUTPUT'] };
}

function validateGarminBattery(
  raw: Extract<RawObservation, { type: 'GARMIN_BATTERY' }>,
): ValidationResult {
  const peak = checkRange({
    field: 'peakValue',
    value: raw.peakValue,
    min: 0,
    max: 100,
    required: true,
  });
  if (peak) {
    return peak;
  }

  if (raw.troughValue !== undefined) {
    const trough = checkRange({ field: 'troughValue', value: raw.troughValue, min: 0, max: 100 });
    if (trough) {
      return trough;
    }
  }

  // Invariant: always PROPRIETARY_MODEL_OUTPUT
  return { valid: true, flags: ['PROPRIETARY_MODEL_OUTPUT'] };
}

function validateRequiredNutritionMacros(
  raw: Extract<RawObservation, { type: 'NUTRITION' }>,
): ValidationFailure | null {
  const requiredChecks = [
    { field: 'energyKcal', value: raw.energyKcal, min: 0, max: 12000 },
    { field: 'proteinG', value: raw.proteinG, min: 0, max: 500 },
    { field: 'carbohydratesG', value: raw.carbohydratesG, min: 0, max: 1500 },
    { field: 'fatG', value: raw.fatG, min: 0, max: 500 },
  ] as const;

  for (const check of requiredChecks) {
    const error = checkRange({ ...check, required: true });
    if (error) {
      return error;
    }
  }

  return null;
}

function validateNutrition(raw: Extract<RawObservation, { type: 'NUTRITION' }>): ValidationResult {
  const requiredError = validateRequiredNutritionMacros(raw);
  if (requiredError) {
    return requiredError;
  }

  const optionalError = validateOptionalRanges([
    { field: 'goalEnergyKcal', value: raw.goalEnergyKcal, min: 500, max: 12000 },
    { field: 'exerciseEnergyKcal', value: raw.exerciseEnergyKcal, min: 0, max: 8000 },
  ]);
  if (optionalError) {
    return optionalError;
  }

  if (raw.entryCount <= 0 && raw.energyKcal > 0) {
    return { valid: true, flags: ['UNUSUAL_VALUE'] };
  }

  return { valid: true, flags: [] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dispatch
// ─────────────────────────────────────────────────────────────────────────────

const VALIDATORS: {
  [K in RawObservation['type']]: (raw: Extract<RawObservation, { type: K }>) => ValidationResult;
} = {
  SESSION: validateSession,
  SLEEP: validateSleep,
  HRV: validateHrv,
  RESTING_HR: validateRestingHr,
  SUBJECTIVE: validateSubjective,
  PHYSICAL_CONDITION: validatePhysicalCondition,
  BODY_COMPOSITION: validateBodyComposition,
  GARMIN_READINESS: validateGarminReadiness,
  GARMIN_BATTERY: validateGarminBattery,
  NUTRITION: validateNutrition,
};

export function validate(raw: RawObservation): ValidationResult {
  return VALIDATORS[raw.type](raw as never);
}
