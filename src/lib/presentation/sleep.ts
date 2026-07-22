import { parseISO, format, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getAthleteProfile, getHealthEntries } from '@/lib/queries';
import { getOrBuildAthleteSnapshot } from '@/lib/athlete-state/snapshot-service';
import {
  buildDailyWindowSeries,
  getIndexedHealthEntry,
  indexHealthEntriesByDay,
} from '@/lib/health/health';
import { effectiveSleepMinutes } from '@/lib/health/health';
import { analyzeSleep, toSleepEntryInputs } from '@/lib/sleep/sleep';
import {
  buildSleepScoreBreakdown,
  mapSleepScoreToAdequacy,
  SLEEP_TARGET_MIN,
} from '@/lib/sleep/sleep-scoring';
import {
  mapRecoveryToSignal,
  mapSleepAdequacySignalToDisplay,
  mapConfidenceToTier,
  type ReadinessCategory,
} from '@/lib/today/today-mapping';
import { buildSleepPageInsights } from '@/lib/product-insight/sleep-page-insights';
import { buildGlobalDecisionContext } from '@/lib/decision/global-decision-context';
import { EMPTY_GLOBAL_DECISION } from '@/core/presentation/global-decision-context';
import type { SleepViewModel } from '@/core/presentation/sleep-view-model';

const CONFIDENCE_TONE = {
  high: 'good',
  medium: 'warn',
  low: 'neutral',
} as const;

function emptySleepViewModel(): SleepViewModel {
  return {
    sleepScore: null,
    adequacyDisplay: { label: '—', colorClass: 'text-muted-foreground' },
    scoreBreakdown: buildSleepScoreBreakdown(null, null, null, null),
    totalSleepMin: null,
    deepMin: null,
    remMin: null,
    lightMin: null,
    awakeMin: null,
    bedtimeMin: null,
    wakeMin: null,
    garminScore: null,
    sleepDelta7d: null,
    targetDeltaMin: null,
    sleepTargetMin: SLEEP_TARGET_MIN,
    coachView: {
      hasData: false,
      hasDetailedData: false,
      latest: null,
      avg: { score: null, durationMin: null, deepPct: null, remPct: null, nights: 0 },
      regularityMin: null,
      recommendedBedtimeMin: null,
      recommendedDurationMin: 0,
      targetDurationMin: 0,
      debt7Min: null,
      debt14Min: null,
      insights: [],
    },
    barData: [],
    recoveryNote: null,
    insights: { primary: [], supporting: [], contextual: [] },
    globalDecision: EMPTY_GLOBAL_DECISION,
    confidencePresentation: {
      pct: null,
      label: null,
      tone: 'neutral',
    },
    emptyState: {
      title: 'Données de sommeil indisponibles.',
      description: 'Synchronise tes donnees ou reessaie plus tard.',
    },
    hierarchy: { rootId: 'sleep', order: ['hero', 'stats', 'coach', 'insights', 'trends'] },
    sections: [],
  };
}

