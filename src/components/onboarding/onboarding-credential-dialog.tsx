'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import type { DataClassId } from '@/lib/integrations/provider-catalog';
import type { IntegrationId } from '@/lib/integrations/shared/client-sync';
import type { IntegrationSourcePrefs } from '@/lib/integrations/source-prefs';

type CredentialProvider = Extract<IntegrationId, 'garmin' | 'renpho' | 'myfitnesspal'>;

const COPY: Record<CredentialProvider, { title: string; description: string; submit: string }> = {
  garmin: {
    title: 'Connecter Garmin',
    description:
      'Email et mot de passe du compte Garmin Connect. Le mot de passe n’est pas stocké — jetons de session uniquement.',
    submit: 'Connecter Garmin',
  },
  renpho: {
    title: 'Connecter Renpho',
    description: 'Identifiants de l’app Renpho Health pour importer poids et composition.',
    submit: 'Connecter Renpho',
  },
  myfitnesspal: {
    title: 'Connecter MyFitnessPal',
    description:
      'Colle le cookie de session MyFitnessPal (outils navigateur). Voir l’aide dans Profil → Applications.',
    submit: 'Connecter MyFitnessPal',
  },
};

export function OnboardingCredentialDialog({
  provider,
  dataClass,
  open,
  onOpenChange,
  onConnected,
}: {
  provider: CredentialProvider | null;
  dataClass: DataClassId | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: (id: CredentialProvider, prefs: IntegrationSourcePrefs | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!provider) return null;
  const copy = COPY[provider];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!provider) return;
    const activeProvider = provider;
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);

    try {
      let response: Response;
      if (activeProvider === 'garmin') {
        response = await fetch('/api/garmin/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: form.get('username'),
            password: form.get('password'),
            dataClass,
          }),
        });
      } else if (activeProvider === 'renpho') {
        response = await fetch('/api/renpho/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: form.get('email'),
            password: form.get('password'),
            dataClass,
          }),
        });
      } else {
        response = await fetch('/api/myfitnesspal/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken: form.get('sessionToken'), dataClass }),
        });
      }

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? 'Connexion échouée');
        return;
      }

      let nextPrefs: IntegrationSourcePrefs | null = null;
      const prefsRes = await fetch('/api/integrations/source-prefs');
      if (prefsRes.ok) {
        const data = (await prefsRes.json()) as { prefs: IntegrationSourcePrefs };
        nextPrefs = data.prefs;
      }

      toast.success(`${COPY[activeProvider].title.replace('Connecter ', '')} connecté`);
      onConnected(activeProvider, nextPrefs);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] overflow-x-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <form className="min-w-0 space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          {provider === 'garmin' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="onboarding-garmin-username">Email</Label>
                <Input
                  autoComplete="username"
                  id="onboarding-garmin-username"
                  name="username"
                  type="email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onboarding-garmin-password">Mot de passe</Label>
                <Input
                  autoComplete="current-password"
                  id="onboarding-garmin-password"
                  name="password"
                  type="password"
                  required
                />
              </div>
            </>
          ) : null}
          {provider === 'renpho' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="onboarding-renpho-email">Email</Label>
                <Input
                  autoComplete="username"
                  id="onboarding-renpho-email"
                  name="email"
                  type="email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="onboarding-renpho-password">Mot de passe</Label>
                <Input
                  autoComplete="current-password"
                  id="onboarding-renpho-password"
                  name="password"
                  type="password"
                  required
                />
              </div>
            </>
          ) : null}
          {provider === 'myfitnesspal' ? (
            <div className="min-w-0 space-y-2">
              <Label htmlFor="onboarding-mfp-token">Cookie de session</Label>
              <Textarea
                autoComplete="off"
                className="[field-sizing:fixed] max-h-32 min-h-20 w-full max-w-full resize-y overflow-auto break-all"
                id="onboarding-mfp-token"
                name="sessionToken"
                placeholder="eyJhbG…"
                rows={4}
                spellCheck={false}
                required
              />
            </div>
          ) : null}
          {error ? (
            <p aria-live="assertive" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button disabled={busy} type="submit">
              {busy ? 'Connexion…' : copy.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
