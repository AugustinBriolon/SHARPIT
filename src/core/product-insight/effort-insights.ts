import { buildProductInsightBundle } from '@/core/product-insight/build-product-insight-bundle';
import type { EffortInsightInput, ProductInsight } from '@/core/product-insight/types';

export function buildEffortInsightBundle(input: EffortInsightInput) {
  const primary: ProductInsight[] = [];
  const supporting: ProductInsight[] = [];
  const contextual: ProductInsight[] = [];

  primary.push({
    id: 'effort:daily-cost',
    title: 'Coût du jour',
    summary:
      input.strainScore != null
        ? `${input.strainScore}/21 · ${input.fatigueTypeLabel}`
        : input.fatigueTypeLabel,
    explanation:
      "La lecture utile n'est pas seulement la charge accomplie, mais le type de coût que cette charge impose à ton organisme.",
    evidence: input.rationale,
    confidence: input.confidence,
    importance: 'HIGH',
    decisionImpact: 'TRAINING_TODAY',
    relatedDimensions: ['DAILY_STRAIN', 'FATIGUE'],
  });

  primary.push({
    id: 'effort:training-capacity',
    title: 'Marge de travail restante',
    summary: input.trainingCapacityLabel,
    explanation:
      input.performancePercent != null
        ? `La capacité utile du jour est estimée autour de ${input.performancePercent} % de ton niveau frais.`
        : 'La capacité traduit ce que le corps peut encore absorber sans payer trop cher ensuite.',
    evidence: [
      input.estimatedDaysToFresh != null
        ? `${input.estimatedDaysToFresh} jour(s) pour revenir frais`
        : null,
      input.limitingFactorLabel,
    ].filter((line): line is string => Boolean(line)),
    confidence: input.confidence,
    importance: 'HIGH',
    decisionImpact: 'TRAINING_TODAY',
    relatedDimensions: ['FATIGUE'],
  });

  if (input.dominantDimensionLabel) {
    supporting.push({
      id: 'effort:dominant-system',
      title: 'Système qui paie le plus',
      summary: input.dominantDimensionLabel,
      explanation:
        input.limitingFactorLabel != null
          ? `Le facteur limitant principal est ${input.limitingFactorLabel.toLowerCase()}.`
          : 'Identifier le système dominant aide à savoir quoi protéger sur la prochaine séance.',
      evidence: input.keyEvidence.slice(0, 3),
      confidence: input.confidence,
      importance: 'MEDIUM',
      decisionImpact: 'LOAD_PROGRESSION',
      relatedDimensions: ['FATIGUE'],
    });
  }

  supporting.push({
    id: 'effort:load-context',
    title: 'Contexte de charge',
    summary: `ACWR ${input.acwr > 0 ? input.acwr.toFixed(2) : '—'} · ${input.weeklyLoad} TSS / 7j`,
    explanation:
      'Le contexte hebdomadaire sert surtout à juger si le coût du jour reste soutenable dans le bloc actuel.',
    evidence: [
      input.tsb != null ? `TSB ${input.tsb > 0 ? '+' : ''}${input.tsb}` : null,
      input.overreachingLabel,
    ].filter((line): line is string => Boolean(line)),
    confidence: input.confidence,
    importance: 'MEDIUM',
    decisionImpact: 'LOAD_PROGRESSION',
    relatedDimensions: ['FATIGUE', 'ADAPTATION'],
  });

  return buildProductInsightBundle({ primary, supporting, contextual });
}