export async function buildSleepViewModel(trainingDayId: string): Promise<SleepViewModel> {
  const snapshot = await getOrBuildAthleteSnapshot(trainingDayId);
  const { recovery } = snapshot;

  if (!recovery) return emptySleepViewModel();

  const refDate = parseISO(trainingDayId);

  const [healthEntries, athleteProfile] = await Promise.all([
    getHealthEntries(30, refDate),
    getAthleteProfile(),
  ]);

  const sleepGoals = {
    targetDurationMin: athleteProfile?.sleepTargetMinutes ?? null,
    bedtimeTargetMin: athleteProfile?.sleepBedtimeTargetMin ?? null,
  };

  const healthByDay = indexHealthEntriesByDay(healthEntries);
  const todayEntry = getIndexedHealthEntry(healthByDay, refDate);

  const deepMin = todayEntry?.sleepDeepMin ?? null;
  const remMin = todayEntry?.sleepRemMin ?? null;
  const lightMin = todayEntry?.sleepLightMin ?? null;
  const totalSleepMin = todayEntry ? effectiveSleepMinutes(todayEntry) : null;

  const awakeMin =
    totalSleepMin != null && deepMin != null && remMin != null && lightMin != null
      ? Math.max(0, totalSleepMin - deepMin - remMin - lightMin)
      : (todayEntry?.sleepAwakeMin ?? null);

  const sleepTargetMin = athleteProfile?.sleepTargetMinutes ?? SLEEP_TARGET_MIN;

  const coachView = analyzeSleep(toSleepEntryInputs(healthEntries), {
    ...sleepGoals,
  });

  const scoreBreakdown = buildSleepScoreBreakdown(
    deepMin,
    remMin,
    totalSleepMin,
    null,
    sleepTargetMin,
  );

  const sleepDim = recovery.dimensions.sleep;
  const sleepScore =
    scoreBreakdown.sharpitScore ?? (sleepDim.available ? (sleepDim.score ?? null) : null);

  const adequacyDisplay = mapSleepAdequacySignalToDisplay(mapSleepScoreToAdequacy(sleepScore));

  const last7Sleep = buildDailyWindowSeries(
    healthByDay,
    7,
    (d, e) => {
      if (isSameDay(d, refDate)) return null;
      return e ? effectiveSleepMinutes(e) : null;
    },
    refDate,
  ).filter((value): value is number => value != null);

  const avgSleepMinutes7d =
    last7Sleep.length > 0
      ? Math.round(last7Sleep.reduce((sum, value) => sum + value, 0) / last7Sleep.length)
      : null;

  const sleepDelta7d =
    totalSleepMin != null && avgSleepMinutes7d != null ? totalSleepMin - avgSleepMinutes7d : null;
  const targetDeltaMin = totalSleepMin != null ? totalSleepMin - sleepTargetMin : null;

  const autonomicScore = recovery.dimensions.autonomic.available
    ? recovery.dimensions.autonomic.score
    : null;
  const recoverySignal = mapRecoveryToSignal(recovery.readinessCategory as ReadinessCategory);

  let recoveryNote: string | null = null;
  if (recovery.readinessScore != null) {
    if (autonomicScore != null && sleepScore != null && autonomicScore > sleepScore) {
      recoveryNote = `Récupération ${recovery.readinessScore}/100 (${recoverySignal.label.toLowerCase()}) — la VFC compense partiellement le sommeil.`;
    } else if (recovery.primaryLimitingFactor === 'sleep') {
      recoveryNote = `Récupération ${recovery.readinessScore}/100 — le sommeil est le facteur limitant aujourd'hui.`;
    }
  }

  const barData = buildDailyWindowSeries(
    healthByDay,
    14,
    (d, e) => {
      const mins = e?.sleepMinutes ?? null;
      let fill = 'var(--muted-foreground)';
      if (mins !== null) {
        fill = mins >= sleepTargetMin ? 'var(--color-signal-base)' : 'var(--color-signal-caution)';
      }
      return { date: format(d, 'dd/MM', { locale: fr }), minutes: mins, fill };
    },
    refDate,
  );

  const confidenceTier = mapConfidenceToTier(recovery.confidence);

  const insights = buildSleepPageInsights({
    adequacyLabel: adequacyDisplay.label,
    coachView,
    confidence: recovery.confidence,
    recoveryNote,
    sleepDelta7d,
    sleepScore,
    targetDeltaMin,
  });

  return {
    sleepScore,
    adequacyDisplay,
    scoreBreakdown,
    totalSleepMin,
    deepMin,
    remMin,
    lightMin,
    awakeMin,
    bedtimeMin: todayEntry?.sleepBedtimeMin ?? null,
    wakeMin: todayEntry?.sleepWakeMin ?? null,
    garminScore: todayEntry?.sleepScore ?? null,
    sleepDelta7d,
    targetDeltaMin,
    sleepTargetMin,
    coachView,
    barData,
    recoveryNote,
    insights,
    globalDecision: buildGlobalDecisionContext(snapshot, 'SLEEP'),
    confidencePresentation: {
      pct: Math.round(recovery.confidence * 100),
      label: null,
      tone: CONFIDENCE_TONE[confidenceTier] ?? 'neutral',
    },
    emptyState: null,
    hierarchy: {
      rootId: 'sleep',
      order: ['hero', 'stats', 'coach', 'phases', 'insights', 'trends'],
    },
    sections: [],
  };
}
