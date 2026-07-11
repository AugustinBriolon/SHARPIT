import { getOrBuildAthleteSnapshot } from '@/lib/athlete-state/snapshot-service';
import { computePmcSeries, type ActivityForAnalytics } from '@/lib/analytics';
import { computeTrainingLoad, enrichFatigueLoadDimension } from '@/lib/training-load';
import { getActivitiesList } from '@/lib/queries';
import { resolve } from '@/lib/french';
import { mapConfidenceToTier, mapFatigueTypeToLabel, type FatigueType } from '@/lib/today-mapping';
import { buildEffortPageInsights } from '@/lib/product-insight/effort-page-insights';
import { buildGlobalDecisionContext } from '@/lib/decision/global-decision-context';
import { EMPTY_GLOBAL_DECISION } from '@/core/presentation/global-decision-context';
import type { EffortViewModel } from '@/core/presentation/effort-view-model';

const OVERREACHING_RISK_DISPLAY: Record<string, { label: string; colorClass: string } | undefined> =
  {
    MODERATE: { label: 'Risque modéré', colorClass: 'text-amber-600' },
    HIGH: { label: 'Risque élevé', colorClass: 'text-orange-600' },
    CRITICAL: { label: 'Risque critique', colorClass: 'text-red-600' },
  };

const FATIGUE_VERDICT_DISPLAY: Record<string, { label: string; colorClass: string }> = {
  BUILD: { label: 'Progresser', colorClass: 'text-emerald-600' },
  MAINTAIN: { label: 'Maintenir', colorClass: 'text-blue-600' },
  REDUCE: { label: 'Réduire la charge', colorClass: 'text-amber-600' },
  REST_WEEK: { label: 'Semaine de récupération', colorClass: 'text-orange-600' },
  TAPER: { label: 'Affûtage', colorClass: 'text-blue-600' },
  INSUFFICIENT_DATA: { label: 'Données insuffisantes', colorClass: 'text-muted-foreground' },
};

const COMPLETENESS_LABEL: Record<string, string> = {
  FULL: 'Complètes',
  PARTIAL: 'Partielles',
  SPARSE: 'Éparses',
  INSUFFICIENT: 'Insuffisantes',
};

const CONFIDENCE_TONE = {
  high: 'good',
  medium: 'warn',
  low: 'neutral',
} as const;

function mapStrainToDisplay(strainScore: number | null) {
  if (strainScore == null) {
    return { label: 'Indéterminé', colorClass: 'text-muted-foreground', strokeColor: '#94a3b8' };
  }
  if (strainScore >= 16)
    return { label: 'Très élevé', colorClass: 'text-red-600', strokeColor: '#dc2626' };
  if (strainScore >= 11)
    return { label: 'Élevé', colorClass: 'text-orange-600', strokeColor: '#ea580c' };
  if (strainScore >= 6)
    return { label: 'Modéré', colorClass: 'text-amber-600', strokeColor: '#d97706' };
  if (strainScore > 0)
    return { label: 'Léger', colorClass: 'text-blue-600', strokeColor: '#2563eb' };
  return { label: 'Repos', colorClass: 'text-muted-foreground', strokeColor: '#94a3b8' };
}

function emptyEffortViewModel(): EffortViewModel {
  const strainDisplay = mapStrainToDisplay(null);
  return {
    strainScore: null,
    dailyLoad: 0,
    weeklyLoad: 0,
    fatigueType: 'INSUFFICIENT_DATA',
    fatigueTypeLabel: null,
    performancePercent: null,
    consecutiveDays: 0,
    estimatedDaysToFresh: null,
    acwr: 0,
    chronicWeeklyAvg: null,
    tsb: null,
    confidencePct: 0,
    confidenceTone: 'neutral',
    verdict: 'Données insuffisantes',
    verdictClass: 'text-muted-foreground',
    verdictKey: 'INSUFFICIENT_DATA',
    rationale: [],
    trainingCapacity: 'REST_ONLY',
    strainSubtitle: 'strain indisponible',
    strainStatusLabel: strainDisplay.label,
    strainStatusClassName: strainDisplay.colorClass,
    strainStrokeColor: strainDisplay.strokeColor,
    dimensions: {},
    missingDimCount: 5,
    dominantDimension: null,
    primaryLimitingFactor: null,
    isLowFatigue: false,
    pmcSeries: [],
    weeklyTss: [],
    avgWeeklyTss: 0,
    overreaching: undefined,
    keyEvidence: [],
    completenessLabel: '—',
    availableDimCount: 0,
    insights: { primary: [], supporting: [], contextual: [] },
    globalDecision: EMPTY_GLOBAL_DECISION,
    emptyState: {
      title: 'Charge d’effort indisponible.',
      description: 'Synchronise tes donnees et reessaie.',
    },
    hierarchy: { rootId: 'effort', order: ['hero', 'verdict', 'insights', 'charts', 'evidence'] },
    sections: [],
  };
}

