'use client';

import type { IntegrationId } from '@sharpit/server/lib/integrations/shared/client-sync';
import type { IntegrationSourcePrefs } from '@sharpit/server/lib/integrations/source-prefs';
import type {
  CatalogProvider,
  DataClassId,
} from '@sharpit/server/lib/integrations/provider-catalog';
import {
  continueButtonLabel,
  OnboardingProvidersClassList,
} from '@/components/onboarding/steps/onboarding-providers-step-parts';
import { OnboardingContinueButton } from '@/components/onboarding/steps/onboarding-step-actions';
import { OnboardingStepShell } from '@/components/onboarding/steps/onboarding-step-shell';

export function OnboardingProvidersStep({
  prefs,
  connected,
  busy,
  error,
  onConnect,
  onSetPrimary,
  onToggleUse,
  onContinue,
}: {
  prefs: IntegrationSourcePrefs;
  connected: Set<string>;
  busy: boolean;
  error: string | null;
  onConnect: (provider: CatalogProvider, dataClassId: DataClassId) => void;
  onSetPrimary: (integrationId: IntegrationId, dataClassId: DataClassId) => void;
  onToggleUse: (integrationId: IntegrationId, dataClassId: DataClassId, enable: boolean) => void;
  onContinue: () => void;
}) {
  return (
    <OnboardingStepShell
      error={error}
      intro="Un compte, plusieurs usages — tu choisis ce que SharpIt lit par catégorie. Garmin connecté pour les activités ne force pas la santé wearable."
      title="Connecte tes sources"
      titleId="onboarding-providers-title"
      actions={
        <OnboardingContinueButton disabled={busy} onClick={onContinue}>
          {continueButtonLabel(busy)}
        </OnboardingContinueButton>
      }
    >
      <OnboardingProvidersClassList
        connected={connected}
        prefs={prefs}
        onConnect={onConnect}
        onSetPrimary={onSetPrimary}
        onToggleUse={onToggleUse}
      />
    </OnboardingStepShell>
  );
}
