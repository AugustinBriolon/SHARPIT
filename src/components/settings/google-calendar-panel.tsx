'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGoogleCalendars } from '@/hooks/use-data';

interface GoogleCalendarPanelProps {
  configured: boolean;
  account: {
    email: string | null;
    targetCalendarId: string | null;
    targetCalendarName: string | null;
    lastSyncAt: string | null;
  } | null;
  statusMessage?: string;
}

export function GoogleCalendarPanel({
  configured,
  account,
  statusMessage,
}: GoogleCalendarPanelProps) {
  const router = useRouter();
  const connected = Boolean(account);

  // Liste des calendriers via react-query (évite un fetch manuel en effet).
  const calendarsQuery = useGoogleCalendars(connected);
  const calendars = calendarsQuery.data ?? [];
  const loadingCalendars = calendarsQuery.isLoading;

  // Sélection : override local optimiste, sinon valeur serveur (prop account).
  const [pendingCalendarId, setPendingCalendarId] = useState<string | null>(null);
  const calendarId = pendingCalendarId ?? account?.targetCalendarId ?? '';

  const [savingTarget, setSavingTarget] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSelectCalendar(nextCalendarId: string | null) {
    if (!nextCalendarId) return;
    const calendar = calendars.find((c) => c.id === nextCalendarId);
    setPendingCalendarId(nextCalendarId);
    setSavingTarget(true);
    setResult(null);
    try {
      await fetch('/api/google/select-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendarId: nextCalendarId,
          calendarName: calendar?.summary ?? null,
        }),
      });
      router.refresh();
    } finally {
      setSavingTarget(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setResult(null);
    try {
      const response = await fetch('/api/google/sync', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) {
        setResult(data.error ?? 'Synchronisation échouée');
      } else {
        setResult(
          `${data.pushed} ajoutée(s) à Google, ${data.updated} mise(s) à jour, ${data.unlinked} déliée(s).`,
        );
        router.refresh();
      }
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    if (
      !confirm(
        "Déconnecter Google Calendar ? Les événements déjà créés restent dans ton agenda, mais l'app oubliera le lien.",
      )
    )
      return;
    await fetch('/api/google/disconnect', { method: 'POST' });
    router.refresh();
  }

  if (!configured) {
    return (
      <div className="text-muted-foreground space-y-3 text-sm">
        <p>
          Google Calendar n&apos;est pas encore configuré. Crée des identifiants OAuth dans la{' '}
          <a
            className="text-primary underline"
            href="https://console.cloud.google.com/apis/credentials"
            rel="noreferrer"
            target="_blank"
          >
            Google Cloud Console
          </a>{' '}
          (type «&nbsp;Application Web&nbsp;»), active l&apos;API Google Calendar, puis ajoute ces
          variables dans <code>.env</code> :
        </p>
        <pre className="border-border/60 bg-muted/40 overflow-x-auto rounded-lg border p-3 font-mono text-xs">
          {`GOOGLE_CLIENT_ID="ton_client_id"
GOOGLE_CLIENT_SECRET="ton_client_secret"`}
        </pre>
        <p>Dans les identifiants OAuth, ajoute comme URI de redirection autorisée :</p>
        <pre className="border-border/60 bg-muted/40 overflow-x-auto rounded-lg border p-3 font-mono text-xs">
          {`http://localhost:3000/api/google/callback
https://ton-domaine.vercel.app/api/google/callback`}
        </pre>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm">
          Connecte ton compte Google pour que le coach planifie tes séances dans ton agenda en
          évitant tes créneaux déjà occupés.
        </p>
        <a className={buttonVariants()} href="/api/google/connect">
          Connecter Google Calendar
        </a>
        {statusMessage && <p className="text-destructive text-sm">{statusMessage}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="font-medium">{account?.email ?? 'Compte Google'}</p>
        <p className="text-muted-foreground text-xs">
          {account?.lastSyncAt
            ? `Dernière synchro : ${new Date(account.lastSyncAt).toLocaleString('fr-FR')}`
            : 'Jamais synchronisé depuis Google'}
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Calendrier où créer les séances</label>
        <Select value={calendarId} onValueChange={handleSelectCalendar}>
          <SelectTrigger disabled={loadingCalendars || savingTarget}>
            <SelectValue>
              {calendarId
                ? (calendars.find((c) => c.id === calendarId)?.summary ??
                  account?.targetCalendarName ??
                  calendarId)
                : loadingCalendars
                  ? 'Chargement…'
                  : 'Choisir un calendrier (ex: SPORT)'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {calendars.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.summary}
                {c.primary ? ' (principal)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          Le coach lit tous tes calendriers pour connaître tes disponibilités, mais n&apos;écrit que
          dans celui-ci.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button disabled={syncing || !calendarId} onClick={handleSync}>
          {syncing ? 'Synchronisation…' : 'Synchroniser depuis Google'}
        </Button>
        <Button variant="outline" onClick={handleDisconnect}>
          Déconnecter
        </Button>
      </div>

      {result && <p className="text-muted-foreground text-sm">{result}</p>}
      {statusMessage && <p className="text-muted-foreground text-sm">{statusMessage}</p>}
    </div>
  );
}
