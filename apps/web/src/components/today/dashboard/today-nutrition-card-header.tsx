'use client';

import { NutritionCalorieHero } from '@/components/today/dashboard/today-nutrition-card-parts';

export function TodayNutritionCardHeader({
  day,
  goals,
}: {
  day: { calories: number };
  goals: { calorieBudget: number; calories: { remaining: number | null } } | null;
}) {
  return (
    <NutritionCalorieHero
      calorieBudget={goals?.calorieBudget ?? null}
      calories={day.calories}
      remaining={goals?.calories.remaining ?? null}
    />
  );
}
