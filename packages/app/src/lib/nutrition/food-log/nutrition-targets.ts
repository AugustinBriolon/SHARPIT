/**
 * Daily targets typed in grams, or as a calorie total split in percent (ADR-061). A split is
 * stored in grams too, so every reader — page, widget, coach, analysis — keeps reading grams.
 */

export const NUTRITION_TARGET_MODES = ['GRAMS', 'PERCENT'] as const;
export type NutritionTargetMode = (typeof NUTRITION_TARGET_MODES)[number];

export type TargetMacro = 'protein' | 'carbs' | 'fat';

/** Atwater factors: what a gram of each macro is worth in kilocalories. */
export const KCAL_PER_GRAM: Record<TargetMacro, number> = { protein: 4, carbs: 4, fat: 9 };

/** The grams a share of the calorie target buys, to the gram. */
export function gramsFromPercent(kcal: number, percent: number, macro: TargetMacro): number {
  return Math.round((kcal * percent) / 100 / KCAL_PER_GRAM[macro]);
}

/** The share of the calorie target a gram target stands for, to the percent — to prefill a split. */
export function percentFromGrams(
  kcal: number | null,
  grams: number | null,
  macro: TargetMacro,
): number | null {
  if (!kcal || grams === null) {
    return null;
  }
  return Math.round(((grams * KCAL_PER_GRAM[macro]) / kcal) * 100);
}

export function percentTotal(parts: ReadonlyArray<number | null | undefined>): number {
  return parts.reduce<number>((total, part) => total + (part ?? 0), 0);
}
