'use client';

import { useSyncExternalStore } from 'react';
import {
  isPresentationValuesLoading,
  useTodayPresentationViewModel,
} from '@/hooks/use-presentation-view-model';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useOfflineGuard } from '@/hooks/use-offline-guard';
import { useOfflineSnapshot } from '@/hooks/use-offline-snapshot';
import { useClientMorningHold } from '@/components/today/rich/morning-orientation-actions';
import { withClientMorningHold } from '@/components/today/today-dashboard-morning-hold';
import { resolveTodayDashboardView } from '@/components/today/today-dashboard-view';
import { TodayDashboardResolvedView } from '@/components/today/today-dashboard-resolved-view';
import { TodayDashboardShell } from '@/components/today/today-dashboard-shell';
import { useActivities } from '@/hooks/use-activities';
import { trainingDayIdForNow } from '@/lib/training/training-day';

/** Prerender-safe placeholder — Suspense fallback / SSR never freezes wall-clock day. */
const SERVER_TRAINING_DAY_ID = '0000-00-00';

const emptySubscribe = () => () => {};

function useClientTrainingDayId(): string {
  return useSyncExternalStore(emptySubscribe, trainingDayIdForNow, () => SERVER_TRAINING_DAY_ID);
}

function TodayDashboardLoaded({ trainingDayId }: { trainingDayId: string }) {
  const query = useTodayPresentationViewModel(trainingDayId);
  const morningHold = useClientMorningHold(trainingDayId);
  const online = useOnlineStatus();
  const activitiesQuery = useActivities();
  const { offline, guardDisabled, offlineLabel } = useOfflineGuard();
  const valuesLoading = isPresentationValuesLoading(query);

  const rawVm = query.data ?? null;
  const vm = rawVm ? withClientMorningHold(rawVm, morningHold) : null;
  const hasNoLiveContent = !vm || Boolean(vm.emptyState);
  const { entry: offlineEntry } = useOfflineSnapshot(!online && hasNoLiveContent);

  const view = resolveTodayDashboardView({
    valuesLoading,
    vm,
    online,
    offlineEntry,
  });

  return (
    <TodayDashboardResolvedView
      activities={activitiesQuery.data ?? []}
      activitiesLoading={activitiesQuery.data === null}
      guardDisabled={guardDisabled}
      isFetching={query.isFetching}
      refreshLabel={offline ? offlineLabel : 'Actualiser'}
      trainingDayId={trainingDayId}
      valuesLoading={valuesLoading}
      view={view}
      onWellnessCompleted={() => void query.refetch()}
      onRefresh={() => {
        if (!guardDisabled) {
          void query.refetch();
        }
      }}
    />
  );
}

/**
 * Today root — SSR uses a placeholder day id (shell); first client paint seeds
 * the real training day without waiting on an effect (avoids shell → shell flash).
 */
export function TodayDashboard() {
  const trainingDayId = useClientTrainingDayId();

  if (trainingDayId === SERVER_TRAINING_DAY_ID) {
    return <TodayDashboardShell />;
  }

  return <TodayDashboardLoaded trainingDayId={trainingDayId} />;
}
