'use client';

import { format } from 'date-fns';
import { MobileDrillDownHeader } from '@/components/layout/mobile-drill-down-header';
import { EffortPageView } from '@/components/effort/effort-page-view';
import { MetricDrillDownSkeleton } from '@/components/today/drill-down/drill-down-skeleton';
import { useTodaySelectedDate } from '@/hooks/use-today-selected-date';
import { useEffortViewModel } from '@/hooks/use-presentation-view-model';

export default function TodayEffortPage() {
  const { date, isToday, maxDate, setDate, goToNextDay, goToPreviousDay } = useTodaySelectedDate();
  const trainingDayId = format(date, 'yyyy-MM-dd');

  const query = useEffortViewModel(trainingDayId);
  const viewModel = query.data ?? null;

  if (query.isPending && !viewModel) {
    return <MetricDrillDownSkeleton title="Charge d'effort" variant="effort" />;
  }

  if (!viewModel || viewModel.emptyState) {
    return (
      <div className="space-y-4">
        <MobileDrillDownHeader title="Charge d'effort" />
        <p className="text-muted-foreground text-sm leading-relaxed">
          {viewModel?.emptyState?.description ?? 'Données d’effort indisponibles.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <MobileDrillDownHeader title="Charge d'effort" />
      <EffortPageView
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
