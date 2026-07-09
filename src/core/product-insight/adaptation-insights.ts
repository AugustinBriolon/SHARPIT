import { buildProductInsightBundle } from '@/core/product-insight/build-product-insight-bundle';
import type { AdaptationInsightInput, ProductInsight } from '@/core/product-insight/types';

export function buildAdaptationInsightBundle(input: AdaptationInsightInput) {
  const primary: ProductInsight[] = [];
  const supporting: ProductInsight[] = [];
  const contextual: ProductInsight[] = [];

  primary.push({
    id: 'adaptation:block-reading',
    title: 'Lecture du bloc',
    summary:
      input.adaptationIndex != null
        ? `${input.adaptationIndex}/100 · ${input.statusLabel}`
        : input.statusLabel,
    explanation:
      "Le modèle cherche à dire si la charge récente est en train de produire un gain utile, de stagner, ou de coûter plus qu'elle ne rapporte.",
    evidence: [input.trendLabel, ...input.keyEvidence.slice(0, 2)],
    confidence: input.confidence,
    importance: 'HIGH',
    decisionImpact: 'LOAD_PROGRESSION',
    relatedDimensions: ['ADAPTATION'],
  });

  primary.push({
    id: 'adaptation:progression-decision',
    title: 'Décision de progression',
    summary: input.verdictLabel,
    explanation:
      input.loadMultiplier !== 1
        ? `Le modèle suggère un multiplicateur de charge de ×${input.loadMultiplier.toFixed(2)}.`
        : "Le meilleur choix n'est pas de changer la charge, mais de confirmer ou consolider la trajectoire.",
    evidence: input.rationale,
    confidence: input.confidence,
    importance: 'HIGH',
    decisionImpact: 'LOAD_PROGRESSION',
    relatedDimensions: ['ADAPTATION', 'RECOVERY', 'FATIGUE'],
  });

  if (input.limitingFactorLabel) {
    supporting.push({
      id: 'adaptation:limiting-factor',
      title: 'Frein principal',
      summary: input.limitingFactorLabel,
      explanation:
        "Nommer ce qui freine l'adaptation aide à corriger le levier juste plutôt qu'à ajouter plus de charge au hasard.",
      evidence: input.keyEvidence.slice(0, 3),
      confidence: input.confidence,
      importance: 'MEDIUM',
      decisionImpact: 'LOAD_PROGRESSION',
      relatedDimensions: ['ADAPTATION'],
    });
  }

  if (input.plateauRisk || input.overreachingWithoutAdaptation) {
    contextual.push({
      id: 'adaptation:risk-state',
      title: 'État de vigilance',
      summary: input.plateauRisk ? 'Risque de plateau' : 'Surcharge sans retour visible',
      explanation: input.overreachingWithoutAdaptation
        ? "Le système voit de la charge qui s'accumule sans signal clair de progression."
        : 'Le système voit une trajectoire qui se fige et mérite un ajustement du bloc.',
      evidence: input.keyEvidence.slice(0, 2),
      confidence: input.confidence,
      importance: 'HIGH',
      decisionImpact: 'LOAD_PROGRESSION',
      relatedDimensions: ['ADAPTATION', 'FATIGUE'],
    });
  }

  return buildProductInsightBundle({ primary, supporting, contextual });
}
