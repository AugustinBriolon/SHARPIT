import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { TriathlonLegsPanel } from '@/components/training/activity/insights/triathlon-legs-panel';
import { ActivityDetailHeader } from '@/components/training/activity/detail/activity-detail-header';
import { ActivityDetailHero } from '@/components/training/activity/detail/activity-detail-hero';
import {
  buildActivitySpecs,
  buildStrengthStats,
} from '@/components/training/activity/detail/activity-detail-helpers';
import { ActivityHikeOvernightPanel } from '@/components/training/activity/detail/activity-hike-overnight-panel';
import { ActivityMetaRow } from '@/components/training/activity/detail/activity-meta-row';
import { ActivityDetailRouteSkeleton } from '@/components/training/activity/detail/activity-detail-route-skeleton';
import { ActivitySpecsNotes } from '@/components/training/activity/detail/activity-specs-notes';
import { ActivityStrengthExercises } from '@/components/training/activity/detail/activity-strength-exercises';
import { ActivityGoalValidationsCard } from '@/components/goals/cards/activity-goal-validations-card';
import { ActivityDetailInsights } from '@/components/training/activity/insights/activity-detail-insights';
import { ActivityNarrativeSection } from '@/components/training/activity/insights/activity-narrative-section';
import { isEligibleForActivityNarrative } from '@/lib/activity/narrative/activity-narrative-config';
import { activityDetailExpectsMap } from '@/lib/activity/detail/activity-detail-skeleton-layout';
import { buildHikeOvernightSummary } from '@/lib/activity/hike/hike-overnight-summary';
import { canGenerateNarrativeForActivity } from '@/lib/access/narrative-trial';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
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

type ActivityDetail = NonNullable<Awaited<ReturnType<typeof getActivityById>>>;

function buildHikeSummaryForActivity(activity: ActivityDetail) {
  if (activity.type !== ActivityType.HIKE) {
    return null;
  }
  return buildHikeOvernightSummary({
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
  });
}

function buildCoachNarrativePanel(
  activity: ActivityDetail,
  coachEnabled: boolean,
  access: { isPro: boolean; allowed: boolean },
) {
  const showCoachPanel =
    coachEnabled &&
    NARRATIVE_TYPES.has(activity.type) &&
    isEligibleForActivityNarrative(new Date(activity.date));
  if (!showCoachPanel) {
    return undefined;
  }
  return (
    <ActivityNarrativeSection
      activityDate={activity.date}
      activityId={activity.id}
      activityType={activity.type}
      canGenerate={access.allowed}
      coachEnabled={coachEnabled}
      isPro={access.isPro}
      narrativeAnalysis={activity.narrativeAnalysis}
      narrativeAnalyzedAt={activity.narrativeAnalyzedAt}
    />
  );
}

function ActivityDetailInsightsSection({
  activity,
  coachPanel,
  isTriathlon,
}: {
  activity: ActivityDetail;
  coachPanel: ReturnType<typeof buildCoachNarrativePanel>;
  isTriathlon: boolean;
}) {
  if (isTriathlon) {
    return (
      <>
        {coachPanel}
        <ActivityDetailInsights activityId={activity.id} type={activity.type} isTriathlon />
      </>
    );
  }
  if (activity.type === ActivityType.STRENGTH) {
    return null;
  }
  return (
    <ActivityDetailInsights
      activityId={activity.id}
      coachPanel={coachPanel}
      expectMap={activityDetailExpectsMap(activity)}
      isTriathlon={false}
      type={activity.type}
    />
  );
}

