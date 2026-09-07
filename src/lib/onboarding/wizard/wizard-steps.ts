/**
 * Onboarding wizard step order and navigation helpers (pure — Vitest-friendly).
 *
 * Sports → Equipment (context from sports) → Intention → Sources → done.
 */

export const ONBOARDING_STEPS = ['sports', 'equipment', 'intention', 'providers'] as const;

export type OnboardingWizardStep = (typeof ONBOARDING_STEPS)[number] | 'bootstrap';

/** Bare names — the progress rail owns the numbering (see wizard-progress.ts). */
export const ONBOARDING_STEP_LABELS: Record<(typeof ONBOARDING_STEPS)[number], string> = {
  sports: 'Sports',
  equipment: 'Équipement',
  intention: 'Intention',
  providers: 'Sources',
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
  step: OnboardingWizardStep,
): (typeof ONBOARDING_STEPS)[number] | null {
  if (step === 'bootstrap') {
    return null;
  }
  const index = ONBOARDING_STEPS.indexOf(step);
  if (index <= 0) {
    return null;
  }
  return ONBOARDING_STEPS[index - 1]!;
}

/** Equipment continue / skip both land on Intention. */
export function stepAfterEquipment(): 'intention' {
  return 'intention';
}

/**
 * Equipment is optional — Continuer and Passer both advance.
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
