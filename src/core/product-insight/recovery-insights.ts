import { buildProductInsightBundle } from '@/core/product-insight/build-product-insight-bundle';
import type { ProductInsight, RecoveryInsightInput } from '@/core/product-insight/types';

export function buildRecoveryInsightBundle(input: RecoveryInsightInput) {
  const primary: ProductInsight[] = [];
  const supporting: ProductInsight[] = [];
  const contextual: ProductInsight[] = [];

  primary.push({
    id: 'recovery:training-readiness',
    title: "Intensite realiste aujourd'hui",
    summary: input.recommendedIntensityLabel,
    explanation:
      input.limitingFactorLabel != null
        ? `Le facteur limitant principal est ${input.limitingFactorLabel.toLowerCase()}.`
        : 'Le niveau de recuperation du jour guide l intensite la plus realiste.',
    evidence: input.rationale,
    confidence: input.confidence,
    importance: input.readinessScore != null && input.readinessScore < 50 ? 'CRITICAL' : 'HIGH',
    decisionImpact: 'TRAINING_TODAY',
    relatedDimensions: ['RECOVERY', 'REASONING'],
  });

  supporting.push({
    id: 'recovery:main-driver',
    title: 'Ce qui guide la decision',
    summary: `${input.autonomicLabel} · ${input.wellnessLabel} · ${input.loadLabel}`,
    explanation:
      'SHARPIT confronte les signaux du systeme nerveux, le ressenti et le contexte de charge avant de recommander une intensite.',
    evidence: input.keyEvidence.slice(0, 3),
    confidence: input.confidence,
    importance: 'MEDIUM',
    decisionImpact: 'TRAINING_TODAY',
    relatedDimensions: ['RECOVERY'],
  });

  if (input.estimatedRecoveryDays != null && input.estimatedRecoveryDays > 0) {
    supporting.push({
      id: 'recovery:time-to-full-recovery',
      title: 'Fenetre de retour complet',
      summary: `${input.estimatedRecoveryDays} jour(s) pour revenir pleinement`,
      explanation:
        'Cette estimation aide a placer la prochaine seance exigeante au bon moment plutot que de forcer trop tot.',
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
        'Quand le corps ressenti et les signaux objectifs ne racontent pas la meme histoire, la prudence prime sur les chiffres isoles.',
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
        'Le systeme voit des signes qui ressemblent a une recuperation insuffisante face a la charge recente.',
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
      title: 'Risque de fragilite',
      summary: input.illnessLabel,
      explanation:
        'Quand le profil de recuperation ressemble a une baisse de resilience globale, il vaut mieux proteger la journee.',
      evidence: input.keyEvidence.slice(0, 2),
      confidence: input.confidence,
      importance: 'MEDIUM',
      decisionImpact: 'RECOVERY_BEHAVIOR',
      relatedDimensions: ['RECOVERY'],
    });
  }

  return buildProductInsightBundle({ primary, supporting, contextual });
}
