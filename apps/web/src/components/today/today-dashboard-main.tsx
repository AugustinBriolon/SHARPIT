'use client';

import { SnapshotStatusBanner } from '@/components/today/dashboard/today-dashboard-states';
import { TodayHeader } from '@/components/today/dashboard/today-header';
import { TodayUnderstandSection } from '@/components/today/dashboard/today-understand-section';
import { TodayActionRow } from '@/components/today/rich/today-action-row';
import { TodayPlanVivantSlot } from '@/components/today/rich/today-plan-vivant-slot';
import { TodayVerdictHero } from '@/components/today/rich/today-verdict-hero';
import type { TodayViewModel } from '@/presentation/today-view-model';
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

function TodayDecisionStack({
  content,
  trainingDayId,
  valuesLoading,
}: {
  content: TodayViewModel;
  trainingDayId: string;
  valuesLoading: boolean;
}) {
  return (
    <div className="space-y-1.5 lg:space-y-3">
      <TodayHeader
        dayKey={trainingDayId}
        loading={valuesLoading}
        weather={content.header.weather}
      />
      <TodayVerdictHero loading={valuesLoading} vm={content} />
    </div>
  );
}

/**
 * Today hierarchy: one decision above the fold (verdict), then the action row,
 * then the widgets — Plan vivant heading them, and Comprendre under it. The
 * plate already carries the why; no separate block.
 *
 * Plan vivant leads the widget group rather than sitting inside the action row:
 * a trajectory toward a goal weeks out is not one of the day's actions, and
 * sharing that section's bounded region made it read as one.
 *
 * Goal anchor and daily briefing are unmounted from the hub (presentation-only);
 * VM builders may still populate unused goal/briefing fields.
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
      <TodayDecisionStack
        content={content}
        trainingDayId={trainingDayId}
        valuesLoading={valuesLoading}
      />
      <TodayActionRow
        loading={valuesLoading}
        trainingDayId={trainingDayId}
        vm={content}
        onWellnessCompleted={onWellnessCompleted}
      />
      <TodayPlanVivantSlot loading={valuesLoading} vm={content} />
      <TodayUnderstandSection
        activities={activities}
        activitiesLoading={activitiesLoading}
        loading={valuesLoading}
        metricsRow={content.hero.metricsRow}
        signalPreviews={content.hero.signalPreviews}
      />
    </div>
  );
}
