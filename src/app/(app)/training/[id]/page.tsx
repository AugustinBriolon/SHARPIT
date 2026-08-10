import { notFound } from 'next/navigation';
import { TriathlonLegsPanel } from '@/components/training/activity/triathlon-legs-panel';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { ActivityDetailHeader } from '@/components/training/activity/detail/activity-detail-header';
import { ActivityDetailHero } from '@/components/training/activity/detail/activity-detail-hero';
import {
  buildActivitySpecs,
  buildStrengthStats,
} from '@/components/training/activity/detail/activity-detail-helpers';
import { ActivityHikeOvernightPanel } from '@/components/training/activity/detail/activity-hike-overnight-panel';
import { ActivityMetaRow } from '@/components/training/activity/detail/activity-meta-row';
import { ActivitySpecsNotes } from '@/components/training/activity/detail/activity-specs-notes';
import { ActivityStrengthExercises } from '@/components/training/activity/detail/activity-strength-exercises';
import { ActivityGoalValidationsCard } from '@/components/goals/cards/activity-goal-validations-card';
import { ActivityDetailInsights } from '@/components/training/activity/activity-detail-insights';
import { ActivityNarrativeSection } from '@/components/training/activity/activity-narrative-section';
import { isEligibleForActivityNarrative } from '@/lib/activity/activity-narrative-config';
import { activityDetailExpectsMap } from '@/lib/activity/activity-detail-skeleton-layout';
import { buildHikeOvernightSummary } from '@/lib/activity/hike-overnight-summary';
import { getActivityById, getMultisportLegsForActivity } from '@/lib/queries';
import { getGoalAchievementsForActivity } from '@/lib/goals/goal-achievements';
import { isCoachConfigured } from '@/lib/ai';
import { getPerformanceRecordsForActivity } from '@/lib/training/records';
import { HikeTripMemberLink } from '@/components/training/trip/hike-trip-member-link';
import { ActivityType } from '@prisma/client';

type PageProps = { params: Promise<{ id: string }> };

const NARRATIVE_TYPES = new Set<ActivityType>([
  ActivityType.RUN,
  ActivityType.BIKE,
  ActivityType.SWIM,
]);

export default async function ActivityDetailPage({ params }: PageProps) {
  const { id } = await params;

  // No weather / narrative enrich on browse — that belongs to ingest (sync / create / link).
  // Opening an old activity must stay Instant; coach synthesis is on-demand via the UI.

  const activity = await getActivityById(id);

  if (!activity) notFound();

  const isStrength = activity.type === ActivityType.STRENGTH;
  const isTriathlon = activity.type === ActivityType.TRIATHLON;
  const isHike = activity.type === ActivityType.HIKE;
  const hikeSummary = isHike
    ? buildHikeOvernightSummary({
        date: activity.date,
        duration: activity.duration,
        weather: activity.weather,
        load: activity.load,
        observedLocationLabel: activity.observedLocationLabel,
        hikeMetrics: activity.hikeMetrics
          ? {
              distanceM: activity.hikeMetrics.distanceM,
              elevationM: activity.hikeMetrics.elevationM,
              elevationLossM: activity.hikeMetrics.elevationLossM,
            }
          : null,
      })
    : null;
  const [multisportLegs, goalValidations, performanceRecords] = await Promise.all([
    isTriathlon ? getMultisportLegsForActivity(activity) : Promise.resolve(null),
    getGoalAchievementsForActivity(activity.id),
    getPerformanceRecordsForActivity(activity.id),
  ]);
  const coachEnabled = isCoachConfigured();
  const specs = buildActivitySpecs(activity);
  const strengthStats = buildStrengthStats(activity);
  const showCoachPanel =
    coachEnabled &&
    NARRATIVE_TYPES.has(activity.type) &&
    isEligibleForActivityNarrative(new Date(activity.date));

  const coachPanel = showCoachPanel ? (
    <ActivityNarrativeSection
      activityDate={activity.date}
      activityId={activity.id}
      activityType={activity.type}
      coachEnabled={coachEnabled}
      narrativeAnalysis={activity.narrativeAnalysis}
      narrativeAnalyzedAt={activity.narrativeAnalyzedAt}
    />
  ) : undefined;

  return (
    <div className="relative z-0 space-y-6 sm:space-y-8">
      <MobileBackLink showOnDesktop />

      <ActivityDetailHeader activity={activity} />

      <div className="relative z-0 space-y-4 sm:space-y-5">
        <ActivityMetaRow activity={activity} records={performanceRecords} />

        {isHike && activity.hikeTrip ? <HikeTripMemberLink hikeTrip={activity.hikeTrip} /> : null}

        <ActivityDetailHero
          activity={activity}
          isStrength={isStrength}
          isTriathlon={isTriathlon}
          multisportLegs={multisportLegs}
          strengthStats={strengthStats}
        />

        {/* Strength: exercises are the main visual plane (map equivalent). */}
        {isStrength ? <ActivityStrengthExercises activity={activity} /> : null}

        {hikeSummary?.variant === 'overnight' ? (
          <ActivityHikeOvernightPanel summary={hikeSummary} />
        ) : null}

        <ActivityGoalValidationsCard validations={goalValidations} />
      </div>

      {isTriathlon && multisportLegs && <TriathlonLegsPanel legs={multisportLegs} />}

      {isTriathlon ? (
        <>
          {coachPanel}
          <ActivityDetailInsights activityId={activity.id} type={activity.type} isTriathlon />
        </>
      ) : (
        !isStrength && (
          <ActivityDetailInsights
            activityId={activity.id}
            coachPanel={coachPanel}
            expectMap={activityDetailExpectsMap(activity)}
            isTriathlon={false}
            type={activity.type}
          />
        )
      )}

      <ActivitySpecsNotes activity={activity} specs={specs} />
    </div>
  );
}
