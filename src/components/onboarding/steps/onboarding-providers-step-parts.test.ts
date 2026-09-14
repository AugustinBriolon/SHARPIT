import { describe, expect, it } from 'vitest';
import { continueButtonLabel } from '@/components/onboarding/steps/onboarding-providers-step-parts';

describe('continueButtonLabel', () => {
  it('marks the last wizard step as Finaliser, not Continuer', () => {
    expect(continueButtonLabel(false)).toBe('Finaliser');
    expect(continueButtonLabel(true)).toBe('Finalisation…');
  });
});
