'use client';

import { format } from 'date-fns';
import { MobileDrillDownHeader } from '@/components/layout/mobile-drill-down-header';
import { SleepPageView } from '@/components/sleep/sleep-page-view';
import { useTodaySelectedDate } from '@/hooks/use-today-selected-date';
import { useSleepViewModel } from '@/hooks/use-presentation-view-model';

export default function TodaySleepPage() {
  const { date, isToday, maxDate, setDate, goToNextDay, goToPreviousDay } = useTodaySelectedDate();
  const trainingDayId = format(date, 'yyyy-MM-dd');

  const query = useSleepViewModel(trainingDayId);
  const viewModel = query.data ?? null;

  if (query.isPending && !viewModel) {
    return (
      <div>
        <MobileDrillDownHeader title="Sommeil" />
        <div className="animate-pulse space-y-4 p-4">
          <div className="bg-muted mx-auto h-48 rounded-3xl" />
          <div className="bg-muted mx-auto h-16 rounded-3xl" />
          <div className="bg-muted mx-auto h-40 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!viewModel || viewModel.emptyState) {
    return (
      <div className="space-y-4">
        <MobileDrillDownHeader title="Sommeil" />
        <p className="text-muted-foreground text-sm leading-relaxed">
          {viewModel?.emptyState?.description ?? 'Données de sommeil indisponibles.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <MobileDrillDownHeader title="Sommeil" />
      <SleepPageView
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
