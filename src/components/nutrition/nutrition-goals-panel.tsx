'use client';

import type {
  NutritionFuelDensity,
  NutritionGoalsProgress,
} from '@/core/presentation/nutrition-view-model';
import { MacroProgressBar } from '@/components/nutrition/nutrition-macro-progress-bar';
import { CALORIE_RING } from '@/lib/nutrition/macro-colors';
import { formatFuelDensityReference } from '@/lib/nutrition/fuel-density-display';
import { cn } from '@/lib/utils';

function CalorieRing({
  consumed,
  budget,
  remaining,
  size = 132,
}: {
  consumed: number;
  budget: number;
  remaining: number | null;
  size?: number;
}) {
  const pct = budget > 0 ? Math.min(1, consumed / budget) : 0;
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg className="-rotate-90" height={size} width={size} aria-hidden>
        <circle
          className="stroke-primary/20"
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={r}
          strokeWidth={8}
        />
        <circle
          className={CALORIE_RING.ring}
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={r}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          strokeWidth={8}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
        <p className={cn('text-data text-2xl font-semibold tabular-nums', CALORIE_RING.text)}>
          {remaining != null ? Math.abs(Math.round(remaining)).toLocaleString('fr-FR') : '—'}
        </p>
        <p className="text-muted-foreground text-[11px] leading-tight">
          {remaining != null && remaining < 0 ? 'kcal au-dessus' : 'kcal restantes'}
        </p>
      </div>
    </div>
  );
}

export function NutritionGoalsPanel({
  progress,
  fuelDensity = null,
  loading = false,
}: {
  progress: NutritionGoalsProgress | null;
  fuelDensity?: NutritionFuelDensity | null;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <section className="analysis-panel rounded-analysis-lg space-y-4 p-4 sm:p-5">
        <div className="bg-muted h-4 w-40 animate-pulse rounded-full" />
        <div className="bg-muted mx-auto size-32 animate-pulse rounded-full" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-muted h-10 animate-pulse rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (!progress) return null;

  const { calories, protein, carbohydrates, fat, exerciseCalories, calorieBudget } = progress;

  return (
    <section className="analysis-panel rounded-analysis-lg space-y-5 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-section-title">Objectifs MyFitnessPal</p>
        </div>
        <div className="text-right">
          <p className="text-data text-sm font-semibold tabular-nums">
            {calories.consumed.toLocaleString('fr-FR')} / {calorieBudget.toLocaleString('fr-FR')}{' '}
            kcal
          </p>
          {exerciseCalories > 0 ? (
            <p className="text-muted-foreground text-xs">+{exerciseCalories} kcal exercice</p>
          ) : null}
        </div>
      </div>

      <CalorieRing
        budget={calorieBudget}
        consumed={calories.consumed}
        remaining={calories.remaining}
      />

      <div className="space-y-4 border-t pt-4">
        <MacroProgressBar
          consumed={protein.consumed}
          densityGPerKg={fuelDensity?.proteinGPerKg}
          goal={protein.goal}
          kind="protein"
          pct={protein.pct}
          remaining={protein.remaining}
          unit="g"
        />
        <MacroProgressBar
          consumed={carbohydrates.consumed}
          densityGPerKg={fuelDensity?.carbohydratesGPerKg}
          goal={carbohydrates.goal}
          kind="carbs"
          pct={carbohydrates.pct}
          remaining={carbohydrates.remaining}
          unit="g"
        />
        <MacroProgressBar
          consumed={fat.consumed}
          goal={fat.goal}
          kind="fat"
          pct={fat.pct}
          remaining={fat.remaining}
          unit="g"
        />
      </div>

      {fuelDensity ? (
        <p className="text-muted-foreground/80 border-t pt-3 text-[11px] leading-snug">
          {formatFuelDensityReference(fuelDensity.referenceWeightKg)}
        </p>
      ) : null}
    </section>
  );
}
