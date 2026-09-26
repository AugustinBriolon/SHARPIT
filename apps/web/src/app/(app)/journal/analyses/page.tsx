import { Suspense } from 'react';
import { JournalAnalysesScreen } from '@/components/journal/analyses/journal-analyses-screen';
import { MobileDrillDownHeader } from '@/components/layout/header/mobile-drill-down-header';
import { Skeleton } from '@/components/ui/skeleton';
import { hasProAccess } from '@sharpit/server/lib/access/tier';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import { buildJournalAnalysesViewModel } from '@sharpit/server/lib/journal/journal-analyses-view-model';
import { loadJournalHabitFindings } from '@sharpit/server/lib/journal/journal-habit-analysis-load';
import { loadJournalHabitExperiments } from '@sharpit/server/lib/journal/journal-habit-experiment-load';
import {
  testedFactorIds,
  toHabitExperimentView,
} from '@sharpit/server/lib/journal/journal-habit-experiment-view';
import { buildJournalHabitReading } from '@sharpit/server/lib/journal/journal-habit-reading';
import {
  JOURNAL_ANALYSIS_MIN_DAYS,
  isJournalAnalysisReady,
} from '@sharpit/server/lib/journal/journal-limits';
import { prisma } from '@sharpit/db/client';
import { getAthleteProfile } from '@sharpit/server/lib/queries';
import { trainingDayIdForNow } from '@sharpit/core/training/training-day';

function JournalAnalysesSkeleton() {
  return (
    <div className="space-y-6" aria-busy>
      <Skeleton className="rounded-analysis-lg h-44 w-full border-0" />
      <Skeleton className="rounded-analysis h-72 w-full border-0" />
    </div>
  );
}

/** Athlete-scoped reads live under Suspense so the shell prerenders (Cache Components). */
async function JournalAnalysesWithData() {
  const athleteId = await getCurrentAthleteId();
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

  return (
    <JournalAnalysesScreen
      analysis={reading && viewModel ? { reading, viewModel } : null}
      daysWithSignal={daysWithSignal}
      experiments={experiments.map(toHabitExperimentView)}
      isPro={hasProAccess(profile?.tier ?? 'FREE')}
      minDays={JOURNAL_ANALYSIS_MIN_DAYS}
    />
  );
}

export default function JournalAnalysesPage() {
  return (
    <div className="space-y-8">
      <MobileDrillDownHeader backHref="/journal" backLabel="Journal" title="Analyses" />
      <Suspense fallback={<JournalAnalysesSkeleton />}>
        <JournalAnalysesWithData />
      </Suspense>
    </div>
  );
}
