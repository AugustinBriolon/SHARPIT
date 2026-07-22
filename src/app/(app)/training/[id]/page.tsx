import { notFound } from 'next/navigation';
import { ActivityInsights } from '@/components/training/activity/activity-insights';
import { TriathlonActivityInsights } from '@/components/training/activity/triathlon-activity-insights';
import { TriathlonLegsPanel } from '@/components/training/activity/triathlon-legs-panel';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { ActivityDetailHeader } from '@/components/training/activity/detail/activity-detail-header';
import { ActivityDetailHero } from '@/components/training/activity/detail/activity-detail-hero';
import {
  buildActivitySpecs,
  buildStrengthStats,
} from '@/components/training/activity/detail/activity-detail-helpers';
import { ActivityMetaRow } from '@/components/training/activity/detail/activity-meta-row';
import { ActivitySpecsNotes } from '@/components/training/activity/detail/activity-specs-notes';
import { ActivityStrengthExercises } from '@/components/training/activity/detail/activity-strength-exercises';
import { ActivityGoalValidationsCard } from '@/components/goals/cards/activity-goal-validations-card';
import { ActivityNarrativeSection } from '@/components/training/activity/activity-narrative-section';
import { enrichActivityObservedContext } from '@/lib/activity/enrich-observed-context';
import { getActivityById, getMultisportLegsForActivity } from '@/lib/queries';
import { getGoalAchievementsForActivity } from '@/lib/goals/goal-achievements';
import { isCoachConfigured } from '@/lib/ai';
import { getPerformanceRecordsForActivity } from '@/lib/training/records';
import { prisma } from '@/lib/prisma';
import { ActivityType } from '@prisma/client';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ id: string }> };

export default async function ActivityDetailPage({ params }: PageProps) {
  const { id } = await params;

  try {
    await enrichActivityObservedContext(prisma, id);
  } catch (error) {
    console.error('[activity-detail/enrich]', error);
  }

  const activity = await getActivityById(id);

  if (!activity) notFound();

  const isStrength = activity.type === ActivityType.STRENGTH;
  const isTriathlon = activity.type === ActivityType.TRIATHLON;
  const multisportLegs = isTriathlon ? await getMultisportLegsForActivity(activity) : null;
  const goalValidations = await getGoalAchievementsForActivity(activity.id);
  const performanceRecords = await getPerformanceRecordsForActivity(activity.id);
  const coachEnabled = isCoachConfigured();
  const specs = buildActivitySpecs(activity);
  const strengthStats = buildStrengthStats(activity);

  return (
    <div className="relative z-0 space-y-8">
      <MobileBackLink showOnDesktop />

      <ActivityDetailHeader activity={activity} />

      <div className="relative z-0 space-y-5">
        <ActivityMetaRow activity={activity} records={performanceRecords} />

        <ActivityNarrativeSection
          activityDate={activity.date}
          activityId={activity.id}
          activityType={activity.type}
          coachEnabled={coachEnabled}
          narrativeAnalysis={activity.narrativeAnalysis}
          narrativeAnalyzedAt={activity.narrativeAnalyzedAt}
        />

        <ActivityGoalValidationsCard validations={goalValidations} />

        <ActivityDetailHero
          activity={activity}
          isStrength={isStrength}
          isTriathlon={isTriathlon}
          multisportLegs={multisportLegs}
          strengthStats={strengthStats}
        />
      </div>

      {isTriathlon && multisportLegs && <TriathlonLegsPanel legs={multisportLegs} />}

      {isTriathlon ? (
        <TriathlonActivityInsights activityId={activity.id} />
      ) : (
        !isStrength && <ActivityInsights activityId={activity.id} type={activity.type} />
      )}

      {isStrength && <ActivityStrengthExercises activity={activity} />}

      <ActivitySpecsNotes activity={activity} specs={specs} />
    </div>
  );
}
