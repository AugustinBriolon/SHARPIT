'use client';

import type { IntegrationId } from '@/lib/integrations/shared/client-sync';
import type { IntegrationSourcePrefs } from '@/lib/integrations/source-prefs';
import type { CatalogProvider, DataClassId } from '@/lib/integrations/provider-catalog';
import {
  continueButtonLabel,
  OnboardingProvidersClassList,
} from '@/components/onboarding/onboarding-providers-step-parts';
import { OnboardingStepShell } from '@/components/onboarding/onboarding-step-shell';
import { Button } from '@/components/ui/button';

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
        <Button className="w-full sm:w-auto" disabled={busy} type="button" onClick={onContinue}>
          {continueButtonLabel(busy, connected.size > 0)}
        </Button>
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
