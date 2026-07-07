'use client';

import {
  DashboardSkeleton,
  PartialSnapshotFallback,
  SnapshotStatusBanner,
} from './dashboard/today-dashboard-states';
import { useTodayDashboardViewModel } from './dashboard/use-today-dashboard-view-model';
import { TodayActionRow } from './rich/today-action-row';
import { TodayVerdictHero } from './rich/today-verdict-hero';
import { TodayWeeklyTrajectory } from './rich/today-weekly-trajectory';
import { TodayWhyBlock } from './rich/today-why-block';

export function TodayDashboard() {
  const vm = useTodayDashboardViewModel();
  const { snapshot } = vm;

  if (vm.loading && !snapshot) return <DashboardSkeleton />;

  if (!vm.hasContent && snapshot) {
    return <PartialSnapshotFallback snapshot={snapshot} onRetry={vm.refresh} />;
  }

  const statusMessage = vm.primaryProductMessage ?? vm.insufficientDataMessage;

  return (
    <div className="mx-auto max-w-3xl space-y-3 sm:space-y-4">
      {statusMessage ? (
        <SnapshotStatusBanner isRefreshing={vm.isRefreshing} message={statusMessage} />
      ) : null}

      <TodayVerdictHero vm={vm} />
      <TodayWhyBlock vm={vm} />
      <TodayActionRow vm={vm} onWellnessCompleted={vm.refresh} />
      <TodayWeeklyTrajectory vm={vm} />
    </div>
  );
}
