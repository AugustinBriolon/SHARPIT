import { buildProductInsightBundle } from '@/core/product-insight/build-product-insight-bundle';
import type { BodyInsightInput, ProductInsight } from '@/core/product-insight/types';

export function buildBodyInsightBundle(input: BodyInsightInput) {
  const primary: ProductInsight[] = [];
  const supporting: ProductInsight[] = [];
  const contextual: ProductInsight[] = [];

  const trajectoryEvidence: string[] = [];
  if (input.weightDelta7d != null) {
    trajectoryEvidence.push(
      `Poids: ${input.weightDelta7d > 0 ? '+' : ''}${input.weightDelta7d.toFixed(1)} kg / 7j`,
    );
  }
  if (input.bodyFatDelta7d != null) {
    trajectoryEvidence.push(
      `Masse grasse: ${input.bodyFatDelta7d > 0 ? '+' : ''}${input.bodyFatDelta7d.toFixed(1)} pt / 7j`,
    );
  }

  let trajectorySummary: string;
  if (input.weightDelta7d == null) {
    trajectorySummary = 'Pas encore assez de recul';
  } else if (Math.abs(input.weightDelta7d) < 0.3) {
    trajectorySummary = 'Trajectoire globalement stable';
  } else if (input.weightDelta7d > 0) {
    trajectorySummary = 'Derive a la hausse';
  } else {
    trajectorySummary = 'Derive a la baisse';
  }

  primary.push({
    id: 'body:trajectory',
    title: 'Trajectoire corporelle',
    summary: trajectorySummary,
    explanation:
      'Une mesure isolee dit peu. La valeur produit vient surtout de la direction prise sur plusieurs jours et de sa coherence avec la composition.',
    evidence: trajectoryEvidence,
    confidence: 0.75,
    importance: 'HIGH',
    decisionImpact: 'BODY_TRAJECTORY',
    relatedDimensions: ['BODY'],
  });

  if (input.waterPercent != null) {
    let hydrationSummary: string;
    if (input.waterPercent < 45) {
      hydrationSummary = 'Lecture probablement tiree vers le bas';
    } else if (input.waterPercent > 65) {
      hydrationSummary = 'Variation du jour possiblement surtout liee a l eau';
    } else {
      hydrationSummary = 'Aucun signal fort de biais hydrique';
    }

    supporting.push({
      id: 'body:hydration-context',
      title: 'Contexte de mesure',
      summary: hydrationSummary,
      explanation:
        'Le pourcentage d eau est surtout utile pour juger si la pesee du jour est representative ou tres influencee par l hydratation.',
      evidence: [`Eau corporelle: ${input.waterPercent.toFixed(1)} %`],
      confidence: 0.65,
      importance: 'MEDIUM',
      decisionImpact: 'TRUST',
      relatedDimensions: ['BODY'],
    });
  }

  if (input.visceralFat != null) {
    contextual.push({
      id: 'body:visceral-risk',
      title: 'Signal sante long terme',
      summary:
        input.visceralFat >= 12
          ? 'Graisse viscerale a surveiller'
          : 'Pas de signal fort de risque viscerale',
      explanation:
        'La graisse viscerale ne pilote pas la seance du jour, mais elle donne du contexte sur la trajectoire sante globale.',
      evidence: [`Indice viscerale: ${input.visceralFat}`],
      confidence: 0.7,
      importance: input.visceralFat >= 12 ? 'HIGH' : 'LOW',
      decisionImpact: 'HEALTH_AWARENESS',
      relatedDimensions: ['BODY'],
    });
  }

  if (input.sourceLabel || input.measuredAtLabel) {
    contextual.push({
      id: 'body:source-context',
      title: 'Contexte de pesee',
      summary: input.sourceLabel ?? 'Source de mesure',
      explanation:
        'Le moment et la source de la mesure aident a comparer les tendances sans surinterpretrer une valeur du jour.',
      evidence: [input.measuredAtLabel, input.sourceLabel].filter((line): line is string =>
        Boolean(line),
      ),
      confidence: 0.9,
      importance: 'LOW',
      decisionImpact: 'TRUST',
      relatedDimensions: ['BODY'],
    });
  }

  return buildProductInsightBundle({ primary, supporting, contextual });
}
