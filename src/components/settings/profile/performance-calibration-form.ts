import type { ProfileData } from '@/components/settings/profile/profile-types';
import { paceToInput, parsePaceInput } from '@/components/settings/profile/profile-input-format';
import { changedProfileFields } from '@/lib/profile/profile-patch';

export function profileStringField(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

export function profilePaceField(value: number | null | undefined): string {
  return paceToInput(value ?? null);
}

type CalibrationFormValues = {
  ftpW: string;
  maxHr: string;
  lthr: string;
  thresholdPace: string;
  swimCss: string;
  poolLength: string;
};

export function calibrationValuesFromProfile(initial: ProfileData): CalibrationFormValues {
  return {
    ftpW: profileStringField(initial.ftpW),
    maxHr: profileStringField(initial.maxHr),
    lthr: profileStringField(initial.lthr),
    thresholdPace: profilePaceField(initial.runThresholdPaceSecPerKm),
    swimCss: profilePaceField(initial.swimCssSecPer100m),
    poolLength: profileStringField(initial.defaultPoolLengthM),
  };
}

function parseNumericField(value: string): number | null {
  if (!value) {
    return null;
  }
  return Number(value);
}

function emptyCalibrationBaseline() {
  return {
    ftpW: null,
    maxHr: null,
    lthr: null,
    runThresholdPaceSecPerKm: null,
    swimCssSecPer100m: null,
    defaultPoolLengthM: null,
  };
}

function calibrationBaselineFromProfile(initial: ProfileData) {
  return {
    ftpW: initial.ftpW ?? null,
    maxHr: initial.maxHr ?? null,
    lthr: initial.lthr ?? null,
    runThresholdPaceSecPerKm: initial.runThresholdPaceSecPerKm ?? null,
    swimCssSecPer100m: initial.swimCssSecPer100m ?? null,
    defaultPoolLengthM: initial.defaultPoolLengthM ?? null,
  };
}

export function buildCalibrationPatch(initial: ProfileData | null, values: CalibrationFormValues) {
  const baseline = initial ? calibrationBaselineFromProfile(initial) : emptyCalibrationBaseline();
  const next = {
    ftpW: parseNumericField(values.ftpW),
    maxHr: parseNumericField(values.maxHr),
    lthr: parseNumericField(values.lthr),
    runThresholdPaceSecPerKm: parsePaceInput(values.thresholdPace),
    swimCssSecPer100m: parsePaceInput(values.swimCss),
    defaultPoolLengthM: parseNumericField(values.poolLength),
  };
  return changedProfileFields(baseline, next);
}
