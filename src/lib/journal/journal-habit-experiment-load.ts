/**
 * Load a few recent journal habit experiments with the journal and DailyHealth
 * evidence they need, then evaluate them at read time (ADR-032). Every query is
 * scoped to the athlete resolved by the server.
 */

import type { PrismaClient } from '@prisma/client';
import { OUTCOMES, type JournalOutcomeKey } from '@/lib/journal/journal-habit-analysis';
import {
  HEALTH_ROW_SELECT,
  parseRecordedFactors,
  trainingDayIdFromDate,
} from '@/lib/journal/journal-habit-analysis-load';
import {
  EXPERIMENT_BASELINE_DAYS,
  evaluateExperiment,
  experimentReviewDayId,
  type EvaluatedExperiment,
  type ExperimentEvidence,
  type ExperimentRecord,
} from '@/lib/journal/journal-habit-experiment';
import { addTrainingDays } from '@/lib/training/training-day';

/** One running test plus a short history is all the page shows. */
const EXPERIMENT_HISTORY_LIMIT = 6;

const EXPERIMENT_SELECT = {
  id: true,
  factorId: true,
  intent: true,
  startDayId: true,
  cancelledAt: true,
} as const;

function evidenceRange(records: readonly ExperimentRecord[]): { from: string; to: string } {
  const starts = records.map((record) => record.startDayId).sort();
  const reviews = records.map(experimentReviewDayId).sort();
  return {
    from: addTrainingDays(starts[0]!, -EXPERIMENT_BASELINE_DAYS),
    to: reviews[reviews.length - 1]!,
  };
}

function emptyOutcomeSeries(): Record<JournalOutcomeKey, Map<string, number>> {
  return {
    sleepMinutes: new Map(),
    recoveryScore: new Map(),
    bodyBattery: new Map(),
  };
}

async function loadExperimentEvidence(
  prisma: PrismaClient,
  athleteId: string,
  records: readonly ExperimentRecord[],
): Promise<ExperimentEvidence> {
  const { from, to } = evidenceRange(records);
  const [journals, healthRows] = await Promise.all([
    prisma.athleteDayJournal.findMany({
      where: { athleteId, trainingDayId: { gte: from, lte: to } },
      select: { trainingDayId: true, factors: true },
    }),
    prisma.dailyHealth.findMany({
      where: {
        athleteId,
        date: { gte: new Date(`${from}T00:00:00Z`), lte: new Date(`${to}T00:00:00Z`) },
      },
      select: HEALTH_ROW_SELECT,
    }),
  ]);

  const outcomesByDay = emptyOutcomeSeries();
  for (const row of healthRows) {
    const dayId = trainingDayIdFromDate(row.date);
    for (const outcome of OUTCOMES) {
      const value = row[outcome];
      if (value !== null) {
        outcomesByDay[outcome].set(dayId, value);
      }
    }
  }

  return {
    factorsByDay: new Map(
      journals.map((journal) => [journal.trainingDayId, parseRecordedFactors(journal.factors)]),
    ),
    outcomesByDay,
  };
}

export async function loadJournalHabitExperiments(
  prisma: PrismaClient,
  athleteId: string,
  todayDayId: string,
): Promise<EvaluatedExperiment[]> {
  const records = await prisma.journalHabitExperiment.findMany({
    where: { athleteId },
    orderBy: { startDayId: 'desc' },
    take: EXPERIMENT_HISTORY_LIMIT,
    select: EXPERIMENT_SELECT,
  });
  if (records.length === 0) {
    return [];
  }
  const evidence = await loadExperimentEvidence(prisma, athleteId, records);
  return records.map((record) => evaluateExperiment(record, evidence, todayDayId));
}

/** A test is active until its automatic review — one lever at a time. */
export function findRunningExperiment(
  experiments: readonly EvaluatedExperiment[],
): EvaluatedExperiment | null {
  return experiments.find((experiment) => experiment.status === 'running') ?? null;
}
