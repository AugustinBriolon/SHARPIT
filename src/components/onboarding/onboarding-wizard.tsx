'use client';

import { OnboardingCredentialHost } from '@/components/onboarding/onboarding-credential-host';
import { OnboardingBootstrapScreen } from '@/components/onboarding/onboarding-bootstrap-screen';
import { OnboardingWizardShell } from '@/components/onboarding/onboarding-wizard-steps';
import { useOnboardingWizard } from '@/components/onboarding/use-onboarding-wizard';
import type { IntegrationId } from '@/lib/integrations/shared/client-sync';
import type { IntegrationSourcePrefs } from '@/lib/integrations/source-prefs';
import type { AthleteEquipment } from '@/lib/equipment/types';

export function OnboardingWizard({
  initiallyConnected,
  initialPrefs,
  initialEquipment,
}: {
  initiallyConnected: IntegrationId[];
  initialPrefs: IntegrationSourcePrefs;
  initialEquipment?: AthleteEquipment | null;
}) {
  const wizard = useOnboardingWizard({ initiallyConnected, initialPrefs, initialEquipment });

  if (wizard.step === 'bootstrap') {
    return <OnboardingBootstrapScreen onDone={wizard.goToToday} />;
  }

  return (
    <>
      <OnboardingWizardShell initialEquipment={initialEquipment} wizard={wizard} />
      <OnboardingCredentialHost
        credentialTarget={wizard.credentialTarget}
        onTargetChange={wizard.setCredentialTarget}
        onConnected={(id, nextPrefs) => {
          wizard.setConnected((prev) => new Set(prev).add(id));
          if (nextPrefs) {
            wizard.setPrefs(nextPrefs);
          }
        }}
      />
    </>
  );
}
