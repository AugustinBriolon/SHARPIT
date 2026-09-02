import { describe, expect, it } from 'vitest';
import {
  ATYPICAL_RECOVERY_SIGNAL_PREFIX,
  ILLNESS_SYMPTOM_ADVICE_FR,
  MEDICAL_DISCLAIMER_V0,
} from '@/lib/copy/medical-disclaimer';
import { resolveCode } from '@/lib/french';

describe('Science Sport medical disclaimer V0', () => {
  it('keeps the exact athlete-facing disclaimer string', () => {
    expect(MEDICAL_DISCLAIMER_V0).toBe(
      "Sharpit est un outil d'aide à l'entraînement. Ce n'est pas un dispositif médical et ça ne remplace pas un avis médical. Les signaux (récupération, fatigue, risques) sont des estimations d'entraînement, pas un diagnostic.",
    );
  });

  it('exposes atypical recovery chip prefix and symptom advice', () => {
    expect(ATYPICAL_RECOVERY_SIGNAL_PREFIX).toBe('Signal de récupération atypique');
    expect(ILLNESS_SYMPTOM_ADVICE_FR).toBe('En cas de symptômes, consulte un avis médical.');
  });
});

describe('illnessRisk FR strings', () => {
  it('resolves consult and mandatory caveats (not raw codes)', () => {
    expect(resolveCode('recovery.rationale.illnessRisk.acute')).not.toBe(
      'recovery.rationale.illnessRisk.acute',
    );
    expect(resolveCode('recovery.rationale.illnessRisk.mandatory')).toMatch(/Repos/i);
    expect(resolveCode('recovery.rationale.illnessRisk.consult')).toBe(
      'En cas de symptômes, consulte un avis médical.',
    );
  });

  it('avoids absolute form / physiology claims on race-ready rationale', () => {
    const rationale = resolveCode('reasoning.topAction.raceReady.rationale');
    expect(rationale).not.toMatch(/tous tes indicateurs/i);
    expect(rationale).not.toMatch(/forme optimale/i);
    expect(rationale.length).toBeGreaterThan(10);
  });
});
