'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { queryKeys } from '@/lib/query/keys';

async function runGarminSync(options?: { full?: boolean }): Promise<{
  updated: number;
  days: number;
  activities: {
    imported: number;
    merged: number;
    updated: number;
    skipped: number;
  };
}> {
  const response = await fetch('/api/garmin/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options?.full ? { full: true } : { days: 60 }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? 'Synchronisation échouée');
  }
  return data;
}

interface GarminPanelProps {
  account: {
    displayName: string | null;
    fullName: string | null;
    lastSyncAt: string | null;
  } | null;
}

export function GarminPanel({ account }: GarminPanelProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [importingAll, setImportingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setConnecting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const response = await fetch('/api/garmin/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: form.get('username'),
        password: form.get('password'),
      }),
    });

    setConnecting(false);

    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? 'Connexion échouée');
      return;
    }

    router.refresh();
  }

  async function handleSync(full = false) {
    if (full) setImportingAll(true);
    else setSyncing(true);
    try {
      await toast.promise(runGarminSync({ full }), {
        loading: full
          ? 'Import de tout ton historique Garmin… (cela peut prendre un moment)'
          : 'Synchronisation Garmin en cours…',
        success: (data) => ({
          title: 'Garmin synchronisé',
          description: `${data.updated} jour(s) santé · ${data.activities.imported} séance(s) importée(s), ${data.activities.merged} fusionnée(s)`,
        }),
        error: (err) => ({
          title: 'Synchronisation Garmin échouée',
          description: err instanceof Error ? err.message : undefined,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ['health'] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.activities });
      router.refresh();
    } catch {
      // L'échec est déjà signalé par le toast d'erreur.
    } finally {
      setSyncing(false);
      setImportingAll(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('Déconnecter Garmin ? Les données déjà importées sont conservées.')) return;
    await fetch('/api/garmin/disconnect', { method: 'POST' });
    router.refresh();
  }

  if (account) {
    return (
      <div className="space-y-4">
        <div>
          <p className="font-medium">
            {account.fullName ?? account.displayName ?? 'Compte Garmin'}
          </p>
          <p className="text-muted-foreground text-xs">
            {account.lastSyncAt
              ? `Dernière sync : ${new Date(account.lastSyncAt).toLocaleString('fr-FR')}`
              : 'Jamais synchronisé'}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button disabled={syncing || importingAll} onClick={() => handleSync(false)}>
            {syncing ? 'Synchronisation…' : 'Synchroniser (60j)'}
          </Button>
          <Button
            disabled={syncing || importingAll}
            variant="outline"
            onClick={() => handleSync(true)}
          >
            {importingAll ? 'Import en cours…' : 'Importer tout l’historique'}
          </Button>
          <Button variant="outline" onClick={handleDisconnect}>
            Déconnecter
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          « Tout l’historique » récupère l’intégralité de tes séances Garmin (peut prendre plusieurs
          minutes selon le volume).
        </p>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleConnect}>
      <p className="text-muted-foreground text-sm">
        Connecte ton compte Garmin pour importer automatiquement sommeil, HRV, FC repos, poids et
        tes séances (ressenti et difficulté perçue). Ton mot de passe n&apos;est jamais stocké —
        seuls les jetons de session le sont.
      </p>

      <div className="space-y-2">
        <Label htmlFor="garmin-username">Email Garmin</Label>
        <Input id="garmin-username" name="username" type="email" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="garmin-password">Mot de passe</Label>
        <Input id="garmin-password" name="password" type="password" required />
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button disabled={connecting} type="submit">
        {connecting ? 'Connexion…' : 'Connecter Garmin'}
      </Button>

      <p className="text-muted-foreground text-xs">
        Note : si l&apos;authentification à deux facteurs (MFA) est activée sur ton compte Garmin,
        la connexion échouera. Désactive-la temporairement ou utilise un compte sans MFA.
      </p>
    </form>
  );
}
