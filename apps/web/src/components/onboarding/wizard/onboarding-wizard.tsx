'use client';

import { OnboardingCredentialHost } from '@/components/onboarding/gate/onboarding-credential-host';
import { OnboardingBootstrapScreen } from '@/components/onboarding/gate/onboarding-bootstrap-screen';
import { OnboardingWizardShell } from '@/components/onboarding/wizard/onboarding-wizard-steps';
import { useOnboardingWizard } from '@/components/onboarding/wizard/use-onboarding-wizard';
import type { IntegrationId } from '@sharpit/app/lib/integrations/shared/client-sync';
import type { IntegrationSourcePrefs } from '@sharpit/app/lib/integrations/source-prefs';
import type { AthleteEquipment } from '@sharpit/app/lib/equipment/types';

export function OnboardingWizard({
  initiallyConnected,
  initialPrefs,
  initialEquipment,
  unofficialAcknowledged = false,
}: {
  initiallyConnected: IntegrationId[];
  initialPrefs: IntegrationSourcePrefs;
  initialEquipment?: AthleteEquipment | null;
  /** Garmin, Renpho and MyFitnessPal can't connect before this acknowledgement. */
  unofficialAcknowledged?: boolean;
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
        unofficialAcknowledged={unofficialAcknowledged}
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
