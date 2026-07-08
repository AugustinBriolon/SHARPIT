import { buildProductInsightBundle } from '@/core/product-insight/build-product-insight-bundle';
import type { ProductInsight, SleepInsightInput } from '@/core/product-insight/types';

function formatMinutes(min: number): string {
  const sign = min >= 0 ? '+' : '-';
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}h${String(m).padStart(2, '0')}`;
}

export function buildSleepInsightBundle(input: SleepInsightInput) {
  const primary: ProductInsight[] = [];
  const supporting: ProductInsight[] = [];
  const contextual: ProductInsight[] = [];

  primary.push({
    id: 'sleep:night-impact',
    title: 'Impact probable sur demain',
    summary: input.adequacyLabel,
    explanation:
      input.recoveryNote ??
      'Le sommeil n a de valeur produit que par son effet sur la recuperation et la capacite a encaisser la charge suivante.',
    evidence: [
      input.targetDeltaMin != null ? `Objectif: ${formatMinutes(input.targetDeltaMin)}` : null,
      input.sleepDelta7d != null ? `Vs 7 jours: ${formatMinutes(input.sleepDelta7d)}` : null,
    ].filter((line): line is string => line != null),
    confidence: input.confidence,
    importance: input.sleepScore != null && input.sleepScore < 60 ? 'HIGH' : 'MEDIUM',
    decisionImpact: 'TRAINING_TODAY',
    relatedDimensions: ['SLEEP', 'RECOVERY'],
  });

  if (input.recommendedBedtime || input.recommendedDurationLabel) {
    primary.push({
      id: 'sleep:tonight-action',
      title: 'Action pour ce soir',
      summary:
        input.recommendedBedtime && input.recommendedDurationLabel
          ? `${input.recommendedBedtime} pour viser ${input.recommendedDurationLabel}`
          : (input.recommendedDurationLabel ??
            input.recommendedBedtime ??
            'Prioriser le sommeil ce soir'),
      explanation:
        'Le meilleur usage produit du sommeil est d aider a choisir quoi faire ce soir pour proteger la prochaine journee.',
      evidence: [
        input.debt7Min != null && input.debt7Min > 0
          ? `Dette 7 jours: ${input.debt7Min} min`
          : null,
        input.regularityMin != null ? `Regularite: ±${input.regularityMin} min` : null,
      ].filter((line): line is string => line != null),
      confidence: input.confidence,
      importance: 'HIGH',
      decisionImpact: 'RECOVERY_BEHAVIOR',
      relatedDimensions: ['SLEEP', 'RECOVERY'],
    });
  }

  if (input.debt7Min != null && input.debt7Min > 0) {
    supporting.push({
      id: 'sleep:debt',
      title: 'Dette de sommeil',
      summary: `${input.debt7Min} min de retard cumule`,
      explanation:
        'La dette aide a comprendre pourquoi une nuit correcte ne suffit pas toujours a restaurer completement la recuperation.',
      evidence: [
        input.sleepDelta7d != null ? `Vs 7 jours: ${formatMinutes(input.sleepDelta7d)}` : null,
      ].filter((line): line is string => line != null),
      confidence: input.confidence,
      importance: input.debt7Min >= 180 ? 'HIGH' : 'MEDIUM',
      decisionImpact: 'RECOVERY_BEHAVIOR',
      relatedDimensions: ['SLEEP'],
    });
  }

  if (input.coachInsightLines.length > 0) {
    contextual.push({
      id: 'sleep:architecture',
      title: 'Ce que la nuit raconte',
      summary: input.coachInsightLines[0] ?? 'Lecture qualitative de la nuit',
      explanation:
        'Les details de phases ou de regularite ne valent que s ils expliquent pourquoi la recuperation suivra ou non.',
      evidence: input.coachInsightLines.slice(0, 3),
      confidence: input.confidence,
      importance: 'MEDIUM',
      decisionImpact: 'RECOVERY_BEHAVIOR',
      relatedDimensions: ['SLEEP'],
    });
  }

  return buildProductInsightBundle({ primary, supporting, contextual });
}
