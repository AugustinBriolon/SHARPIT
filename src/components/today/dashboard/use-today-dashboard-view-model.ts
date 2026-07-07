'use client';

import {
  useActivities,
  useAthleteProfile,
  useHealthEntries,
  usePlannedSessions,
} from '@/hooks/use-data';
import type {
  AdaptationData,
  DailyStrainData,
  EngineRecommendation,
  FatigueData,
  ReasoningData,
  RecoveryData,
} from '@/hooks/use-today';
import { useToday } from '@/hooks/use-today';
import type { ClientActivity, ClientHealthEntry } from '@/lib/query/types';
import { effectiveSleepMinutes } from '@/lib/health';
import {
  AUTONOMIC_SIGNAL,
  ADAPTATION_STATUS_SIGNAL,
  DOMINANT_DIMENSION_LABEL,
  formatSleepDuration,
  RECOVERY_DIMENSION_NAME,
  SLEEP_TREND,
} from '@/lib/today-dashboard-labels';
import type { TodayDaySummary } from '@/lib/today-day-summary';
import { buildTodayDaySummary } from '@/lib/today-day-summary';
import {
  mapFatigueCapacityLabel,
  mapFatigueToSignal,
  mapRecoveryToSignal,
  type FatigueLevel,
  type FatigueTrajectory,
  type ReadinessCategory,
} from '@/lib/today-mapping';
import { computeTrainingLoad } from '@/lib/training-load';
import {
  computeSharpitSleepScoreForDay,
  mapSleepScoreToAdequacy,
  SLEEP_TARGET_MIN,
} from '@/lib/sleep-scoring';
import { isSameDay, subDays } from 'date-fns';

export interface TodayDashboardViewModel {
  loading: boolean;
  refresh: () => void;
  ready: boolean;
  reasoning: ReasoningData;
  recovery: RecoveryData | null;
  fatigue: FatigueData | null;
  adaptation: AdaptationData | null;
  dailyStrain: DailyStrainData | null;
  healthEntries: ClientHealthEntry[];
  plannedSessions: NonNullable<ReturnType<typeof usePlannedSessions>['data']>;
  todayEntry: ClientHealthEntry | null;
  recoverySpark: (number | null)[];
  sleepSpark: (number | null)[];
  effortSpark: (number | null)[];
  recoveryDelta: number | null;
  sleepDelta: number | null;
  recoveryDimCount: number;
  recoverySignal: ReturnType<typeof mapRecoveryToSignal>;
  fatigueSignal: ReturnType<typeof mapFatigueToSignal>;
  sleepSignal: { label: string; arrow: string; colorClass: string };
  sleepScore: number | null;
  sleepTargetMin: number;
  recoverySubMetrics: { label: string; value: string }[];
  effortSubMetrics: { label: string; value: string }[];
  sleepSubMetrics: { label: string; value: string }[];
  daySummary: TodayDaySummary;
  activities: ClientActivity[];
  primaryRecommendation: EngineRecommendation | null;
}

