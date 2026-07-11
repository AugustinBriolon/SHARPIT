import { notFound } from 'next/navigation';
import { ActivityInsights } from '@/components/training/activity-insights';
import { TriathlonActivityInsights } from '@/components/training/triathlon-activity-insights';
import { TriathlonLegsPanel } from '@/components/training/triathlon-legs-panel';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { ActivityDetailHeader } from '@/components/training/activity-detail/activity-detail-header';
import { ActivityDetailHero } from '@/components/training/activity-detail/activity-detail-hero';
import {
  buildActivitySpecs,
  buildStrengthStats,
} from '@/components/training/activity-detail/activity-detail-helpers';
import { ActivityMetaRow } from '@/components/training/activity-detail/activity-meta-row';
import { ActivitySpecsNotes } from '@/components/training/activity-detail/activity-specs-notes';
import { ActivityStrengthExercises } from '@/components/training/activity-detail/activity-strength-exercises';
import { ActivityGoalValidationsCard } from '@/components/goals/activity-goal-validations-card';
import { ActivityEnvironmentInsight } from '@/components/training/activity-environment-insight';
import { ActivityNarrativeSection } from '@/components/training/activity-narrative-section';
import { PlannedSessionCompletionPanel } from '@/components/planning/planned-session-context-panel';
import { resolveActivityEnvironmentPresentation } from '@/lib/environment/activity-environment';
import { getPlannedSessionById } from '@/lib/queries';
import { buildPlannedSessionCompletionComparison } from '@/lib/planned-session/completion-comparison';
import { resolvePlannedSessionContext } from '@/lib/planned-session/resolve-context';
import { buildPlannedSessionViewModel } from '@/lib/presentation/planned-session';
import { getActivityById, getMultisportLegsForActivity } from '@/lib/queries';
import { getGoalAchievementsForActivity } from '@/lib/goal-achievements';
import { isCoachConfigured } from '@/lib/ai';
import { getPerformanceRecordsForActivity } from '@/lib/records';
import { ActivityType } from '@prisma/client';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ id: string }> };

export default async function ActivityDetailPage({ params }: PageProps) {
  const { id } = await params;
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
  const environmentPresentation = await resolveActivityEnvironmentPresentation({
    athleteId: 'default',
    activity: {
      id: activity.id,
      type: activity.type,
      date: activity.date,
      duration: activity.duration,
      weather: activity.weather,
    },
  });

  let plannedCompletionVm = null;
  if (activity.plannedSession?.id) {
    const planned = await getPlannedSessionById(activity.plannedSession.id);
    if (planned) {
      const plannedContext = await resolvePlannedSessionContext(planned);
      const completion = buildPlannedSessionCompletionComparison({
        plannedContext,
        observedCorrection: environmentPresentation.visible
          ? environmentPresentation.correction
          : null,
      });
      plannedCompletionVm = buildPlannedSessionViewModel({
        session: planned,
        context: plannedContext,
        completion,
      }).completion;
    }
  }

  return (
    <div className="relative z-0 space-y-8">
      <MobileBackLink href="/seances?tab=activites" label="Activités" showOnDesktop />

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

        {environmentPresentation.visible ? (
          <ActivityEnvironmentInsight correction={environmentPresentation.correction} />
        ) : null}

        {plannedCompletionVm ? (
          <PlannedSessionCompletionPanel completion={plannedCompletionVm} />
        ) : null}

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
