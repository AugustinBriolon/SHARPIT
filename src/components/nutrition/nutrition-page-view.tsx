'use client';

import { NutritionGoalsPanel } from '@/components/nutrition/nutrition-goals-panel';
import { NutritionHero } from '@/components/nutrition/nutrition-hero';
import { NutritionMealsSection } from '@/components/nutrition/nutrition-meals-section';
import { NutritionTrendSection } from '@/components/nutrition/nutrition-trend-section';
import { MetricDrillDownPage } from '@/components/today/drill-down/metric-drill-down-page';
import type { NutritionViewModel } from '@/core/presentation/nutrition-view-model';

export function NutritionPageView({
  date,
  isToday,
  maxDate,
  onDateChange,
  onPreviousDay,
  onNextDay,
  loading = false,
  selectedDay,
  history,
  averages,
  emptyState,
}: {
  date: Date;
  isToday: boolean;
  maxDate: Date;
  onDateChange: (date: Date) => void;
  onPreviousDay: () => void;
  onNextDay: () => void;
  loading?: boolean;
  selectedDay: NutritionViewModel['selectedDay'];
  history: NutritionViewModel['history'];
  averages: NutritionViewModel['averages'];
  emptyState?: NutritionViewModel['emptyState'];
}) {
  const selectedDate = selectedDay?.date ?? '';

  return (
    <MetricDrillDownPage>
      <NutritionHero
        date={date}
        day={selectedDay}
        emptyHint={emptyState?.description}
        isToday={isToday}
        loading={loading}
        maxDate={maxDate}
        onDateChange={onDateChange}
        onNextDay={onNextDay}
        onPreviousDay={onPreviousDay}
      />
      <NutritionGoalsPanel
        fuelDensity={selectedDay?.fuelDensity ?? null}
        loading={loading}
        progress={selectedDay?.goalsProgress ?? null}
      />
      <NutritionMealsSection loading={loading} meals={selectedDay?.meals ?? []} />
      <NutritionTrendSection
        averages={averages}
        history={history}
        loading={loading}
        selectedDate={selectedDate}
        onDateSelect={onDateChange}
      />
    </MetricDrillDownPage>
  );
}
