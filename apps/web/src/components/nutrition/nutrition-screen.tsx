'use client';

import { format } from 'date-fns';
import Link from 'next/link';
import { Apple } from 'lucide-react';
import { MobileDrillDownHeader } from '@/components/layout/header/mobile-drill-down-header';
import { NutritionPageView } from '@/components/nutrition/nutrition-page-view';
import { useTodaySelectedDate } from '@/hooks/use-today-selected-date';
import {
  isPresentationValuesLoading,
  useNutritionViewModel,
} from '@/hooks/use-presentation-view-model';

function NutritionDisconnectedView() {
  return (
    <div className="space-y-4">
      <MobileDrillDownHeader title="Nutrition" />
      <div className="analysis-panel rounded-analysis-lg flex flex-col items-center gap-3 p-8 text-center">
        <Apple className="text-muted-foreground size-8" strokeWidth={1.5} />
        <div className="space-y-1">
          <p className="text-sm font-medium">Aucun provider nutrition connecté</p>
          <p className="text-muted-foreground text-sm">
            Connecte MyFitnessPal dans les réglages pour voir tes apports caloriques et macros.
          </p>
        </div>
        <Link
          className="bg-primary text-primary-foreground mt-2 inline-flex items-center rounded-full px-4 py-2 text-sm font-medium"
          href="/settings/integrations"
        >
          Aller aux réglages
        </Link>
      </div>
    </div>
  );
}

function isNutritionDisconnected(
  valuesLoading: boolean,
  viewModel: ReturnType<typeof useNutritionViewModel>['data'] | null,
): boolean {
  return !valuesLoading && viewModel !== undefined && viewModel !== null && !viewModel.connected;
}

type NutritionViewData = NonNullable<ReturnType<typeof useNutritionViewModel>['data']>;

const EMPTY_VIEW_DEFAULTS: Pick<
  NutritionViewData,
  'coachReading' | 'diet' | 'emptyState' | 'history' | 'selectedDay'
> = {
  coachReading: null,
  diet: { ids: [], labels: [] },
  emptyState: undefined,
  history: [],
  selectedDay: null,
};

function nutritionViewDefaults(viewModel: NutritionViewData | null) {
  if (!viewModel) {
    return EMPTY_VIEW_DEFAULTS;
  }
  const { coachReading, diet, emptyState, history, selectedDay } = viewModel;
  return { coachReading, diet, emptyState, history, selectedDay };
}

export function NutritionScreen() {
  const { date, isToday, maxDate, minDate, setDate, goToNextDay, goToPreviousDay } =
    useTodaySelectedDate();
  const trainingDayId = format(date, 'yyyy-MM-dd');

  const query = useNutritionViewModel(trainingDayId);
  const valuesLoading = isPresentationValuesLoading(query);
  const viewModel = query.data ?? null;

  if (isNutritionDisconnected(valuesLoading, viewModel)) {
    return <NutritionDisconnectedView />;
  }

  const defaults = nutritionViewDefaults(viewModel);

  return (
    <div className="space-y-4">
      <MobileDrillDownHeader title="Nutrition" />
      <NutritionPageView
        coachReading={defaults.coachReading}
        date={date}
        diet={defaults.diet}
        emptyState={defaults.emptyState}
        history={defaults.history}
        isToday={isToday}
        loading={valuesLoading}
        maxDate={maxDate}
        minDate={minDate}
        selectedDay={defaults.selectedDay}
        onDateChange={setDate}
        onNextDay={goToNextDay}
        onPreviousDay={goToPreviousDay}
      />
    </div>
  );
}
