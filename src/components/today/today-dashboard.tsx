'use client';

import { format } from 'date-fns';
import { SnapshotStatusBanner } from './dashboard/today-dashboard-states';

import { TodayVerdictHero } from './rich/today-verdict-hero';

import {
  isPresentationValuesLoading,
  useTodayPresentationViewModel,
} from '@/hooks/use-presentation-view-model';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useOfflineSnapshot } from '@/hooks/use-offline-snapshot';
import { OfflineSnapshotSummary } from '@/components/pwa/offline-snapshot-summary';
import { TodayActionRow } from './rich/today-action-row';
import { TodaySignalStrip } from './dashboard/today-signal-strip';
import { TodayWeeklyTrajectory } from './rich/today-weekly-trajectory';
import { readClientMorningHold } from '@/components/today/rich/morning-orientation-actions';
import { todayLoadingShell } from '@/lib/presentation/today-loading-shell';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { sessionChoiceLabel } from '@/lib/today/morning-orientation';

function withClientMorningHold(vm: TodayViewModel, trainingDayId: string): TodayViewModel {
  if (!readClientMorningHold(trainingDayId)) return vm;
  if (!vm.morningOrientation || vm.morningOrientation.phase === 'POST_CHOICE') return vm;

  const primarySessionId =
    vm.actionRow.daySummaryLines.find((l) => l.kind === 'planned')?.id ??
    vm.morningOrientation.holdDecisionId;

  const label = sessionChoiceLabel('HOLD');
  const sessionId =
    vm.morningOrientation.confirmEase?.sessionId ??
    vm.morningOrientation.confirmIncrease?.sessionId ??
    primarySessionId;

  return {
    ...vm,
    morningOrientation: {
      ...vm.morningOrientation,
      phase: 'POST_CHOICE',
      evidenceLine: null,
      showRefreshEvidence: false,
      showFirmActions: false,
      hideHeroConfidence: true,
      heroHeadline: null,
      heroSubline: null,
      confirmEase: null,
      confirmIncrease: null,
      holdDecisionId: null,
      sessionChoice: sessionId ? { sessionId, kind: 'HOLD', label } : null,
    },
    actionRow: {
      ...vm.actionRow,
      daySummaryLines: vm.actionRow.daySummaryLines.map((line) => {
        if (!sessionId || line.id !== sessionId) return line;
        return { ...line, morningChoiceLabel: label };
      }),
    },
  };
}

export function TodayDashboard() {
  const trainingDayId = format(new Date(), 'yyyy-MM-dd');
  const query = useTodayPresentationViewModel(trainingDayId);
  const online = useOnlineStatus();
  const valuesLoading = isPresentationValuesLoading(query);

  const rawVm = query.data ?? null;
  const vm = rawVm ? withClientMorningHold(rawVm, trainingDayId) : null;
  const hasNoLiveContent = !vm || Boolean(vm.emptyState);
  const { entry: offlineEntry } = useOfflineSnapshot(!online && hasNoLiveContent);

  if (!valuesLoading && hasNoLiveContent) {
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
            className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 transition-colors hover:underline"
            type="button"
            onClick={() => void query.refetch()}
          >
            Actualiser
          </button>
        </div>
      </div>
    );
  }

  const content = vm ?? todayLoadingShell();
  const hideTrajectory = content.morningOrientation?.phase === 'EVIDENCE_PENDING';

  return (
    <div className="mx-auto space-y-6 lg:space-y-8">
      {!valuesLoading && content.statusMessage ? (
        <SnapshotStatusBanner isRefreshing={query.isFetching} message={content.statusMessage} />
      ) : null}
      <div className="space-y-2 lg:space-y-4">
        <TodayVerdictHero loading={valuesLoading} vm={content} />
        <TodaySignalStrip loading={valuesLoading} metricsRow={content.hero.metricsRow} />
      </div>
      <TodayActionRow
        loading={valuesLoading}
        trainingDayId={trainingDayId}
        vm={content}
        onWellnessCompleted={() => void query.refetch()}
      />
      {hideTrajectory ? null : <TodayWeeklyTrajectory loading={valuesLoading} vm={content} />}
    </div>
  );
}
