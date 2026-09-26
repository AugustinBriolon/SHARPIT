'use client';

import { useCallback, useState } from 'react';
import type { AthleteEquipment } from '@sharpit/app/lib/equipment/types';
import type { IntegrationId } from '@sharpit/app/lib/integrations/shared/client-sync';
import type { IntegrationSourcePrefs } from '@sharpit/app/lib/integrations/source-prefs';
import type { DataClassId } from '@sharpit/app/lib/integrations/provider-catalog';
import {
  parseOnboardingStepParam,
  type OnboardingWizardStep,
} from '@sharpit/app/lib/onboarding/wizard/wizard-steps';
import type { PracticedSportId } from '@sharpit/app/lib/practiced-sports';
import {
  EMPTY_TRAINING_AVAILABILITY,
  type TrainingAvailability,
} from '@sharpit/app/lib/training-availability/types';
import type { CredentialProvider } from '@/components/onboarding/wizard/use-onboarding-wizard';

export function useOnboardingWizardState(
  initiallyConnected: IntegrationId[],
  initialPrefs: IntegrationSourcePrefs,
  initialStep: OnboardingWizardStep,
) {
  const [step, setStep] = useState<OnboardingWizardStep>(initialStep);
  const [sports, setSports] = useState<PracticedSportId[]>([]);
  const [availability, setAvailability] = useState<TrainingAvailability>(
    EMPTY_TRAINING_AVAILABILITY,
  );
  const [connected, setConnected] = useState<Set<string>>(() => new Set(initiallyConnected));
  const [prefs, setPrefs] = useState<IntegrationSourcePrefs>(initialPrefs);
  const [credentialTarget, setCredentialTarget] = useState<{
    provider: CredentialProvider;
    dataClass: DataClassId;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearErrorAndGo = useCallback((target: OnboardingWizardStep) => {
    setError(null);
    setStep(target);
  }, []);

  return {
    step,
    setStep,
    sports,
    setSports,
    availability,
    setAvailability,
    connected,
    setConnected,
    prefs,
    setPrefs,
    credentialTarget,
    setCredentialTarget,
    busy,
    setBusy,
    error,
    setError,
    clearErrorAndGo,
  };
}

export function parseInitialOnboardingStep(searchStep: string | null): OnboardingWizardStep {
  return parseOnboardingStepParam(searchStep);
}

export type OnboardingWizardInitialProps = {
  initiallyConnected: IntegrationId[];
  initialPrefs: IntegrationSourcePrefs;
  initialEquipment?: AthleteEquipment | null;
};
