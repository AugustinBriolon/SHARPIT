'use client';

import { format } from 'date-fns';
import { DashboardSkeleton, SnapshotStatusBanner } from './dashboard/today-dashboard-states';

import { TodayVerdictHero } from './rich/today-verdict-hero';

import { useTodayPresentationViewModel } from '@/hooks/use-presentation-view-model';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useOfflineSnapshot } from '@/hooks/use-offline-snapshot';
import { OfflineSnapshotSummary } from '@/components/pwa/offline-snapshot-summary';
import { TodayActionRow } from './rich/today-action-row';
import { TodaySignalStrip } from './dashboard/today-signal-strip';
import { TodayWeeklyTrajectory } from './rich/today-weekly-trajectory';
import { TodayWhyBlock } from './rich/today-why-block';

export function TodayDashboard() {
  const trainingDayId = format(new Date(), 'yyyy-MM-dd');
  const query = useTodayPresentationViewModel(trainingDayId);
  const online = useOnlineStatus();

  const vm = query.data ?? null;
  const hasNoLiveContent = !vm || Boolean(vm.emptyState);
  const { entry: offlineEntry } = useOfflineSnapshot(!online && hasNoLiveContent);

  if (query.isPending && !vm) return <DashboardSkeleton />;

  if (hasNoLiveContent) {
    // Offline with no live ViewModel: fall back to the last verified Snapshot,
    // read-only, rather than the generic empty state — never a full Today
    // reconstruction (that pipeline is server-built and unavailable offline).
    if (!online && offlineEntry) {
      return <OfflineSnapshotSummary entry={offlineEntry} />;
    }

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
      <TodaySignalStrip metricsRow={vm.hero.metricsRow} />
      <TodayWhyBlock vm={vm} />
      <TodayActionRow vm={vm} onWellnessCompleted={() => void query.refetch()} />
      <TodayWeeklyTrajectory vm={vm} />
    </div>
  );
}
