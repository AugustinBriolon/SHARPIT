'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { OnboardingCredentialHost } from '@/components/onboarding/onboarding-credential-host';
import { OnboardingBootstrapScreen } from '@/components/onboarding/onboarding-bootstrap-screen';
import { OnboardingEquipmentStep } from '@/components/onboarding/onboarding-equipment-step';
import { OnboardingIntentionStep } from '@/components/onboarding/onboarding-intention-step';
import { OnboardingProvidersStep } from '@/components/onboarding/onboarding-providers-step';
import { OnboardingSportsStep } from '@/components/onboarding/onboarding-sports-step';
import { toast } from '@/components/ui/toast';
import { useGoalMutations } from '@/hooks/use-data';
import type { AthleteEquipment } from '@/lib/equipment/types';
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
import {
  ONBOARDING_STEP_LABELS,
  ONBOARDING_STEPS,
  parseOnboardingStepParam,
  type OnboardingWizardStep,
} from '@/lib/onboarding/wizard-steps';
import { hasCorePracticedSport, type PracticedSportId } from '@/lib/practiced-sports';
import { cn } from '@/lib/utils';

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

async function patchPracticedSports(sports: PracticedSportId[]): Promise<boolean> {
  const response = await fetch('/api/athlete-profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ practicedSports: { version: 1, sports } }),
  });
  return response.ok;
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
  setStep: React.Dispatch<React.SetStateAction<OnboardingWizardStep>>,
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

function OnboardingStepHeader({ step }: { step: OnboardingWizardStep }) {
  return (
    <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-2 text-xs tracking-wide">
      {ONBOARDING_STEPS.map((id, index) => (
        <span key={id} className="inline-flex items-center gap-2">
          {index > 0 ? <span aria-hidden>·</span> : null}
          <span className={cn(step === id && 'text-foreground font-medium')}>
            {ONBOARDING_STEP_LABELS[id]}
          </span>
        </span>
      ))}
    </div>
  );
}

export function OnboardingWizard({
  initiallyConnected,
  initialPrefs,
  initialEquipment,
}: {
  initiallyConnected: IntegrationId[];
  initialPrefs: IntegrationSourcePrefs;
  initialEquipment?: AthleteEquipment | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { create: createGoal } = useGoalMutations();
  const [step, setStep] = useState<OnboardingWizardStep>(() =>
    parseOnboardingStepParam(searchParams.get('step')),
  );
  const [sports, setSports] = useState<PracticedSportId[]>([]);
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
  }, [searchParams]);

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

  async function continueFromSports() {
    if (!hasCorePracticedSport(sports)) {
      setError('Choisis au moins un sport d’endurance pour continuer.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const ok = await patchPracticedSports(sports);
      if (!ok) {
        setError('Impossible d’enregistrer tes sports — réessaie.');
        return;
      }
      setStep('intention');
    } finally {
      setBusy(false);
    }
  }

  async function submitIntentionGoal(payload: import('@/hooks/use-data').GoalPayload) {
    setError(null);
    setStep('providers');
    createGoal.mutate(payload, {
      onError: (err) => {
        setError(err instanceof Error ? err.message : "Impossible de créer l'objectif");
        setStep('intention');
      },
    });
  }

  if (step === 'bootstrap') {
    return <OnboardingBootstrapScreen onDone={goToToday} />;
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <OnboardingStepHeader step={step} />

      {step === 'sports' ? (
        <OnboardingSportsStep
          busy={busy}
          error={error}
          sports={sports}
          onContinue={() => void continueFromSports()}
          onSportsChange={setSports}
        />
      ) : null}

      {step === 'intention' ? (
        <OnboardingIntentionStep
          busy={busy}
          error={error}
          practicedSports={sports}
          onSubmit={submitIntentionGoal}
          onBack={() => {
            setError(null);
            setStep('sports');
          }}
          onSkip={() => {
            setError(null);
            setStep('providers');
          }}
        />
      ) : null}

      {step === 'providers' ? (
        <OnboardingProvidersStep
          busy={busy}
          connected={connected}
          error={error}
          prefs={prefs}
          onBack={() => setStep('intention')}
          onConnect={handleConnect}
          onSetPrimary={handleSetPrimary}
          onToggleUse={handleToggleUse}
          onContinue={() => {
            setError(null);
            setStep('equipment');
          }}
        />
      ) : null}

      {step === 'equipment' ? (
        <OnboardingEquipmentStep
          busy={busy}
          error={error}
          initialEquipment={initialEquipment}
          practicedSports={sports}
          onContinue={() => void finish()}
          onSkip={() => void finish()}
          onBack={() => {
            setError(null);
            setStep('providers');
          }}
        />
      ) : null}

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
