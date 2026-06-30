'use client';

import { useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { queryKeys } from '@/lib/client/keys';
import type { RecordChange } from '@/lib/records';

type StravaSyncResult = {
  imported: number;
  skipped: number;
  fetched: number;
  recordChanges?: RecordChange[];
};

type StravaBackfillResult = {
  processed: number;
  withData: number;
  remaining: number;
  stopped?: string;
  recordChanges?: RecordChange[];
};

async function runStravaSync(): Promise<StravaSyncResult> {
  const response = await fetch('/api/strava/sync', { method: 'POST' });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? 'Synchronisation échouée');
  }
  return data;
}

async function runStravaBackfill(): Promise<StravaBackfillResult> {
  const response = await fetch('/api/strava/backfill', { method: 'POST' });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? 'Backfill échoué');
  }
  return data;
}

function backfillSummary(data: StravaBackfillResult): string {
  const base = `${data.processed} séance(s) traitée(s), ${data.withData} avec données détaillées.`;
  const tail =
    data.remaining > 0
      ? data.stopped === 'rate_limited'
        ? ` Limite Strava atteinte, ${data.remaining} restante(s) — réessaie dans ~15 min.`
        : ` ${data.remaining} restante(s), relance pour continuer.`
      : ' Historique complet ✓';
  return base + tail;
}

interface StravaPanelProps {
  configured: boolean;
  account: {
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    lastSyncAt: string | null;
  } | null;
  statusMessage?: string;
}

