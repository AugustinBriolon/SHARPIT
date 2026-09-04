/**
 * Onboarding progress model (pure — Vitest-friendly).
 *
 * The wizard rail fills inclusively: reaching a step counts it as attained,
 * so step 2 of 4 sits at 50%. Keeps the athlete oriented without pretending
 * the current step is already validated.
 */

import {
  ONBOARDING_STEP_LABELS,
  ONBOARDING_STEPS,
  type OnboardingWizardStep,
} from '@/lib/onboarding/wizard-steps';

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number];
export type OnboardingStepStatus = 'done' | 'current' | 'upcoming';

export const ONBOARDING_STEP_COUNT = ONBOARDING_STEPS.length;

/** 1-based position. `bootstrap` reads as the whole wizard being behind us. */
export function onboardingStepPosition(step: OnboardingWizardStep): number {
  if (step === 'bootstrap') {
    return ONBOARDING_STEP_COUNT;
  }
  return ONBOARDING_STEPS.indexOf(step) + 1;
}

/** Rail fill, 0–100, rounded to an integer so the CSS width stays stable. */
export function onboardingProgressPercent(step: OnboardingWizardStep): number {
  return Math.round((onboardingStepPosition(step) / ONBOARDING_STEP_COUNT) * 100);
}

export function onboardingStepStatus(
  candidate: OnboardingStepId,
  current: OnboardingWizardStep,
): OnboardingStepStatus {
  const candidatePosition = onboardingStepPosition(candidate);
  const currentPosition = onboardingStepPosition(current);
  if (candidatePosition < currentPosition) {
    return 'done';
  }
  return candidatePosition === currentPosition ? 'current' : 'upcoming';
}

/** Announced by the progressbar — screen readers get the count, not just a ratio. */
export function onboardingProgressLabel(step: OnboardingWizardStep): string {
  const position = onboardingStepPosition(step);
  if (step === 'bootstrap') {
    return `Étape ${position} sur ${ONBOARDING_STEP_COUNT} · terminé`;
  }
  return `Étape ${position} sur ${ONBOARDING_STEP_COUNT} · ${ONBOARDING_STEP_LABELS[step]}`;
}

/** Boundary offsets (%) between segments — the rail's countable ticks. */
export function onboardingSegmentTicks(): number[] {
  return ONBOARDING_STEPS.slice(1).map((_, index) =>
    Math.round(((index + 1) / ONBOARDING_STEP_COUNT) * 100),
  );
}
