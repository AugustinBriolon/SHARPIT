'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { GoalCreateForm } from '@/components/goals/dialogs/goal-create-form';
import { ClassSourceControls } from '@/components/integrations/class-source-controls';
import { OnboardingBootstrapScreen } from '@/components/onboarding/onboarding-bootstrap-screen';
import { OnboardingCredentialDialog } from '@/components/onboarding/onboarding-credential-dialog';
import { IntegrationLogo } from '@/components/settings/integrations/logos';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import type { GoalPayload } from '@/hooks/use-data';
import {
  DATA_CLASSES,
  oauthConnectHref,
  providersForClass,
  type CatalogProvider,
  type DataClassId,
} from '@/lib/integrations/provider-catalog';
import type { IntegrationId } from '@/lib/integrations/shared/client-sync';
import {
  disableProviderForClass,
  enableProviderForClass,
  setPrimaryForClass,
  type IntegrationSourcePrefs,
} from '@/lib/integrations/source-prefs';
import { cn } from '@/lib/utils';

type Step = 'intention' | 'providers' | 'bootstrap';
type CredentialProvider = Extract<IntegrationId, 'garmin' | 'renpho' | 'myfitnesspal'>;

const OAUTH_STATUS_LABELS: Record<string, string> = {
  connected: 'connecté',
  denied: 'connexion refusée',
  error: 'erreur de connexion',
  invalid_state: 'session expirée — réessaie',
  no_athlete: 'compte introuvable',
  no_refresh: 'autorisation incomplète — réessaie',
};

async function patchPrefs(
  action: 'enable' | 'disable' | 'setPrimary',
  dataClass: DataClassId,
  provider: IntegrationId,
): Promise<IntegrationSourcePrefs | null> {
  const response = await fetch('/api/integrations/source-prefs', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, dataClass, provider }),
  });
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as { prefs: IntegrationSourcePrefs };
  return data.prefs;
}

