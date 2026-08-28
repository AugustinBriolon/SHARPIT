import type { ReactNode } from 'react';
import {
  CalorieTrack,
  MacroStackShare,
} from '@/components/today/dashboard/today-nutrition-card-parts';

type DayTotals = {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  goalsProgress: {
    calories: { pct: number | null; remaining: number | null };
  } | null;
};

export function resolveIntakeTrack(day: DayTotals | null): ReactNode {
  if (!day) {
    return null;
  }
  const goals = day.goalsProgress;
  const hasMacroIntake = day.protein + day.carbohydrates + day.fat > 0;

  if (goals?.calories.pct !== null) {
    return <CalorieTrack pct={goals.calories.pct} remaining={goals.calories.remaining} />;
  }
  if (!goals && hasMacroIntake) {
    return <MacroStackShare carbs={day.carbohydrates} fat={day.fat} protein={day.protein} />;
  }
  if (!goals) {
    return <CalorieTrack pct={0} remaining={null} />;
  }
  return null;
}

export function resolveNutritionLinkTitle({
  disconnected,
  isError,
}: {
  disconnected: boolean;
  isError: boolean;
}) {
  if (isError) {
    return 'Ouvrir le journal alimentaire';
  }
  if (disconnected) {
    return 'Connecter le journal alimentaire';
  }
  return 'Voir le journal alimentaire';
}

export function budgetCaptionClass(remaining: number | null): string {
  if (remaining !== null && remaining < 0) {
    return 'text-foreground';
  }
  return 'text-muted-foreground';
}
