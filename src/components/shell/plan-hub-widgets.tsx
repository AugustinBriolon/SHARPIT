'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAthleteSnapshot } from '@/hooks/use-athlete-snapshot';
import { useActivities, useGoals, usePlannedSessions } from '@/hooks/use-data';
import { PlanActions } from '@/components/plan/plan-actions';
import { PlanGoalBand, PlanGoalBandSkeleton } from '@/components/plan/plan-goal-band';
import {
  PlanProjectionSection,
  PlanProjectionSectionSkeleton,
} from '@/components/plan/plan-projection-section';
import { PlanTrajectoryStrip } from '@/components/plan/plan-trajectory-strip';
import { PlanWeekSection, PlanWeekSectionSkeleton } from '@/components/plan/plan-week-section';
import { selectPlanGoal } from '@/lib/plan/plan-goal';
import { buildPlanWeek, type PlanWeek } from '@/lib/plan/plan-week';
import { isHardSessionIntensity, shouldGateHardIntensities } from '@/lib/plan/intensity-gate';
import { buildPlanTrajectoryPreviews } from '@/lib/today/signal-previews';
import { mapVerdictToDisplay, type OverallVerdict } from '@/lib/today/today-mapping';
import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';

/** Client "today" after mount, so prerender never depends on an impure clock. */
function useClientNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
  }, []);
  return now;
}

function resolveVerdict(snapshot: AthleteSnapshot | null): OverallVerdict | null {
  const verdict = snapshot?.todaysDecision ?? snapshot?.decision?.overallVerdict;
  return (verdict as OverallVerdict | undefined) ?? null;
}

/**
 * Hard sessions still owed while readiness says to back off.
 *
 * Marked, never hidden: the gate cannot remove work from a plan the athlete
 * already committed to, so it names the conflict and lets him decide.
 */
function countGatedSessions(week: PlanWeek | null, verdict: OverallVerdict | null): number {
  if (!week || !shouldGateHardIntensities(verdict)) {
    return 0;
  }
  return week.remaining.filter((entry) => isHardSessionIntensity(entry.planned?.intensity)).length;
}

/**
 * Plan hub, the week read against the goal it serves.
 *
 * Questions in order: what am I building toward, what does this week ask of me
 * and what is already done, how is the block adapting / what charge am I under,
 * what will holding it produce, and how do I change it.
 * See `docs/design/INFORMATION_ARCHITECTURE.md` ("My week").
 */
function PlanHubWidgetsContent({
  goalsQuery,
  weekReady,
  week,
  verdict,
  goal,
  trajectoryPreviews,
  snapshot,
  now,
}: {
  goalsQuery: ReturnType<typeof useGoals>;
  weekReady: boolean;
  week: PlanWeek | null;
  verdict: OverallVerdict | null;
  goal: ReturnType<typeof selectPlanGoal>;
  trajectoryPreviews: ReturnType<typeof buildPlanTrajectoryPreviews>;
  snapshot: AthleteSnapshot | null;
  now: Date | null;
}) {
  return (
    <div className="space-y-8">
      {goalsQuery.isPending ? <PlanGoalBandSkeleton /> : <PlanGoalBand goal={goal} />}

      {weekReady && week ? (
        <PlanWeekSection
          gatedCount={countGatedSessions(week, verdict)}
          verdict={verdict}
          verdictLabel={verdict ? mapVerdictToDisplay(verdict).label : null}
          week={week}
        />
      ) : (
        <PlanWeekSectionSkeleton />
      )}

      <PlanTrajectoryStrip loading={!snapshot} previews={trajectoryPreviews} />

      {now ? <PlanProjectionSection now={now} /> : <PlanProjectionSectionSkeleton />}

      <PlanActions />
    </div>
  );
}

export function PlanHubWidgets() {
  const now = useClientNow();
  const goalsQuery = useGoals();
  const activitiesQuery = useActivities();
  const plannedQuery = usePlannedSessions();
  const { snapshot } = useAthleteSnapshot();

  const verdict = resolveVerdict(snapshot);
  const goal = useMemo(() => selectPlanGoal(goalsQuery.data ?? []), [goalsQuery.data]);

  const week = useMemo(
    () =>
      now
        ? buildPlanWeek({
            activities: activitiesQuery.data ?? [],
            plannedSessions: plannedQuery.data ?? [],
            now,
          })
        : null,
    [activitiesQuery.data, plannedQuery.data, now],
  );

  const weekReady = week !== null && !activitiesQuery.isPending && !plannedQuery.isPending;
  const trajectoryPreviews = useMemo(
    () => (snapshot ? buildPlanTrajectoryPreviews(snapshot) : []),
    [snapshot],
  );

  return (
    <PlanHubWidgetsContent
      goal={goal}
      goalsQuery={goalsQuery}
      now={now}
      snapshot={snapshot}
      trajectoryPreviews={trajectoryPreviews}
      verdict={verdict}
      week={week}
      weekReady={weekReady}
    />
  );
}
