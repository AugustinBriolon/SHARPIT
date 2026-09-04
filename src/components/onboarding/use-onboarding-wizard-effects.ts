'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { processOAuthReturn } from '@/components/onboarding/onboarding-wizard-api';
import type { useOnboardingWizardState } from '@/components/onboarding/use-onboarding-wizard-state';

export function useOnboardingWizardEffects(wizard: ReturnType<typeof useOnboardingWizardState>) {
  const searchParams = useSearchParams();

  useEffect(() => {
    processOAuthReturn(searchParams, wizard.setConnected, wizard.setStep);
  }, [searchParams, wizard.setConnected, wizard.setStep]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [wizard.step]);
}
