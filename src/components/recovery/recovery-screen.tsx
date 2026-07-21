'use client';

import { format } from 'date-fns';
import { HeartPulse } from 'lucide-react';
import { MobileDrillDownHeader } from '@/components/layout/mobile-drill-down-header';
import { RecoveryPageView } from '@/components/recovery/recovery-page-view';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { useTodaySelectedDate } from '@/hooks/use-today-selected-date';
import {
  isPresentationValuesLoading,
  useRecoveryViewModel,
} from '@/hooks/use-presentation-view-model';
import { recoveryLoadingShell } from '@/lib/presentation/drill-down-loading-shells';

export function RecoveryScreen({ backHref, backLabel }: { backHref?: string; backLabel?: string }) {
  const { date, isToday, maxDate, setDate, goToNextDay, goToPreviousDay } = useTodaySelectedDate();
  const trainingDayId = format(date, 'yyyy-MM-dd');

  const query = useRecoveryViewModel(trainingDayId);
  const valuesLoading = isPresentationValuesLoading(query);
  const viewModel = query.data ?? null;

  if (!valuesLoading && (!viewModel || viewModel.emptyState)) {
    return (
      <div className="space-y-4">
        <MobileDrillDownHeader backHref={backHref} backLabel={backLabel} title="Récupération" />
        <InkEmptyState
          icon={HeartPulse}
          title={viewModel?.emptyState?.title ?? 'Récupération indisponible'}
          description={
            viewModel?.emptyState?.description ?? 'Données de récupération indisponibles.'
          }
        />
      </div>
    );
  }

  const content = viewModel ?? recoveryLoadingShell();

  return (
    <div className="space-y-4">
      <MobileDrillDownHeader backHref={backHref} backLabel={backLabel} title="Récupération" />
      <RecoveryPageView
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
