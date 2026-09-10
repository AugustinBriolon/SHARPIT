import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { hasProAccess } from '@/lib/access/tier';
import { loadJournalHabitFindings } from '@/lib/health/journal-habit-analysis-load';
import { JOURNAL_ANALYSIS_MIN_DAYS, isJournalAnalysisReady } from '@/lib/health/journal-limits';
import { getAthleteProfile } from '@/lib/queries';
import { prisma } from '@/lib/prisma';
import { JournalAnalysesScreen } from '@/components/journal/journal-analyses-screen';

export default async function JournalAnalysesPage() {
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
