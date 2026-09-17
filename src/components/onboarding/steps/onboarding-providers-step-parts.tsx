'use client';

import { DATA_CLASSES, availableProvidersForClass } from '@/lib/integrations/provider-catalog';
import type { IntegrationId } from '@/lib/integrations/shared/client-sync';
import type { IntegrationSourcePrefs } from '@/lib/integrations/source-prefs';
import type { CatalogProvider, DataClassId } from '@/lib/integrations/provider-catalog';
import { OnboardingProviderRow } from '@/components/onboarding/steps/onboarding-provider-row';

/**
 * Last-step forward label. Connecting nothing is a valid path; the step copy
 * already says sources are optional, so we do not invent a lesser "sans
 * connexion" variant. "Finaliser" (not "Continuer") marks the wizard end.
 */
export function continueButtonLabel(busy: boolean): string {
  return busy ? 'Finalisation…' : 'Finaliser';
}

export function OnboardingProvidersClassList({
  prefs,
  connected,
  onConnect,
  onSetPrimary,
  onToggleUse,
}: {
  prefs: IntegrationSourcePrefs;
  connected: Set<string>;
  onConnect: (provider: CatalogProvider, dataClassId: DataClassId) => void;
  onSetPrimary: (integrationId: IntegrationId, dataClassId: DataClassId) => void;
  onToggleUse: (integrationId: IntegrationId, dataClassId: DataClassId, enable: boolean) => void;
}) {
  return (
    <div className="space-y-8">
      {DATA_CLASSES.map((dataClass) => {
        // Beta: only connectable providers — hide "Bientôt" noise (Strava, Polar, …).
        const providers = availableProvidersForClass(dataClass.id);
        if (providers.length === 0) {
          return null;
        }
        const classPrefs = prefs.classes[dataClass.id];
        return (
          <div key={dataClass.id} className="space-y-2">
            <div>
              <h2 className="text-sm font-medium">{dataClass.label}</h2>
              <p className="text-muted-foreground text-xs">{dataClass.description}</p>
            </div>
            <ul className="space-y-2">
              {providers.map((provider) => (
                <OnboardingProviderRow
                  key={`${dataClass.id}-${provider.id}`}
                  classPrefs={classPrefs}
                  connected={connected}
                  dataClassId={dataClass.id}
                  provider={provider}
                  onConnect={() => onConnect(provider, dataClass.id)}
                  onSetPrimary={(integrationId) => onSetPrimary(integrationId, dataClass.id)}
                  onToggleUse={(integrationId, enable) =>
                    onToggleUse(integrationId, dataClass.id, enable)
                  }
                />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
