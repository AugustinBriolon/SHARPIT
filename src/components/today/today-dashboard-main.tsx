'use client';

import { SnapshotStatusBanner } from '@/components/today/dashboard/today-dashboard-states';
import { TodayHeader } from '@/components/today/dashboard/today-header';
import { TodayNutritionCard } from '@/components/today/dashboard/today-nutrition-card';
import { ActivityConsistencyPanel } from '@/components/today/dashboard/activity-consistency-panel';
import { TodaySignalStrip } from '@/components/today/dashboard/today-signal-strip';
import { TodayActionRow } from '@/components/today/rich/today-action-row';
import { TodayVerdictHero } from '@/components/today/rich/today-verdict-hero';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import type { ClientActivity } from '@/lib/query/types';

export function TodayDashboardMain({
  content,
  trainingDayId,
  valuesLoading,
  isFetching,
  activities,
  activitiesLoading,
  onWellnessCompleted,
}: {
  content: TodayViewModel;
  trainingDayId: string;
  valuesLoading: boolean;
  isFetching: boolean;
  activities: ClientActivity[];
  activitiesLoading: boolean;
  onWellnessCompleted: () => void;
}) {
  return (
    <div className="mx-auto space-y-6 lg:space-y-8">
      {isFetching ? (
        <p aria-live="polite" className="sr-only" role="status">
          Mise a jour de la page Today en cours.
        </p>
      ) : null}
      {!valuesLoading && content.statusMessage ? (
        <SnapshotStatusBanner
          href={content.statusHref}
          isRefreshing={isFetching}
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
          loading={valuesLoading}
          metricsRow={content.hero.metricsRow}
        />
      </div>
      <TodayActionRow
        loading={valuesLoading}
        trainingDayId={trainingDayId}
        vm={content}
        onWellnessCompleted={onWellnessCompleted}
      />
      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <ActivityConsistencyPanel activities={activities} loading={activitiesLoading} />
        <TodayNutritionCard />
      </div>
    </div>
  );
}
