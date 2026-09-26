'use client';

import { format } from 'date-fns';
import { Activity } from 'lucide-react';
import { MobileDrillDownHeader } from '@/components/layout/header/mobile-drill-down-header';
import { EffortPageView } from '@/components/effort/effort-page-view';
import { ExpertModeBadge } from '@/components/display-mode';
import { ConnectSourceCta } from '@/components/integrations/connect-source-cta';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { useTodaySelectedDate } from '@/hooks/use-today-selected-date';
import {
  isPresentationValuesLoading,
  useEffortViewModel,
} from '@/hooks/use-presentation-view-model';
import { effortLoadingShell } from '@sharpit/server/lib/presentation/shared/drill-down-loading-shells';

function EffortEmptyView({
  viewModel,
}: {
  viewModel: ReturnType<typeof useEffortViewModel>['data'];
}) {
  return (
    <div className="space-y-4">
      <MobileDrillDownHeader title="Charge" />
      <InkEmptyState
        action={<ConnectSourceCta />}
        icon={Activity}
        title={viewModel?.emptyState?.title ?? 'Charge indisponible'}
        description={
          viewModel?.emptyState?.description ??
          'Synchronise Garmin pour construire ta charge d’entraînement.'
        }
      />
    </div>
  );
}

export function EffortScreen() {
  const { date, isToday, maxDate, minDate, setDate, goToNextDay, goToPreviousDay } =
    useTodaySelectedDate();
  const trainingDayId = format(date, 'yyyy-MM-dd');

  const query = useEffortViewModel(trainingDayId);
  const valuesLoading = isPresentationValuesLoading(query);
  const viewModel = query.data ?? null;

  if (!valuesLoading && (!viewModel || viewModel.emptyState)) {
    return <EffortEmptyView viewModel={viewModel ?? undefined} />;
  }

  const content = viewModel ?? effortLoadingShell();

  return (
    <div className="space-y-4">
      <MobileDrillDownHeader title="Charge" titleBadge={<ExpertModeBadge />} />
      <EffortPageView
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
