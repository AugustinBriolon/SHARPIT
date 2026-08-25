'use client';

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  GOOGLE_OAUTH_LAN_HINT,
  googleOAuthLocalConnectHref,
  isGoogleOAuthBlockedOnCurrentHost,
} from '@/lib/integrations/google/google-oauth-hint';
import {
  IntegrationAccountCard,
  IntegrationAccountSummary,
  IntegrationManageStage,
  IntegrationSyncActions,
} from '@/components/settings/integrations/modal-parts';
import { IntegrationLogo } from '@/components/settings/integrations/logos';
import {
  integrationConnectBody,
  integrationConnectCta,
  type IntegrationDefinition,
} from '@/components/settings/integrations/types';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
} from '@/lib/integrations/shared/client-sync';
import { invalidateAfterProviderSync } from '@/lib/query/invalidate-after-provider-sync';
import { queryKeys } from '@/lib/query/keys';
import type { RecordChange } from '@/lib/training/records';
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
    case 'myfitnesspal':
      return <MfpContent integration={integration} onUpdated={onUpdated} />;
    default:
      return null;
  }
}

function IntegrationModalHeader({ integration }: { integration: IntegrationDefinition }) {
  return (
    <div className="flex items-start gap-3">
      <IntegrationLogo className="size-11 shrink-0" id={integration.id} />
      <div className="flex flex-wrap gap-1.5 pt-1">
        {integration.dataTypes.map((tag) => (
          <span
            key={tag}
            className="bg-muted/80 text-muted-foreground text-label rounded-full px-2 py-0.5"
          >
            {tag}
          </span>
        ))}
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
  const [stage, setStage] = useState<'manage' | 'confirm'>('manage');
  const [disconnecting, setDisconnecting] = useState(false);
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
      await invalidateAfterProviderSync(queryClient, { includeBodyComposition: false });
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
    setDisconnecting(true);
    try {
      await fetch('/api/strava/disconnect', { method: 'POST' });
      router.refresh();
      onUpdated?.();
    } finally {
      setDisconnecting(false);
      setStage('manage');
    }
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
          {integrationConnectBody(
            integration,
            'Connecte Strava pour importer automatiquement tes activités course, vélo et natation.',
          )}
        </p>
        <a
          className={cn(buttonVariants(), 'w-full sm:w-auto')}
          href="/api/strava/connect?returnTo=/settings/integrations"
        >
          {integrationConnectCta(integration)}
        </a>
        {integration.statusMessage && (
          <p aria-live="assertive" className="text-destructive text-sm">
            {integration.statusMessage}
          </p>
        )}
      </div>
    );
  }

  return (
    <IntegrationManageStage
      confirmDescription="Les séances importées sont conservées."
      confirmTitle="Déconnecter Strava ?"
      disconnecting={disconnecting}
      stage={stage}
      onCancelConfirm={() => setStage('manage')}
      onConfirmDisconnect={handleDisconnect}
    >
      <IntegrationModalHeader integration={integration} />
      <IntegrationAccountCard
        avatarUrl={avatarUrl}
        label={integration.account?.label}
        lastSyncAt={integration.account?.lastSyncAt}
      />
      <IntegrationSyncActions
        fullImportingLabel="Récupération…"
        fullImportLabel="Données détaillées"
        importingAll={backfilling}
        syncing={syncing}
        onDisconnect={() => setStage('confirm')}
        onFullImport={handleBackfill}
        onSync={handleSync}
      />
      <RecordChangesBanner changes={syncRecordChanges} />
      {integration.statusMessage && (
        <p aria-live="polite" className="text-muted-foreground text-sm">
          {integration.statusMessage}
        </p>
      )}
    </IntegrationManageStage>
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
  const [syncRecordChanges, setSyncRecordChanges] = useState<RecordChange[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<'manage' | 'confirm'>('manage');
  const [disconnecting, setDisconnecting] = useState(false);

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
    setSyncRecordChanges([]);
    try {
      const data = await toast.promise(runGarminSync({ full }), {
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
      setSyncRecordChanges(Array.isArray(data.recordChanges) ? data.recordChanges : []);
      await invalidateAfterProviderSync(queryClient);
      router.refresh();
      onUpdated?.();
    } finally {
      setSyncing(false);
      setImportingAll(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await fetch('/api/garmin/disconnect', { method: 'POST' });
      router.refresh();
      onUpdated?.();
    } finally {
      setDisconnecting(false);
      setStage('manage');
    }
  }

  if (!integration.connected) {
    return (
      <form className="space-y-4" onSubmit={handleConnect}>
        <IntegrationModalHeader integration={integration} />
        <p className="text-muted-foreground text-sm leading-relaxed">
          {integrationConnectBody(
            integration,
            'Sommeil, HRV, FC repos et séances Garmin. Mot de passe non stocké, jetons de session uniquement.',
          )}
        </p>
        <div className="space-y-2">
          <Label htmlFor="garmin-username">Email Garmin</Label>
          <Input
            autoComplete="username"
            id="garmin-username"
            name="username"
            type="email"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="garmin-password">Mot de passe</Label>
          <Input
            autoComplete="current-password"
            id="garmin-password"
            name="password"
            type="password"
            required
          />
        </div>
        {error && (
          <p aria-live="assertive" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <Button className="w-full sm:w-auto" disabled={connecting} type="submit">
          {connecting ? 'Connexion…' : integrationConnectCta(integration)}
        </Button>
        <p className="text-muted-foreground text-xs">
          MFA Garmin doit être désactivée le temps de la connexion.
        </p>
      </form>
    );
  }

  return (
    <IntegrationManageStage
      confirmTitle="Déconnecter Garmin ?"
      disconnecting={disconnecting}
      stage={stage}
      onCancelConfirm={() => setStage('manage')}
      onConfirmDisconnect={handleDisconnect}
    >
      <IntegrationModalHeader integration={integration} />
      <IntegrationAccountSummary
        label={integration.account?.label}
        lastSyncAt={integration.account?.lastSyncAt}
      />
      <IntegrationSyncActions
        importingAll={importingAll}
        syncing={syncing}
        onDisconnect={() => setStage('confirm')}
        onFullImport={() => handleSync(true)}
        onSync={() => handleSync(false)}
      />
      <RecordChangesBanner changes={syncRecordChanges} />
    </IntegrationManageStage>
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
  const [stage, setStage] = useState<'manage' | 'confirm'>('manage');
  const [disconnecting, setDisconnecting] = useState(false);

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
      await invalidateAfterProviderSync(queryClient);
      router.refresh();
      onUpdated?.();
    } finally {
      setSyncing(false);
      setImportingAll(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await fetch('/api/withings/disconnect', { method: 'POST' });
      router.refresh();
      onUpdated?.();
    } finally {
      setDisconnecting(false);
      setStage('manage');
    }
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
          {integrationConnectBody(
            integration,
            'Connecte ta balance Withings pour importer poids et composition corporelle. En cas de chevauchement avec Renpho, Withings est prioritaire.',
          )}
        </p>
        <p className="text-muted-foreground text-xs leading-relaxed">
          OAuth Withings exige une URL de redirection HTTPS (pas localhost). Sur Vercel :{' '}
          <code className="text-xs">https://ton-domaine/api/withings/callback</code>
        </p>
        <a
          className={cn(buttonVariants(), 'w-full sm:w-auto')}
          href="/api/withings/connect?returnTo=/settings/integrations"
        >
          {integrationConnectCta(integration)}
        </a>
        {integration.statusMessage && (
          <p aria-live="assertive" className="text-destructive text-sm">
            {integration.statusMessage}
          </p>
        )}
      </div>
    );
  }

  return (
    <IntegrationManageStage
      confirmDescription="Les mesures importées sont conservées."
      confirmTitle="Déconnecter Withings ?"
      disconnecting={disconnecting}
      stage={stage}
      onCancelConfirm={() => setStage('manage')}
      onConfirmDisconnect={handleDisconnect}
    >
      <IntegrationModalHeader integration={integration} />
      <IntegrationAccountSummary
        label={integration.account?.label}
        lastSyncAt={integration.account?.lastSyncAt}
      />
      <IntegrationSyncActions
        importingAll={importingAll}
        syncing={syncing}
        onDisconnect={() => setStage('confirm')}
        onFullImport={() => handleSync(true)}
        onSync={() => handleSync(false)}
      />
      {integration.statusMessage && (
        <p aria-live="polite" className="text-muted-foreground text-sm">
          {integration.statusMessage}
        </p>
      )}
    </IntegrationManageStage>
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
  const [stage, setStage] = useState<'manage' | 'confirm'>('manage');
  const [disconnecting, setDisconnecting] = useState(false);

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
      await invalidateAfterProviderSync(queryClient);
      router.refresh();
      onUpdated?.();
    } finally {
      setSyncing(false);
      setImportingAll(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await fetch('/api/renpho/disconnect', { method: 'POST' });
      router.refresh();
      onUpdated?.();
    } finally {
      setDisconnecting(false);
      setStage('manage');
    }
  }

  if (!integration.connected) {
    return (
      <form className="space-y-4" onSubmit={handleConnect}>
        <IntegrationModalHeader integration={integration} />
        <p className="text-muted-foreground text-sm leading-relaxed">
          {integrationConnectBody(
            integration,
            integration.badge === 'legacy'
              ? 'Balance Renpho Health: historique conservé. Withings est ta source principale : ses données remplacent Renpho sur les jours en commun.'
              : 'Balance Renpho Health: historique conservé.',
          )}
        </p>
        <div className="space-y-2">
          <Label htmlFor="renpho-email">Email Renpho</Label>
          <Input autoComplete="username" id="renpho-email" name="email" type="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="renpho-password">Mot de passe</Label>
          <Input
            autoComplete="current-password"
            id="renpho-password"
            name="password"
            type="password"
            required
          />
        </div>
        {error && (
          <p aria-live="assertive" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <Button className="w-full sm:w-auto" disabled={connecting} type="submit">
          {connecting ? 'Connexion…' : integrationConnectCta(integration)}
        </Button>
      </form>
    );
  }

  return (
    <IntegrationManageStage
      confirmTitle="Déconnecter Renpho ?"
      disconnecting={disconnecting}
      stage={stage}
      onCancelConfirm={() => setStage('manage')}
      onConfirmDisconnect={handleDisconnect}
    >
      <IntegrationModalHeader integration={integration} />
      <IntegrationAccountSummary
        label={integration.account?.label}
        lastSyncAt={integration.account?.lastSyncAt}
      />
      <IntegrationSyncActions
        importingAll={importingAll}
        syncing={syncing}
        onDisconnect={() => setStage('confirm')}
        onFullImport={() => handleSync(true)}
        onSync={() => handleSync(false)}
      />
    </IntegrationManageStage>
  );
}

function googleSyncErrorDescription(err: unknown): string | undefined {
  if (!(err instanceof Error)) return undefined;
  if (err.message.includes('Reconnecte')) {
    return `${err.message} Utilise le bouton « Connecter Google Calendar » ci-dessous.`;
  }
  return err.message;
}

function GoogleContent({
  integration,
  onUpdated,
}: {
  integration: IntegrationDefinition;
  onUpdated?: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const calendarsQuery = useGoogleCalendars(integration.connected);
  const calendars = calendarsQuery.data ?? [];
  const [pendingCalendarId, setPendingCalendarId] = useState<string | null>(null);
  const targetCalendarId = integration.account?.extra?.targetCalendarId as string | null;
  const targetCalendarName = integration.account?.extra?.targetCalendarName as string | null;
  const calendarId = pendingCalendarId ?? targetCalendarId ?? '';
  const [savingTarget, setSavingTarget] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [stage, setStage] = useState<'manage' | 'confirm'>('manage');
  const [disconnecting, setDisconnecting] = useState(false);

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
          description: googleSyncErrorDescription(err),
        }),
      });
      await invalidateAfterProviderSync(queryClient, { includeBodyComposition: false });
    } finally {
      router.refresh();
      onUpdated?.();
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await fetch('/api/google/disconnect', { method: 'POST' });
      router.refresh();
      onUpdated?.();
    } finally {
      setDisconnecting(false);
      setStage('manage');
    }
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
    const blockedOnLan = isGoogleOAuthBlockedOnCurrentHost();
    const connectHref = blockedOnLan
      ? `${googleOAuthLocalConnectHref()}?returnTo=/settings/integrations`
      : '/api/google/connect?returnTo=/settings/integrations';

    return (
      <div className="space-y-4">
        <IntegrationModalHeader integration={integration} />
        <p className="text-muted-foreground text-sm leading-relaxed">
          {integrationConnectBody(
            integration,
            'Le coach planifie tes séances dans ton agenda en évitant tes créneaux occupés.',
          )}
        </p>
        {blockedOnLan && (
          <p className="border-signal-caution/30 bg-signal-caution/10 text-signal-caution rounded-lg border px-3 py-2 text-sm leading-relaxed">
            {GOOGLE_OAUTH_LAN_HINT}
          </p>
        )}
        <a className={cn(buttonVariants(), 'w-full sm:w-auto')} href={connectHref}>
          {integrationConnectCta(integration)}
        </a>
        {integration.statusMessage && (
          <p aria-live="assertive" className="text-destructive text-sm">
            {integration.statusMessage}
          </p>
        )}
      </div>
    );
  }

  return (
    <IntegrationManageStage
      confirmTitle="Déconnecter Google Calendar ?"
      disconnecting={disconnecting}
      stage={stage}
      onCancelConfirm={() => setStage('manage')}
      onConfirmDisconnect={handleDisconnect}
    >
      <IntegrationModalHeader integration={integration} />
      <IntegrationAccountSummary
        label={integration.account?.label}
        lastSyncAt={integration.account?.lastSyncAt}
      />
      <div className="space-y-2">
        <Label htmlFor="google-calendar-target">Calendrier des séances</Label>
        <Select value={calendarId} onValueChange={handleSelectCalendar}>
          <SelectTrigger
            className="w-full"
            disabled={calendarsQuery.isPending || savingTarget}
            id="google-calendar-target"
          >
            <SelectValue>
              {calendarSelectLabel(
                calendarId,
                calendars,
                targetCalendarName,
                calendarsQuery.isPending,
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="w-max max-w-[var(--available-width)] min-w-[var(--anchor-width)]">
            {calendars.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.summary}
                {c.primary ? ' (principal)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <IntegrationSyncActions
        syncDisabled={!calendarId}
        syncing={syncing}
        onDisconnect={() => setStage('confirm')}
        onSync={handleSync}
      />
    </IntegrationManageStage>
  );
}

function MfpContent({
  integration,
  onUpdated,
}: {
  integration: IntegrationDefinition;
  onUpdated?: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [stage, setStage] = useState<'manage' | 'confirm'>('manage');

  async function handleSync() {
    setSyncing(true);
    try {
      await fetch('/api/myfitnesspal/sync', { method: 'POST' });
      await queryClient.invalidateQueries({ queryKey: ['presentation'] });
      onUpdated?.();
      router.refresh();
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await fetch('/api/myfitnesspal/disconnect', { method: 'POST' });
      await queryClient.invalidateQueries({ queryKey: ['presentation'] });
      onUpdated?.();
      router.refresh();
    } finally {
      setDisconnecting(false);
      setStage('manage');
    }
  }

  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  async function handleConnect(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setConnecting(true);
    setConnectError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/myfitnesspal/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: form.get('sessionToken') }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Connexion échouée' }));
        setConnectError(data.error ?? 'Connexion échouée');
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ['presentation'] });
      onUpdated?.();
      router.refresh();
    } catch {
      setConnectError('Erreur réseau');
    } finally {
      setConnecting(false);
    }
  }

  if (!integration.connected) {
    return (
      <form className="min-w-0 space-y-4" onSubmit={handleConnect}>
        <IntegrationModalHeader integration={integration} />
        <p className="text-muted-foreground text-sm leading-relaxed">
          Connecte MyFitnessPal pour importer ton journal alimentaire : calories, protéines,
          glucides et lipides.
        </p>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Ouvre myfitnesspal.com dans ton navigateur, connecte-toi, puis DevTools → Application →
          Cookies → copie la valeur de <strong>__Secure-next-auth.session-token</strong>.
        </p>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="mfp-session-token">Cookie de session MFP</Label>
          <Textarea
            autoComplete="off"
            className="[field-sizing:fixed] max-h-32 min-h-20 w-full max-w-full resize-y overflow-auto break-all"
            id="mfp-session-token"
            name="sessionToken"
            placeholder="eyJhbG…"
            rows={3}
            spellCheck={false}
            required
          />
          <p className="text-muted-foreground mt-1 text-xs">
            À faire une seule fois : chaque synchro prolonge la session, tant que la synchro
            automatique tourne.
          </p>
        </div>
        {connectError && (
          <p aria-live="assertive" className="text-destructive text-sm">
            {connectError}
          </p>
        )}
        <Button className="w-full sm:w-auto" disabled={connecting} type="submit">
          {connecting ? 'Connexion…' : 'Connecter MyFitnessPal'}
        </Button>
      </form>
    );
  }

  return (
    <IntegrationManageStage
      confirmDescription="Les données nutritionnelles importées sont conservées."
      confirmTitle="Déconnecter MyFitnessPal ?"
      disconnecting={disconnecting}
      stage={stage}
      onCancelConfirm={() => setStage('manage')}
      onConfirmDisconnect={handleDisconnect}
    >
      <IntegrationModalHeader integration={integration} />
      <IntegrationAccountSummary
        label={integration.account?.label}
        lastSyncAt={integration.account?.lastSyncAt}
      />
      <IntegrationSyncActions
        syncing={syncing}
        onDisconnect={() => setStage('confirm')}
        onSync={handleSync}
      />
    </IntegrationManageStage>
  );
}

export function integrationModalTitle(id: IntegrationId): string {
  const titles: Record<IntegrationId, string> = {
    strava: 'Strava',
    garmin: 'Garmin Connect',
    withings: 'Withings',
    renpho: 'Renpho Health',
    google: 'Google Calendar',
    myfitnesspal: 'MyFitnessPal',
  };
  return titles[id];
}
