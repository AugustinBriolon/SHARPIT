import { describe, expect, it } from 'vitest';
import { buildRecoveryInsightBundle } from '@/core/product-insight/recovery-insights';

describe('recovery illness insight copy', () => {
  it('keeps fragilité title and aligns with atypical recovery wording', () => {
    const bundle = buildRecoveryInsightBundle({
      autonomicLabel: 'Équilibre normal',
      confidence: 0.8,
      dissonanceDetected: false,
      estimatedRecoveryDays: null,
      illnessLabel: 'Risque élevé',
      keyEvidence: [],
      limitingFactorLabel: null,
      loadLabel: 'Charge optimale',
      overreachingLabel: null,
      rationale: [],
      readinessScore: 35,
      recommendedIntensityLabel: 'Repos complet',
      wellnessLabel: 'Bien-être normal',
    });

    const illness = bundle.contextual.find((i) => i.id === 'recovery:illness-risk');
    expect(illness?.title).toBe('Risque de fragilité');
    expect(illness?.explanation).toMatch(/Signal de récupération atypique/);
    expect(illness?.explanation).toMatch(/avis médical/);
  });
});
