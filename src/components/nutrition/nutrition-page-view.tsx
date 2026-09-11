'use client';

import { NutritionGoalsPanel } from '@/components/nutrition/nutrition-goals-panel';
import { NutritionHero } from '@/components/nutrition/blocks/nutrition-hero';
import { NutritionMealsSection } from '@/components/nutrition/blocks/nutrition-meals-section';
import { NutritionMacroBreakdownSection } from '@/components/nutrition/blocks/nutrition-macro-breakdown-section';
import { MetricDrillDownPage } from '@/components/today/drill-down/metric-drill-down-page';
import type { NutritionViewModel } from '@/core/presentation/nutrition-view-model';

function pickSelectedDayFields(selectedDay: NutritionViewModel['selectedDay']) {
  if (!selectedDay) {
    return {
      fuelDensity: null,
      goalsProgress: null,
      meals: [],
    };
  }
  return {
    fuelDensity: selectedDay.fuelDensity ?? null,
    goalsProgress: selectedDay.goalsProgress ?? null,
    meals: selectedDay.meals ?? [],
  };
}

function NutritionPageSections({
  date,
  loading,
  selectedDay,
  history,
}: {
  date: Date;
  loading: boolean;
  selectedDay: NutritionViewModel['selectedDay'];
  history: NutritionViewModel['history'];
}) {
  const dayDefaults = pickSelectedDayFields(selectedDay);

  return (
    <>
      <NutritionGoalsPanel
        fuelDensity={dayDefaults.fuelDensity}
        loading={loading}
        progress={dayDefaults.goalsProgress}
      />
      <NutritionMealsSection loading={loading} meals={dayDefaults.meals} />
      <NutritionMacroBreakdownSection date={date} history={history} loading={loading} />
    </>
  );
}

export function NutritionPageView({
  date,
  isToday,
  maxDate,
  minDate,
  onDateChange,
  onPreviousDay,
  onNextDay,
  loading = false,
  selectedDay,
  history,
  emptyState,
}: {
  date: Date;
  isToday: boolean;
  maxDate: Date;
  minDate?: Date;
  onDateChange: (date: Date) => void;
  onPreviousDay: () => void;
  onNextDay: () => void;
  loading?: boolean;
  selectedDay: NutritionViewModel['selectedDay'];
  history: NutritionViewModel['history'];
  emptyState?: NutritionViewModel['emptyState'];
}) {
  return (
    <MetricDrillDownPage>
      <NutritionHero
        date={date}
        day={selectedDay}
        emptyHint={emptyState?.description}
        isToday={isToday}
        loading={loading}
        maxDate={maxDate}
        minDate={minDate}
        onDateChange={onDateChange}
        onNextDay={onNextDay}
        onPreviousDay={onPreviousDay}
      />
      <NutritionPageSections
        date={date}
        history={history}
        loading={loading}
        selectedDay={selectedDay}
      />
    </MetricDrillDownPage>
  );
}
