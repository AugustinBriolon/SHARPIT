'use client';

import { format } from 'date-fns';
import { MobileDrillDownHeader } from '@/components/layout/header/mobile-drill-down-header';
import { NutritionPageView } from '@/components/nutrition/nutrition-page-view';
import { useTodaySelectedDate } from '@/hooks/use-today-selected-date';
import {
  isPresentationValuesLoading,
  useNutritionViewModel,
} from '@/hooks/use-presentation-view-model';

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
        mfpConnected={viewModel?.mfpConnected ?? false}
        minDate={minDate}
        selectedDay={defaults.selectedDay}
        trainingDayId={trainingDayId}
        onDateChange={setDate}
        onNextDay={goToNextDay}
        onPreviousDay={goToPreviousDay}
      />
    </div>
  );
}