function RecordChangesBanner({ changes }: { changes: RecordChange[] }) {
  if (changes.length === 0) return null;

  return (
    <div className="border-primary/30 bg-primary/5 rounded-lg border p-3 text-sm">
      <p className="text-primary font-medium">
        {changes.length} record{changes.length > 1 ? 's' : ''} battu
        {changes.length > 1 ? 's' : ''}
      </p>
      <ul className="mt-2 space-y-1.5">
        {changes.map((c) => (
          <li key={c.category} className="flex flex-wrap items-baseline gap-x-1">
            {c.activityId ? (
              <Link
                className="hover:text-primary font-medium hover:underline"
                href={`/training/${c.activityId}`}
              >
                {c.label}
              </Link>
            ) : (
              <span className="font-medium">{c.label}</span>
            )}
            <span className="text-muted-foreground">—</span>
            <span className="font-mono font-semibold tabular-nums">{c.displayValue}</span>
            {c.previousDisplayValue && (
              <span className="text-muted-foreground text-xs">
                (avant : {c.previousDisplayValue})
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StravaPanel({ configured, account, statusMessage }: StravaPanelProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [syncRecordChanges, setSyncRecordChanges] = useState<RecordChange[]>([]);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);
  const [backfillRecordChanges, setBackfillRecordChanges] = useState<RecordChange[]>([]);

  async function handleSync() {
    setSyncing(true);
    setResult(null);
    setSyncRecordChanges([]);
    try {
      const data = await toast.promise(runStravaSync(), {
        loading: 'Synchronisation Strava en cours…',
        success: (result) => ({
          title: 'Strava synchronisé',
          description: `${result.imported} importée(s), ${result.skipped} ignorée(s) sur ${result.fetched} récupérée(s).`,
        }),
        error: (err) => ({
          title: 'Synchronisation Strava échouée',
          description: err instanceof Error ? err.message : undefined,
        }),
      });
      setResult(
        `${data.imported} importée(s), ${data.skipped} ignorée(s) sur ${data.fetched} récupérée(s).`,
      );
      setSyncRecordChanges(Array.isArray(data.recordChanges) ? data.recordChanges : []);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.activities }),
        queryClient.invalidateQueries({ queryKey: queryKeys.records }),
      ]);
      router.refresh();
    } catch {
      // L'échec est déjà signalé par le toast d'erreur.
    } finally {
      setSyncing(false);
    }
  }

  async function handleBackfill() {
    setBackfilling(true);
    setBackfillResult(null);
    setBackfillRecordChanges([]);
    try {
      const data = await toast.promise(runStravaBackfill(), {
        loading: 'Récupération des données détaillées…',
        success: (result) => ({
          title: 'Données détaillées récupérées',
          description: backfillSummary(result),
        }),
        error: (err) => ({
          title: 'Récupération échouée',
          description: err instanceof Error ? err.message : undefined,
        }),
      });
      setBackfillResult(backfillSummary(data));
      setBackfillRecordChanges(Array.isArray(data.recordChanges) ? data.recordChanges : []);
      await queryClient.invalidateQueries({ queryKey: queryKeys.records });
    } catch {
      // L'échec est déjà signalé par le toast d'erreur.
    } finally {
      setBackfilling(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('Déconnecter Strava ? Les séances déjà importées sont conservées.')) return;
    await fetch('/api/strava/disconnect', { method: 'POST' });
    router.refresh();
  }

  if (!configured) {
    return (
      <div className="text-muted-foreground space-y-3 text-sm">
        <p>
          Strava n&apos;est pas encore configuré. Crée une application sur{' '}
          <a
            className="text-primary underline"
            href="https://www.strava.com/settings/api"
            rel="noreferrer"
            target="_blank"
          >
            strava.com/settings/api
          </a>{' '}
          puis ajoute ces variables dans ton fichier <code>.env</code> :
        </p>
        <pre className="border-border/60 bg-muted/40 overflow-x-auto rounded-lg border p-3 font-mono text-xs">
          {`STRAVA_CLIENT_ID="ton_client_id"
STRAVA_CLIENT_SECRET="ton_client_secret"
STRAVA_REDIRECT_URI="http://localhost:3000/api/strava/callback"`}
        </pre>
        <p>
          Dans les réglages Strava, mets <strong>localhost</strong> comme &laquo;&nbsp;Authorization
          Callback Domain&nbsp;&raquo;, puis relance le serveur.
        </p>
      </div>
    );
  }

  if (account) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {account.avatarUrl && (
            <Image
              alt="Photo de profil Strava"
              className="size-10 rounded-full object-cover"
              height={40}
              src={account.avatarUrl}
              width={40}
            />
          )}
          <div>
            <p className="font-medium">
              {account.firstName} {account.lastName}
            </p>
            <p className="text-muted-foreground text-xs">
              {account.lastSyncAt
                ? `Dernière sync : ${new Date(account.lastSyncAt).toLocaleString('fr-FR')}`
                : 'Jamais synchronisé'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button disabled={syncing} onClick={handleSync}>
            {syncing ? 'Synchronisation…' : 'Synchroniser maintenant'}
          </Button>
          <Button disabled={backfilling} variant="outline" onClick={handleBackfill}>
            {backfilling ? 'Récupération…' : 'Récupérer les données détaillées'}
          </Button>
          <Button variant="outline" onClick={handleDisconnect}>
            Déconnecter
          </Button>
        </div>

        <p className="text-muted-foreground text-xs">
          La récupération détaillée alimente les records et les courbes de puissance/allure (par
          lots, pour respecter les limites Strava).
        </p>

        {result && <p className="text-muted-foreground text-sm">{result}</p>}
        <RecordChangesBanner changes={syncRecordChanges} />
        {backfillResult && <p className="text-muted-foreground text-sm">{backfillResult}</p>}
        <RecordChangesBanner changes={backfillRecordChanges} />
        {statusMessage && <p className="text-muted-foreground text-sm">{statusMessage}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">
        Connecte ton compte Strava pour importer automatiquement tes activités (course, vélo,
        natation…).
      </p>
      <a className={buttonVariants()} href="/api/strava/connect">
        Connecter Strava
      </a>
      {statusMessage && <p className="text-destructive text-sm">{statusMessage}</p>}
    </div>
  );
}
