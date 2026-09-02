'use client';

import { SnapshotStatusBanner } from '@/components/today/dashboard/today-dashboard-states';
import { DailyBriefingPanel } from '@/components/today/dashboard/daily-briefing-panel';
import { TodayHeader } from '@/components/today/dashboard/today-header';
import { TodayUnderstandSection } from '@/components/today/dashboard/today-understand-section';
import { TodayActionRow } from '@/components/today/rich/today-action-row';
import { TodayVerdictHero } from '@/components/today/rich/today-verdict-hero';
import { MedicalDisclaimerNote } from '@/components/ui/instruments/medical-disclaimer-note';
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
 * Today V0 hierarchy: one decision above the fold, then briefing, bilan, Comprendre.
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
      <div className="space-y-2 lg:space-y-4">
        <TodayHeader
          dayKey={trainingDayId}
          loading={valuesLoading}
          weather={content.header.weather}
        />
        <TodayVerdictHero loading={valuesLoading} vm={content} />
        {/* Visible, not buried — Science Sport medical disclaimer V0 */}
        {!valuesLoading ? <MedicalDisclaimerNote className="px-1" /> : null}
      </div>
      {!valuesLoading ? <DailyBriefingPanel dayKey={trainingDayId} /> : null}
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
      />
    </div>
  );
}
