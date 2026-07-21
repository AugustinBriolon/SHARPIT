'use client';

import { format } from 'date-fns';
import { Activity } from 'lucide-react';
import { MobileDrillDownHeader } from '@/components/layout/mobile-drill-down-header';
import { EffortPageView } from '@/components/effort/effort-page-view';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { useTodaySelectedDate } from '@/hooks/use-today-selected-date';
import {
  isPresentationValuesLoading,
  useEffortViewModel,
} from '@/hooks/use-presentation-view-model';
import { effortLoadingShell } from '@/lib/presentation/drill-down-loading-shells';

export default function TodayEffortPage() {
  const { date, isToday, maxDate, setDate, goToNextDay, goToPreviousDay } = useTodaySelectedDate();
  const trainingDayId = format(date, 'yyyy-MM-dd');

  const query = useEffortViewModel(trainingDayId);
  const valuesLoading = isPresentationValuesLoading(query);
  const viewModel = query.data ?? null;

  if (!valuesLoading && (!viewModel || viewModel.emptyState)) {
    return (
      <div className="space-y-4">
        <MobileDrillDownHeader title="Charge d'effort" />
        <InkEmptyState
          description={viewModel?.emptyState?.description ?? 'Données d’effort indisponibles.'}
          icon={Activity}
          title={viewModel?.emptyState?.title ?? 'Charge d’effort indisponible'}
        />
      </div>
    );
  }

  const content = viewModel ?? effortLoadingShell();

  return (
    <div className="space-y-4">
      <MobileDrillDownHeader title="Charge d'effort" />
      <EffortPageView
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
