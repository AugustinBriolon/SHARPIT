'use client';

import { useSearchParams } from 'next/navigation';
import { useOnboardingWizardEffects } from '@/components/onboarding/use-onboarding-wizard-effects';
import {
  useOnboardingWizardHandlers,
  useOnboardingWizardNavigation,
} from '@/components/onboarding/use-onboarding-wizard-handlers';
import {
  parseInitialOnboardingStep,
  useOnboardingWizardState,
  type OnboardingWizardInitialProps,
} from '@/components/onboarding/use-onboarding-wizard-state';
import { useGoalMutations } from '@/hooks/use-data';

export type CredentialProvider = Extract<
  import('@/lib/integrations/shared/client-sync').IntegrationId,
  'garmin' | 'renpho' | 'myfitnesspal'
>;

export function useOnboardingWizard({
  initiallyConnected,
  initialPrefs,
}: OnboardingWizardInitialProps) {
  const searchParams = useSearchParams();
  const { create: createGoal } = useGoalMutations();
  const wizard = useOnboardingWizardState(
    initiallyConnected,
    initialPrefs,
    parseInitialOnboardingStep(searchParams.get('step')),
  );

  useOnboardingWizardEffects(wizard);
  const handlers = useOnboardingWizardHandlers(wizard, createGoal);
  const goToToday = useOnboardingWizardNavigation();

  return { ...wizard, goToToday, ...handlers };
}
