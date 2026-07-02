'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { queryKeys } from '@/lib/query/keys';

async function runRenphoSync(options?: { full?: boolean }): Promise<{
  imported: number;
  updated: number;
  days: number;
}> {
  const response = await fetch('/api/renpho/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options?.full ? { full: true } : { days: 90 }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? 'Synchronisation échouée');
  }
  return data;
}

interface RenphoPanelProps {
  account: {
    email: string;
    displayName: string | null;
    lastSyncAt: string | null;
  } | null;
}

export function RenphoPanel({ account }: RenphoPanelProps) {
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
    const response = await fetch('/api/renpho/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.get('email'),
        password: form.get('password'),
      }),
    });

    setConnecting(false);

    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? 'Connexion échouée');
      return;
    }

    const data = await response.json();
    toast.success('Renpho connecté', {
      description: `${data.sync.imported} mesure(s) importée(s)`,
    });
    await queryClient.invalidateQueries({ queryKey: queryKeys.bodyComposition() });
    await queryClient.invalidateQueries({ queryKey: ['health'] });
    router.refresh();
  }

  async function handleSync(full = false) {
    if (full) setImportingAll(true);
    else setSyncing(true);
    try {
      await toast.promise(runRenphoSync({ full }), {
        loading: full
          ? 'Import de tout ton historique Renpho…'
          : 'Synchronisation Renpho en cours…',
        success: (data) => ({
          title: 'Renpho synchronisé',
          description: `${data.imported} nouvelle(s) · ${data.updated} mise(s) à jour`,
        }),
        error: (err) => ({
          title: 'Synchronisation Renpho échouée',
          description: err instanceof Error ? err.message : undefined,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.bodyComposition() });
      await queryClient.invalidateQueries({ queryKey: ['health'] });
      router.refresh();
    } catch {
      // toast gère l'erreur
    } finally {
      setSyncing(false);
      setImportingAll(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('Déconnecter Renpho ? Les mesures déjà importées sont conservées.')) return;
    await fetch('/api/renpho/disconnect', { method: 'POST' });
    router.refresh();
  }

  if (account) {
    return (
      <div className="space-y-4">
        <div>
          <p className="font-medium">{account.displayName ?? account.email}</p>
          <p className="text-muted-foreground text-xs">
            {account.lastSyncAt
              ? `Dernière sync : ${new Date(account.lastSyncAt).toLocaleString('fr-FR')}`
              : 'Jamais synchronisé'}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button disabled={syncing || importingAll} onClick={() => handleSync(false)}>
            {syncing ? 'Synchronisation…' : 'Synchroniser (90j)'}
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
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleConnect}>
      <p className="text-muted-foreground text-sm">
        Connecte ton compte <strong>Renpho Health</strong> (app bleue) pour importer poids et
        composition corporelle depuis ta balance. Tes identifiants sont chiffrés côté serveur.
      </p>

      <div className="space-y-2">
        <Label htmlFor="renpho-email">Email Renpho</Label>
        <Input id="renpho-email" name="email" type="email" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="renpho-password">Mot de passe</Label>
        <Input id="renpho-password" name="password" type="password" required />
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button disabled={connecting} type="submit">
        {connecting ? 'Connexion…' : 'Connecter Renpho'}
      </Button>
    </form>
  );
}