export function useTodayDashboardViewModel(): TodayDashboardViewModel {
  const { data, loading, refresh } = useToday();
  const { reasoning, recovery, fatigue, adaptation, dailyStrain } = data;
  const { data: healthEntries = [] } = useHealthEntries(14);
  const { data: athleteProfile } = useAthleteProfile();
  const { data: activities = [] } = useActivities();
  const { data: plannedSessions = [] } = usePlannedSessions();

  const today = new Date();
  const todayEntry = healthEntries.find((e) => isSameDay(new Date(e.date), today)) ?? null;
  const yesterdayEntry =
    healthEntries.find((e) => isSameDay(new Date(e.date), subDays(today, 1))) ?? null;

  const sleepTargetMin = athleteProfile?.sleepTargetMinutes ?? SLEEP_TARGET_MIN;

  const recoverySpark = Array.from({ length: 14 }, (_, i) => {
    const d = subDays(today, 13 - i);
    return healthEntries.find((e) => isSameDay(new Date(e.date), d))?.recoveryScore ?? null;
  });
  const sleepSpark = Array.from({ length: 14 }, (_, i) => {
    const d = subDays(today, 13 - i);
    return computeSharpitSleepScoreForDay(healthEntries, d, sleepTargetMin);
  });
  const effortSpark = Array.from({ length: 14 }, (_, i) => {
    const d = subDays(today, 13 - i);
    const load = activities
      .filter((a) => isSameDay(new Date(a.date), d))
      .reduce((sum, a) => sum + (a.load ?? 0), 0);
    return load > 0 ? load : null;
  });

  const recoveryDelta =
    todayEntry?.recoveryScore != null && yesterdayEntry?.recoveryScore != null
      ? todayEntry.recoveryScore - yesterdayEntry.recoveryScore
      : null;
  const todaySharpitSleep = computeSharpitSleepScoreForDay(healthEntries, today, sleepTargetMin);
  const yesterdaySharpitSleep = computeSharpitSleepScoreForDay(
    healthEntries,
    subDays(today, 1),
    sleepTargetMin,
  );
  const sleepDelta =
    todaySharpitSleep != null && yesterdaySharpitSleep != null
      ? todaySharpitSleep - yesterdaySharpitSleep
      : null;

  const trainingLoad = computeTrainingLoad(
    activities.map((a) => ({ load: a.load, date: new Date(a.date) })),
    today,
  );

  const recoveryDimCount = recovery
    ? Object.values(recovery.dimensions).filter((d) => d.available).length
    : 0;

  const recoverySignal = mapRecoveryToSignal(
    (recovery?.readinessCategory as ReadinessCategory) ?? 'INSUFFICIENT_DATA',
  );
  const fatigueSignal = mapFatigueToSignal(
    (fatigue?.fatigueLevel as FatigueLevel) ?? 'INSUFFICIENT_DATA',
    (fatigue?.trajectory as FatigueTrajectory) ?? 'STABLE',
  );

  const sleepAdequacy = mapSleepScoreToAdequacy(todaySharpitSleep);
  const sleepSignal = SLEEP_TREND[sleepAdequacy] ?? {
    label: '—',
    arrow: '→',
    colorClass: 'text-slate-400',
  };

  const sleepScore =
    todaySharpitSleep ??
    (recovery?.dimensions.sleep.available ? (recovery.dimensions.sleep.score ?? null) : null);

  const recoverySubMetrics = (() => {
    if (recovery?.readinessCategory === 'BASELINE_PENDING' && recovery.dimensions) {
      const dims = recovery.dimensions;
      const dimEntries = Object.entries(dims) as [string, { available: boolean }][];
      const availableCount = dimEntries.filter(([, d]) => d.available).length;
      const missingNames = dimEntries
        .filter(([, d]) => !d.available)
        .map(([k]) => RECOVERY_DIMENSION_NAME[k] ?? k)
        .slice(0, 3);
      return [
        { label: 'Signaux actifs', value: `${availableCount} / 4` },
        { label: 'Manquants', value: missingNames.join(' · ') || '—' },
      ];
    }
    const autonomicEntry = recovery?.signals.autonomicBalance
      ? {
          label: 'SNV',
          value: (AUTONOMIC_SIGNAL[recovery.signals.autonomicBalance]?.label ?? '—').replace(
            'SNV: ',
            '',
          ),
        }
      : null;
    const recovTimeEntry =
      recovery?.estimatedTimeToFullRecovery != null && recovery.estimatedTimeToFullRecovery > 0
        ? { label: 'Récup. complète', value: `${recovery.estimatedTimeToFullRecovery}j` }
        : null;
    return [
      { label: 'VFC', value: todayEntry?.hrv != null ? `${todayEntry.hrv} ms` : '—' },
      {
        label: 'FC repos',
        value: todayEntry?.restingHr != null ? `${todayEntry.restingHr} bpm` : '—',
      },
      ...(autonomicEntry ? [autonomicEntry] : []),
      ...(recovTimeEntry ? [recovTimeEntry] : []),
    ];
  })();

  const effortSubMetrics = (() => {
    const base = [
      {
        label: 'TSS sem.',
        value: trainingLoad.weeklyLoad > 0 ? String(trainingLoad.weeklyLoad) : '—',
      },
      { label: 'ACWR', value: trainingLoad.acwr > 0 ? String(trainingLoad.acwr) : '—' },
    ];
    let capacityEntry: { label: string; value: string } | null = null;
    if (fatigue != null && fatigue.performanceImpairmentEstimate > 0) {
      capacityEntry = {
        label: 'Capacité',
        value: `~${Math.round((1 - fatigue.performanceImpairmentEstimate) * 100)}%`,
      };
    } else if (fatigue?.trainingCapacity) {
      capacityEntry = {
        label: 'Capacité',
        value: mapFatigueCapacityLabel(fatigue.trainingCapacity),
      };
    }
    let adaptationEntry: { label: string; value: string } | null = null;
    if (adaptation?.adaptationIndex != null) {
      const statusLabel = adaptation.adaptationStatus
        ? (ADAPTATION_STATUS_SIGNAL[adaptation.adaptationStatus]?.label ??
          adaptation.adaptationStatus)
        : null;
      adaptationEntry = {
        label: 'Adaptation',
        value: statusLabel
          ? `${adaptation.adaptationIndex} · ${statusLabel}`
          : String(adaptation.adaptationIndex),
      };
    }
    const dominantEntry =
      fatigue?.dominantDimension != null
        ? {
            label: 'Dominante',
            value: DOMINANT_DIMENSION_LABEL[fatigue.dominantDimension] ?? fatigue.dominantDimension,
          }
        : null;
    return [
      ...base,
      ...(capacityEntry ? [capacityEntry] : []),
      ...(adaptationEntry ? [adaptationEntry] : []),
      ...(dominantEntry ? [dominantEntry] : []),
    ];
  })();

  const sleepSubMetrics = [
    { label: 'Durée', value: formatSleepDuration(effectiveSleepMinutes(todayEntry ?? {})) },
    { label: 'Profond', value: formatSleepDuration(todayEntry?.sleepDeepMin ?? null) },
    { label: 'Paradoxal', value: formatSleepDuration(todayEntry?.sleepRemMin ?? null) },
    ...(adaptation?.dimensions.recoveryQuality.available &&
    adaptation.dimensions.recoveryQuality.score != null
      ? [{ label: 'Qualité adapt.', value: String(adaptation.dimensions.recoveryQuality.score) }]
      : []),
  ];

  const daySummary = buildTodayDaySummary(today, activities, plannedSessions);

  let primaryRecommendation = recovery?.recommendation ?? fatigue?.recommendation ?? null;
  if (reasoning?.systemAttentionPriority === 'RECOVERY') {
    primaryRecommendation = recovery?.recommendation ?? null;
  } else if (reasoning?.systemAttentionPriority === 'FATIGUE') {
    primaryRecommendation = fatigue?.recommendation ?? null;
  } else if (reasoning?.systemAttentionPriority === 'ADAPTATION') {
    primaryRecommendation = adaptation?.recommendation ?? null;
  }

  const ready = Boolean(
    reasoning && reasoning.overallVerdict !== 'INSUFFICIENT_DATA' && reasoning.topAction,
  );

  return {
    loading,
    refresh,
    ready,
    reasoning: reasoning!,
    recovery,
    fatigue,
    adaptation,
    dailyStrain,
    healthEntries,
    plannedSessions,
    todayEntry,
    recoverySpark,
    sleepSpark,
    effortSpark,
    recoveryDelta,
    sleepDelta,
    recoveryDimCount,
    recoverySignal,
    fatigueSignal,
    sleepSignal,
    sleepScore,
    sleepTargetMin,
    recoverySubMetrics,
    effortSubMetrics,
    sleepSubMetrics,
    daySummary,
    activities,
    primaryRecommendation,
  };
}

export type {
  AdaptationDecisionVerdict,
  AutonomicBalance,
  PhysiologicalConsistency,
  TrainingCapacity,
} from '@/hooks/use-today';
