'use client';

import { format } from 'date-fns';
import { useSearchParams } from 'next/navigation';
import { usePhysicalHealthViewModel } from '@/hooks/use-presentation-view-model';
import { useTodaySelectedDate } from '@/hooks/use-today-selected-date';
import { PhysicalHealthPageSkeleton, PhysicalHealthPageView } from './physical-health-page-view';

/** Embedded suivi physique tab — Condition Engine UI */
export function PhysicalHealthHubView() {
  const { date } = useTodaySelectedDate();
  const trainingDayId = format(date, 'yyyy-MM-dd');
  const searchParams = useSearchParams();
  const focusConditionId = searchParams.get('condition');
  const query = usePhysicalHealthViewModel(trainingDayId);

  if (query.isPending) {
    return <PhysicalHealthPageSkeleton embedded />;
  }

  if (!query.data) {
    return (
      <p className="text-muted-foreground text-sm">
        Impossible de charger l&apos;état physique inféré.
      </p>
    );
  }

  const focused =
    focusConditionId != null
      ? [...query.data.activeConditions, ...query.data.resolvedConditions].find(
          (c) => c.conditionId === focusConditionId,
        )
      : null;

  return (
    <div className="space-y-3">
      {focused && (
        <p className="text-muted-foreground text-sm">
          Focus : <span className="text-foreground font-medium">{focused.label}</span>
        </p>
      )}
      <PhysicalHealthPageView viewModel={query.data} embedded />
    </div>
  );
}
