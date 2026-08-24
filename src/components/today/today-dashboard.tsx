'use client';

import { format } from 'date-fns';
import { SnapshotStatusBanner } from './dashboard/today-dashboard-states';
import { TodayEmptyState } from './dashboard/today-empty-state';
import { TodayVerdictHero } from './rich/today-verdict-hero';

import {
  isPresentationValuesLoading,
  useTodayPresentationViewModel,
} from '@/hooks/use-presentation-view-model';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useOfflineGuard } from '@/hooks/use-offline-guard';
import { useOfflineSnapshot } from '@/hooks/use-offline-snapshot';
import { OfflineSnapshotSummary } from '@/components/pwa/offline-snapshot-summary';
import { TodayActionRow } from './rich/today-action-row';
import { TodaySignalStrip } from './dashboard/today-signal-strip';
import { TodayHeader } from './dashboard/today-header';
import { TodayNutritionCard } from './dashboard/today-nutrition-card';
import { ActivityConsistencyPanel } from './dashboard/activity-consistency-panel';
import { useActivities } from '@/hooks/use-activities';
import { useClientMorningHold } from '@/components/today/rich/morning-orientation-actions';
import { TodayDashboardShell } from './today-dashboard-shell';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { sessionChoiceLabel } from '@/lib/today/morning-orientation';

function withClientMorningHold(vm: TodayViewModel, holdActive: boolean): TodayViewModel {
  if (!holdActive) return vm;
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
  const morningHold = useClientMorningHold(trainingDayId);
  const online = useOnlineStatus();
  /* Regularity lived on /training, which is why it was never read: the question
     "am I actually training regularly" is a morning question, and the morning
     screen is not /training. */
  const activitiesQuery = useActivities();
  const { offline, guardDisabled, offlineLabel } = useOfflineGuard();
  const valuesLoading = isPresentationValuesLoading(query);

  const rawVm = query.data ?? null;
  const vm = rawVm ? withClientMorningHold(rawVm, morningHold) : null;
  const hasNoLiveContent = !vm || Boolean(vm.emptyState);
  const { entry: offlineEntry } = useOfflineSnapshot(!online && hasNoLiveContent);

  if (!valuesLoading && hasNoLiveContent) {
    if (!online && offlineEntry) {
      return <OfflineSnapshotSummary entry={offlineEntry} />;
    }

    return (
      <TodayEmptyState
        isRefreshing={query.isFetching}
        refreshDisabled={guardDisabled || query.isFetching}
        refreshLabel={offline ? offlineLabel : 'Actualiser'}
        statusHref={vm?.statusHref}
        statusMessage={vm?.statusMessage}
        statusSnoozeKey={vm?.statusSnoozeKey}
        onWellnessCompleted={() => void query.refetch()}
        onRefresh={() => {
          if (guardDisabled) return;
          void query.refetch();
        }}
      />
    );
  }

  if (valuesLoading && !vm) {
    return (
      <>
        {query.isFetching ? (
          <p aria-live="polite" className="sr-only" role="status">
            Mise a jour de la page Today en cours.
          </p>
        ) : null}
        <TodayDashboardShell trainingDayId={trainingDayId} />
      </>
    );
  }

  const content = vm!;

  return (
    <div className="mx-auto space-y-6 lg:space-y-8">
      {query.isFetching ? (
        <p aria-live="polite" className="sr-only" role="status">
          Mise a jour de la page Today en cours.
        </p>
      ) : null}
      {!valuesLoading && content.statusMessage ? (
        <SnapshotStatusBanner
          href={content.statusHref}
          isRefreshing={query.isFetching}
          message={content.statusMessage}
          snoozeKey={content.statusSnoozeKey}
        />
      ) : null}
      <div className="space-y-2 lg:space-y-4">
        <TodayHeader
          dayKey={trainingDayId}
          loading={valuesLoading}
          weather={content.header.weather}
        />
        <TodayVerdictHero loading={valuesLoading} vm={content} />
        <TodaySignalStrip
          limiterHref={content.hero.twinTrustStrip.limitingFactorHref}
          limiterText={content.hero.twinTrustStrip.limitingCauseText}
          loading={valuesLoading}
          metricsRow={content.hero.metricsRow}
        />
      </div>
      <TodayActionRow
        loading={valuesLoading}
        trainingDayId={trainingDayId}
        vm={content}
        onWellnessCompleted={() => void query.refetch()}
      />
      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <ActivityConsistencyPanel
          activities={activitiesQuery.data ?? []}
          loading={activitiesQuery.data == null}
        />
        <TodayNutritionCard />
      </div>
    </div>
  );
}
