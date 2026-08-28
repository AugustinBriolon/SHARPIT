'use client';

import { format } from 'date-fns';
import { RecoveryScreenBody } from '@/components/recovery/recovery-screen-body';
import { resolveRecoveryEmpty } from '@/components/recovery/recovery-empty';
import { RecoveryScreenEmpty } from '@/components/recovery/recovery-screen-empty';
import { useTodaySelectedDate } from '@/hooks/use-today-selected-date';
import {
  isPresentationValuesLoading,
  useRecoveryViewModel,
} from '@/hooks/use-presentation-view-model';
import { recoveryLoadingShell } from '@/lib/presentation/drill-down-loading-shells';
import type { RecoveryViewModel } from '@/core/presentation/recovery-view-model';

export function RecoveryScreen({ backHref, backLabel }: { backHref?: string; backLabel?: string }) {
  const { date, isToday, maxDate, minDate, setDate, goToNextDay, goToPreviousDay } =
    useTodaySelectedDate();
  const trainingDayId = format(date, 'yyyy-MM-dd');
  const query = useRecoveryViewModel(trainingDayId);
  const valuesLoading = isPresentationValuesLoading(query);
  const viewModel = query.data ?? null;
  const empty = !valuesLoading ? resolveRecoveryEmpty(viewModel) : null;

  if (empty) {
    return (
      <RecoveryScreenEmpty
        backHref={backHref}
        backLabel={backLabel}
        description={empty.description}
        title={empty.title}
      />
    );
  }

  return (
    <RecoveryScreenBody
      backHref={backHref}
      backLabel={backLabel}
      content={(viewModel ?? recoveryLoadingShell()) as RecoveryViewModel}
      date={date}
      isToday={isToday}
      loading={valuesLoading}
      maxDate={maxDate}
      minDate={minDate ?? date}
      onDateChange={setDate}
      onNextDay={goToNextDay}
      onPreviousDay={goToPreviousDay}
    />
  );
}
