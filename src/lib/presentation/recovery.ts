import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';
import type { RecoveryViewModel } from '@/core/presentation/recovery-view-model';
import { getOrBuildAthleteSnapshot } from '@/lib/athlete-state/snapshot-service';
import { getHealthEntries } from '@/lib/queries';
import {
  buildDailyWindowSeries,
  getIndexedHealthEntry,
  indexHealthEntriesByDay,
} from '@/lib/health';
import { resolve } from '@/lib/french';
import {
  mapAutonomicBalanceToDisplay,
  mapConfidenceToTier,
  mapLoadStressContextToDisplay,
  mapRecoveryIntensityLabel,
  mapRecoveryToSignal,
  mapScoreToColorClass,
  mapSubjectiveWellnessToDisplay,
  type AutonomicBalance,
  type LoadStressContext,
  type ReadinessCategory,
  type RecommendedIntensity,
  type SubjectiveWellness,
} from '@/lib/today-mapping';
import { buildRecoveryPageInsights } from '@/lib/product-insight/recovery-page-insights';
import { buildGlobalDecisionContext } from '@/lib/decision/global-decision-context';
import { EMPTY_GLOBAL_DECISION } from '@/core/presentation/global-decision-context';

const PRIMARY_LIMITER_LABEL: Record<string, string> = {
  autonomic: 'Système nerveux autonome',
  sleep: 'Qualité du sommeil',
  subjective: 'Bien-être subjectif',
  loadContext: 'Contexte de charge',
};

const COMPLETENESS_LABEL: Record<string, string> = {
  FULL: 'Complètes',
  PARTIAL: 'Partielles',
  SPARSE: 'Éparses',
  INSUFFICIENT: 'Insuffisantes',
};

const RISK_DISPLAY: Record<string, { label: string; colorClass: string } | undefined> = {
  MODERATE: { label: 'Risque modéré', colorClass: 'text-amber-600' },
  HIGH: { label: 'Risque élevé', colorClass: 'text-orange-600' },
  CRITICAL: { label: 'Risque critique', colorClass: 'text-red-600' },
};

const ILLNESS_RISK_DISPLAY: Record<string, { label: string; colorClass: string } | undefined> = {
  ELEVATED: { label: 'Risque modéré', colorClass: 'text-amber-600' },
  HIGH: { label: 'Risque élevé', colorClass: 'text-red-600' },
};

const CONFIDENCE_TONE = {
  high: 'good',
  medium: 'warn',
  low: 'neutral',
} as const;

function chipClass(colorClass: string): string {
  return colorClass.split(' ')[0] ?? colorClass;
}

function emptyRecoveryViewModel(): RecoveryViewModel {
  return {
    readinessScore: null,
    signal: { label: '—', qualityClass: 'text-muted-foreground', arrow: '→' },
    limiterLabel: null,
    estimatedRecoveryDays: null,
    isCalibrating: false,
    availableDimCount: 0,
    dimensions: {} as RecoveryViewModel['dimensions'],
    intensityLabel: '—',
    intensityClassName: mapScoreToColorClass(null),
    rationale: [],
    autonomicLabel: '—',
    autonomicClass: 'text-muted-foreground',
    wellnessLabel: '—',
    wellnessClass: 'text-muted-foreground',
    loadLabel: '—',
    loadClass: 'text-muted-foreground',
    dissonanceDetected: false,
    sparkHrv: [],
    sparkRhr: [],
    dualData: [],
    baselineLow: null,
    baselineHigh: null,
    hrv: null,
    restingHr: null,
    bodyBattery: null,
    confidencePct: 0,
    confidenceTone: 'neutral',
    completenessLabel: '—',
    keyEvidence: [],
    insights: { primary: [], supporting: [], contextual: [] },
    globalDecision: EMPTY_GLOBAL_DECISION,
    overreaching: undefined,
    illness: undefined,
    emptyState: {
      title: 'Données de récupération indisponibles.',
      description: 'Reessaie plus tard ou synchronise tes donnees.',
    },
    hierarchy: {
      rootId: 'recovery',
      order: ['hero', 'decision', 'signals', 'insights', 'evidence'],
    },
    sections: [],
  };
}

