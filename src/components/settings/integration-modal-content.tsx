'use client';

import { useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { IntegrationLogo } from '@/components/settings/integration-logos';
import type { IntegrationDefinition } from '@/components/settings/integrations-types';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { useGoogleCalendars } from '@/hooks/use-data';
import type { GoogleCalendarInfo } from '@/lib/query/fetchers';
import {
  runGarminSync,
  runGoogleSync,
  runRenphoSync,
  runStravaBackfill,
  runStravaSync,
  runWithingsSync,
  stravaBackfillSummary,
  type IntegrationId,
} from '@/lib/integrations/client-sync';
import { queryKeys } from '@/lib/query/keys';
import type { RecordChange } from '@/lib/records';
import { cn } from '@/lib/utils';

function calendarSelectLabel(
  calendarId: string,
  calendars: GoogleCalendarInfo[],
  targetCalendarName: string | null | undefined,
  loadingCalendars: boolean,
): string {
  if (!calendarId) {
    if (loadingCalendars) return 'Chargement…';
    return 'Choisir un calendrier (ex: SPORT)';
  }
  return calendars.find((c) => c.id === calendarId)?.summary ?? targetCalendarName ?? calendarId;
}

function RecordChangesBanner({ changes }: { changes: RecordChange[] }) {
  if (changes.length === 0) return null;

  return (
    <div className="border-primary/30 bg-primary/5 rounded-xl border p-3 text-sm">
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
          </li>
        ))}
      </ul>
    </div>
  );
}

function EnvSetupBlock({ children }: { children: React.ReactNode }) {
  return <div className="text-muted-foreground space-y-3 text-sm leading-relaxed">{children}</div>;
}

function ModalActions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2 pt-1">{children}</div>;
}

export function IntegrationModalContent({
  integration,
  onUpdated,
}: {
  integration: IntegrationDefinition;
  onUpdated?: () => void;
}) {
  switch (integration.id) {
    case 'strava':
      return <StravaContent integration={integration} onUpdated={onUpdated} />;
    case 'garmin':
      return <GarminContent integration={integration} onUpdated={onUpdated} />;
    case 'withings':
      return <WithingsContent integration={integration} onUpdated={onUpdated} />;
    case 'renpho':
      return <RenphoContent integration={integration} onUpdated={onUpdated} />;
    case 'google':
      return <GoogleContent integration={integration} onUpdated={onUpdated} />;
    default:
      return null;
  }
}

