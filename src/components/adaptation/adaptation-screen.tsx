'use client';

import { format } from 'date-fns';
import { TrendingUp } from 'lucide-react';
import { MobileDrillDownHeader } from '@/components/layout/header/mobile-drill-down-header';
import { AdaptationPageView } from '@/components/adaptation/adaptation-page-view';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { useTodaySelectedDate } from '@/hooks/use-today-selected-date';
import {
  isPresentationValuesLoading,
  useAdaptationViewModel,
} from '@/hooks/use-presentation-view-model';
import { adaptationLoadingShell } from '@/lib/presentation/drill-down-loading-shells';
import { TWIN_ADAPTATION_READING } from '@/lib/plan/hub/plan-coach-offer';

function adaptationEmptyDescription(viewModel: ReturnType<typeof useAdaptationViewModel>['data']) {
  return (
    viewModel?.emptyState?.description ??
    'Les dimensions d’adaptation ne sont pas encore assez complètes pour un indice fiable.'
  );
}

function AdaptationReadingBlurb() {
  return (
    <p className="text-muted-foreground text-sm leading-snug text-pretty">
      {TWIN_ADAPTATION_READING.blurb}
    </p>
  );
}

function AdaptationEmptyView({
  viewModel,
}: {
  viewModel: ReturnType<typeof useAdaptationViewModel>['data'];
}) {
  return (
    <div className="space-y-4">
      <MobileDrillDownHeader title={TWIN_ADAPTATION_READING.title} />
      <AdaptationReadingBlurb />
      <InkEmptyState
        description={adaptationEmptyDescription(viewModel)}
        icon={TrendingUp}
        title={viewModel?.emptyState?.title ?? 'Adaptation en cours de consolidation'}
      />
    </div>
  );
}

export function AdaptationScreen() {
  const { date, isToday, maxDate, minDate, setDate, goToNextDay, goToPreviousDay } =
    useTodaySelectedDate();
  const trainingDayId = format(date, 'yyyy-MM-dd');

  const query = useAdaptationViewModel(trainingDayId);
  const valuesLoading = isPresentationValuesLoading(query);
  const viewModel = query.data ?? null;

  if (!valuesLoading && (!viewModel || viewModel.emptyState)) {
    return <AdaptationEmptyView viewModel={viewModel ?? undefined} />;
  }

  const content = viewModel ?? adaptationLoadingShell();

  return (
    <div className="space-y-4">
      <MobileDrillDownHeader title={TWIN_ADAPTATION_READING.title} />
      <AdaptationReadingBlurb />
      <AdaptationPageView
        date={date}
        isToday={isToday}
        loading={valuesLoading}
        maxDate={maxDate}
        minDate={minDate}
        onDateChange={setDate}
        onNextDay={goToNextDay}
        onPreviousDay={goToPreviousDay}
        {...content}
      />
    </div>
  );
}
