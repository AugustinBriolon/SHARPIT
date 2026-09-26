'use client';

import { format } from 'date-fns';
import { Moon } from 'lucide-react';
import { MobileDrillDownHeader } from '@/components/layout/header/mobile-drill-down-header';
import { SleepPageView } from '@/components/sleep/sleep-page-view';
import { ConnectSourceCta } from '@/components/integrations/connect-source-cta';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { useTodaySelectedDate } from '@/hooks/use-today-selected-date';
import {
  isPresentationValuesLoading,
  useSleepViewModel,
} from '@/hooks/use-presentation-view-model';
import { sleepLoadingShell } from '@sharpit/server/lib/presentation/shared/drill-down-loading-shells';

function isSleepEmptyState(
  valuesLoading: boolean,
  viewModel: ReturnType<typeof useSleepViewModel>['data'] | null,
): boolean {
  return !valuesLoading && (!viewModel || Boolean(viewModel.emptyState));
}

function SleepScreenEmpty({
  viewModel,
}: {
  viewModel: ReturnType<typeof useSleepViewModel>['data'] | null;
}) {
  return (
    <div className="space-y-4">
      <MobileDrillDownHeader title="Sommeil" />
      <InkEmptyState
        action={<ConnectSourceCta />}
        icon={Moon}
        title={viewModel?.emptyState?.title ?? 'Sommeil indisponible'}
        description={
          viewModel?.emptyState?.description ??
          'Connecte Garmin pour synchroniser tes nuits, ou réessaie après une sync.'
        }
      />
    </div>
  );
}

export function SleepScreen() {
  const { date, isToday, maxDate, minDate, setDate, goToNextDay, goToPreviousDay } =
    useTodaySelectedDate();
  const trainingDayId = format(date, 'yyyy-MM-dd');

  const query = useSleepViewModel(trainingDayId);
  const valuesLoading = isPresentationValuesLoading(query);
  const viewModel = query.data ?? null;

  if (isSleepEmptyState(valuesLoading, viewModel)) {
    return <SleepScreenEmpty viewModel={viewModel} />;
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
        minDate={minDate}
        onDateChange={setDate}
        onNextDay={goToNextDay}
        onPreviousDay={goToPreviousDay}
        {...content}
      />
    </div>
  );
}
