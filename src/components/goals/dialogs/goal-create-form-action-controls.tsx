'use client';

import { Button } from '@/components/ui/button';
import {
  OnboardingContinueButton,
  OnboardingSkipButton,
} from '@/components/onboarding/steps/onboarding-step-actions';

export function GoalCreateSkipAction({
  skipLabel,
  onSkip,
  docked,
}: {
  skipLabel?: string;
  onSkip?: () => void;
  docked: boolean;
}) {
  if (!skipLabel || !onSkip) {
    return null;
  }
  if (docked) {
    return <OnboardingSkipButton onClick={onSkip}>{skipLabel}</OnboardingSkipButton>;
  }
  return (
    <Button className="sm:mr-auto" type="button" variant="ghost" onClick={onSkip}>
      {skipLabel}
    </Button>
  );
}

export function GoalCreateCancelAction({
  onCancel,
  docked,
}: {
  onCancel?: () => void;
  docked: boolean;
}) {
  if (!onCancel) {
    return null;
  }
  return (
    <Button
      className={docked ? 'w-full sm:w-auto' : undefined}
      type="button"
      variant="outline"
      onClick={onCancel}
    >
      Annuler
    </Button>
  );
}

export function GoalCreateSubmitAction({
  form,
  submitLabel,
  submitReady,
  docked,
}: {
  form: string;
  submitLabel: string;
  submitReady: boolean;
  docked: boolean;
}) {
  if (docked) {
    return (
      <OnboardingContinueButton disabled={!submitReady} form={form} type="submit">
        {submitLabel}
      </OnboardingContinueButton>
    );
  }
  return (
    <Button disabled={!submitReady} form={form} type="submit">
      {submitLabel}
    </Button>
  );
}
