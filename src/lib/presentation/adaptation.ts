import { getOrBuildAthleteSnapshot } from '@/lib/athlete-state/snapshot-service';
import { resolve } from '@/lib/french';
import { mapConfidenceToTier } from '@/lib/today/today-mapping';
import { ADAPTATION_STATUS_SIGNAL } from '@/lib/today/today-dashboard-labels';
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
  INCREASE_LOAD: { label: 'Augmenter la charge', colorClass: 'text-primary' },
  SUSTAIN: { label: 'Maintenir la trajectoire', colorClass: 'text-[var(--color-signal-recovery)]' },
  CONSOLIDATE: { label: 'Consolider', colorClass: 'text-[var(--color-signal-recovery)]' },
  REDUCE_LOAD: { label: 'Réduire la charge', colorClass: 'text-signal-caution' },
  RECOVERY_PRIORITY: { label: 'Priorité récupération', colorClass: 'text-signal-vo2' },
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
    verdictKey: 'INSUFFICIENT_DATA',
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

function buildAdaptationDimensions(
  dimensions: NonNullable<Awaited<ReturnType<typeof getOrBuildAthleteSnapshot>>['adaptation']>['dimensions'],
): AdaptationDimensionVm[] {
  return Object.entries(dimensions).map(([key, dim]) => {
    const copy = DIMENSION_COPY[key] ?? { label: key, description: 'Signal de dimension' };
    return {
      key,
      label: copy.label,
      description: copy.description,
      dim: dim as DimensionResult,
    };
  });
}

function resolveAdaptationLimitingFactor(limitingFactor: string | null | undefined) {
  if (!limitingFactor) {
    return null;
  }
  return ADAPTATION_LIMITING_FACTOR_LABEL[limitingFactor] ?? limitingFactor;
}

function resolveAdaptationPresentation(
  adaptation: NonNullable<Awaited<ReturnType<typeof getOrBuildAthleteSnapshot>>['adaptation']>,
) {
  const status = ADAPTATION_STATUS_SIGNAL[adaptation.adaptationStatus];
  const verdict =
    ADAPTATION_VERDICT_DISPLAY[adaptation.decision.verdict] ??
    ADAPTATION_VERDICT_DISPLAY.INSUFFICIENT_DATA;
  const confidencePct = Math.round(adaptation.confidence * 100);
  const confidenceTier = mapConfidenceToTier(adaptation.confidence);
  const confidenceTone = (CONFIDENCE_TONE[confidenceTier] ??
    'neutral') as AdaptationViewModel['confidenceTone'];
  const trendLabel = TREND_LABEL[adaptation.adaptationTrend] ?? adaptation.adaptationTrend;

  return {
    status,
    verdict,
    confidencePct,
    confidenceTone,
    trendLabel,
    limitingFactor: resolveAdaptationLimitingFactor(adaptation.limitingFactor),
    statusLabel: status?.label ?? adaptation.adaptationStatus,
    statusClassName: status?.colorClass ?? 'text-muted-foreground',
  };
}

function buildPopulatedAdaptationViewModel(
  snapshot: Awaited<ReturnType<typeof getOrBuildAthleteSnapshot>>,
): AdaptationViewModel {
  const { adaptation } = snapshot;
  if (!adaptation) {
    return emptyAdaptationViewModel();
  }

  const presentation = resolveAdaptationPresentation(adaptation);
  const rationale = adaptation.decision.rationale.map((r) => resolve(r));
  const keyEvidence = adaptation.recommendation.keyEvidence.map((e) => resolve(e));
  const dimensions = buildAdaptationDimensions(adaptation.dimensions);
  const insights = buildAdaptationPageInsights({
    adaptationIndex: adaptation.adaptationIndex,
    confidence: adaptation.confidence,
    keyEvidence,
    limitingFactorLabel: presentation.limitingFactor,
    loadMultiplier: adaptation.decision.loadMultiplier,
    overreachingWithoutAdaptation: adaptation.overreachingWithoutAdaptationDetected,
    plateauRisk: adaptation.plateauRisk,
    rationale,
    statusLabel: presentation.statusLabel,
    trendLabel: presentation.trendLabel,
    verdictLabel: presentation.verdict.label,
  });

  return {
    adaptationIndex: adaptation.adaptationIndex,
    statusLabel: presentation.statusLabel,
    statusClassName: presentation.statusClassName,
    trendLabel: presentation.trendLabel,
    verdictLabel: presentation.verdict.label,
    verdictClassName: presentation.verdict.colorClass,
    verdictKey: adaptation.decision.verdict,
    loadMultiplier: adaptation.decision.loadMultiplier,
    rationale,
    keyEvidence,
    limitingFactor: presentation.limitingFactor,
    plateauRisk: adaptation.plateauRisk,
    overreachingWithoutAdaptation: adaptation.overreachingWithoutAdaptationDetected,
    dimensions,
    availableDimCount: adaptation.signals.availableDimensionCount,
    historyLength: adaptation.signals.historyLength,
    confidencePct: presentation.confidencePct,
    confidenceTone: presentation.confidenceTone,
    insights,
    globalDecision: buildGlobalDecisionContext(snapshot, 'ADAPTATION'),
    emptyState: null,
    hierarchy: { rootId: 'adaptation', order: ['hero', 'decision', 'signals', 'insights'] },
    sections: [],
  };
}

export async function buildAdaptationViewModel(
  athleteId: string,
  trainingDayId: string,
): Promise<AdaptationViewModel> {
  const snapshot = await getOrBuildAthleteSnapshot(athleteId, trainingDayId);
  const { adaptation } = snapshot;
  if (!adaptation || adaptation.adaptationStatus === 'INSUFFICIENT_DATA') {
    return emptyAdaptationViewModel();
  }

  return buildPopulatedAdaptationViewModel(snapshot);
}
