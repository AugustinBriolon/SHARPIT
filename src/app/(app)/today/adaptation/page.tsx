'use client';

import { format } from 'date-fns';
import { TrendingUp } from 'lucide-react';
import { MobileDrillDownHeader } from '@/components/layout/mobile-drill-down-header';
import { AdaptationPageView } from '@/components/adaptation/adaptation-page-view';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { useTodaySelectedDate } from '@/hooks/use-today-selected-date';
import {
  isPresentationValuesLoading,
  useAdaptationViewModel,
} from '@/hooks/use-presentation-view-model';
import { adaptationLoadingShell } from '@/lib/presentation/drill-down-loading-shells';

export default function TodayAdaptationPage() {
  const { date, isToday, maxDate, setDate, goToNextDay, goToPreviousDay } = useTodaySelectedDate();
  const trainingDayId = format(date, 'yyyy-MM-dd');

  const query = useAdaptationViewModel(trainingDayId);
  const valuesLoading = isPresentationValuesLoading(query);
  const viewModel = query.data ?? null;

  if (!valuesLoading && (!viewModel || viewModel.emptyState)) {
    return (
      <div className="space-y-4">
        <MobileDrillDownHeader title="Adaptation" />
        <InkEmptyState
          icon={TrendingUp}
          title={viewModel?.emptyState?.title ?? 'Adaptation en cours de consolidation'}
          description={
            viewModel?.emptyState?.description ??
            'Les dimensions d’adaptation ne sont pas encore assez complètes pour un indice fiable.'
          }
        />
      </div>
    );
  }

  const content = viewModel ?? adaptationLoadingShell();

  return (
    <div className="space-y-4">
      <MobileDrillDownHeader title="Adaptation" />
      <AdaptationPageView
        date={date}
        isToday={isToday}
        loading={valuesLoading}
        maxDate={maxDate}
        onDateChange={setDate}
        onNextDay={goToNextDay}
        onPreviousDay={goToPreviousDay}
        {...content}
      />
    </div>
  );
}