export async function buildEffortViewModel(trainingDayId: string): Promise<EffortViewModel> {
  const snapshot = await getOrBuildAthleteSnapshot(trainingDayId);
  const { fatigue } = snapshot;
  const { dailyStrain } = snapshot;

  if (!fatigue) return emptyEffortViewModel();

  const refDate = new Date(`${trainingDayId}T12:00:00.000Z`);
  const activities = await getActivitiesList({ sinceDays: 60 });

  const activityInputs = activities.map((a) => ({ load: a.load, date: new Date(a.date) }));
  const trainingLoad = computeTrainingLoad(activityInputs, refDate);
  const dailyLoad = dailyStrain?.dailyTss ?? trainingLoad.dailyLoad;
  const strainScore = dailyStrain?.strainScore ?? null;
  const strainDisplay = mapStrainToDisplay(strainScore);
  const fatigueTypeLabel =
    fatigue.fatigueType && fatigue.fatigueType !== 'UNDETERMINED'
      ? mapFatigueTypeToLabel(fatigue.fatigueType as FatigueType)
      : null;

  const pmcSeries = computePmcSeries(
    activities.map((a) => ({ ...a, date: new Date(a.date) })) as ActivityForAnalytics[],
    28,
    refDate,
  );

  const weeklyTss: { week: string; tss: number }[] = [];
  for (let w = 7; w >= 0; w--) {
    const weekStart = new Date(refDate);
    weekStart.setDate(refDate.getDate() - w * 7 - 6);
    const weekEnd = new Date(refDate);
    weekEnd.setDate(refDate.getDate() - w * 7);
    const total = activities
      .filter((a) => {
        const d = new Date(a.date);
        return d >= weekStart && d <= weekEnd;
      })
      .reduce((s, a) => s + (a.load ?? 0), 0);
    weeklyTss.push({ week: w === 0 ? 'Cette sem.' : `S-${w}`, tss: Math.round(total) });
  }

  const avgWeeklyTss =
    weeklyTss.length > 0
      ? Math.round(weeklyTss.reduce((s, w) => s + w.tss, 0) / weeklyTss.length)
      : 0;

  const chronicWeeklyAvg =
    trainingLoad.acwr > 0 ? Math.round(trainingLoad.weeklyLoad / trainingLoad.acwr) : null;

  const lastTsb = pmcSeries.length > 0 ? (pmcSeries[pmcSeries.length - 1]?.tsb ?? null) : null;

  const performancePercent =
    fatigue.performanceImpairmentEstimate > 0
      ? Math.round((1 - fatigue.performanceImpairmentEstimate) * 100)
      : null;

  const verdictDisplay =
    FATIGUE_VERDICT_DISPLAY[fatigue.decision.verdict] ?? FATIGUE_VERDICT_DISPLAY.INSUFFICIENT_DATA;

  const confidencePct = Math.round(fatigue.confidence * 100);
  const confidenceTier = mapConfidenceToTier(fatigue.confidence);
  const confidenceTone = (CONFIDENCE_TONE[confidenceTier] ??
    'neutral') as EffortViewModel['confidenceTone'];

  const completenessLabel =
    COMPLETENESS_LABEL[fatigue.dataCompleteness] ?? fatigue.dataCompleteness;

  const isLowFatigue =
    fatigue.fatigueLevel === 'FRESH' || fatigue.fatigueLevel === 'FUNCTIONAL_LOW';

  const dimensions = enrichFatigueLoadDimension(fatigue.dimensions, trainingLoad.acwr);
  const availableDimCount = Object.values(dimensions).filter((d) => d.available).length;

  const rationale = fatigue.decision.rationale.map((r) => resolve(r));
  const keyEvidence = fatigue.recommendation.keyEvidence.map((e) => resolve(e));

  const dominantDimensionLabel = (() => {
    if (!fatigue.dominantDimension) return null;
    const DOMINANT_LABEL: Record<string, string> = {
      LOAD: 'Charge excessive',
      NEUROMUSCULAR: 'Fatigue neuromusculaire',
      METABOLIC: 'Fatigue métabolique',
      CUMULATIVE: 'Accumulation chronique',
      PSYCHOLOGICAL: 'Fatigue psychologique',
      load: 'Charge excessive',
      neuromuscular: 'Fatigue neuromusculaire',
      metabolic: 'Fatigue métabolique',
      cumulative: 'Accumulation chronique',
      psychological: 'Fatigue psychologique',
    };
    const DOMINANT_LABEL_LOW: Record<string, string> = {
      LOAD: 'Charge actuelle',
      NEUROMUSCULAR: 'Neuromusculaire',
      METABOLIC: 'Métabolique',
      CUMULATIVE: 'Historique de charge',
      PSYCHOLOGICAL: 'Psychologique',
      load: 'Charge actuelle',
      neuromuscular: 'Neuromusculaire',
      metabolic: 'Métabolique',
      cumulative: 'Historique de charge',
      psychological: 'Psychologique',
    };
    const map = isLowFatigue ? DOMINANT_LABEL_LOW : DOMINANT_LABEL;
    return map[fatigue.dominantDimension] ?? fatigue.dominantDimension;
  })();

  const limitingFactorLabel = fatigue.primaryLimitingFactor
    ? resolve({ code: fatigue.primaryLimitingFactor })
    : null;

  const insights = buildEffortPageInsights({
    acwr: trainingLoad.acwr,
    confidence: fatigue.confidence,
    dominantDimension: dominantDimensionLabel,
    estimatedDaysToFresh: fatigue.estimatedTimeToFresh,
    fatigueType: fatigue.fatigueType as FatigueType,
    keyEvidence,
    overreachingLabel:
      OVERREACHING_RISK_DISPLAY[fatigue.signals.functionalOverreachingRisk]?.label ?? null,
    performancePercent,
    primaryLimitingFactor: limitingFactorLabel,
    rationale,
    strainScore,
    trainingCapacity: fatigue.trainingCapacity,
    tsb: lastTsb,
    verdictLabel: verdictDisplay.label,
    weeklyLoad: trainingLoad.weeklyLoad,
  });

  const overreaching = OVERREACHING_RISK_DISPLAY[fatigue.signals.functionalOverreachingRisk];

  return {
    strainScore,
    dailyLoad,
    weeklyLoad: trainingLoad.weeklyLoad,
    fatigueType: fatigue.fatigueType,
    fatigueTypeLabel,
    performancePercent,
    consecutiveDays: fatigue.consecutiveAccumulationDays,
    estimatedDaysToFresh: fatigue.estimatedTimeToFresh,
    acwr: trainingLoad.acwr,
    chronicWeeklyAvg,
    tsb: lastTsb,
    confidencePct,
    confidenceTone,
    verdict: verdictDisplay.label,
    verdictClass: verdictDisplay.colorClass,
    verdictKey: fatigue.decision.verdict,
    rationale,
    trainingCapacity: fatigue.trainingCapacity,
    strainSubtitle: strainScore != null ? 'strain physiologique du jour' : 'strain indisponible',
    strainStatusLabel: strainDisplay.label,
    strainStatusClassName: strainDisplay.colorClass,
    strainStrokeColor: strainDisplay.strokeColor,
    dimensions,
    missingDimCount: 5 - availableDimCount,
    dominantDimension: fatigue.dominantDimension,
    primaryLimitingFactor: fatigue.primaryLimitingFactor,
    isLowFatigue,
    pmcSeries,
    weeklyTss,
    avgWeeklyTss,
    overreaching,
    keyEvidence,
    completenessLabel,
    availableDimCount,
    insights,
    globalDecision: buildGlobalDecisionContext(snapshot, 'FATIGUE'),
    emptyState: null,
    hierarchy: { rootId: 'effort', order: ['hero', 'verdict', 'insights', 'charts', 'evidence'] },
    sections: [],
  };
}