export function OnboardingWizard({
  initiallyConnected,
  initialPrefs,
}: {
  initiallyConnected: IntegrationId[];
  initialPrefs: IntegrationSourcePrefs;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>(() =>
    searchParams.get('step') === 'providers' ? 'providers' : 'intention',
  );
  const [connected, setConnected] = useState<Set<string>>(() => new Set(initiallyConnected));
  const [prefs, setPrefs] = useState<IntegrationSourcePrefs>(initialPrefs);
  const [credentialTarget, setCredentialTarget] = useState<{
    provider: CredentialProvider;
    dataClass: DataClassId;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goToToday = useCallback(() => {
    router.replace('/');
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (searchParams.get('step') === 'providers') {
      setStep('providers');
    }

    for (const provider of ['strava', 'withings', 'google'] as const) {
      const status = searchParams.get(provider);
      if (!status) {
        continue;
      }
      if (status === 'connected') {
        setConnected((prev) => new Set(prev).add(provider));
        toast.success(`${providerLabel(provider)} connecté`);
      } else {
        toast.error(`${providerLabel(provider)} : ${OAUTH_STATUS_LABELS[status] ?? status}`);
      }
    }
    // Toast once when landing from OAuth return.
  }, [searchParams]);

  async function createGoal(payload: GoalPayload): Promise<void> {
    setError(null);
    setBusy(true);
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Impossible de créer l'objectif");
      }
      setStep('providers');
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/onboarding/complete', { method: 'POST' });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Impossible de terminer l'onboarding");
        return;
      }
      setStep('bootstrap');
    } finally {
      setBusy(false);
    }
  }

  function handleConnect(provider: CatalogProvider, dataClass: DataClassId) {
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
  }

  async function handleToggleUse(provider: IntegrationId, dataClass: DataClassId, enable: boolean) {
    const optimistic = enable
      ? enableProviderForClass(prefs, dataClass, provider)
      : disableProviderForClass(prefs, dataClass, provider);
    setPrefs(optimistic);
    const next = await patchPrefs(enable ? 'enable' : 'disable', dataClass, provider);
    if (next) {
      setPrefs(next);
    } else {
      setPrefs(prefs);
    }
  }

  async function handleSetPrimary(provider: IntegrationId, dataClass: DataClassId) {
    const optimistic = setPrimaryForClass(prefs, dataClass, provider);
    setPrefs(optimistic);
    const next = await patchPrefs('setPrimary', dataClass, provider);
    if (next) {
      setPrefs(next);
    } else {
      setPrefs(prefs);
    }
  }

  if (step === 'bootstrap') {
    return <OnboardingBootstrapScreen onDone={goToToday} />;
  }

  return (
    <div className="space-y-6">
      <div className="text-muted-foreground flex items-center justify-center gap-2 text-xs tracking-wide">
        <span className={cn(step === 'intention' && 'text-foreground font-medium')}>
          1 · Intention
        </span>
        <span aria-hidden>·</span>
        <span className={cn(step === 'providers' && 'text-foreground font-medium')}>
          2 · Sources
        </span>
      </div>

      {step === 'intention' ? (
        <section aria-labelledby="onboarding-intention-title" className="space-y-5">
          <div className="space-y-1 text-center">
            <h1 className="text-section-title" id="onboarding-intention-title">
              Pourquoi SharpIt ?
            </h1>
            <p className="text-muted-foreground text-sm text-pretty">
              Pose un premier objectif — les mêmes champs que dans Progression. Tu pourras en
              ajouter d’autres plus tard.
            </p>
          </div>

          <GoalCreateForm
            error={error}
            pending={busy}
            skipLabel="Je décide plus tard"
            submitLabel="Continuer"
            onSkip={() => {
              setError(null);
              setStep('providers');
            }}
            onSubmit={async (payload) => {
              try {
                await createGoal(payload);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Impossible de créer l'objectif");
                throw err;
              }
            }}
          />
        </section>
      ) : (
        <section aria-labelledby="onboarding-providers-title" className="space-y-6">
          <button
            className="text-muted-foreground hover:text-foreground -mb-2 text-xs underline underline-offset-2"
            type="button"
            onClick={() => setStep('intention')}
          >
            ‹ Retour
          </button>
          <div className="space-y-1 text-center">
            <h1 className="text-section-title" id="onboarding-providers-title">
              Connecte tes sources
            </h1>
            <p className="text-muted-foreground text-sm text-pretty">
              Un compte, plusieurs usages — tu choisis ce que SharpIt lit par catégorie. Garmin
              connecté pour les activités ne force pas la santé wearable.
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
                  {providers.map((provider) => {
                    const soon = provider.status === 'coming_soon';
                    const { integrationId } = provider;
                    const isConnected = integrationId !== null && connected.has(integrationId);
                    const isEnabled =
                      integrationId !== null && classPrefs.enabled.includes(integrationId);
                    const isPrimary = classPrefs.primary === integrationId;

                    return (
                      <li key={`${dataClass.id}-${provider.id}`}>
                        <div
                          className={cn(
                            'rounded-analysis w-full border px-3 py-3 text-left',
                            soon && 'border-analysis-border/60 opacity-55',
                            !soon && 'border-analysis-border',
                            isPrimary && 'bg-muted/20',
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                              {integrationId ? (
                                <IntegrationLogo
                                  className="size-9 shrink-0 rounded-lg"
                                  id={integrationId}
                                />
                              ) : (
                                <span
                                  className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-medium"
                                  aria-hidden
                                >
                                  {provider.name.slice(0, 1)}
                                </span>
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{provider.name}</p>
                                <p className="text-muted-foreground text-xs text-pretty">
                                  {provider.dataTypesByClass[dataClass.id]?.join(' · ') ??
                                    provider.tagline}
                                </p>
                              </div>
                            </div>
                            {(() => {
                              if (soon) {
                                return (
                                  <span className="text-muted-foreground shrink-0 text-xs">
                                    Bientôt
                                  </span>
                                );
                              }
                              if (!isConnected && integrationId) {
                                return (
                                  <Button
                                    className="shrink-0"
                                    size="sm"
                                    type="button"
                                    variant="secondary"
                                    onClick={() => handleConnect(provider, dataClass.id)}
                                  >
                                    Connecter
                                  </Button>
                                );
                              }
                              return null;
                            })()}
                          </div>

                          {isConnected && integrationId ? (
                            <ClassSourceControls
                              isEnabled={isEnabled}
                              isPrimary={isPrimary}
                              onSetPrimary={() =>
                                void handleSetPrimary(integrationId, dataClass.id)
                              }
                              onToggleEnabled={(next) =>
                                void handleToggleUse(integrationId, dataClass.id, next)
                              }
                            />
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}

          {error ? (
            <p aria-live="assertive" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}

          <Button className="w-full" disabled={busy} type="button" onClick={() => void finish()}>
            {finishButtonLabel(busy, connected.size > 0)}
          </Button>
        </section>
      )}

      <OnboardingCredentialDialog
        dataClass={credentialTarget?.dataClass ?? null}
        open={credentialTarget !== null}
        provider={credentialTarget?.provider ?? null}
        onConnected={(id, nextPrefs) => {
          setConnected((prev) => new Set(prev).add(id));
          if (nextPrefs) {
            setPrefs(nextPrefs);
          }
        }}
        onOpenChange={(open) => {
          if (!open) {
            setCredentialTarget(null);
          }
        }}
      />
    </div>
  );
}

function finishButtonLabel(busy: boolean, hasConnectedAny: boolean): string {
  if (busy) {
    return 'Ouverture…';
  }
  return hasConnectedAny ? 'Terminer et ouvrir Today' : 'Continuer sans connexion';
}

function providerLabel(id: string): string {
  const fromClass = providersForClass('activities')
    .concat(providersForClass('body'))
    .concat(providersForClass('calendar'))
    .find((p) => p.integrationId === id);
  return fromClass?.name ?? id;
}
