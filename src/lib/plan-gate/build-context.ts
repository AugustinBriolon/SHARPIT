import { addDays, min as minDate, max as maxDate } from 'date-fns';
import { getOrBuildAthleteSnapshot } from '@/lib/athlete-state/snapshot-service';
import {
  getActivitiesList,
  getAthleteProfile,
  getGoalById,
  getActiveTrainingPlan,
  getPlannedSessions,
} from '@/lib/queries';
import { getGoogleAccount, getUpcomingBusy } from '@/lib/integrations/google-sync';
import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';
import type { GateContext, GateProposal } from './types';

const LOOKBACK_DAYS = 42; // matches computeTrainingLoad's chronic window
const WINDOW_PADDING_DAYS = 7; // for recovery-spacing / duplicate checks near the proposal window edges

function hasThresholds(
  profile: {
    ftpW: number | null;
    lthr: number | null;
    maxHr: number | null;
    runThresholdPaceSecPerKm: number | null;
  } | null,
): boolean {
  if (!profile) return false;
  return (
    profile.ftpW != null ||
    profile.lthr != null ||
    profile.maxHr != null ||
    profile.runThresholdPaceSecPerKm != null
  );
}

/**
 * The ONLY place in the plan-gate module that touches Prisma or the Snapshot service.
 * Builds a fully-resolved, deterministic GateContext — evaluate-plan.ts never fetches
 * anything itself.
 *
 * Also returns the raw `snapshot` used to build the context, so callers that need the
 * full AthleteSnapshot (e.g. Decision Memory's frozen snapshotContext) don't have to
 * fetch it a second time.
 */
export async function buildGateContext(params: {
  trainingDayId: string;
  proposals: readonly GateProposal[];
  goalId?: string | null;
  now?: Date;
}): Promise<{ context: GateContext; snapshot: AthleteSnapshot }> {
  const { trainingDayId, proposals, goalId, now = new Date() } = params;

  const proposalDates = proposals.map((p) => new Date(`${p.date}T00:00:00`));
  const windowStart =
    proposalDates.length > 0
      ? addDays(minDate(proposalDates), -WINDOW_PADDING_DAYS)
      : addDays(now, -WINDOW_PADDING_DAYS);
  const windowEnd =
    proposalDates.length > 0
      ? addDays(maxDate(proposalDates), WINDOW_PADDING_DAYS)
      : addDays(now, WINDOW_PADDING_DAYS);

  const [
    snapshot,
    recentActivities,
    existingSessionsRaw,
    goal,
    trainingPlan,
    athleteProfile,
    googleAccount,
  ] = await Promise.all([
    getOrBuildAthleteSnapshot(trainingDayId),
    getActivitiesList({ sinceDays: LOOKBACK_DAYS }),
    getPlannedSessions({ from: windowStart, to: windowEnd }),
    goalId ? getGoalById(goalId) : Promise.resolve(null),
    getActiveTrainingPlan(),
    getAthleteProfile(),
    getGoogleAccount(),
  ]);

  // null = no calendar connected (skip the rule); [] = connected with nothing busy.
  const busyBlocks = googleAccount
    ? await getUpcomingBusy(WINDOW_PADDING_DAYS + Math.max(1, proposalDates.length)).catch(() => [])
    : null;

  const context: GateContext = {
    trainingDayId,
    decision: snapshot.decision,
    physicalHealth: snapshot.physicalHealth,
    fatigueTrainingCapacity: snapshot.fatigue?.trainingCapacity ?? null,
    recentActivities: recentActivities.map((a) => ({ load: a.load, date: new Date(a.date) })),
    existingSessions: existingSessionsRaw.map((s) => ({
      id: s.id,
      date: new Date(s.date),
      type: s.type,
      intensity: s.intensity,
      completed: s.completed,
      load: s.load,
    })),
    goal: goal ? { horizon: goal.horizon, targetDate: goal.targetDate } : null,
    planWeeks: trainingPlan
      ? trainingPlan.weeks.map((w) => ({
          weekStart: w.weekStart,
          phase: w.phase,
          targetLoad: w.targetLoad,
        }))
      : [],
    busyBlocks,
    athleteProfile: { hasThresholds: hasThresholds(athleteProfile) },
    now,
  };

  return { context, snapshot };
}
