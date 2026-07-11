import { getOrBuildAthleteSnapshot } from '@/lib/athlete-state/snapshot-service';
import { resolve } from '@/lib/french';
import { mapConfidenceToTier } from '@/lib/today-mapping';
import { ADAPTATION_STATUS_SIGNAL } from '@/lib/today-dashboard-labels';
import { buildAdaptationPageInsights } from '@/lib/product-insight/adaptation-page-insights';
import { buildGlobalDecisionContext } from '@/lib/decision/global-decision-context';
import { EMPTY_GLOBAL_DECISION } from '@/core/presentation/global-decision-context';
import type {
  AdaptationViewModel,
  AdaptationDimensionVm,
} from '@/core/presentation/adaptation-view-model';
import type { ProductInsightBundle } from '@/core/product-insight/types';
import type { DimensionResult } from '@/hooks/use-today';

const ADAPTATION_VERDICT_DISPLAY: Record<string, { label: string; colorClass: string }> = {
  INCREASE_LOAD: { label: 'Augmenter la charge', colorClass: 'text-emerald-600' },
  SUSTAIN: { label: 'Maintenir la trajectoire', colorClass: 'text-blue-600' },
  CONSOLIDATE: { label: 'Consolider', colorClass: 'text-blue-600' },
  REDUCE_LOAD: { label: 'Réduire la charge', colorClass: 'text-amber-600' },
  RECOVERY_PRIORITY: { label: 'Priorité récupération', colorClass: 'text-orange-600' },
  INSUFFICIENT_DATA: { label: 'Historique insuffisant', colorClass: 'text-muted-foreground' },
};

const TREND_LABEL: Record<string, string> = {
  IMPROVING: 'En progression',
  STABLE: 'Stable',
  DECLINING: 'En baisse',
};

const ADAPTATION_LIMITING_FACTOR_LABEL: Record<string, string> = {
  loadProgression: 'Progression de charge',
  neuromuscularEfficiency: 'Efficacité neuromusculaire',
  autonomicAdaptation: 'Adaptation autonome',
  recoveryQuality: 'Qualité de récupération',
};

const DIMENSION_COPY: Record<string, { label: string; description: string }> = {
  loadProgression: {
    label: 'Progression de charge',
    description: 'La charge d’entraînement évolue-t-elle de façon productive ?',
  },
  neuromuscularEfficiency: {
    label: 'Efficacité neuromusculaire',
    description: 'Même effort, meilleure performance ?',
  },
  autonomicAdaptation: {
    label: 'Adaptation autonome',
    description: 'Le système nerveux suit-il la charge ?',
  },
  recoveryQuality: {
    label: 'Qualité de récupération',
    description: 'La récupération soutient-elle l’adaptation ?',
  },
};

const CONFIDENCE_TONE: Record<string, 'good' | 'warn' | 'neutral'> = {
  high: 'good',
  medium: 'warn',
  low: 'neutral',
};

function emptyAdaptationViewModel(): AdaptationViewModel {
  return {
    adaptationIndex: null,
    statusLabel: 'Historique insuffisant',
    statusClassName: 'text-muted-foreground',
    trendLabel: '—',
    verdictLabel: 'Données insuffisantes',
    verdictClassName: 'text-muted-foreground',
    loadMultiplier: 1,
    rationale: [],
    keyEvidence: [],
    limitingFactor: null,
    plateauRisk: false,
    overreachingWithoutAdaptation: false,
    dimensions: [],
    availableDimCount: 0,
    historyLength: 0,
    confidencePct: 0,
    confidenceTone: 'neutral',
    insights: { primary: [], supporting: [], contextual: [] } satisfies ProductInsightBundle,
    globalDecision: EMPTY_GLOBAL_DECISION,
    emptyState: {
      title: 'Adaptation en cours de consolidation',
      description:
        'SHARPIT construit encore ton historique d’adaptation. Quelques semaines de donnees d’entraînement et de récupération suffisent pour une première lecture fiable.',
    },
    hierarchy: { rootId: 'adaptation', order: ['hero', 'decision', 'insights'] },
    sections: [],
  };
}

export async function buildAdaptationViewModel(
  trainingDayId: string,
): Promise<AdaptationViewModel> {
  const snapshot = await getOrBuildAthleteSnapshot(trainingDayId);
  const { adaptation } = snapshot;
  if (!adaptation || adaptation.adaptationStatus === 'INSUFFICIENT_DATA') {
    return emptyAdaptationViewModel();
  }

  const status = ADAPTATION_STATUS_SIGNAL[adaptation.adaptationStatus];
  const verdict =
    ADAPTATION_VERDICT_DISPLAY[adaptation.decision.verdict] ??
    ADAPTATION_VERDICT_DISPLAY.INSUFFICIENT_DATA;
  const confidencePct = Math.round(adaptation.confidence * 100);
  const confidenceTier = mapConfidenceToTier(adaptation.confidence);
  const confidenceTone = (CONFIDENCE_TONE[confidenceTier] ??
    'neutral') as AdaptationViewModel['confidenceTone'];

  const limitingFactor = adaptation.limitingFactor
    ? (ADAPTATION_LIMITING_FACTOR_LABEL[adaptation.limitingFactor] ?? adaptation.limitingFactor)
    : null;

  const rationale = adaptation.decision.rationale.map((r) => resolve(r));
  const keyEvidence = adaptation.recommendation.keyEvidence.map((e) => resolve(e));

  const dimensions: AdaptationDimensionVm[] = Object.entries(adaptation.dimensions).map(
    ([key, dim]) => {
      const copy = DIMENSION_COPY[key] ?? { label: key, description: 'Signal de dimension' };
      return {
        key,
        label: copy.label,
        description: copy.description,
        dim: dim as DimensionResult,
      };
    },
  );

  const availableDimCount = adaptation.signals.availableDimensionCount;

  const insights = buildAdaptationPageInsights({
    adaptationIndex: adaptation.adaptationIndex,
    confidence: adaptation.confidence,
    keyEvidence,
    limitingFactorLabel: limitingFactor,
    loadMultiplier: adaptation.decision.loadMultiplier,
    overreachingWithoutAdaptation: adaptation.overreachingWithoutAdaptationDetected,
    plateauRisk: adaptation.plateauRisk,
    rationale,
    statusLabel: status?.label ?? adaptation.adaptationStatus,
    trendLabel: TREND_LABEL[adaptation.adaptationTrend] ?? adaptation.adaptationTrend,
    verdictLabel: verdict.label,
  });

  return {
    adaptationIndex: adaptation.adaptationIndex,
    statusLabel: status?.label ?? adaptation.adaptationStatus,
    statusClassName: status?.colorClass ?? 'text-muted-foreground',
    trendLabel: TREND_LABEL[adaptation.adaptationTrend] ?? adaptation.adaptationTrend,
    verdictLabel: verdict.label,
    verdictClassName: verdict.colorClass,
    loadMultiplier: adaptation.decision.loadMultiplier,
    rationale,
    keyEvidence,
    limitingFactor,
    plateauRisk: adaptation.plateauRisk,
    overreachingWithoutAdaptation: adaptation.overreachingWithoutAdaptationDetected,
    dimensions,
    availableDimCount,
    historyLength: adaptation.signals.historyLength,
    confidencePct,
    confidenceTone,
    insights,
    globalDecision: buildGlobalDecisionContext(snapshot, 'ADAPTATION'),
    emptyState: null,
    hierarchy: { rootId: 'adaptation', order: ['hero', 'decision', 'signals', 'insights'] },
    sections: [],
  };
}
