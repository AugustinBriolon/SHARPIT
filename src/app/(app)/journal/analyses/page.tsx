import { Suspense } from 'react';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { hasProAccess } from '@/lib/access/tier';
import { JournalAnalysesScreen } from '@/components/journal/journal-analyses-screen';
import { MobileDrillDownHeader } from '@/components/layout/header/mobile-drill-down-header';
import { Skeleton } from '@/components/ui/skeleton';
import { loadJournalHabitFindings } from '@/lib/health/journal-habit-analysis-load';
import { JOURNAL_ANALYSIS_MIN_DAYS, isJournalAnalysisReady } from '@/lib/health/journal-limits';
import { getAthleteProfile } from '@/lib/queries';
import { prisma } from '@/lib/prisma';

function JournalAnalysesFallback() {
  return (
    <div className="space-y-8" aria-busy>
      <MobileDrillDownHeader backHref="/journal" backLabel="Journal" title="Analyses" />
      <Skeleton className="rounded-analysis-lg h-40 w-full border-0" />
      <Skeleton className="rounded-analysis-lg h-56 w-full border-0" />
    </div>
  );
}

async function JournalAnalysesContent() {
  const athleteId = await getCurrentAthleteId();
  const [profile, { daysWithSignal, findings }] = await Promise.all([
    getAthleteProfile(athleteId).catch(() => null),
    loadJournalHabitFindings(prisma, athleteId),
  ]);
  const ready = isJournalAnalysisReady(daysWithSignal);
  const isPro = hasProAccess(profile?.tier ?? 'FREE');

  return (
    <JournalAnalysesScreen
      daysWithSignal={daysWithSignal}
      findings={ready ? findings : []}
      isPro={isPro}
      minDays={JOURNAL_ANALYSIS_MIN_DAYS}
      ready={ready}
    />
  );
}

export default function JournalAnalysesPage() {
  return (
    <Suspense fallback={<JournalAnalysesFallback />}>
      <JournalAnalysesContent />
    </Suspense>
  );
}
