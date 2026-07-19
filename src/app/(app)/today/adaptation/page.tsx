'use client';

import { format } from 'date-fns';
import { MobileDrillDownHeader } from '@/components/layout/mobile-drill-down-header';
import { AdaptationPageView } from '@/components/adaptation/adaptation-page-view';
import { MetricDrillDownSkeleton } from '@/components/today/drill-down/drill-down-skeleton';
import { useTodaySelectedDate } from '@/hooks/use-today-selected-date';
import { useAdaptationViewModel } from '@/hooks/use-presentation-view-model';

export default function TodayAdaptationPage() {
  const { date, isToday, maxDate, setDate, goToNextDay, goToPreviousDay } = useTodaySelectedDate();
  const trainingDayId = format(date, 'yyyy-MM-dd');

  const query = useAdaptationViewModel(trainingDayId);
  const viewModel = query.data ?? null;

  if (query.isPending && !viewModel) {
    return <MetricDrillDownSkeleton variant="adaptation" />;
  }

  if (!viewModel || viewModel.emptyState) {
    return (
      <div className="space-y-4">
        <MobileDrillDownHeader title="Adaptation" />
        <p className="text-muted-foreground text-sm leading-relaxed">
          {viewModel?.emptyState?.description ??
            'Les dimensions d’adaptation ne sont pas encore assez complètes pour un indice fiable.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <MobileDrillDownHeader title="Adaptation" />
      <AdaptationPageView
        date={date}
        isToday={isToday}
        maxDate={maxDate}
        onDateChange={setDate}
        onNextDay={goToNextDay}
        onPreviousDay={goToPreviousDay}
        {...viewModel}
      />
    </div>
  );
}
