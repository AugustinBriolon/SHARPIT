import { buildAdaptationInsightBundle } from '@/core/product-insight/adaptation-insights';

export function buildAdaptationPageInsights(params: {
  adaptationIndex: number | null;
  statusLabel: string;
  trendLabel: string;
  verdictLabel: string;
  rationale: string[];
  limitingFactorLabel: string | null;
  plateauRisk: boolean;
  overreachingWithoutAdaptation: boolean;
  loadMultiplier: number;
  keyEvidence: string[];
  confidence: number;
}) {
  return buildAdaptationInsightBundle({
    adaptationIndex: params.adaptationIndex,
    statusLabel: params.statusLabel,
    trendLabel: params.trendLabel,
    verdictLabel: params.verdictLabel,
    rationale: params.rationale,
    limitingFactorLabel: params.limitingFactorLabel,
    plateauRisk: params.plateauRisk,
    overreachingWithoutAdaptation: params.overreachingWithoutAdaptation,
    loadMultiplier: params.loadMultiplier,
    keyEvidence: params.keyEvidence,
    confidence: params.confidence,
  });
}
