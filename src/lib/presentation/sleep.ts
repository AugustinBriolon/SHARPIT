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
  type SleepAdequacySignal,
} from '@/lib/today/today-mapping';
import { buildSleepPageInsights } from '@/lib/product-insight/sleep-page-insights';
import { buildGlobalDecisionContext } from '@/lib/decision/global-decision-context';
import { EMPTY_GLOBAL_DECISION } from '@/core/presentation/global-decision-context';
import type { SleepNightStatus, SleepViewModel } from '@/core/presentation/sleep-view-model';

const CONFIDENCE_TONE = {
  high: 'good',
  medium: 'warn',
  low: 'neutral',
} as const;

function emptySleepViewModel(): SleepViewModel {
  return {
    nightStatus: 'missing',
    sleepScore: null,
    adequacyDisplay: { label: '—', colorClass: 'text-muted-foreground' },
    scoreBreakdown: buildSleepScoreBreakdown({
      deepMin: null,
      remMin: null,
      totalMin: null,
      debtMin: null,
    }),
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

export function resolveSleepNightStatus(
  trainingDayId: string,
  totalSleepMin: number | null,
  liveDayId: string = format(new Date(), 'yyyy-MM-dd'),
): SleepNightStatus {
  if (totalSleepMin !== null && totalSleepMin > 0) {
    return 'present';
  }
  return trainingDayId === liveDayId ? 'pending' : 'missing';
}

export function sleepAdequacySignalForNight(
  nightStatus: SleepNightStatus,
  sleepScore: number | null,
): SleepAdequacySignal {
  if (nightStatus === 'pending') {
    return 'PENDING';
  }
  if (nightStatus === 'missing') {
    return 'MISSING';
  }
  return mapSleepScoreToAdequacy(sleepScore) ?? 'MISSING';
}

export async function buildSleepViewModel(
  athleteId: string,
  trainingDayId: string,
): Promise<SleepViewModel> {
  const snapshot = await getOrBuildAthleteSnapshot(athleteId, trainingDayId);
  const { recovery } = snapshot;

  if (!recovery) {
    return emptySleepViewModel();
  }

  const refDate = parseISO(trainingDayId);

  const [healthEntries, athleteProfile] = await Promise.all([
    getHealthEntries(athleteId, 30, refDate),
    getAthleteProfile(athleteId),
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
    totalSleepMin !== null && deepMin !== null && remMin !== null && lightMin !== null
      ? Math.max(0, totalSleepMin - deepMin - remMin - lightMin)
      : (todayEntry?.sleepAwakeMin ?? null);

  const sleepTargetMin = athleteProfile?.sleepTargetMinutes ?? SLEEP_TARGET_MIN;
  const nightStatus = resolveSleepNightStatus(trainingDayId, totalSleepMin);
  const nightPresent = nightStatus === 'present';

  const coachView = analyzeSleep(toSleepEntryInputs(healthEntries), {
    ...sleepGoals,
  });

  const scoreBreakdown = buildSleepScoreBreakdown({
    deepMin,
    remMin,
    totalMin: totalSleepMin,
    debtMin: null,
    targetMin: sleepTargetMin,
  });

  // Never fall back to twin sleep dimension when tonight's health row is absent —
  // that reused yesterday's score as "Sommeil insuffisant" for an unslept night.
  const sleepScore = nightPresent ? (scoreBreakdown.sharpitScore ?? null) : null;
  const adequacyDisplay = mapSleepAdequacySignalToDisplay(
    sleepAdequacySignalForNight(nightStatus, sleepScore),
  );

  const last7Sleep = buildDailyWindowSeries(
    healthByDay,
    7,
    (d, e) => {
      if (isSameDay(d, refDate)) {
        return null;
      }
      return e ? effectiveSleepMinutes(e) : null;
    },
    refDate,
  ).filter((value): value is number => value !== null);

  const avgSleepMinutes7d =
    last7Sleep.length > 0
      ? Math.round(last7Sleep.reduce((sum, value) => sum + value, 0) / last7Sleep.length)
      : null;

  const sleepDelta7d =
    nightPresent && totalSleepMin !== null && avgSleepMinutes7d !== null
      ? totalSleepMin - avgSleepMinutes7d
      : null;
  const targetDeltaMin =
    nightPresent && totalSleepMin !== null ? totalSleepMin - sleepTargetMin : null;

  const autonomicScore = recovery.dimensions.autonomic.available
    ? recovery.dimensions.autonomic.score
    : null;
  const recoverySignal = mapRecoveryToSignal(recovery.readinessCategory as ReadinessCategory);

  let recoveryNote: string | null = null;
  if (nightPresent && recovery.readinessScore !== null) {
    if (autonomicScore !== null && sleepScore !== null && autonomicScore > sleepScore) {
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
    nightStatus,
    recoveryNote,
    sleepDelta7d,
    sleepScore,
    targetDeltaMin,
  });

  return {
    nightStatus,
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
