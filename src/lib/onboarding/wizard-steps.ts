/**
 * Onboarding wizard step order and navigation helpers (pure — Vitest-friendly).
 */

export const ONBOARDING_STEPS = ['sports', 'intention', 'providers', 'equipment'] as const;

export type OnboardingWizardStep = (typeof ONBOARDING_STEPS)[number] | 'bootstrap';

export const ONBOARDING_STEP_LABELS: Record<(typeof ONBOARDING_STEPS)[number], string> = {
  sports: '1 · Sports',
  intention: '2 · Intention',
  providers: '3 · Sources',
  equipment: '4 · Équipement',
};

export function nextOnboardingStep(
  step: (typeof ONBOARDING_STEPS)[number],
): (typeof ONBOARDING_STEPS)[number] | 'complete' {
  const index = ONBOARDING_STEPS.indexOf(step);
  if (index < 0 || index >= ONBOARDING_STEPS.length - 1) {
    return 'complete';
  }
  return ONBOARDING_STEPS[index + 1]!;
}

export function previousOnboardingStep(
  step: (typeof ONBOARDING_STEPS)[number],
): (typeof ONBOARDING_STEPS)[number] | null {
  const index = ONBOARDING_STEPS.indexOf(step);
  if (index <= 0) {
    return null;
  }
  return ONBOARDING_STEPS[index - 1]!;
}

/** Sources continue / skip both land on Equipment (optional gear step). */
export function stepAfterProviders(): 'equipment' {
  return 'equipment';
}

/**
 * Equipment is optional — Continuer and Passer both complete onboarding.
 * Skip does not require any equipment selection.
 */
export function equipmentStepAllowsSkip(): true {
  return true;
}

export function parseOnboardingStepParam(value: string | null): OnboardingWizardStep {
  if (
    value === 'providers' ||
    value === 'intention' ||
    value === 'equipment' ||
    value === 'sports'
  ) {
    return value;
  }
  return 'sports';
}
