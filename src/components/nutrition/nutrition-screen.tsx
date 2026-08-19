'use client';

import { format } from 'date-fns';
import Link from 'next/link';
import { Apple } from 'lucide-react';
import { MobileDrillDownHeader } from '@/components/layout/mobile-drill-down-header';
import { NutritionPageView } from '@/components/nutrition/nutrition-page-view';
import { useTodaySelectedDate } from '@/hooks/use-today-selected-date';
import {
  isPresentationValuesLoading,
  useNutritionViewModel,
} from '@/hooks/use-presentation-view-model';

export function NutritionScreen() {
  const { date, isToday, maxDate, setDate, goToNextDay, goToPreviousDay } = useTodaySelectedDate();
  const trainingDayId = format(date, 'yyyy-MM-dd');

  const query = useNutritionViewModel(trainingDayId);
  const valuesLoading = isPresentationValuesLoading(query);
  const viewModel = query.data ?? null;

  if (!valuesLoading && viewModel && !viewModel.connected) {
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

  return (
    <div className="space-y-4">
      <MobileDrillDownHeader title="Nutrition" />
      <NutritionPageView
        averages={viewModel?.averages ?? null}
        date={date}
        emptyState={viewModel?.emptyState}
        history={viewModel?.history ?? []}
        isToday={isToday}
        loading={valuesLoading}
        maxDate={maxDate}
        selectedDay={viewModel?.selectedDay ?? null}
        onDateChange={setDate}
        onNextDay={goToNextDay}
        onPreviousDay={goToPreviousDay}
      />
    </div>
  );
}
