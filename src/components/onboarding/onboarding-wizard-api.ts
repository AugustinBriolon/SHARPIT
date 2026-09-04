'use client';

import type { IntegrationId } from '@/lib/integrations/shared/client-sync';
import type { IntegrationSourcePrefs } from '@/lib/integrations/source-prefs';
import type { DataClassId } from '@/lib/integrations/provider-catalog';
import { toast } from '@/components/ui/toast';
import { providersForClass } from '@/lib/integrations/provider-catalog';
import type { OnboardingWizardStep } from '@/lib/onboarding/wizard-steps';
import type { PracticedSportId } from '@/lib/practiced-sports';

const OAUTH_STATUS_LABELS: Record<string, string> = {
  connected: 'connecté',
  denied: 'connexion refusée',
  error: 'erreur de connexion',
  invalid_state: 'session expirée — réessaie',
  no_athlete: 'compte introuvable',
  no_refresh: 'autorisation incomplète — réessaie',
};

export async function patchOnboardingPrefs(
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

export async function patchPracticedSports(sports: PracticedSportId[]): Promise<boolean> {
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

export function processOAuthReturn(
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

export async function completeOnboarding(): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch('/api/onboarding/complete', { method: 'POST' });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    return { ok: false, error: data?.error ?? "Impossible de terminer l'onboarding" };
  }
  return { ok: true };
}