export async function buildRecoveryViewModel(trainingDayId: string): Promise<RecoveryViewModel> {
  const snapshot: AthleteSnapshot = await getOrBuildAthleteSnapshot(trainingDayId);
  const { recovery } = snapshot;

  if (!recovery) return emptyRecoveryViewModel();

  const refDate = new Date(`${trainingDayId}T12:00:00.000Z`);
  const healthEntries = await getHealthEntries(14, refDate);
  const healthByDay = indexHealthEntriesByDay(healthEntries);
  const todayEntry = getIndexedHealthEntry(healthByDay, refDate);

  const sparkHrv = buildDailyWindowSeries(
    healthByDay,
    14,
    (d, e) => ({
      date: format(d, 'dd MMM', { locale: fr }),
      value: e?.hrv ?? null,
    }),
    refDate,
  );

  const sparkRhr = buildDailyWindowSeries(
    healthByDay,
    14,
    (d, e) => ({
      date: format(d, 'dd MMM', { locale: fr }),
      value: e?.restingHr ?? null,
    }),
    refDate,
  );

  const dualData = buildDailyWindowSeries(
    healthByDay,
    14,
    (d, e) => ({
      date: format(d, 'dd MMM', { locale: fr }),
      a: e?.bodyBattery ?? null,
      b: e?.stress ?? null,
    }),
    refDate,
  );

  const signal = mapRecoveryToSignal(recovery.readinessCategory as ReadinessCategory);
  const autonomicDisplay = mapAutonomicBalanceToDisplay(
    recovery.signals.autonomicBalance as AutonomicBalance,
  );
  const wellnessDisplay = mapSubjectiveWellnessToDisplay(
    recovery.signals.subjectiveWellness as SubjectiveWellness,
  );
  const loadDisplay = mapLoadStressContextToDisplay(
    recovery.signals.loadStressContext as LoadStressContext,
  );

  const limiterLabel = recovery.primaryLimitingFactor
    ? (PRIMARY_LIMITER_LABEL[recovery.primaryLimitingFactor] ?? recovery.primaryLimitingFactor)
    : null;

  const confidencePct = Math.round(recovery.confidence * 100);
  const confidenceTier = mapConfidenceToTier(recovery.confidence);
  const completenessLabel =
    COMPLETENESS_LABEL[recovery.dataCompleteness] ?? recovery.dataCompleteness;

  const intensityLabel = mapRecoveryIntensityLabel(
    recovery.decision.recommendedIntensity as RecommendedIntensity,
  );

  const rationale = recovery.decision.rationale.map((r) => resolve(r));
  const keyEvidence = recovery.recommendation.keyEvidence.map((e) => resolve(e));

  const insights = buildRecoveryPageInsights({
    autonomicLabel: autonomicDisplay.label,
    confidence: recovery.confidence,
    dissonanceDetected: recovery.signals.dissonanceDetected,
    estimatedRecoveryDays: recovery.estimatedTimeToFullRecovery,
    illnessLabel: ILLNESS_RISK_DISPLAY[recovery.signals.illnessRisk]?.label ?? null,
    keyEvidence,
    limitingFactorLabel: limiterLabel,
    loadLabel: loadDisplay.label,
    overreachingLabel: RISK_DISPLAY[recovery.signals.overreachingRisk]?.label ?? null,
    rationale,
    readinessScore: recovery.readinessScore,
    recommendedIntensityLabel: intensityLabel,
    wellnessLabel: wellnessDisplay.label,
  });

  const confidenceTone = CONFIDENCE_TONE[confidenceTier] ?? 'neutral';

  return {
    readinessScore: recovery.readinessScore,
    signal,
    limiterLabel,
    estimatedRecoveryDays: recovery.estimatedTimeToFullRecovery,
    isCalibrating: recovery.readinessCategory === 'BASELINE_PENDING',
    availableDimCount: Object.values(recovery.dimensions).filter((d) => d.available).length,
    dimensions: recovery.dimensions,
    intensityLabel,
    intensityClassName: mapScoreToColorClass(recovery.readinessScore),
    rationale,
    autonomicLabel: autonomicDisplay.label,
    autonomicClass: chipClass(autonomicDisplay.colorClass),
    wellnessLabel: wellnessDisplay.label,
    wellnessClass: chipClass(wellnessDisplay.colorClass),
    loadLabel: loadDisplay.label,
    loadClass: chipClass(loadDisplay.colorClass),
    dissonanceDetected: recovery.signals.dissonanceDetected,
    sparkHrv,
    sparkRhr,
    dualData,
    baselineLow: todayEntry?.hrvBaselineLow ?? null,
    baselineHigh: todayEntry?.hrvBaselineHigh ?? null,
    hrv: todayEntry?.hrv ?? null,
    restingHr: todayEntry?.restingHr ?? null,
    bodyBattery: todayEntry?.bodyBattery ?? null,
    confidencePct,
    confidenceTone,
    completenessLabel,
    overreaching: RISK_DISPLAY[recovery.signals.overreachingRisk],
    illness: ILLNESS_RISK_DISPLAY[recovery.signals.illnessRisk],
    keyEvidence,
    insights,
    globalDecision: buildGlobalDecisionContext(snapshot, 'RECOVERY'),
    emptyState: null,
    hierarchy: {
      rootId: 'recovery',
      order: ['hero', 'decision', 'signals', 'insights', 'evidence'],
    },
    sections: [],
  };
}
