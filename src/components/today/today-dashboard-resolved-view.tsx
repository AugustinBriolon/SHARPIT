'use client';

import type { TodayDashboardView } from '@/components/today/today-dashboard-view';
import {
  TodayDashboardContentView,
  TodayDashboardEmptyView,
  TodayDashboardLoadingView,
  TodayDashboardOfflineView,
} from '@/components/today/today-dashboard-views';
import type { ClientActivity } from '@/lib/query/types';

export function TodayDashboardResolvedView({
  view,
  trainingDayId,
  valuesLoading,
  isFetching,
  activities,
  activitiesLoading,
  guardDisabled,
  refreshLabel,
  onWellnessCompleted,
  onRefresh,
}: {
  view: TodayDashboardView;
  trainingDayId: string;
  valuesLoading: boolean;
  isFetching: boolean;
  activities: ClientActivity[];
  activitiesLoading: boolean;
  guardDisabled: boolean;
  refreshLabel: string;
  onWellnessCompleted: () => void;
  onRefresh: () => void;
}) {
  if (view.kind === 'offline') {
    return <TodayDashboardOfflineView entry={view.entry} />;
  }

  if (view.kind === 'empty') {
    return (
      <TodayDashboardEmptyView
        guardDisabled={guardDisabled}
        isFetching={isFetching}
        refreshLabel={refreshLabel}
        view={view}
        onRefresh={onRefresh}
        onWellnessCompleted={onWellnessCompleted}
      />
    );
  }

  if (view.kind === 'loading-shell') {
    return <TodayDashboardLoadingView isFetching={isFetching} trainingDayId={trainingDayId} />;
  }

  return (
    <TodayDashboardContentView
      activities={activities}
      activitiesLoading={activitiesLoading}
      isFetching={isFetching}
      trainingDayId={trainingDayId}
      valuesLoading={valuesLoading}
      vm={view.vm}
      onWellnessCompleted={onWellnessCompleted}
    />
  );
}
