'use client';

import { TodayEmptyState } from '@/components/today/dashboard/today-empty-state';
import { OfflineSnapshotSummary } from '@/components/pwa/offline-snapshot-summary';
import { TodayDashboardShell } from '@/components/today/today-dashboard-shell';
import { TodayDashboardMain } from '@/components/today/today-dashboard-main';
import type { TodayDashboardView } from '@/components/today/today-dashboard-view';
import type { ClientActivity } from '@/lib/query/types';

export function TodayDashboardOfflineView({
  entry,
}: {
  entry: TodayDashboardView extends { kind: 'offline'; entry: infer E } ? E : never;
}) {
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
  vm: TodayDashboardView extends { kind: 'main'; vm: infer V } ? V : never;
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
