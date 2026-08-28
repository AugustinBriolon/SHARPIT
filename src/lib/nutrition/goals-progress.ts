import type { NutritionGoalsProgress } from '@/core/presentation/nutrition-view-model';

export function buildGoalsProgress(input: {
  consumedCalories: number;
  consumedProtein: number;
  consumedCarbohydrates: number;
  consumedFat: number;
  goalCalories: number | null;
  goalProtein: number | null;
  goalCarbohydrates: number | null;
  goalFat: number | null;
  exerciseCalories?: number | null;
}): NutritionGoalsProgress | null {
  if (input.goalCalories === null) {
    return null;
  }

  const exercise = Math.max(0, Math.round(input.exerciseCalories ?? 0));
  const calorieBudget = input.goalCalories + exercise;

  return {
    calories: progressLine(input.consumedCalories, calorieBudget, 'kcal'),
    protein: progressLine(input.consumedProtein, input.goalProtein, 'g'),
    carbohydrates: progressLine(input.consumedCarbohydrates, input.goalCarbohydrates, 'g'),
    fat: progressLine(input.consumedFat, input.goalFat, 'g'),
    exerciseCalories: exercise,
    calorieBudget,
  };
}

function progressLine(
  consumed: number,
  goal: number | null,
  unit: 'kcal' | 'g',
): NutritionGoalsProgress['calories'] {
  const normalizedConsumed = Math.max(0, Math.round(consumed));
  const normalizedGoal = goal !== null && goal > 0 ? Math.round(goal) : null;

  if (normalizedGoal === null) {
    return {
      consumed: normalizedConsumed,
      goal: null,
      remaining: null,
      pct: null,
      unit,
    };
  }

  const remaining = normalizedGoal - normalizedConsumed;
  const pct = Math.min(100, Math.round((normalizedConsumed / normalizedGoal) * 100));

  return {
    consumed: normalizedConsumed,
    goal: normalizedGoal,
    remaining,
    pct,
    unit,
  };
}

export function formatRemainingCalories(remaining: number | null): string {
  if (remaining === null) {
    return '—';
  }
  if (remaining > 0) {
    return `${remaining.toLocaleString('fr-FR')} kcal restantes`;
  }
  if (remaining === 0) {
    return 'Objectif atteint';
  }
  return `${Math.abs(remaining).toLocaleString('fr-FR')} kcal au-dessus`;
}

export function formatRemainingMacro(remaining: number | null, unit: 'g'): string {
  if (remaining === null) {
    return '—';
  }
  if (remaining > 0) {
    return `${remaining} ${unit} restants`;
  }
  if (remaining === 0) {
    return 'Objectif atteint';
  }
  return `${Math.abs(remaining)} ${unit} au-dessus`;
}
