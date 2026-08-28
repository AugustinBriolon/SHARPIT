'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { OnboardingCredentialHost } from '@/components/onboarding/onboarding-credential-host';
import { OnboardingBootstrapScreen } from '@/components/onboarding/onboarding-bootstrap-screen';
import { OnboardingIntentionStep } from '@/components/onboarding/onboarding-intention-step';
import { OnboardingProvidersStep } from '@/components/onboarding/onboarding-providers-step';
import { toast } from '@/components/ui/toast';
import type { GoalPayload } from '@/hooks/use-data';
import {
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

function providerLabel(id: string): string {
  const fromClass = providersForClass('activities')
    .concat(providersForClass('body'))
    .concat(providersForClass('calendar'))
    .find((p) => p.integrationId === id);
  return fromClass?.name ?? id;
}

function processOAuthReturn(
  searchParams: URLSearchParams,
  setConnected: React.Dispatch<React.SetStateAction<Set<string>>>,
  setStep: React.Dispatch<React.SetStateAction<Step>>,
) {
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
}

function OnboardingStepHeader({ step }: { step: Step }) {
  return (
    <div className="text-muted-foreground flex items-center justify-center gap-2 text-xs tracking-wide">
      <span className={cn(step === 'intention' && 'text-foreground font-medium')}>
        1 · Intention
      </span>
      <span aria-hidden>·</span>
      <span className={cn(step === 'providers' && 'text-foreground font-medium')}>2 · Sources</span>
    </div>
  );
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
    processOAuthReturn(searchParams, setConnected, setStep);
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

  async function submitIntentionGoal(payload: GoalPayload) {
    try {
      await createGoal(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer l'objectif");
      throw err;
    }
  }

  if (step === 'bootstrap') {
    return <OnboardingBootstrapScreen onDone={goToToday} />;
  }

  return (
    <div className="space-y-6">
      <OnboardingStepHeader step={step} />

      {step === 'intention' ? (
        <OnboardingIntentionStep
          busy={busy}
          error={error}
          onSubmit={submitIntentionGoal}
          onSkip={() => {
            setError(null);
            setStep('providers');
          }}
        />
      ) : (
        <OnboardingProvidersStep
          busy={busy}
          connected={connected}
          error={error}
          prefs={prefs}
          onBack={() => setStep('intention')}
          onConnect={handleConnect}
          onFinish={() => void finish()}
          onSetPrimary={handleSetPrimary}
          onToggleUse={handleToggleUse}
        />
      )}

      <OnboardingCredentialHost
        credentialTarget={credentialTarget}
        onTargetChange={setCredentialTarget}
        onConnected={(id, nextPrefs) => {
          setConnected((prev) => new Set(prev).add(id));
          if (nextPrefs) {
            setPrefs(nextPrefs);
          }
        }}
      />
    </div>
  );
}
