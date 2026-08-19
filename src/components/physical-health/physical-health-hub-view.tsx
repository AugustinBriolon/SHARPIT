'use client';

import { format } from 'date-fns';
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

  return (
    <div className="space-y-4">
      {valuesLoading ? (
        <p aria-live="polite" className="sr-only">
          Chargement de l&apos;état physique…
        </p>
      ) : null}
      <PhysicalHealthPageView loading={valuesLoading} viewModel={viewModel} embedded />
    </div>
  );
}
