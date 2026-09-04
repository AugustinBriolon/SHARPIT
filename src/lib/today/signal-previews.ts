import { subDays } from 'date-fns';
import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';
import {
  buildDailyWindowSeries,
  effectiveSleepMinutes,
  getIndexedHealthEntry,
  indexHealthEntriesByDay,
} from '@/lib/health/health';
import {
  computeSharpitSleepScoreForDay,
  formatSleepDuration,
  SLEEP_TARGET_MIN,
} from '@/lib/sleep/sleep-scoring';
import { ADAPTATION_STATUS_SIGNAL } from '@/lib/today/today-dashboard-labels';
import type { ReadinessCategory } from '@/lib/today/today-mapping';
import { isSet } from '@/lib/util/value';

export type SignalPreviewKey = 'sleep' | 'recovery' | 'adaptation' | 'effort';

export type SleepStageKey = 'deep' | 'rem' | 'light' | 'awake';

export type SignalPreviewVisual =
  | {
      kind: 'gauge';
      score: number;
      /** Qualitative line under /100 — e.g. "Sommeil excellent". */
      statusLabel: string | null;
      /** Baseline band title — e.g. "Au-dessus de ta moyenne". */
      baselineTitle: string | null;
      /** Baseline band detail — e.g. "+8 vs moy." */
      baselineDetail: string | null;
      trend: 'up' | 'down' | 'flat' | null;
    }
  | {
      kind: 'stages';
      stages: Array<{ key: SleepStageKey; fraction: number }>;
    }
  | {
      kind: 'spark';
      values: (number | null)[];
      stroke: string;
    }
  | {
      kind: 'spectrum';
      position: number;
    }
  | { kind: 'none' };

export type SignalPreview = {
  key: SignalPreviewKey;
  scoreDisplay: string;
  unit: string | null;
  subtitle: string | null;
  visual: SignalPreviewVisual;
};

export type SignalPreviewHealthEntry = {
  date: Date | string;
  sleepMinutes?: number | null;
  napMinutes?: number | null;
  sleepDeepMin?: number | null;
  sleepRemMin?: number | null;
  sleepLightMin?: number | null;
  sleepAwakeMin?: number | null;
  hrv?: number | null;
  bodyBattery?: number | null;
};

export type SignalPreviewScores = {
  sleepScore: number | null;
  recoveryScore: number | null;
  effortScore: number | null;
  adaptationScore: number | null;
  adaptationUnavailableCaption: string | null;
  effortUnavailableCaption: string | null;
};

const TREND_LABEL: Record<string, string> = {
  IMPROVING: 'En progression',
  STABLE: 'Stable',
  DECLINING: 'En baisse',
};

const EFFORT_DOMINANT_LABEL: Record<string, string> = {
  TRAINING: 'Entraînement',
  CARDIOVASCULAR: 'Cardiovasculaire',
  MOVEMENT: 'Mouvement',
};

const RECOVERY_LIMITER_LABEL: Record<string, string> = {
  autonomic: 'Frein · VFC',
  sleep: 'Frein · sommeil',
  subjective: 'Frein · ressenti',
  loadContext: 'Frein · charge',
};

const LOW_READINESS = new Set(['REDUCED', 'LOW', 'VERY_LOW']);

function formatPercentScore(value: number | null): string {
  if (value === null) {
    return '—';
  }
  return String(Math.round(value));
}

function formatStrainScore(value: number | null): string {
  if (value === null) {
    return '—';
  }
  return value.toFixed(1).replace('.', ',');
}

