import { buildProductInsightBundle } from '@/core/product-insight/build-product-insight-bundle';
import type { BodyInsightInput, ProductInsight } from '@/core/product-insight/types';

export function buildBodyInsightBundle(input: BodyInsightInput) {
  const primary: ProductInsight[] = [];
  const supporting: ProductInsight[] = [];
  const contextual: ProductInsight[] = [];

  const trajectoryEvidence: string[] = [];
  if (input.weightDelta7d != null) {
    trajectoryEvidence.push(
      `Poids : ${input.weightDelta7d > 0 ? '+' : ''}${input.weightDelta7d.toFixed(1)} kg / 7j`,
    );
  }
  if (input.bodyFatDelta7d != null) {
    trajectoryEvidence.push(
      `Masse grasse : ${input.bodyFatDelta7d > 0 ? '+' : ''}${input.bodyFatDelta7d.toFixed(1)} pt / 7j`,
    );
  }

  let trajectorySummary: string;
  if (input.weightDelta7d == null) {
    trajectorySummary = 'Pas encore assez de recul';
  } else if (Math.abs(input.weightDelta7d) < 0.3) {
    trajectorySummary = 'Trajectoire globalement stable';
  } else if (input.weightDelta7d > 0) {
    trajectorySummary = 'Dérive à la hausse';
  } else {
    trajectorySummary = 'Dérive à la baisse';
  }

  primary.push({
    id: 'body:trajectory',
    title: trajectorySummary,
    summary: 'Trajectoire corporelle',
    explanation:
      'Une mesure isolée dit peu. La valeur produit vient surtout de la direction prise sur plusieurs jours et de sa cohérence avec la composition.',
    evidence: trajectoryEvidence,
    confidence: 0.75,
    importance: 'HIGH',
    decisionImpact: 'BODY_TRAJECTORY',
    relatedDimensions: ['BODY'],
  });

  if (input.waterPercent != null) {
    let hydrationSummary: string;
    if (input.waterPercent < 45) {
      hydrationSummary = 'Lecture probablement tirée vers le bas';
    } else if (input.waterPercent > 65) {
      hydrationSummary = "Variation du jour possiblement surtout liée à l'eau";
    } else {
      hydrationSummary = 'Aucun signal fort de biais hydrique';
    }

    supporting.push({
      id: 'body:hydration-context',
      title: hydrationSummary,
      summary: 'Contexte de mesure',
      explanation:
        "Le pourcentage d'eau est surtout utile pour juger si la pesée du jour est représentative ou très influencée par l'hydratation.",
      evidence: [`Eau corporelle : ${input.waterPercent.toFixed(1)} %`],
      confidence: 0.65,
      importance: 'MEDIUM',
      decisionImpact: 'TRUST',
      relatedDimensions: ['BODY'],
    });
  }

  if (input.visceralFat != null) {
    contextual.push({
      id: 'body:visceral-risk',
      title:
        input.visceralFat >= 12
          ? 'Graisse viscérale à surveiller'
          : 'Pas de signal fort de risque viscéral',
      summary: 'Signal santé long terme',
      explanation:
        'La graisse viscérale ne pilote pas la séance du jour, mais elle donne du contexte sur la trajectoire santé globale.',
      evidence: [`Indice viscéral : ${input.visceralFat}`],
      confidence: 0.7,
      importance: input.visceralFat >= 12 ? 'HIGH' : 'LOW',
      decisionImpact: 'HEALTH_AWARENESS',
      relatedDimensions: ['BODY'],
    });
  }

  if (input.sourceLabel || input.measuredAtLabel) {
    contextual.push({
      id: 'body:source-context',
      title: input.sourceLabel ?? 'Source de mesure',
      summary: 'Contexte de pesée',
      explanation:
        'Le moment et la source de la mesure aident à comparer les tendances sans surinterpréter une valeur du jour.',
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
