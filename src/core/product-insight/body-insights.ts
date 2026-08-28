import { buildProductInsightBundle } from '@/core/product-insight/build-product-insight-bundle';
import type { BodyInsightInput, ProductInsight } from '@/core/product-insight/types';

function buildTrajectoryEvidence(input: BodyInsightInput): string[] {
  const evidence: string[] = [];
  if (input.weightDelta7d !== null) {
    evidence.push(
      `Poids : ${input.weightDelta7d > 0 ? '+' : ''}${input.weightDelta7d.toFixed(1)} kg / 7j`,
    );
  }
  if (input.bodyFatDelta7d !== null) {
    evidence.push(
      `Masse grasse : ${input.bodyFatDelta7d > 0 ? '+' : ''}${input.bodyFatDelta7d.toFixed(1)} pt / 7j`,
    );
  }
  return evidence;
}

function summarizeTrajectory(weightDelta7d: number | null): string {
  if (weightDelta7d === null) {
    return 'Pas encore assez de recul';
  }
  if (Math.abs(weightDelta7d) < 0.3) {
    return 'Trajectoire globalement stable';
  }
  return weightDelta7d > 0 ? 'Dérive à la hausse' : 'Dérive à la baisse';
}

function buildTrajectoryInsight(input: BodyInsightInput): ProductInsight {
  return {
    id: 'body:trajectory',
    title: summarizeTrajectory(input.weightDelta7d),
    summary: 'Trajectoire corporelle',
    explanation:
      'Une mesure isolée dit peu. La valeur produit vient surtout de la direction prise sur plusieurs jours et de sa cohérence avec la composition.',
    evidence: buildTrajectoryEvidence(input),
    confidence: 0.75,
    importance: 'HIGH',
    decisionImpact: 'BODY_TRAJECTORY',
    relatedDimensions: ['BODY'],
  };
}

function summarizeHydration(waterPercent: number): string {
  if (waterPercent < 45) {
    return 'Lecture probablement tirée vers le bas';
  }
  if (waterPercent > 65) {
    return "Variation du jour possiblement surtout liée à l'eau";
  }
  return 'Aucun signal fort de biais hydrique';
}

function buildHydrationInsight(waterPercent: number): ProductInsight {
  return {
    id: 'body:hydration-context',
    title: summarizeHydration(waterPercent),
    summary: 'Contexte de mesure',
    explanation:
      "Le pourcentage d'eau est surtout utile pour juger si la pesée du jour est représentative ou très influencée par l'hydratation.",
    evidence: [`Eau corporelle : ${waterPercent.toFixed(1)} %`],
    confidence: 0.65,
    importance: 'MEDIUM',
    decisionImpact: 'TRUST',
    relatedDimensions: ['BODY'],
  };
}

function buildVisceralInsight(visceralFat: number): ProductInsight {
  return {
    id: 'body:visceral-risk',
    title:
      visceralFat >= 12
        ? 'Graisse viscérale à surveiller'
        : 'Pas de signal fort de risque viscéral',
    summary: 'Signal santé long terme',
    explanation:
      'La graisse viscérale ne pilote pas la séance du jour, mais elle donne du contexte sur la trajectoire santé globale.',
    evidence: [`Indice viscéral : ${visceralFat}`],
    confidence: 0.7,
    importance: visceralFat >= 12 ? 'HIGH' : 'LOW',
    decisionImpact: 'HEALTH_AWARENESS',
    relatedDimensions: ['BODY'],
  };
}

function buildSourceInsight(input: BodyInsightInput): ProductInsight {
  return {
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
  };
}

function collectOptionalBodyInsights(input: BodyInsightInput) {
  const supporting: ProductInsight[] = [];
  const contextual: ProductInsight[] = [];

  if (input.waterPercent !== null) {
    supporting.push(buildHydrationInsight(input.waterPercent));
  }
  if (input.visceralFat !== null) {
    contextual.push(buildVisceralInsight(input.visceralFat));
  }
  if (input.sourceLabel || input.measuredAtLabel) {
    contextual.push(buildSourceInsight(input));
  }

  return { supporting, contextual };
}

export function buildBodyInsightBundle(input: BodyInsightInput) {
  const { supporting, contextual } = collectOptionalBodyInsights(input);
  return buildProductInsightBundle({
    primary: [buildTrajectoryInsight(input)],
    supporting,
    contextual,
  });
}
