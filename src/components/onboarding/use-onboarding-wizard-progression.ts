'use client';

import { useCallback } from 'react';
import { patchPracticedSports } from '@/components/onboarding/onboarding-wizard-api';
import { hasCorePracticedSport, type PracticedSportId } from '@/lib/practiced-sports';
import type { GoalPayload } from '@/hooks/use-data';
import type { useGoalMutations } from '@/hooks/use-data';
import type { OnboardingWizardStep } from '@/lib/onboarding/wizard-steps';

export function useOnboardingWizardSportsFlow(
  sports: PracticedSportId[],
  setStep: React.Dispatch<React.SetStateAction<OnboardingWizardStep>>,
  setBusy: React.Dispatch<React.SetStateAction<boolean>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
) {
  return useCallback(async () => {
    if (!hasCorePracticedSport(sports)) {
      setError('Choisis au moins un sport d’endurance pour continuer.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const ok = await patchPracticedSports(sports);
      if (!ok) {
        setError('Impossible d’enregistrer tes sports — réessaie.');
        return;
      }
      setStep('equipment');
    } finally {
      setBusy(false);
    }
  }, [setBusy, setError, setStep, sports]);
}

export function useOnboardingWizardIntentionSubmit(
  createGoal: ReturnType<typeof useGoalMutations>['create'],
  setStep: React.Dispatch<React.SetStateAction<OnboardingWizardStep>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
) {
  return useCallback(
    (payload: GoalPayload) => {
      setError(null);
      setStep('providers');
      createGoal.mutate(payload, {
        onError: (err) => {
          setError(err instanceof Error ? err.message : "Impossible de créer l'objectif");
          setStep('intention');
        },
      });
    },
    [createGoal, setError, setStep],
  );
}
