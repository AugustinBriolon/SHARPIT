'use client';

import { format } from 'date-fns';
import { DashboardSkeleton, SnapshotStatusBanner } from './dashboard/today-dashboard-states';

import { TodayVerdictHero } from './rich/today-verdict-hero';

import { useTodayPresentationViewModel } from '@/hooks/use-presentation-view-model';
import { TodayActionRow } from './rich/today-action-row';
import { TodayWeeklyTrajectory } from './rich/today-weekly-trajectory';
import { TodayWhyBlock } from './rich/today-why-block';

export function TodayDashboard() {
  const trainingDayId = format(new Date(), 'yyyy-MM-dd');
  const query = useTodayPresentationViewModel(trainingDayId);

  const vm = query.data ?? null;

  if (query.isPending && !vm) return <DashboardSkeleton />;

  if (!vm || vm.emptyState) {
    return (
      <div className="mx-auto space-y-4">
        {vm?.statusMessage ? (
          <SnapshotStatusBanner isRefreshing={query.isFetching} message={vm.statusMessage} />
        ) : null}
        <div className="flex justify-center">
          <button
            className="text-xs text-slate-400 underline-offset-4 transition-colors hover:text-slate-600 hover:underline"
            type="button"
            onClick={() => void query.refetch()}
          >
            Actualiser
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto space-y-3 sm:space-y-4">
      {vm.statusMessage ? (
        <SnapshotStatusBanner isRefreshing={query.isFetching} message={vm.statusMessage} />
      ) : null}

      <TodayVerdictHero vm={vm} />
      <TodayWhyBlock vm={vm} />
      <TodayActionRow vm={vm} onWellnessCompleted={() => void query.refetch()} />
      <TodayWeeklyTrajectory vm={vm} />
    </div>
  );
}
