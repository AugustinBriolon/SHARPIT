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
      'Le modele cherche a dire si la charge recente est en train de produire un gain utile, de stagner, ou de couter plus qu elle ne rapporte.',
    evidence: [input.trendLabel, ...input.keyEvidence.slice(0, 2)],
    confidence: input.confidence,
    importance: 'HIGH',
    decisionImpact: 'LOAD_PROGRESSION',
    relatedDimensions: ['ADAPTATION'],
  });

  primary.push({
    id: 'adaptation:progression-decision',
    title: 'Decision de progression',
    summary: input.verdictLabel,
    explanation:
      input.loadMultiplier !== 1
        ? `Le modele suggere un multiplicateur de charge de ×${input.loadMultiplier.toFixed(2)}.`
        : 'Le meilleur choix n est pas de changer la charge, mais de confirmer ou consolider la trajectoire.',
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
        'Nommer ce qui freine l adaptation aide a corriger le levier juste plutot qu a ajouter plus de charge au hasard.',
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
      title: 'Etat de vigilance',
      summary: input.plateauRisk ? 'Risque de plateau' : 'Surcharge sans retour visible',
      explanation: input.overreachingWithoutAdaptation
        ? 'Le systeme voit de la charge qui s accumule sans signal clair de progression.'
        : 'Le systeme voit une trajectoire qui se fige et merite un ajustement du bloc.',
      evidence: input.keyEvidence.slice(0, 2),
      confidence: input.confidence,
      importance: 'HIGH',
      decisionImpact: 'LOAD_PROGRESSION',
      relatedDimensions: ['ADAPTATION', 'FATIGUE'],
    });
  }

  return buildProductInsightBundle({ primary, supporting, contextual });
}
