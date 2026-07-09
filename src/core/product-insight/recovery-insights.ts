import { buildProductInsightBundle } from '@/core/product-insight/build-product-insight-bundle';
import type { ProductInsight, RecoveryInsightInput } from '@/core/product-insight/types';

export function buildRecoveryInsightBundle(input: RecoveryInsightInput) {
  const primary: ProductInsight[] = [];
  const supporting: ProductInsight[] = [];
  const contextual: ProductInsight[] = [];

  primary.push({
    id: 'recovery:training-readiness',
    title: "Intensité réaliste aujourd'hui",
    summary: input.recommendedIntensityLabel,
    explanation:
      input.limitingFactorLabel != null
        ? `Le facteur limitant principal est ${input.limitingFactorLabel.toLowerCase()}.`
        : "Le niveau de récupération du jour guide l'intensité la plus réaliste.",
    evidence: input.rationale,
    confidence: input.confidence,
    importance: input.readinessScore != null && input.readinessScore < 50 ? 'CRITICAL' : 'HIGH',
    decisionImpact: 'TRAINING_TODAY',
    relatedDimensions: ['RECOVERY', 'REASONING'],
  });

  supporting.push({
    id: 'recovery:main-driver',
    title: 'Ce qui guide la décision',
    summary: `${input.autonomicLabel} · ${input.wellnessLabel} · ${input.loadLabel}`,
    explanation:
      'SHARPIT confronte les signaux du système nerveux, le ressenti et le contexte de charge avant de recommander une intensité.',
    evidence: input.keyEvidence.slice(0, 3),
    confidence: input.confidence,
    importance: 'MEDIUM',
    decisionImpact: 'TRAINING_TODAY',
    relatedDimensions: ['RECOVERY'],
  });

  if (input.estimatedRecoveryDays != null && input.estimatedRecoveryDays > 0) {
    supporting.push({
      id: 'recovery:time-to-full-recovery',
      title: 'Fenêtre de retour complet',
      summary: `${input.estimatedRecoveryDays} jour(s) pour revenir pleinement`,
      explanation:
        'Cette estimation aide à placer la prochaine séance exigeante au bon moment plutôt que de forcer trop tôt.',
      evidence: input.rationale.slice(0, 2),
      confidence: input.confidence,
      importance: input.estimatedRecoveryDays >= 3 ? 'HIGH' : 'MEDIUM',
      decisionImpact: 'LOAD_PROGRESSION',
      relatedDimensions: ['RECOVERY'],
    });
  }

  if (input.dissonanceDetected) {
    contextual.push({
      id: 'recovery:dissonance',
      title: 'Signaux contradictoires',
      summary: 'Le ressenti et les marqueurs physiologiques divergent.',
      explanation:
        'Quand le corps ressenti et les signaux objectifs ne racontent pas la même histoire, la prudence prime sur les chiffres isolés.',
      evidence: [input.autonomicLabel, input.wellnessLabel, ...input.keyEvidence.slice(0, 1)],
      confidence: input.confidence,
      importance: 'HIGH',
      decisionImpact: 'TRUST',
      relatedDimensions: ['RECOVERY', 'REASONING'],
    });
  }

  if (input.overreachingLabel) {
    contextual.push({
      id: 'recovery:overreaching-risk',
      title: 'Risque de surcharge',
      summary: input.overreachingLabel,
      explanation:
        'Le système voit des signes qui ressemblent à une récupération insuffisante face à la charge récente.',
      evidence: input.keyEvidence.slice(0, 2),
      confidence: input.confidence,
      importance: 'HIGH',
      decisionImpact: 'TRAINING_TODAY',
      relatedDimensions: ['RECOVERY', 'FATIGUE'],
    });
  }

  if (input.illnessLabel) {
    contextual.push({
      id: 'recovery:illness-risk',
      title: 'Risque de fragilité',
      summary: input.illnessLabel,
      explanation:
        'Quand le profil de récupération ressemble à une baisse de résilience globale, il vaut mieux protéger la journée.',
      evidence: input.keyEvidence.slice(0, 2),
      confidence: input.confidence,
      importance: 'MEDIUM',
      decisionImpact: 'RECOVERY_BEHAVIOR',
      relatedDimensions: ['RECOVERY'],
    });
  }

  return buildProductInsightBundle({ primary, supporting, contextual });
}
