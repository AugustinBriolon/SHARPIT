'use client';

import { format } from 'date-fns';
import { Moon } from 'lucide-react';
import { MobileDrillDownHeader } from '@/components/layout/mobile-drill-down-header';
import { SleepPageView } from '@/components/sleep/sleep-page-view';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { useTodaySelectedDate } from '@/hooks/use-today-selected-date';
import {
  isPresentationValuesLoading,
  useSleepViewModel,
} from '@/hooks/use-presentation-view-model';
import { sleepLoadingShell } from '@/lib/presentation/drill-down-loading-shells';

export default function TodaySleepPage() {
  const { date, isToday, maxDate, setDate, goToNextDay, goToPreviousDay } = useTodaySelectedDate();
  const trainingDayId = format(date, 'yyyy-MM-dd');

  const query = useSleepViewModel(trainingDayId);
  const valuesLoading = isPresentationValuesLoading(query);
  const viewModel = query.data ?? null;

  if (!valuesLoading && (!viewModel || viewModel.emptyState)) {
    return (
      <div className="space-y-4">
        <MobileDrillDownHeader title="Sommeil" />
        <InkEmptyState
          description={viewModel?.emptyState?.description ?? 'Données de sommeil indisponibles.'}
          icon={Moon}
          title={viewModel?.emptyState?.title ?? 'Sommeil indisponible'}
        />
      </div>
    );
  }

  const content = viewModel ?? sleepLoadingShell();

  return (
    <div className="space-y-4">
      <MobileDrillDownHeader title="Sommeil" />
      <SleepPageView
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
