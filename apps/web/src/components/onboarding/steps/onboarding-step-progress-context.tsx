'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { OnboardingWizardStep } from '@sharpit/app/lib/onboarding/wizard/wizard-steps';

/**
 * Lets the step shell render the progress rail as a sticky band above the
 * step title (which scrolls away). The rail must stay a direct child of the
 * step section — nesting it with the title clamps sticky to that short box.
 *
 * A context rather than props: the rail is wizard state, the title is step
 * state, and they meet in `OnboardingStepShell`. Threading step / onBack /
 * backDisabled through all five step components to reunite them there would
 * make every step carry wizard plumbing it never reads.
 *
 * Absent provider yields `null`, so the shell stays renderable on its own
 * (stories, tests, any future non-wizard use).
 */

type OnboardingStepProgress = {
  step: OnboardingWizardStep;
  onBack?: () => void;
  backDisabled: boolean;
};

const OnboardingStepProgressContext = createContext<OnboardingStepProgress | null>(null);

export function OnboardingStepProgressProvider({
  step,
  onBack,
  backDisabled,
  children,
}: OnboardingStepProgress & { children: ReactNode }) {
  const value = useMemo(() => ({ step, onBack, backDisabled }), [step, onBack, backDisabled]);

  return (
    <OnboardingStepProgressContext.Provider value={value}>
      {children}
    </OnboardingStepProgressContext.Provider>
  );
}

export function useOnboardingStepProgress(): OnboardingStepProgress | null {
  return useContext(OnboardingStepProgressContext);
}