function ActivityDetailContent({
  activity,
  isStrength,
  isTriathlon,
  isHike,
  hikeSummary,
  multisportLegs,
  goalValidations,
  performanceRecords,
  strengthStats,
  coachPanel,
  specs,
}: {
  activity: ActivityDetail;
  isStrength: boolean;
  isTriathlon: boolean;
  isHike: boolean;
  hikeSummary: ReturnType<typeof buildHikeSummaryForActivity>;
  multisportLegs: Awaited<ReturnType<typeof getMultisportLegsForActivity>> | null;
  goalValidations: Awaited<ReturnType<typeof getGoalAchievementsForActivity>>;
  performanceRecords: Awaited<ReturnType<typeof getPerformanceRecordsForActivity>>;
  strengthStats: ReturnType<typeof buildStrengthStats>;
  coachPanel: ReturnType<typeof buildCoachNarrativePanel>;
  specs: ReturnType<typeof buildActivitySpecs>;
}) {
  return (
    <>
      <ActivityDetailHeader
        activity={{
          id: activity.id,
          type: activity.type,
          title: activity.title,
          date: activity.date,
          source: activity.source,
          garminId: activity.garminId,
          stravaId: activity.stravaId,
          duration: activity.duration,
          load: activity.load,
          rpe: activity.rpe,
          feeling: activity.feeling,
          hikeTrip: activity.hikeTrip,
          plannedSession: activity.plannedSession,
        }}
      />

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

        {isStrength ? (
          <ActivityStrengthExercises
            activity={{ id: activity.id, strengthSets: activity.strengthSets }}
          />
        ) : null}

        {hikeSummary?.variant === 'overnight' ? (
          <ActivityHikeOvernightPanel summary={hikeSummary} />
        ) : null}

        <ActivityGoalValidationsCard validations={goalValidations} />
      </div>

      {isTriathlon && multisportLegs ? <TriathlonLegsPanel legs={multisportLegs} /> : null}

      <ActivityDetailInsightsSection
        activity={activity}
        coachPanel={coachPanel}
        isTriathlon={isTriathlon}
      />

      <ActivitySpecsNotes activity={activity} specs={specs} />
    </>
  );
}

async function ActivityDetailBody({ id }: { id: string }) {
  const athleteId = await getCurrentAthleteId();
  // Start independent fetches immediately — do not wait for activity first.
  const activityPromise = getActivityById(athleteId, id);
  const goalValidationsPromise = getGoalAchievementsForActivity(id);
  const performanceRecordsPromise = getPerformanceRecordsForActivity(athleteId, id);

  const activity = await activityPromise;
  if (!activity) {
    notFound();
  }

  const isStrength = activity.type === ActivityType.STRENGTH;
  const isTriathlon = activity.type === ActivityType.TRIATHLON;
  const isHike = activity.type === ActivityType.HIKE;
  const hikeSummary = buildHikeSummaryForActivity(activity);

  // Legs and narrative access depend on activity; goals/records already started above.
  const [multisportLegs, goalValidations, performanceRecords, narrativeAccess] = await Promise.all([
    isTriathlon ? getMultisportLegsForActivity(athleteId, activity) : Promise.resolve(null),
    goalValidationsPromise,
    performanceRecordsPromise,
    canGenerateNarrativeForActivity(athleteId, activity.date),
  ]);
  const coachEnabled = isCoachConfigured();
  const specs = buildActivitySpecs(activity);
  const strengthStats = buildStrengthStats(activity);
  const coachPanel = buildCoachNarrativePanel(activity, coachEnabled, narrativeAccess);

  return (
    <ActivityDetailContent
      activity={activity}
      coachPanel={coachPanel}
      goalValidations={goalValidations}
      hikeSummary={hikeSummary}
      isHike={isHike}
      isStrength={isStrength}
      isTriathlon={isTriathlon}
      multisportLegs={multisportLegs}
      performanceRecords={performanceRecords}
      specs={specs}
      strengthStats={strengthStats}
    />
  );
}

export default async function ActivityDetailPage({ params }: PageProps) {
  const { id } = await params;

  // No weather / narrative enrich on browse — that belongs to ingest (sync / create / link).
  // Opening an old activity must stay Instant; coach synthesis is on-demand via the UI.

  return (
    <div className="relative z-0 space-y-4 sm:space-y-6">
      <Suspense fallback={<ActivityDetailRouteSkeleton activityId={id} />}>
        <ActivityDetailBody id={id} />
      </Suspense>
    </div>
  );
}
