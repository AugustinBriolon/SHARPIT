'use client';

import { DATA_CLASSES, providersForClass } from '@/lib/integrations/provider-catalog';
import type { IntegrationId } from '@/lib/integrations/shared/client-sync';
import type { IntegrationSourcePrefs } from '@/lib/integrations/source-prefs';
import type { CatalogProvider, DataClassId } from '@/lib/integrations/provider-catalog';
import { OnboardingProviderRow } from '@/components/onboarding/onboarding-provider-row';
import { Button } from '@/components/ui/button';

export function OnboardingProvidersStep({
  prefs,
  connected,
  busy,
  error,
  onBack,
  onConnect,
  onSetPrimary,
  onToggleUse,
  onContinue,
}: {
  prefs: IntegrationSourcePrefs;
  connected: Set<string>;
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onConnect: (provider: CatalogProvider, dataClassId: DataClassId) => void;
  onSetPrimary: (integrationId: IntegrationId, dataClassId: DataClassId) => void;
  onToggleUse: (integrationId: IntegrationId, dataClassId: DataClassId, enable: boolean) => void;
  onContinue: () => void;
}) {
  return (
    <section aria-labelledby="onboarding-providers-title" className="space-y-6">
      <button
        className="text-muted-foreground hover:text-foreground -mb-2 text-xs underline underline-offset-2"
        type="button"
        onClick={onBack}
      >
        ‹ Retour
      </button>
      <div className="space-y-1 text-center">
        <h1 className="text-section-title" id="onboarding-providers-title">
          Connecte tes sources
        </h1>
        <p className="text-muted-foreground text-sm text-pretty">
          Un compte, plusieurs usages — tu choisis ce que SharpIt lit par catégorie. Garmin connecté
          pour les activités ne force pas la santé wearable.
        </p>
      </div>

      {DATA_CLASSES.map((dataClass) => {
        const providers = providersForClass(dataClass.id);
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

      {error ? (
        <p aria-live="assertive" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <Button className="w-full" disabled={busy} type="button" onClick={onContinue}>
        {continueButtonLabel(busy, connected.size > 0)}
      </Button>
    </section>
  );
}

function continueButtonLabel(busy: boolean, hasConnectedAny: boolean): string {
  if (busy) {
    return 'Suite…';
  }
  return hasConnectedAny ? 'Continuer' : 'Continuer sans connexion';
}
