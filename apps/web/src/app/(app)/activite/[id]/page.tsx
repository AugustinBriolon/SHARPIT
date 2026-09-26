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
import { ActivityDetailCacheSeeder } from '@/components/training/activity/detail/activity-detail-cache-seeder';
import { ActivitySpecsNotes } from '@/components/training/activity/detail/activity-specs-notes';
import { ActivityStrengthExercises } from '@/components/training/activity/detail/activity-strength-exercises';
import { ActivityGoalValidationsCard } from '@/components/goals/cards/activity-goal-validations-card';
import { ActivityDetailInsights } from '@/components/training/activity/insights/activity-detail-insights';
import { ActivityNarrativeSection } from '@/components/training/activity/insights/activity-narrative-section';
import { isEligibleForActivityNarrative } from '@sharpit/app/lib/activity/narrative/activity-narrative-config';
import { activityDetailExpectsMap } from '@sharpit/app/lib/activity/detail/activity-detail-skeleton-layout';
import { buildHikeOvernightSummary } from '@sharpit/app/lib/activity/hike/hike-overnight-summary';
import { ActivityBrickSiblingNav } from '@/components/training/activity/detail/activity-brick-sibling-nav';
import type { ActivityDetailPayload } from '@sharpit/app/lib/web/payloads';
import { cachedServerApiJson } from '@/server/api-client';
import { HikeTripMemberLink } from '@/components/training/trip/hike-trip-member-link';
import { ActivityType } from '@prisma/client';

type PageProps = { params: Promise<{ id: string }> };

const NARRATIVE_TYPES = new Set<ActivityType>([
  ActivityType.RUN,
  ActivityType.BIKE,
  ActivityType.SWIM,
]);

type ActivityDetail = ActivityDetailPayload['activity'];

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
      activityTitle={activity.title}
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
  brickSiblings,
}: {
  activity: ActivityDetail;
  isStrength: boolean;
  isTriathlon: boolean;
  isHike: boolean;
  hikeSummary: ReturnType<typeof buildHikeSummaryForActivity>;
  multisportLegs: ActivityDetailPayload['multisportLegs'];
  goalValidations: ActivityDetailPayload['goalValidations'];
  performanceRecords: ActivityDetailPayload['performanceRecords'];
  strengthStats: ReturnType<typeof buildStrengthStats>;
  coachPanel: ReturnType<typeof buildCoachNarrativePanel>;
  specs: ReturnType<typeof buildActivitySpecs>;
  brickSiblings: ActivityDetailPayload['brickSiblings'];
}) {
  return (
    <>
      <ActivityDetailCacheSeeder activity={activity} />
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
          weather: activity.weather,
          hikeTrip: activity.hikeTrip,
          plannedSession: activity.plannedSession,
        }}
      />

      <div className="relative z-0 space-y-5 sm:space-y-6">
        <ActivityMetaRow activity={activity} records={performanceRecords} />

        {isHike && activity.hikeTrip ? <HikeTripMemberLink hikeTrip={activity.hikeTrip} /> : null}

        <ActivityDetailHero
          activity={activity}
          isStrength={isStrength}
          isTriathlon={isTriathlon}
          multisportLegs={multisportLegs}
          strengthStats={strengthStats}
        />

        <ActivityBrickSiblingNav siblings={brickSiblings} />

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
  const detail = await cachedServerApiJson<ActivityDetailPayload>(
    `/api/web/activity-detail/${encodeURIComponent(id)}`,
    true,
  );
  if (!detail) {
    notFound();
  }
  const {
    activity,
    multisportLegs,
    goalValidations,
    performanceRecords,
    narrativeAccess,
    brickSiblings,
    coachEnabled,
  } = detail;

  const isStrength = activity.type === ActivityType.STRENGTH;
  const isTriathlon = activity.type === ActivityType.TRIATHLON;
  const isHike = activity.type === ActivityType.HIKE;
  const hikeSummary = buildHikeSummaryForActivity(activity);

  const specs = buildActivitySpecs(activity);
  const strengthStats = buildStrengthStats(activity);
  const coachPanel = buildCoachNarrativePanel(activity, coachEnabled, narrativeAccess);

  return (
    <ActivityDetailContent
      activity={activity}
      brickSiblings={brickSiblings}
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

  return (
    <div className="activity-reading relative z-0 space-y-5 sm:space-y-7">
      {/*
        THESIS: Post-session reading as a flight log — mission header, weighted instruments, then evidence; refuses equal metric-card inventory.
        OWN-WORLD: Form-paper rules, stamp icon well, field boxes, sage accent for active proof; hairline log borders.
        STORY: Athlete understands what the sortie meant, then interrogates map, curves, and rhythm splits.
        FIRST VIEWPORT: Sticky chrome · plate (meta, title, discuss/chips) · three primary instruments.
        FORM: Logbook post-vol · grounded list index 6 · seed b31627f2 · Operate.
        FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
      */}
      <Suspense fallback={<ActivityDetailRouteSkeleton activityId={id} />}>
        <ActivityDetailBody id={id} />
      </Suspense>
    </div>
  );
}
