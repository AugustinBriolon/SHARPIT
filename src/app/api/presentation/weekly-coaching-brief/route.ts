import { NextRequest, NextResponse } from 'next/server';
import { addDays, startOfWeek, subDays } from 'date-fns';
import {
  getActiveTrainingPlan,
  getGoals,
  getPlannedSessions,
  getActivitiesList,
} from '@/lib/queries';
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
import type { CoachingDecisionRecord } from '@/lib/decision-memory/types';

export const dynamic = 'force-dynamic';

const WEEK_OPTS = { weekStartsOn: 1 as const };
const LEARNING_FEEDBACK_WINDOW_DAYS = 90;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const weekStartParam = searchParams.get('weekStart');
  const weekStart = startOfWeek(weekStartParam ? new Date(weekStartParam) : new Date(), WEEK_OPTS);
  const weekEnd = addDays(weekStart, 6);
  const now = new Date();

  const [activePlan, goals, plannedSessions, recentActivities, snapshot, recentOutcomes] =
    await Promise.all([
      getActiveTrainingPlan(),
      getGoals(),
      getPlannedSessions({ from: weekStart, to: weekEnd }),
      getActivitiesList({ sinceDays: 42 }),
      getOrBuildAthleteSnapshot(computeTrainingDayId(now)),
      findRecentEvaluatedOutcomes(subDays(now, LEARNING_FEEDBACK_WINDOW_DAYS)),
    ]);

  const planWeek = activePlan ? (findPlanWeekForDate(activePlan.weeks, weekStart) ?? null) : null;

  const goal = goals.find((g) => !g.achieved && g.targetDate && g.targetDate >= weekStart) ?? null;

  const sessionDecisions = new Map<string, CoachingDecisionRecord>();
  await Promise.all(
    plannedSessions.map(async (session) => {
      const decision = await findDecisionForPlannedSession(session.id);
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
    })),
    recentActivities: recentActivities.map((a) => ({ load: a.load, date: a.date })),
    sessionDecisions,
    todaysSnapshotContext: snapshot.decision ? buildDecisionSnapshotContext(snapshot) : null,
    learningFeedback,
  });

  return NextResponse.json({ viewModel });
}
