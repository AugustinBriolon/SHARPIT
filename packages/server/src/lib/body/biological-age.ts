/**
 * Biological age v1 (ADR-045): a training estimate from VO₂max, never a diagnosis. The
 * fitness age is the age at which the healthy-population mean VO₂max equals the athlete's.
 * Pure — no clock, no database.
 */

export const BIOLOGICAL_AGE_METHOD = 'fitness-age-hunt3-loe-2013-v1';

export type ReferenceSex = 'female' | 'male';

/**
 * Mean VO₂max (mL·kg⁻¹·min⁻¹) by decade, placed at the decade midpoint — HUNT3 Fitness Study,
 * Loe et al., PLoS ONE 2013;8(5):e64319. The 70+ group is placed at 75.
 */
type ReferencePoint = readonly [age: number, vo2: number];

const HUNT3_MEAN_VO2MAX: Record<ReferenceSex, readonly ReferencePoint[]> = {
  female: [
    [25, 43],
    [35, 40],
    [45, 38],
    [55, 34],
    [65, 31],
    [75, 27],
  ],
  male: [
    [25, 54],
    [35, 49],
    [45, 47],
    [55, 42],
    [65, 39],
    [75, 34],
  ],
};

const MIN_AGE = 20;
const MAX_AGE = 80;
const DAY_MS = 24 * 60 * 60 * 1000;

/** How much a VO₂max reading is trusted by its age in days; too old gives no estimate. */
const CONFIDENCE_BY_READING_AGE = [
  { maxDays: 30, confidence: 0.9 },
  { maxDays: 90, confidence: 0.6 },
] as const;

function interpolateAge(vo2max: number, a: ReferencePoint, b: ReferencePoint): number {
  const [ageA, vo2A] = a;
  const [ageB, vo2B] = b;
  return ageA + ((vo2max - vo2A) * (ageB - ageA)) / (vo2B - vo2A);
}

/**
 * Age whose reference mean equals `vo2max`: linear between midpoints, extended along the end
 * segments, clamped to 20–80. Rounded to whole years — the method cannot say more.
 */
export function fitnessAge(vo2max: number, sex: ReferenceSex): number {
  const table = HUNT3_MEAN_VO2MAX[sex];
  // Means fall with age: the segment ends at the first midpoint at or below the reading.
  const firstAtOrBelow = table.findIndex(([, vo2]) => vo2 <= vo2max);
  const end =
    firstAtOrBelow === -1
      ? table.length - 1
      : Math.min(Math.max(firstAtOrBelow, 1), table.length - 1);
  const age = interpolateAge(vo2max, table[end - 1], table[end]);
  return Math.round(Math.min(MAX_AGE, Math.max(MIN_AGE, age)));
}

export function ageInYears(birthDate: Date, now: Date): number {
  let years = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < birthDate.getUTCMonth() ||
    (now.getUTCMonth() === birthDate.getUTCMonth() && now.getUTCDate() < birthDate.getUTCDate());
  if (beforeBirthday) {
    years -= 1;
  }
  return years;
}

export type BiologicalAgeInputs = {
  birthDate: Date | null;
  sex: string | null;
  vo2maxRunning: number | null;
  vo2maxCycling: number | null;
  /** When the VO₂max values were last read (Garmin import, else profile edit). */
  vo2maxMeasuredAt: Date | null;
};

export type BiologicalAge = {
  years: number;
  chronologicalYears: number;
  method: typeof BIOLOGICAL_AGE_METHOD;
  confidence: number;
  inputs: Array<'vo2maxRun' | 'vo2maxBike' | 'sex' | 'birthDate'>;
  computedAt: string;
};

function readingConfidence(measuredAt: Date, now: Date): number | null {
  const days = (now.getTime() - measuredAt.getTime()) / DAY_MS;
  return CONFIDENCE_BY_READING_AGE.find((band) => days <= band.maxDays)?.confidence ?? null;
}

function isReferenceSex(sex: string | null): sex is ReferenceSex {
  return sex === 'female' || sex === 'male';
}

/** Null without birth date, a reference sex, a VO₂max, or with a VO₂max older than 90 days. */
export function estimateBiologicalAge(
  inputs: BiologicalAgeInputs,
  now: Date,
): BiologicalAge | null {
  const vo2max = inputs.vo2maxRunning ?? inputs.vo2maxCycling;
  if (!inputs.birthDate || !isReferenceSex(inputs.sex) || !vo2max || !inputs.vo2maxMeasuredAt) {
    return null;
  }
  const confidence = readingConfidence(inputs.vo2maxMeasuredAt, now);
  if (confidence === null) {
    return null;
  }
  return {
    years: fitnessAge(vo2max, inputs.sex),
    chronologicalYears: ageInYears(inputs.birthDate, now),
    method: BIOLOGICAL_AGE_METHOD,
    confidence,
    inputs: [inputs.vo2maxRunning ? 'vo2maxRun' : 'vo2maxBike', 'sex', 'birthDate'],
    computedAt: now.toISOString(),
  };
}
