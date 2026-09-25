'use client';

import {
  OnboardingContinueButton,
  OnboardingSkipButton,
} from '@/components/onboarding/steps/onboarding-step-actions';

export function OnboardingEquipmentActions({
  pending,
  onContinue,
  onSkip,
}: {
  pending: boolean;
  onContinue: () => void | Promise<void>;
  onSkip: () => void | Promise<void>;
}) {
  return (
    <>
      <OnboardingSkipButton disabled={pending} onClick={onSkip} />
      <OnboardingContinueButton disabled={pending} onClick={onContinue} />
    </>
  );
}

export async function flushEquipmentAndContinue(
  flush: () => Promise<void>,
  next: () => void | Promise<void>,
) {
  await flush();
  await next();
}
