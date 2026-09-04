'use client';

import { SnapshotStatusBanner } from '@/components/today/dashboard/today-dashboard-states';
import { TodayHeader } from '@/components/today/dashboard/today-header';
import { TodayUnderstandSection } from '@/components/today/dashboard/today-understand-section';
import { TodayActionRow } from '@/components/today/rich/today-action-row';
import { TodayVerdictHero } from '@/components/today/rich/today-verdict-hero';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import type { ClientActivity } from '@/lib/query/types';

function TodayCriticalStatus({
  content,
  isFetching,
}: {
  content: TodayViewModel;
  isFetching: boolean;
}) {
  if (!content.statusMessage || !content.statusHref) {
    return null;
  }
  return (
    <SnapshotStatusBanner
      href={content.statusHref}
      isRefreshing={isFetching}
      message={content.statusMessage}
      snoozeKey={content.statusSnoozeKey}
    />
  );
}

/**
 * Today V0 hierarchy: one decision above the fold, then action row, Comprendre.
 *
 * Daily briefing stays generated/API-backed but is not mounted here until it
 * has differentiated value vs the verdict (design feedback).
 *
 * Metric chips live as tertiary visual evidence under Comprendre — never as a
 * primary equal grid under the verdict.
 */
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
      {!valuesLoading ? <TodayCriticalStatus content={content} isFetching={isFetching} /> : null}
      <div className="space-y-1.5 lg:space-y-3">
        <TodayHeader
          dayKey={trainingDayId}
          loading={valuesLoading}
          weather={content.header.weather}
        />
        <TodayVerdictHero loading={valuesLoading} vm={content} />
      </div>
      <TodayActionRow
        loading={valuesLoading}
        trainingDayId={trainingDayId}
        vm={content}
        onWellnessCompleted={onWellnessCompleted}
      />
      <TodayUnderstandSection
        activities={activities}
        activitiesLoading={activitiesLoading}
        limitingFactorHref={content.hero.twinTrustStrip.limitingFactorHref}
        loading={valuesLoading}
        metricsRow={content.hero.metricsRow}
        signalPreviews={content.hero.signalPreviews}
      />
    </div>
  );
}
