'use client';

import { useCallback } from 'react';
import {
  oauthConnectHref,
  type CatalogProvider,
  type DataClassId,
} from '@/lib/integrations/provider-catalog';
import type { CredentialProvider } from '@/components/onboarding/use-onboarding-wizard';
import { completeOnboarding } from '@/components/onboarding/onboarding-wizard-api';
import type { OnboardingWizardStep } from '@/lib/onboarding/wizard-steps';

export function useOnboardingWizardFinish(
  setStep: React.Dispatch<React.SetStateAction<OnboardingWizardStep>>,
  setBusy: React.Dispatch<React.SetStateAction<boolean>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
) {
  return useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await completeOnboarding();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStep('bootstrap');
    } finally {
      setBusy(false);
    }
  }, [setBusy, setError, setStep]);
}

export function useOnboardingWizardConnect(
  setCredentialTarget: React.Dispatch<
    React.SetStateAction<{ provider: CredentialProvider; dataClass: DataClassId } | null>
  >,
) {
  return useCallback(
    (provider: CatalogProvider, dataClass: DataClassId) => {
      if (provider.status === 'coming_soon' || !provider.integrationId) {
        return;
      }

      if (provider.authKind === 'oauth' && provider.oauthPath) {
        window.location.assign(oauthConnectHref(provider.oauthPath, '/onboarding', dataClass));
        return;
      }
      if (provider.authKind === 'credentials') {
        setCredentialTarget({
          provider: provider.integrationId as CredentialProvider,
          dataClass,
        });
      }
    },
    [setCredentialTarget],
  );
}
