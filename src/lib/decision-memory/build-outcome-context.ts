/**
 * Decision Memory — outcome-evaluation context builder.
 *
 * The only place in the outcome-evaluation path that touches Prisma. Gathers exactly
 * what `evaluateOutcome` (pure) needs — never re-derives physiological state itself.
 */

import { addTrainingDays, computeTrainingDayId } from '@/lib/training/training-day';
import { prisma } from '@/lib/prisma';
import { getPlannedSessionById } from '@/lib/queries';
import { parseSessionAnalysis } from '@/lib/planned-session/session-analysis-display';
import type { OutcomeEvaluationInput } from './types';

const RECOVERY_WINDOW_DAYS = [1, 2, 3];

export async function buildOutcomeEvaluationContext(
  plannedSessionId: string,
  now: Date = new Date(),
): Promise<OutcomeEvaluationInput | null> {
  const session = await getPlannedSessionById(plannedSessionId);
  if (!session) return null;

  const trainingDayId = computeTrainingDayId(session.date);
  const windowDayIds = RECOVERY_WINDOW_DAYS.map((offset) => addTrainingDays(trainingDayId, offset));

  const [conditionObservations, snapshotRecords] = await Promise.all([
    prisma.conditionObservation.findMany({
      where: { plannedSessionId },
      select: { observedAt: true, symptomPresent: true, severityReported: true, comment: true },
    }),
    prisma.athleteSnapshotRecord.findMany({
      where: { trainingDayId: { in: windowDayIds } },
      select: { trainingDayId: true, payload: true },
    }),
  ]);

  const snapshotByDay = new Map(snapshotRecords.map((r) => [r.trainingDayId, r.payload]));
  const recoverySnapshots = windowDayIds.map((dayId) => {
    const payload = snapshotByDay.get(dayId) as
      { readiness?: number | null; fatigue?: { fatigueIndex?: number | null } } | undefined;
    return {
      readiness: payload?.readiness ?? null,
      fatigueIndex: payload?.fatigue?.fatigueIndex ?? null,
    };
  });

  return {
    sessionDate: session.date,
    now,
    plannedFields: {
      durationMin: session.durationMin,
      load: session.load,
    },
    linkedActivity: session.activity
      ? {
          duration: session.activity.duration,
          load: session.activity.load,
          rpe: session.activity.rpe,
          feeling: session.activity.feeling,
        }
      : null,
    sessionAnalysis: parseSessionAnalysis(session.analysis),
    conditionObservations,
    recoverySnapshots,
  };
}
