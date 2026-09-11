'use client';

import { DailyBriefingPanel } from '@/components/today/dashboard/daily-briefing-panel';
import { SnapshotStatusBanner } from '@/components/today/dashboard/today-dashboard-states';
import { TodayHeader } from '@/components/today/dashboard/today-header';
import { TodayUnderstandSection } from '@/components/today/dashboard/today-understand-section';
import { TodayActionRow } from '@/components/today/rich/today-action-row';
import { TodayGoalAnchor } from '@/components/today/rich/today-goal-anchor';
import { TodayJournalHabitBridgeFooter } from '@/components/today/rich/today-journal-habit-bridge-footer';
import { TodayVerdictHero } from '@/components/today/rich/today-verdict-hero';
import { TodayWhyBlock } from '@/components/today/rich/today-why-block';
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
    <>
      <div className="space-y-1.5 lg:space-y-3">
        <TodayHeader
          dayKey={trainingDayId}
          loading={valuesLoading}
          weather={content.header.weather}
        />
        <TodayVerdictHero loading={valuesLoading} vm={content} />
      </div>
      <TodayGoalAnchor
        href={content.hero.goalHref}
        label={content.hero.goalLine}
        linkedToSession={content.hero.goalLinkedToSession}
        loading={valuesLoading}
      />
      {!valuesLoading ? <DailyBriefingPanel dayKey={trainingDayId} /> : null}
      <TodayWhyBlock loading={valuesLoading} vm={content} />
    </>
  );
}

/**
 * Today hierarchy: one decision above the fold (verdict), then living goal
 * anchor + progressive briefing + why evidence (objectif / journal / signaux),
 * then action row (incl. rearrange habit ou Twin), Comprendre, and a quiet
 * journal footnote for analyses / test progress.
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
      <TodayUnderstandSection
        activities={activities}
        activitiesLoading={activitiesLoading}
        loading={valuesLoading}
        metricsRow={content.hero.metricsRow}
        signalPreviews={content.hero.signalPreviews}
      />
      {!valuesLoading ? <TodayJournalHabitBridgeFooter enabled /> : null}
    </div>
  );
}
