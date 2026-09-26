import { prisma } from '@sharpit/db/client';
import { trainingDayIdForNow } from '@sharpit/core/training/training-day';
import { hasProAccess } from '@sharpit/server/lib/access/tier';
import { buildJournalAnalysesViewModel } from '@sharpit/server/lib/journal/journal-analyses-view-model';
import { loadJournalHabitFindings } from '@sharpit/server/lib/journal/journal-habit-analysis-load';
import { loadJournalHabitExperiments } from '@sharpit/server/lib/journal/journal-habit-experiment-load';
import {
  testedFactorIds,
  toHabitExperimentView,
} from '@sharpit/server/lib/journal/journal-habit-experiment-view';
import { buildJournalHabitReading } from '@sharpit/server/lib/journal/journal-habit-reading';
import {
  isJournalAnalysisReady,
  JOURNAL_ANALYSIS_MIN_DAYS,
} from '@sharpit/server/lib/journal/journal-limits';
import { getAthleteProfile } from '@sharpit/server/lib/queries';

/** The journal analyses screen, read and computed on `api.` (ADR-048 phase 3f). */
export async function loadJournalAnalyses(athleteId: string) {
  const [profile, { daysWithSignal, daysInSpan, findings }, experiments] = await Promise.all([
    getAthleteProfile(athleteId).catch(() => null),
    loadJournalHabitFindings(prisma, athleteId),
    loadJournalHabitExperiments(prisma, athleteId, trainingDayIdForNow()),
  ]);
  const reading = isJournalAnalysisReady(daysWithSignal)
    ? buildJournalHabitReading(findings, daysWithSignal)
    : null;
  const viewModel = reading
    ? buildJournalAnalysesViewModel({
        findings,
        reading,
        daysInSpan,
        testedFactorIds: testedFactorIds(experiments),
      })
    : null;
  return {
    analysis: reading && viewModel ? { reading, viewModel } : null,
    daysWithSignal,
    experiments: experiments.map(toHabitExperimentView),
    isPro: hasProAccess(profile?.tier ?? 'FREE'),
    minDays: JOURNAL_ANALYSIS_MIN_DAYS,
  };
}

export type JournalAnalysesPayload = Awaited<ReturnType<typeof loadJournalAnalyses>>;
