/**
 * Load Today habit coaching signal (presentation only).
 * Reuses journal findings + running experiment — never writes Core.
 */

import type { PrismaClient } from '@prisma/client';
import { loadJournalHabitFindings } from '@/lib/health/journal-habit-analysis-load';
import {
  findRunningExperiment,
  loadJournalHabitExperiments,
} from '@/lib/health/journal-habit-experiment-load';
import { toHabitExperimentView } from '@/lib/health/journal-habit-experiment-view';
import {
  buildTodayJournalHabitBridge,
  resolveTodayJournalHabitCallout,
} from '@/lib/health/journal-habit-today-bridge';
import {
  buildHabitCoachingSignal,
  type HabitCoachingSignal,
} from '@/lib/today/rich/habit-coaching-signal';

const EMPTY_SIGNAL: HabitCoachingSignal = { callout: null };

/**
 * Best-effort habit signal for Today. Failures stay silent — Today must still
 * render Twin decision without journal.
 */
export async function loadTodayHabitCoachingSignal(
  prisma: PrismaClient,
  athleteId: string,
  trainingDayId: string,
): Promise<HabitCoachingSignal> {
  try {
    const [{ daysWithSignal, findings }, experiments] = await Promise.all([
      loadJournalHabitFindings(prisma, athleteId),
      loadJournalHabitExperiments(prisma, athleteId, trainingDayId),
    ]);
    const bridge = buildTodayJournalHabitBridge(findings, daysWithSignal);
    const running = findRunningExperiment(experiments);
    const runningView = running ? toHabitExperimentView(running) : null;
    const callout = resolveTodayJournalHabitCallout(runningView, bridge);
    return buildHabitCoachingSignal(callout);
  } catch (error) {
    console.error('Today habit coaching signal unavailable', error);
    return EMPTY_SIGNAL;
  }
}
