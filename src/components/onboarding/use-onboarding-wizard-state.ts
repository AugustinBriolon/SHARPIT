'use client';

import { useCallback, useState } from 'react';
import type { AthleteEquipment } from '@/lib/equipment/types';
import type { IntegrationId } from '@/lib/integrations/shared/client-sync';
import type { IntegrationSourcePrefs } from '@/lib/integrations/source-prefs';
import type { DataClassId } from '@/lib/integrations/provider-catalog';
import { parseOnboardingStepParam, type OnboardingWizardStep } from '@/lib/onboarding/wizard-steps';
import type { PracticedSportId } from '@/lib/practiced-sports';
import type { CredentialProvider } from '@/components/onboarding/use-onboarding-wizard';

export function useOnboardingWizardState(
  initiallyConnected: IntegrationId[],
  initialPrefs: IntegrationSourcePrefs,
  initialStep: OnboardingWizardStep,
) {
  const [step, setStep] = useState<OnboardingWizardStep>(initialStep);
  const [sports, setSports] = useState<PracticedSportId[]>([]);
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