function sparkHasEnoughPoints(values: (number | null)[]): boolean {
  return values.filter((v): v is number => v !== null).length >= 2;
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function priorSleepScoreAverage(
  entries: SignalPreviewHealthEntry[],
  day: Date,
  targetMin: number,
): number | null {
  const scores: number[] = [];
  for (let i = 1; i <= 7; i++) {
    const score = computeSharpitSleepScoreForDay(
      entries.map((entry) => ({
        date: entry.date,
        sleepMinutes: entry.sleepMinutes ?? null,
        sleepDeepMin: entry.sleepDeepMin,
        sleepRemMin: entry.sleepRemMin,
      })),
      subDays(day, i),
      targetMin,
    );
    if (score !== null) {
      scores.push(score);
    }
  }
  const avg = average(scores);
  return avg !== null ? Math.round(avg) : null;
}

function sleepStatusLabel(score: number): string {
  if (score >= 85) {
    return 'Sommeil excellent';
  }
  if (score >= 70) {
    return 'Bon sommeil';
  }
  if (score >= 55) {
    return 'Sommeil correct';
  }
  return 'Sommeil limité';
}

const RECOVERY_STATUS_BY_CATEGORY: Partial<Record<ReadinessCategory, string>> = {
  OPTIMAL: 'Récupération excellente',
  ADEQUATE: 'Récupération correcte',
  REDUCED: 'Récupération en cours',
  LOW: 'Récupération réduite',
  VERY_LOW: 'Récupération basse',
};

function recoveryStatusLabel(
  category: ReadinessCategory | null | undefined,
  fallbackScore: number | null,
): string | null {
  if (category && RECOVERY_STATUS_BY_CATEGORY[category]) {
    return RECOVERY_STATUS_BY_CATEGORY[category] ?? null;
  }
  if (fallbackScore === null) {
    return null;
  }
  if (fallbackScore >= 85) {
    return 'Récupération excellente';
  }
  if (fallbackScore >= 70) {
    return 'Bonne récupération';
  }
  if (fallbackScore >= 55) {
    return 'Récupération correcte';
  }
  return 'Récupération limitée';
}

function baselineFromDelta(delta: number | null): {
  baselineTitle: string | null;
  baselineDetail: string | null;
  trend: 'up' | 'down' | 'flat' | null;
} {
  if (delta === null) {
    return { baselineTitle: null, baselineDetail: null, trend: null };
  }
  const rounded = Math.round(delta);
  const abs = Math.abs(rounded);
  if (abs === 0) {
    return {
      baselineTitle: 'Dans ta moyenne',
      baselineDetail: '= vs moy.',
      trend: 'flat',
    };
  }
  const above = rounded > 0;
  return {
    baselineTitle: above ? 'Au-dessus de ta moyenne' : 'Sous ta moyenne',
    baselineDetail: `${above ? '+' : '−'}${abs} vs moy.`,
    trend: above ? 'up' : 'down',
  };
}

function formatSignedDelta(value: number, suffix: string): string {
  const abs = Math.abs(value);
  if (value === 0) {
    return `= ${suffix}`;
  }
  return `${value > 0 ? '+' : '−'}${abs} ${suffix}`;
}

function emptyBaselineBand() {
  return {
    baselineTitle: null,
    baselineDetail: null,
    trend: null as 'up' | 'down' | 'flat' | null,
  };
}

function hrvTrendBand(vsAvg: number, vsYesterday: number) {
  const useYesterday = vsYesterday !== 0;
  const compare = useYesterday ? vsYesterday : vsAvg;
  return {
    baselineTitle: vsAvg >= 0 ? 'Au-dessus de ta baseline' : 'Sous ta baseline',
    baselineDetail: formatSignedDelta(compare, useYesterday ? 'vs hier' : 'vs moy.'),
    trend: (compare >= 0 ? 'up' : 'down') as 'up' | 'down',
  };
}

function hrvBaselineBand(hrvValues: (number | null)[]) {
  const values = hrvValues.filter((value): value is number => value !== null);
  if (values.length < 2) {
    return emptyBaselineBand();
  }

  const today = values[values.length - 1]!;
  const prior = values.slice(0, -1);
  const avg = average(prior);
  if (avg === null) {
    return emptyBaselineBand();
  }

  const vsAvg = Math.round(today - avg);
  const vsYesterday = Math.round(today - prior[prior.length - 1]!);
  if (Math.abs(vsAvg) < 2 && Math.abs(vsYesterday) < 2) {
    return {
      baselineTitle: 'Dans ta baseline',
      baselineDetail: '= vs hier',
      trend: 'flat' as const,
    };
  }

  return hrvTrendBand(vsAvg, vsYesterday);
}

function deepSleepBaselineDetail(
  entries: SignalPreviewHealthEntry[],
  day: Date,
  todayDeep: number | null,
): string | null {
  if (!isSet(todayDeep) || todayDeep <= 0) {
    return null;
  }
  const byDay = indexHealthEntriesByDay(entries);
  const prior = [1, 2, 3, 4, 5, 6, 7]
    .map((offset) => getIndexedHealthEntry(byDay, subDays(day, offset))?.sleepDeepMin ?? null)
    .filter((value): value is number => isSet(value) && value > 0);
  const avgDeep = average(prior);
  if (avgDeep === null) {
    return null;
  }
  const delta = Math.round(todayDeep - avgDeep);
  if (Math.abs(delta) < 10) {
    return null;
  }
  return `Sommeil profond ${formatSignedDelta(delta, 'min vs moy.')}`;
}

function buildSleepPreview(input: {
  scores: SignalPreviewScores;
  entry: SignalPreviewHealthEntry | null;
  entries: SignalPreviewHealthEntry[];
  day: Date;
  sleepTargetMin: number;
}): SignalPreview {
  const { scores, entry, entries, day, sleepTargetMin } = input;
  const duration = entry ? effectiveSleepMinutes(entry) : null;
  const subtitle =
    duration !== null ? `Nuit dernière · ${formatSleepDuration(duration)}` : 'Nuit dernière';

  if (scores.sleepScore === null) {
    return {
      key: 'sleep',
      scoreDisplay: '—',
      unit: null,
      subtitle,
      visual: { kind: 'none' },
    };
  }

  const avg = priorSleepScoreAverage(entries, day, sleepTargetMin);
  const deltaVsAvg = avg !== null ? scores.sleepScore - avg : null;
  const band = baselineFromDelta(deltaVsAvg);
  const deepDetail = deepSleepBaselineDetail(entries, day, entry?.sleepDeepMin ?? null);

  return {
    key: 'sleep',
    scoreDisplay: formatPercentScore(scores.sleepScore),
    unit: null,
    subtitle,
    visual: {
      kind: 'gauge',
      score: Math.round(scores.sleepScore),
      statusLabel: sleepStatusLabel(scores.sleepScore),
      baselineTitle: band.baselineTitle,
      baselineDetail: deepDetail ?? band.baselineDetail,
      trend: band.trend,
    },
  };
}

function buildRecoveryPreview(
  scores: SignalPreviewScores,
  snapshot: AthleteSnapshot,
  hrvValues: (number | null)[],
): SignalPreview {
  const { recovery } = snapshot;
  let subtitle: string | null = 'État du jour';
  if (recovery?.primaryLimitingFactor && LOW_READINESS.has(recovery.readinessCategory)) {
    subtitle = RECOVERY_LIMITER_LABEL[recovery.primaryLimitingFactor] ?? subtitle;
  }

  if (scores.recoveryScore === null) {
    return {
      key: 'recovery',
      scoreDisplay: '—',
      unit: null,
      subtitle,
      visual: { kind: 'none' },
    };
  }

  const band = hrvBaselineBand(hrvValues);

  return {
    key: 'recovery',
    scoreDisplay: formatPercentScore(scores.recoveryScore),
    unit: null,
    subtitle,
    visual: {
      kind: 'gauge',
      score: Math.round(scores.recoveryScore),
      statusLabel: recoveryStatusLabel(
        recovery?.readinessCategory as ReadinessCategory | undefined,
        scores.recoveryScore,
      ),
      baselineTitle: band.baselineTitle,
      baselineDetail: band.baselineDetail,
      trend: band.trend,
    },
  };
}

function buildAdaptationSubtitle(
  scores: SignalPreviewScores,
  snapshot: AthleteSnapshot,
): string | null {
  if (scores.adaptationUnavailableCaption) {
    return scores.adaptationUnavailableCaption;
  }
  const status =
    snapshot.adaptationStatus && snapshot.adaptationStatus !== 'INSUFFICIENT_DATA'
      ? ADAPTATION_STATUS_SIGNAL[snapshot.adaptationStatus]?.label
      : null;
  const trend = snapshot.adaptationTrend ? TREND_LABEL[snapshot.adaptationTrend] : null;
  return [status, trend].filter(Boolean).join(' · ') || null;
}

function buildAdaptationPreview(
  scores: SignalPreviewScores,
  snapshot: AthleteSnapshot,
): SignalPreview {
  const position = scores.adaptationScore;
  return {
    key: 'adaptation',
    scoreDisplay: formatPercentScore(scores.adaptationScore),
    unit: null,
    subtitle: buildAdaptationSubtitle(scores, snapshot),
    visual:
      position !== null
        ? { kind: 'spectrum', position: Math.max(0, Math.min(100, position)) }
        : { kind: 'none' },
  };
}

function effortVisual(
  strainScore: number | null,
  batteryValues: (number | null)[],
): SignalPreviewVisual {
  if (sparkHasEnoughPoints(batteryValues)) {
    return { kind: 'spark', values: batteryValues, stroke: 'var(--color-signal-threshold)' };
  }
  if (strainScore === null) {
    return { kind: 'none' };
  }
  return {
    kind: 'spectrum',
    position: Math.max(0, Math.min(100, (strainScore / 10) * 100)),
  };
}

function buildEffortPreview(
  scores: SignalPreviewScores,
  snapshot: AthleteSnapshot,
  batteryValues: (number | null)[],
): SignalPreview {
  const strain = snapshot.dailyStrain;
  let subtitle: string | null = scores.effortUnavailableCaption;
  if (!subtitle && strain?.available && strain.dominantContributor) {
    subtitle = EFFORT_DOMINANT_LABEL[strain.dominantContributor] ?? null;
  }

  const strainScore = scores.effortScore;
  return {
    key: 'effort',
    scoreDisplay: formatStrainScore(strainScore),
    unit: null,
    subtitle,
    visual: effortVisual(strainScore, batteryValues),
  };
}

/**
 * Compact visual previews for Today / Plan signal chips — from health + snapshot
 * already available to the presentation layer (no extra fetch).
 */
export function buildSignalPreviews(input: {
  day: Date;
  scores: SignalPreviewScores;
  snapshot: AthleteSnapshot;
  healthEntries: SignalPreviewHealthEntry[];
  sleepTargetMin?: number;
}): SignalPreview[] {
  const byDay = indexHealthEntriesByDay(input.healthEntries);
  const todayEntry = getIndexedHealthEntry(byDay, input.day);
  const sleepTargetMin = input.sleepTargetMin ?? SLEEP_TARGET_MIN;

  const hrvValues = buildDailyWindowSeries(byDay, 14, (_d, entry) => entry?.hrv ?? null, input.day);
  const batteryValues = buildDailyWindowSeries(
    byDay,
    14,
    (_d, entry) => entry?.bodyBattery ?? null,
    input.day,
  );

  return [
    buildSleepPreview({
      scores: input.scores,
      entry: todayEntry,
      entries: input.healthEntries,
      day: input.day,
      sleepTargetMin,
    }),
    buildRecoveryPreview(input.scores, input.snapshot, hrvValues),
    buildAdaptationPreview(input.scores, input.snapshot),
    buildEffortPreview(input.scores, input.snapshot, batteryValues),
  ];
}

/** Plan hub only needs trajectory signals (adaptation + charge). */
export function pickPlanSignalPreviews(previews: SignalPreview[]): SignalPreview[] {
  return previews.filter((preview) => preview.key === 'adaptation' || preview.key === 'effort');
}

/** Today résumé keeps overnight state signals only. */
export function pickTodayResumeSignalPreviews(previews: SignalPreview[]): SignalPreview[] {
  return previews.filter((preview) => preview.key === 'sleep' || preview.key === 'recovery');
}

/**
 * Adaptation + charge from the live snapshot — Plan does not load a 14-day
 * health window, so battery sparks stay off; spectrum carries the reading.
 */
export function buildPlanTrajectoryPreviews(snapshot: AthleteSnapshot): SignalPreview[] {
  const effortScore =
    snapshot.dailyStrain?.available && isSet(snapshot.dailyStrain.strainScore)
      ? snapshot.dailyStrain.strainScore
      : null;
  const adaptationScore =
    snapshot.adaptationIndex === undefined || snapshot.adaptationIndex === null
      ? null
      : snapshot.adaptationIndex;

  const scores: SignalPreviewScores = {
    sleepScore: null,
    recoveryScore: null,
    effortScore,
    adaptationScore,
    adaptationUnavailableCaption: adaptationScore === null ? 'Historique insuffisant' : null,
    effortUnavailableCaption: null,
  };

  return [buildAdaptationPreview(scores, snapshot), buildEffortPreview(scores, snapshot, [])];
}
