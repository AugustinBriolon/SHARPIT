'use client';

import { format } from 'date-fns';
import { MobileDrillDownHeader } from '@/components/layout/mobile-drill-down-header';
import { AdaptationPageView } from '@/components/adaptation/adaptation-page-view';
import { useTodaySelectedDate } from '@/hooks/use-today-selected-date';
import { useAdaptationViewModel } from '@/hooks/use-presentation-view-model';

export default function BiologyAdaptationPage() {
  const { date, isToday, maxDate, setDate, goToNextDay, goToPreviousDay } = useTodaySelectedDate();
  const trainingDayId = format(date, 'yyyy-MM-dd');

  const query = useAdaptationViewModel(trainingDayId);
  const viewModel = query.data ?? null;

  if (query.isPending && !viewModel) {
    return (
      <div>
        <MobileDrillDownHeader title="Adaptation" />
        <div className="animate-pulse space-y-4 p-4">
          <div className="bg-muted mx-auto h-48 rounded-3xl" />
          <div className="bg-muted mx-auto h-32 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!viewModel || viewModel.emptyState) {
    return (
      <div className="space-y-4">
        <MobileDrillDownHeader title="Adaptation" />
        <p className="text-muted-foreground text-sm leading-relaxed">
          {viewModel?.emptyState?.description ??
            'SHARPIT construit encore ton historique d’adaptation. Quelques semaines suffisent pour une première lecture fiable.'}
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
