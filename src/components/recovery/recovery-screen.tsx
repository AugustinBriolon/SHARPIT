'use client';

import { format } from 'date-fns';
import { MobileDrillDownHeader } from '@/components/layout/mobile-drill-down-header';
import { RecoveryPageView } from '@/components/recovery/recovery-page-view';
import { MetricDrillDownSkeleton } from '@/components/today/drill-down/drill-down-skeleton';
import { useTodaySelectedDate } from '@/hooks/use-today-selected-date';
import { useRecoveryViewModel } from '@/hooks/use-presentation-view-model';

export function RecoveryScreen({ backHref, backLabel }: { backHref?: string; backLabel?: string }) {
  const { date, isToday, maxDate, setDate, goToNextDay, goToPreviousDay } = useTodaySelectedDate();
  const trainingDayId = format(date, 'yyyy-MM-dd');

  const query = useRecoveryViewModel(trainingDayId);
  const viewModel = query.data ?? null;

  if (query.isPending && !viewModel) {
    return (
      <MetricDrillDownSkeleton
        backHref={backHref}
        backLabel={backLabel}
        title="Récupération"
        variant="recovery"
      />
    );
  }

  if (!viewModel || viewModel.emptyState) {
    return (
      <div className="space-y-4">
        <MobileDrillDownHeader backHref={backHref} backLabel={backLabel} title="Récupération" />
        <p className="text-muted-foreground text-sm">
          {viewModel?.emptyState?.description ?? 'Données de récupération indisponibles.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <MobileDrillDownHeader backHref={backHref} backLabel={backLabel} title="Récupération" />
      <RecoveryPageView
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
