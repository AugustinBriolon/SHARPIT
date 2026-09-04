'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboardingWizardPrefs } from '@/components/onboarding/use-onboarding-wizard-prefs';
import {
  useOnboardingWizardConnect,
  useOnboardingWizardFinish,
} from '@/components/onboarding/use-onboarding-wizard-connect';
import {
  useOnboardingWizardIntentionSubmit,
  useOnboardingWizardSportsFlow,
} from '@/components/onboarding/use-onboarding-wizard-progression';
import type { useOnboardingWizardState } from '@/components/onboarding/use-onboarding-wizard-state';
import type { useGoalMutations } from '@/hooks/use-data';
import { previousOnboardingStep } from '@/lib/onboarding/wizard-steps';

export function useOnboardingWizardHandlers(
  wizard: ReturnType<typeof useOnboardingWizardState>,
  createGoal: ReturnType<typeof useGoalMutations>['create'],
) {
  const finish = useOnboardingWizardFinish(wizard.setStep, wizard.setBusy, wizard.setError);
  const handleConnect = useOnboardingWizardConnect(wizard.setCredentialTarget);
  const continueFromSports = useOnboardingWizardSportsFlow(
    wizard.sports,
    wizard.setStep,
    wizard.setBusy,
    wizard.setError,
  );
  const submitIntentionGoal = useOnboardingWizardIntentionSubmit(
    createGoal,
    wizard.setStep,
    wizard.setError,
  );
  const prefsActions = useOnboardingWizardPrefs(wizard.prefs, wizard.setPrefs);

  const goBack = useCallback(
    (target: Exclude<ReturnType<typeof previousOnboardingStep>, null>) => {
      wizard.setError(null);
      wizard.setStep(target);
    },
    [wizard],
  );

  return {
    finish,
    handleConnect,
    handleToggleUse: prefsActions.handleToggleUse,
    handleSetPrimary: prefsActions.handleSetPrimary,
    continueFromSports,
    submitIntentionGoal,
    goBack,
    previousStep: previousOnboardingStep(wizard.step),
  };
}

export function useOnboardingWizardNavigation() {
  const router = useRouter();
  return useCallback(() => {
    router.replace('/');
    router.refresh();
  }, [router]);
}
