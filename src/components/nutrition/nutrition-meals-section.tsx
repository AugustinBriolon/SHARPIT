'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { MotionExpand } from '@/components/motion';
import { ColoredMacroPills } from '@/components/nutrition/nutrition-macro-display';
import type { NutritionMealSummary } from '@/core/presentation/nutrition-view-model';
import { cn } from '@/lib/utils';

function MealCard({ meal }: { meal: NutritionMealSummary }) {
  const [open, setOpen] = useState(false);
  const hasEntries = meal.entries.length > 0;

  return (
    <div className="border-analysis-border/20 rounded-xl border">
      <button
        aria-expanded={open}
        disabled={!hasEntries}
        type="button"
        className={cn(
          'flex w-full items-start justify-between gap-3 px-3 py-3 text-left sm:px-4',
          hasEntries && 'hover:bg-muted/40 transition-colors',
        )}
        onClick={() => hasEntries && setOpen((current) => !current)}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium">{meal.label}</p>
          <ColoredMacroPills carbs={meal.carbs} fat={meal.fat} protein={meal.protein} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-data text-sm font-semibold tabular-nums">{meal.calories} kcal</span>
          {hasEntries ? (
            <ChevronDown
              className={cn(
                'text-muted-foreground size-4 transition-transform duration-200',
                open && 'rotate-180',
              )}
              aria-hidden
            />
          ) : null}
        </div>
      </button>

      {hasEntries ? (
        <MotionExpand open={open}>
          <ul className="border-analysis-border/15 space-y-2 border-t px-3 py-3 sm:px-4">
            {meal.entries.map((entry, index) => (
              <li
                key={`${entry.name}-${index}`}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <span className="text-foreground/85 min-w-0 flex-1 leading-snug">{entry.name}</span>
                <div className="shrink-0 text-right">
                  <p className="text-data font-medium tabular-nums">{entry.calories} kcal</p>
                  <ColoredMacroPills
                    carbs={entry.carbs}
                    className="mt-0.5 justify-end"
                    fat={entry.fat}
                    protein={entry.protein}
                  />
                </div>
              </li>
            ))}
          </ul>
        </MotionExpand>
      ) : null}
    </div>
  );
}

export function NutritionMealsSection({
  meals,
  loading = false,
}: {
  meals: NutritionMealSummary[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <section className="analysis-panel rounded-analysis-lg space-y-3 p-4">
        <div className="bg-muted h-4 w-24 animate-pulse rounded-full" />
        <div className="bg-muted h-20 animate-pulse rounded-xl" />
        <div className="bg-muted h-20 animate-pulse rounded-xl" />
      </section>
    );
  }

  if (meals.length === 0) {
    return (
      <section className="analysis-panel rounded-analysis-lg p-4">
        <p className="text-section-title">Repas</p>
        <p className="text-muted-foreground mt-2 text-sm">
          Aucun repas enregistré pour cette journée.
        </p>
      </section>
    );
  }

  return (
    <section className="analysis-panel rounded-analysis-lg space-y-3 p-4 sm:p-5">
      <p className="text-section-title">Repas</p>
      <div className="space-y-2">
        {meals.map((meal) => (
          <MealCard key={meal.name} meal={meal} />
        ))}
      </div>
    </section>
  );
}
