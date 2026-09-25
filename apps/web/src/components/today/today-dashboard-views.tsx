'use client';

import { TodayEmptyState } from '@/components/today/dashboard/today-empty-state';
import { OfflineSnapshotSummary } from '@/components/pwa/offline-snapshot-summary';
import { TodayDashboardShell } from '@/components/today/today-dashboard-shell';
import { TodayDashboardMain } from '@/components/today/today-dashboard-main';
import type { TodayDashboardView } from '@/components/today/today-dashboard-view';
import type { PersistedSnapshotEntry } from '@/lib/pwa/snapshot-store-validation';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import type { ClientActivity } from '@/lib/query/types';

export function TodayDashboardOfflineView({ entry }: { entry: PersistedSnapshotEntry }) {
  return <OfflineSnapshotSummary entry={entry} />;
}

export function TodayDashboardEmptyView({
  view,
  isFetching,
  guardDisabled,
  refreshLabel,
  onWellnessCompleted,
  onRefresh,
}: {
  view: TodayDashboardView & { kind: 'empty' };
  isFetching: boolean;
  guardDisabled: boolean;
  refreshLabel: string;
  onWellnessCompleted: () => void;
  onRefresh: () => void;
}) {
  return (
    <TodayEmptyState
      isRefreshing={isFetching}
      refreshDisabled={guardDisabled || isFetching}
      refreshLabel={refreshLabel}
      statusHref={view.vm?.statusHref}
      statusMessage={view.vm?.statusMessage}
      statusSnoozeKey={view.vm?.statusSnoozeKey}
      onRefresh={onRefresh}
      onWellnessCompleted={onWellnessCompleted}
    />
  );
}

export function TodayDashboardLoadingView({
  isFetching,
  trainingDayId,
}: {
  isFetching: boolean;
  trainingDayId: string;
}) {
  return (
    <>
      {isFetching ? (
        <p aria-live="polite" className="sr-only" role="status">
          Mise a jour de la page Today en cours.
        </p>
      ) : null}
      <TodayDashboardShell trainingDayId={trainingDayId} />
    </>
  );
}

export function TodayDashboardContentView({
  vm,
  trainingDayId,
  valuesLoading,
  isFetching,
  activities,
  activitiesLoading,
  onWellnessCompleted,
}: {
  vm: TodayViewModel;
  trainingDayId: string;
  valuesLoading: boolean;
  isFetching: boolean;
  activities: ClientActivity[];
  activitiesLoading: boolean;
  onWellnessCompleted: () => void;
}) {
  return (
    <TodayDashboardMain
      activities={activities}
      activitiesLoading={activitiesLoading}
      content={vm}
      isFetching={isFetching}
      trainingDayId={trainingDayId}
      valuesLoading={valuesLoading}
      onWellnessCompleted={onWellnessCompleted}
    />
  );
}
