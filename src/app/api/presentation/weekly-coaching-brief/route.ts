import { NextRequest, NextResponse } from 'next/server';
import { addDays, startOfWeek, subDays } from 'date-fns';
import { getActiveTrainingPlan, getGoals, getPlannedSessions } from '@/lib/queries';
import { findPlanWeekForDate } from '@/lib/training/periodization';
import {
  findDecisionForPlannedSession,
  findRecentEvaluatedOutcomes,
} from '@/lib/decision-memory/repository';
import { buildLearningFeedback } from '@/lib/decision-memory/learning-feedback';
import { buildLearningFeedbackViewModel } from '@/lib/presentation/learning-feedback';
import { buildDecisionSnapshotContext } from '@/lib/decision-memory/build-snapshot-context';
import { getOrBuildAthleteSnapshot } from '@/lib/athlete-state/snapshot-service';
import { computeTrainingDayId } from '@/lib/training/training-day';
import { buildWeeklyCoachingBriefViewModel } from '@/lib/presentation/weekly-coaching-brief';
import { loadDailyTrainingStressEntries } from '@/lib/training/pmc-server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import type { CoachingDecisionRecord } from '@/lib/decision-memory/types';

const WEEK_OPTS = { weekStartsOn: 1 as const };
const LEARNING_FEEDBACK_WINDOW_DAYS = 90;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const weekStartParam = searchParams.get('weekStart');
  const weekStart = startOfWeek(weekStartParam ? new Date(weekStartParam) : new Date(), WEEK_OPTS);
  const weekEnd = addDays(weekStart, 6);
  const now = new Date();

  const athleteId = await getCurrentAthleteId();
  const [activePlan, goals, plannedSessions, dailyTrainingStress, snapshot, recentOutcomes] =
    await Promise.all([
      getActiveTrainingPlan(athleteId),
      getGoals(athleteId),
      getPlannedSessions(athleteId, { from: weekStart, to: weekEnd }),
      loadDailyTrainingStressEntries(athleteId, { refDate: now }),
      getOrBuildAthleteSnapshot(athleteId, computeTrainingDayId(now)),
      findRecentEvaluatedOutcomes(athleteId, subDays(now, LEARNING_FEEDBACK_WINDOW_DAYS)),
    ]);

  const planWeek = activePlan ? (findPlanWeekForDate(activePlan.weeks, weekStart) ?? null) : null;

  // Prefer the active plan's linked race/goal (option B fil directeur), then nearest dated goal.
  const planGoal =
    activePlan?.goalId != null
      ? (goals.find((g) => g.id === activePlan.goalId && !g.achieved) ?? null)
      : null;
  const goal =
    planGoal ?? goals.find((g) => !g.achieved && g.targetDate && g.targetDate >= weekStart) ?? null;
  const goalTitleById = new Map(goals.map((g) => [g.id, g.title] as const));

  const sessionDecisions = new Map<string, CoachingDecisionRecord>();
  await Promise.all(
    plannedSessions.map(async (session) => {
      const decision = await findDecisionForPlannedSession(athleteId, session.id);
      if (decision) sessionDecisions.set(session.id, decision);
    }),
  );

  const learningFeedback = buildLearningFeedbackViewModel(buildLearningFeedback(recentOutcomes));

  const viewModel = buildWeeklyCoachingBriefViewModel({
    weekStart,
    now,
    planWeek: planWeek
      ? {
          phase: planWeek.phase,
          targetLoad: planWeek.targetLoad,
          isDeload: planWeek.isDeload,
          focus: planWeek.focus,
        }
      : null,
    goal: goal ? { title: goal.title, targetDate: goal.targetDate, horizon: goal.horizon } : null,
    plannedSessions: plannedSessions.map((s) => ({
      id: s.id,
      date: s.date,
      type: s.type,
      intensity: s.intensity,
      durationMin: s.durationMin,
      load: s.load,
      goalId: s.goalId,
    })),
    goalTitleById,
    dailyTrainingStress,
    sessionDecisions,
    todaysSnapshotContext: snapshot.decision ? buildDecisionSnapshotContext(snapshot) : null,
    learningFeedback,
  });

  return NextResponse.json({ viewModel });
}
