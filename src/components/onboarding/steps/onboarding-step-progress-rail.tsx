'use client';

import { OnboardingProgress } from '@/components/onboarding/gate/onboarding-progress';
import type { useOnboardingStepProgress } from '@/components/onboarding/steps/onboarding-step-progress-context';

type StepProgress = NonNullable<ReturnType<typeof useOnboardingStepProgress>>;

export function OnboardingStepProgressRail({ progress }: { progress: StepProgress }) {
  return (
    <div className="bg-background sticky top-0 z-20 -mx-6 px-6 pt-3 pb-3">
      <OnboardingProgress
        backDisabled={progress.backDisabled}
        step={progress.step}
        onBack={progress.onBack}
      />
    </div>
  );
}