function IntegrationModalHeader({ integration }: { integration: IntegrationDefinition }) {
  return (
    <div className="flex items-start gap-3">
      <IntegrationLogo className="size-11 shrink-0" id={integration.id} />
      <div>
        <p className="font-heading text-base font-semibold">{integration.name}</p>
        <p className="text-muted-foreground text-sm">{integration.tagline}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {integration.dataTypes.map((tag) => (
            <span
              key={tag}
              className="bg-muted/80 text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function StravaContent({
  integration,
  onUpdated,
}: {
  integration: IntegrationDefinition;
  onUpdated?: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [syncRecordChanges, setSyncRecordChanges] = useState<RecordChange[]>([]);
  const avatarUrl = integration.account?.extra?.avatarUrl as string | undefined;

  async function handleSync() {
    setSyncing(true);
    setSyncRecordChanges([]);
    try {
      const data = await toast.promise(runStravaSync(), {
        loading: 'Synchronisation Strava…',
        success: (r) => ({
          title: 'Strava synchronisé',
          description: `${r.imported} importée(s), ${r.skipped} ignorée(s).`,
        }),
        error: (err) => ({
          title: 'Échec Strava',
          description: err instanceof Error ? err.message : undefined,
        }),
      });
      setSyncRecordChanges(Array.isArray(data.recordChanges) ? data.recordChanges : []);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.activities }),
        queryClient.invalidateQueries({ queryKey: queryKeys.records }),
      ]);
      router.refresh();
      onUpdated?.();
    } finally {
      setSyncing(false);
    }
  }

  async function handleBackfill() {
    setBackfilling(true);
    try {
      await toast.promise(runStravaBackfill(), {
        loading: 'Récupération des données détaillées…',
        success: (r) => ({
          title: 'Données détaillées',
          description: stravaBackfillSummary(r),
        }),
        error: (err) => ({
          title: 'Échec récupération',
          description: err instanceof Error ? err.message : undefined,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.records });
    } finally {
      setBackfilling(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('Déconnecter Strava ? Les séances importées sont conservées.')) return;
    await fetch('/api/strava/disconnect', { method: 'POST' });
    router.refresh();
    onUpdated?.();
  }

  if (!integration.configured) {
    return (
      <div className="space-y-4">
        <IntegrationModalHeader integration={integration} />
        <EnvSetupBlock>
          <p>
            Strava n&apos;est pas configuré côté serveur. Crée une app sur{' '}
            <a
              className="text-primary underline"
              href="https://www.strava.com/settings/api"
              rel="noreferrer"
              target="_blank"
            >
              strava.com/settings/api
            </a>{' '}
            puis ajoute les variables <code className="text-xs">STRAVA_*</code> dans{' '}
            <code className="text-xs">.env</code>.
          </p>
        </EnvSetupBlock>
      </div>
    );
  }

  if (!integration.connected) {
    return (
      <div className="space-y-4">
        <IntegrationModalHeader integration={integration} />
        <p className="text-muted-foreground text-sm leading-relaxed">
          Connecte Strava pour importer automatiquement tes activités course, vélo et natation.
        </p>
        <a className={cn(buttonVariants(), 'w-full sm:w-auto')} href="/api/strava/connect">
          Connecter Strava
        </a>
        {integration.statusMessage && (
          <p className="text-destructive text-sm">{integration.statusMessage}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <IntegrationModalHeader integration={integration} />
      <div className="bg-muted/40 flex items-center gap-3 rounded-xl border p-3">
        {avatarUrl && (
          <Image
            alt=""
            className="size-10 rounded-full object-cover"
            height={40}
            src={avatarUrl}
            width={40}
          />
        )}
        <div>
          <p className="font-medium">{integration.account?.label}</p>
          <p className="text-muted-foreground text-xs">
            {integration.account?.lastSyncAt
              ? `Dernière sync : ${new Date(integration.account.lastSyncAt).toLocaleString('fr-FR')}`
              : 'Jamais synchronisé'}
          </p>
        </div>
      </div>
      <ModalActions>
        <Button disabled={syncing} onClick={handleSync}>
          {syncing ? 'Sync…' : 'Synchroniser'}
        </Button>
        <Button disabled={backfilling} variant="outline" onClick={handleBackfill}>
          {backfilling ? 'Récupération…' : 'Données détaillées'}
        </Button>
        <Button variant="outline" onClick={handleDisconnect}>
          Déconnecter
        </Button>
      </ModalActions>
      <RecordChangesBanner changes={syncRecordChanges} />
      {integration.statusMessage && (
        <p className="text-muted-foreground text-sm">{integration.statusMessage}</p>
      )}
    </div>
  );
}

function GarminContent({
  integration,
  onUpdated,
}: {
  integration: IntegrationDefinition;
  onUpdated?: () => void;
}) {
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
      body: JSON.stringify({ username: form.get('username'), password: form.get('password') }),
    });
    setConnecting(false);
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? 'Connexion échouée');
      return;
    }
    router.refresh();
    onUpdated?.();
  }

  async function handleSync(full = false) {
    if (full) setImportingAll(true);
    else setSyncing(true);
    try {
      await toast.promise(runGarminSync({ full }), {
        loading: full ? 'Import historique Garmin…' : 'Synchronisation Garmin…',
        success: (d) => ({
          title: 'Garmin synchronisé',
          description: `${d.updated} jour(s) santé · ${d.activities.imported} séance(s)`,
        }),
        error: (err) => ({
          title: 'Échec Garmin',
          description: err instanceof Error ? err.message : undefined,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ['health'] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.activities });
      router.refresh();
      onUpdated?.();
    } finally {
      setSyncing(false);
      setImportingAll(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('Déconnecter Garmin ?')) return;
    await fetch('/api/garmin/disconnect', { method: 'POST' });
    router.refresh();
    onUpdated?.();
  }

  if (!integration.connected) {
    return (
      <form className="space-y-4" onSubmit={handleConnect}>
        <IntegrationModalHeader integration={integration} />
        <p className="text-muted-foreground text-sm leading-relaxed">
          Sommeil, HRV, FC repos et séances Garmin. Mot de passe non stocké — jetons de session
          uniquement.
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
        <Button className="w-full sm:w-auto" disabled={connecting} type="submit">
          {connecting ? 'Connexion…' : 'Connecter Garmin'}
        </Button>
        <p className="text-muted-foreground text-xs">
          MFA Garmin doit être désactivée le temps de la connexion.
        </p>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <IntegrationModalHeader integration={integration} />
      <div className="bg-muted/40 rounded-xl border p-3">
        <p className="font-medium">{integration.account?.label}</p>
        <p className="text-muted-foreground text-xs">
          {integration.account?.lastSyncAt
            ? `Dernière sync : ${new Date(integration.account.lastSyncAt).toLocaleString('fr-FR')}`
            : 'Jamais synchronisé'}
        </p>
      </div>
      <ModalActions>
        <Button disabled={syncing || importingAll} onClick={() => handleSync(false)}>
          {syncing ? 'Sync…' : 'Synchroniser'}
        </Button>
        <Button
          disabled={syncing || importingAll}
          variant="outline"
          onClick={() => handleSync(true)}
        >
          {importingAll ? 'Import…' : 'Tout l’historique'}
        </Button>
        <Button variant="outline" onClick={handleDisconnect}>
          Déconnecter
        </Button>
      </ModalActions>
    </div>
  );
}

function WithingsContent({
  integration,
  onUpdated,
}: {
  integration: IntegrationDefinition;
  onUpdated?: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [importingAll, setImportingAll] = useState(false);

  async function handleSync(full = false) {
    if (full) setImportingAll(true);
    else setSyncing(true);
    try {
      await toast.promise(runWithingsSync({ full }), {
        loading: full ? 'Import historique Withings…' : 'Synchronisation Withings…',
        success: (d) => ({
          title: 'Withings synchronisé',
          description: `${d.imported} nouvelle(s) · ${d.updated} mise(s) à jour`,
        }),
        error: (err) => ({
          title: 'Échec Withings',
          description: err instanceof Error ? err.message : undefined,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.bodyComposition() });
      await queryClient.invalidateQueries({ queryKey: ['health'] });
      router.refresh();
      onUpdated?.();
    } finally {
      setSyncing(false);
      setImportingAll(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('Déconnecter Withings ? Les mesures importées sont conservées.')) return;
    await fetch('/api/withings/disconnect', { method: 'POST' });
    router.refresh();
    onUpdated?.();
  }

  if (!integration.configured) {
    return (
      <div className="space-y-4">
        <IntegrationModalHeader integration={integration} />
        <EnvSetupBlock>
          <p>
            Withings n&apos;est pas configuré côté serveur. Ajoute{' '}
            <code className="text-xs">WITHINGS_CLIENT_ID</code> et{' '}
            <code className="text-xs">WITHINGS_CLIENT_SECRET</code> dans{' '}
            <code className="text-xs">.env</code>.
          </p>
          <p>
            Le callback OAuth doit être une URL <strong>HTTPS publique</strong> (Withings refuse{' '}
            <code className="text-xs">localhost</code>). En local, utilise un tunnel (
            <code className="text-xs">ngrok</code>, <code className="text-xs">cloudflared</code>)
            puis définis{' '}
            <code className="text-xs">WITHINGS_REDIRECT_URI=https://…/api/withings/callback</code>{' '}
            dans <code className="text-xs">.env</code> et enregistre la même URL chez Withings.
          </p>
        </EnvSetupBlock>
      </div>
    );
  }

  if (!integration.connected) {
    return (
      <div className="space-y-4">
        <IntegrationModalHeader integration={integration} />
        <p className="text-muted-foreground text-sm leading-relaxed">
          Connecte ta balance Withings pour importer poids et composition corporelle. En cas de
          chevauchement avec Renpho, <strong>Withings est prioritaire</strong>.
        </p>
        <p className="text-muted-foreground text-xs leading-relaxed">
          OAuth Withings exige une URL de redirection HTTPS (pas localhost). Sur Vercel :{' '}
          <code className="text-[11px]">https://ton-domaine/api/withings/callback</code>
        </p>
        <a className={cn(buttonVariants(), 'w-full sm:w-auto')} href="/api/withings/connect">
          Connecter Withings
        </a>
        {integration.statusMessage && (
          <p className="text-destructive text-sm">{integration.statusMessage}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <IntegrationModalHeader integration={integration} />
      <div className="bg-muted/40 rounded-xl border p-3">
        <p className="font-medium">{integration.account?.label}</p>
        <p className="text-muted-foreground text-xs">
          {integration.account?.lastSyncAt
            ? `Dernière sync : ${new Date(integration.account.lastSyncAt).toLocaleString('fr-FR')}`
            : 'Jamais synchronisé'}
        </p>
      </div>
      <ModalActions>
        <Button disabled={syncing || importingAll} onClick={() => handleSync(false)}>
          {syncing ? 'Sync…' : 'Synchroniser'}
        </Button>
        <Button
          disabled={syncing || importingAll}
          variant="outline"
          onClick={() => handleSync(true)}
        >
          {importingAll ? 'Import…' : 'Tout l’historique'}
        </Button>
        <Button variant="outline" onClick={handleDisconnect}>
          Déconnecter
        </Button>
      </ModalActions>
      {integration.statusMessage && (
        <p className="text-muted-foreground text-sm">{integration.statusMessage}</p>
      )}
    </div>
  );
}

function RenphoContent({
  integration,
  onUpdated,
}: {
  integration: IntegrationDefinition;
  onUpdated?: () => void;
}) {
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
      body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
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
    router.refresh();
    onUpdated?.();
  }

  async function handleSync(full = false) {
    if (full) setImportingAll(true);
    else setSyncing(true);
    try {
      await toast.promise(runRenphoSync({ full }), {
        loading: full ? 'Import Renpho…' : 'Synchronisation Renpho…',
        success: (d) => ({
          title: 'Renpho synchronisé',
          description: `${d.imported} nouvelle(s) · ${d.updated} mise(s) à jour`,
        }),
        error: (err) => ({
          title: 'Échec Renpho',
          description: err instanceof Error ? err.message : undefined,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.bodyComposition() });
      await queryClient.invalidateQueries({ queryKey: ['health'] });
      router.refresh();
      onUpdated?.();
    } finally {
      setSyncing(false);
      setImportingAll(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('Déconnecter Renpho ?')) return;
    await fetch('/api/renpho/disconnect', { method: 'POST' });
    router.refresh();
    onUpdated?.();
  }

  if (!integration.connected) {
    return (
      <form className="space-y-4" onSubmit={handleConnect}>
        <IntegrationModalHeader integration={integration} />
        <p className="text-muted-foreground text-sm leading-relaxed">
          Balance Renpho Health — historique conservé.{' '}
          {integration.badge === 'legacy' &&
            'Withings est ta source principale : ses données remplacent Renpho sur les jours en commun.'}
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
        <Button className="w-full sm:w-auto" disabled={connecting} type="submit">
          {connecting ? 'Connexion…' : 'Connecter Renpho'}
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <IntegrationModalHeader integration={integration} />
      <div className="bg-muted/40 rounded-xl border p-3">
        <p className="font-medium">{integration.account?.label}</p>
        <p className="text-muted-foreground text-xs">
          {integration.account?.lastSyncAt
            ? `Dernière sync : ${new Date(integration.account.lastSyncAt).toLocaleString('fr-FR')}`
            : 'Jamais synchronisé'}
        </p>
      </div>
      <ModalActions>
        <Button disabled={syncing || importingAll} onClick={() => handleSync(false)}>
          {syncing ? 'Sync…' : 'Synchroniser'}
        </Button>
        <Button
          disabled={syncing || importingAll}
          variant="outline"
          onClick={() => handleSync(true)}
        >
          {importingAll ? 'Import…' : 'Tout l’historique'}
        </Button>
        <Button variant="outline" onClick={handleDisconnect}>
          Déconnecter
        </Button>
      </ModalActions>
    </div>
  );
}

function GoogleContent({
  integration,
  onUpdated,
}: {
  integration: IntegrationDefinition;
  onUpdated?: () => void;
}) {
  const router = useRouter();
  const calendarsQuery = useGoogleCalendars(integration.connected);
  const calendars = calendarsQuery.data ?? [];
  const [pendingCalendarId, setPendingCalendarId] = useState<string | null>(null);
  const targetCalendarId = integration.account?.extra?.targetCalendarId as string | null;
  const targetCalendarName = integration.account?.extra?.targetCalendarName as string | null;
  const calendarId = pendingCalendarId ?? targetCalendarId ?? '';
  const [savingTarget, setSavingTarget] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function handleSelectCalendar(nextCalendarId: string | null) {
    if (!nextCalendarId) return;
    const calendar = calendars.find((c) => c.id === nextCalendarId);
    setPendingCalendarId(nextCalendarId);
    setSavingTarget(true);
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
      onUpdated?.();
    } finally {
      setSavingTarget(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await toast.promise(runGoogleSync(), {
        loading: 'Synchronisation Google Calendar…',
        success: (d) => ({
          title: 'Google synchronisé',
          description: `${d.pushed} ajoutée(s), ${d.updated} mise(s) à jour.`,
        }),
        error: (err) => ({
          title: 'Échec Google',
          description: err instanceof Error ? err.message : undefined,
        }),
      });
      router.refresh();
      onUpdated?.();
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('Déconnecter Google Calendar ?')) return;
    await fetch('/api/google/disconnect', { method: 'POST' });
    router.refresh();
    onUpdated?.();
  }

  if (!integration.configured) {
    return (
      <div className="space-y-4">
        <IntegrationModalHeader integration={integration} />
        <EnvSetupBlock>
          <p>
            Google Calendar n&apos;est pas configuré. Ajoute{' '}
            <code className="text-xs">GOOGLE_CLIENT_ID</code> et{' '}
            <code className="text-xs">GOOGLE_CLIENT_SECRET</code> dans{' '}
            <code className="text-xs">.env</code>.
          </p>
        </EnvSetupBlock>
      </div>
    );
  }

  if (!integration.connected) {
    return (
      <div className="space-y-4">
        <IntegrationModalHeader integration={integration} />
        <p className="text-muted-foreground text-sm leading-relaxed">
          Le coach planifie tes séances dans ton agenda en évitant tes créneaux occupés.
        </p>
        <a className={cn(buttonVariants(), 'w-full sm:w-auto')} href="/api/google/connect">
          Connecter Google Calendar
        </a>
        {integration.statusMessage && (
          <p className="text-destructive text-sm">{integration.statusMessage}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <IntegrationModalHeader integration={integration} />
      <div className="bg-muted/40 rounded-xl border p-3">
        <p className="font-medium">{integration.account?.label}</p>
        <p className="text-muted-foreground text-xs">
          {integration.account?.lastSyncAt
            ? `Dernière sync : ${new Date(integration.account.lastSyncAt).toLocaleString('fr-FR')}`
            : 'Jamais synchronisé'}
        </p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Calendrier des séances</label>
        <Select value={calendarId} onValueChange={handleSelectCalendar}>
          <SelectTrigger disabled={calendarsQuery.isLoading || savingTarget}>
            <SelectValue>
              {calendarSelectLabel(
                calendarId,
                calendars,
                targetCalendarName,
                calendarsQuery.isLoading,
              )}
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
      </div>
      <ModalActions>
        <Button disabled={syncing || !calendarId} onClick={handleSync}>
          {syncing ? 'Sync…' : 'Synchroniser'}
        </Button>
        <Button variant="outline" onClick={handleDisconnect}>
          Déconnecter
        </Button>
      </ModalActions>
    </div>
  );
}

export function integrationModalTitle(id: IntegrationId): string {
  const titles: Record<IntegrationId, string> = {
    strava: 'Strava',
    garmin: 'Garmin Connect',
    withings: 'Withings',
    renpho: 'Renpho Health',
    google: 'Google Calendar',
  };
  return titles[id];
}
