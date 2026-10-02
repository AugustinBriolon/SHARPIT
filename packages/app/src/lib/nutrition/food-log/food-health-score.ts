import { additiveRisk, type AdditiveInfo, type AdditiveRisk } from './additives-risk';

/**
 * Sharpit food health score (v1): nutrition · NOVA · additives → 0–100.
 * Indicator only — not a medical assessment.
 */

export const FOOD_HEALTH_SCORE_VERSION = 1;

export type NutrientLevel = 'low' | 'moderate' | 'high' | 'unknown';
export type HealthCoverage = 'full' | 'partial' | 'none';
export type HealthGrade = 'excellent' | 'good' | 'mediocre' | 'poor';
export type NutriScoreLetter = 'a' | 'b' | 'c' | 'd' | 'e';

export type NutrientFlags = {
  sugars: NutrientLevel;
  salt: NutrientLevel;
  saturatedFat: NutrientLevel;
};

export type FoodHealthAssessment = {
  score: number | null;
  scoreVersion: number;
  grade: HealthGrade | null;
  coverage: HealthCoverage;
  nutriScore: NutriScoreLetter | null;
  nova: 1 | 2 | 3 | 4 | null;
  nutrientFlags: NutrientFlags;
  additives: AdditiveInfo[];
};

export type OffHealthInput = {
  kind?: 'off';
  nutriScore: NutriScoreLetter | null;
  nova: 1 | 2 | 3 | 4 | null;
  nutrientLevels: NutrientFlags;
  additiveTags: string[] | null;
};

export type CustomHealthInput = {
  kind: 'custom';
  sugarPer100g?: number | null;
  saltPer100g?: number | null;
  saturatedFatPer100g?: number | null;
};

export type FoodHealthInput = OffHealthInput | CustomHealthInput;

/** EU reference amounts for solids (g / 100 g) used by OFF nutrient_levels. */
const THRESHOLDS = {
  sugars: { low: 5, high: 12.5 },
  salt: { low: 0.3, high: 1.5 },
  saturatedFat: { low: 1.5, high: 5 },
} as const;

const NUTRI_SCORE_POINTS: Record<NutriScoreLetter, number> = {
  a: 100,
  b: 80,
  c: 55,
  d: 30,
  e: 10,
};

const LEVEL_POINTS: Record<Exclude<NutrientLevel, 'unknown'>, number> = {
  low: 100,
  moderate: 55,
  high: 10,
};

const NOVA_POINTS: Record<1 | 2 | 3 | 4, number> = {
  1: 20,
  2: 15,
  3: 8,
  4: 0,
};

const ADDITIVE_PENALTY: Record<AdditiveRisk, number> = {
  none: 1,
  limited: 3,
  high: 8,
};

const WEIGHT = { nutrition: 0.6, nova: 20, additives: 20 } as const;

export function levelFromAmount(
  nutrient: keyof typeof THRESHOLDS,
  amount: number | null | undefined,
): NutrientLevel {
  if (amount === null || amount === undefined || !Number.isFinite(amount) || amount < 0) {
    return 'unknown';
  }
  const { low, high } = THRESHOLDS[nutrient];
  if (amount <= low) {
    return 'low';
  }
  if (amount > high) {
    return 'high';
  }
  return 'moderate';
}

function gradeOf(score: number): HealthGrade {
  if (score >= 75) {
    return 'excellent';
  }
  if (score >= 50) {
    return 'good';
  }
  if (score >= 25) {
    return 'mediocre';
  }
  return 'poor';
}

function averageLevelPoints(flags: NutrientFlags): number | null {
  const known = [flags.sugars, flags.salt, flags.saturatedFat].filter(
    (level): level is Exclude<NutrientLevel, 'unknown'> => level !== 'unknown',
  );
  if (known.length === 0) {
    return null;
  }
  return known.reduce((sum, level) => sum + LEVEL_POINTS[level], 0) / known.length;
}

function nutritionPoints(nutriScore: NutriScoreLetter | null, flags: NutrientFlags): number | null {
  if (nutriScore) {
    return NUTRI_SCORE_POINTS[nutriScore];
  }
  return averageLevelPoints(flags);
}

function additivePoints(tags: string[] | null): { points: number; additives: AdditiveInfo[] } {
  if (tags === null) {
    return { points: 10, additives: [] };
  }
  const additives = tags.map(additiveRisk);
  let points = WEIGHT.additives;
  for (const item of additives) {
    points -= ADDITIVE_PENALTY[item.risk];
  }
  return { points: Math.max(0, points), additives };
}

function emptyFlags(): NutrientFlags {
  return { sugars: 'unknown', salt: 'unknown', saturatedFat: 'unknown' };
}

function assess(
  coverage: HealthCoverage,
  score: number | null,
  nutriScore: NutriScoreLetter | null,
  nova: 1 | 2 | 3 | 4 | null,
  nutrientFlags: NutrientFlags,
  additives: AdditiveInfo[],
): FoodHealthAssessment {
  return {
    score,
    scoreVersion: FOOD_HEALTH_SCORE_VERSION,
    grade: score === null ? null : gradeOf(score),
    coverage,
    nutriScore,
    nova,
    nutrientFlags,
    additives,
  };
}

/** Full OFF product, or a custom food with at most sugar / salt / saturated fat. */
export function computeFoodHealth(input: FoodHealthInput): FoodHealthAssessment {
  if (input.kind === 'custom') {
    const nutrientFlags: NutrientFlags = {
      sugars: levelFromAmount('sugars', input.sugarPer100g),
      salt: levelFromAmount('salt', input.saltPer100g),
      saturatedFat: levelFromAmount('saturatedFat', input.saturatedFatPer100g),
    };
    const points = averageLevelPoints(nutrientFlags);
    if (points === null) {
      return assess('none', null, null, null, nutrientFlags, []);
    }
    return assess('partial', Math.round(points), null, null, nutrientFlags, []);
  }

  const nutrientFlags = input.nutrientLevels ?? emptyFlags();
  const nutrition = nutritionPoints(input.nutriScore, nutrientFlags);
  if (nutrition === null) {
    return assess('none', null, input.nutriScore, input.nova, nutrientFlags, []);
  }

  const novaPoints = input.nova ? NOVA_POINTS[input.nova] : 10;
  const { points: additivesScore, additives } = additivePoints(input.additiveTags);
  const score = Math.round(
    nutrition * WEIGHT.nutrition + novaPoints + additivesScore,
  );
  return assess(
    'full',
    Math.min(100, Math.max(0, score)),
    input.nutriScore,
    input.nova,
    nutrientFlags,
    additives,
  );
}
