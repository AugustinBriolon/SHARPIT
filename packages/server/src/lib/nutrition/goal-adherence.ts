/**
 * Whether a logged day kept its calorie goal. The budget is the day's goal plus the exercise
 * calories the food log adds to it, as MyFitnessPal counts it; within ±10 % is on target.
 */
export type CalorieAdherence = 'on_target' | 'under' | 'over' | 'none';

export const CALORIE_TARGET_BAND = { low: 0.9, high: 1.1 } as const;

export function calorieAdherence(
  calories: number | null,
  goalCalories: number | null,
  exerciseCalories: number | null = null,
): CalorieAdherence {
  if (!calories || calories <= 0) {
    return 'none';
  }
  if (!goalCalories || goalCalories <= 0) {
    return 'on_target';
  }
  const ratio = calories / (goalCalories + (exerciseCalories ?? 0));
  if (ratio < CALORIE_TARGET_BAND.low) {
    return 'under';
  }
  return ratio > CALORIE_TARGET_BAND.high ? 'over' : 'on_target';
}
