'use client';

import { format } from 'date-fns';
import { useSearchParams } from 'next/navigation';
import {
  isPresentationValuesLoading,
  usePhysicalHealthViewModel,
} from '@/hooks/use-presentation-view-model';
import { physicalHealthLoadingShell } from '@/lib/presentation/physical-health-loading-shell';
import { useTodaySelectedDate } from '@/hooks/use-today-selected-date';
import { PhysicalHealthPageView } from './physical-health-page-view';

/** Embedded suivi physique tab — Condition Engine UI */
export function PhysicalHealthHubView() {
  const { date } = useTodaySelectedDate();
  const trainingDayId = format(date, 'yyyy-MM-dd');
  const searchParams = useSearchParams();
  const focusConditionId = searchParams.get('condition');
  const query = usePhysicalHealthViewModel(trainingDayId);
  const valuesLoading = isPresentationValuesLoading(query);

  if (!valuesLoading && !query.data) {
    return (
      <p className="text-muted-foreground text-sm">
        Impossible de charger l&apos;état physique inféré.
      </p>
    );
  }

  const viewModel = query.data ?? physicalHealthLoadingShell();
  const focused =
    !valuesLoading && focusConditionId != null
      ? [...viewModel.activeConditions, ...viewModel.resolvedConditions].find(
          (c) => c.conditionId === focusConditionId,
        )
      : null;

  return (
    <>
      {focused ? (
        <p className="text-muted-foreground text-sm">
          Focus : <span className="text-foreground font-medium">{focused.label}</span>
        </p>
      ) : null}
      <PhysicalHealthPageView loading={valuesLoading} viewModel={viewModel} embedded />
    </>
  );
}
