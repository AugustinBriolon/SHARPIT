'use client';

import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, CircleDashed, Loader2, RefreshCw, Unplug, XCircle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { FadePresence } from '@/components/motion';
import { ClassSourceControls } from '@/components/integrations/class-source-controls';
import { guardedActionLabel, useOfflineGuard } from '@/hooks/use-offline-guard';
import { useResetWhenHidden } from '@/hooks/use-reset-when-hidden';
import { IntegrationLogo } from '@/components/settings/integrations/logos';
import {
  buildIntegrations,
  type IntegrationDefinition,
  type IntegrationsPayload,
} from '@/components/settings/integrations/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import {
  DATA_CLASSES,
  getCatalogProviderByIntegration,
  providersForClass,
  type DataClassId,
} from '@/lib/integrations/provider-catalog';
import {
  runGarminSync,
  runGoogleSync,
  runMfpSync,
  runRenphoSync,
  runStravaSync,
  runWithingsSync,
  type IntegrationId,
} from '@/lib/integrations/shared/client-sync';
import {
  disableProviderForClass,
  enableProviderForClass,
  setPrimaryForClass,
  type IntegrationSourcePrefs,
} from '@/lib/integrations/source-prefs';
import { invalidateAfterProviderSync } from '@/lib/query/invalidate-after-provider-sync';
import { cn } from '@/lib/utils';

const IntegrationModalContent = dynamic(
  () =>
    import('@/components/settings/integrations/modal-content').then(
      (mod) => mod.IntegrationModalContent,
    ),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full" /> },
);

type RowSyncState = 'running' | 'done' | 'error';

function syncLabel(lastSyncAt: string | null): string {
  if (!lastSyncAt) {
    return 'Jamais synchronisé';
  }
  return formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true, locale: fr });
}

function integrationStatusLabel(integration: IntegrationDefinition): string {
  if (integration.needsReconnect) {
    return 'Session expirée, reconnecte';
  }
  if (integration.connected) {
    return syncLabel(integration.account?.lastSyncAt ?? null);
  }
  if (integration.configured) {
    return 'Clique pour connecter';
  }
  return 'Configuration serveur requise';
}

function StatusBadge({ integration }: { integration: IntegrationDefinition }) {
  if (!integration.configured) {
    return (
      <span className="bg-muted text-muted-foreground text-label inline-flex items-center gap-1 rounded-full px-2 py-0.5">
        <Unplug className="size-3" aria-hidden />
        Non configuré
      </span>
    );
  }
  if (integration.needsReconnect) {
    return (
      <span className="bg-signal-caution/10 text-signal-caution text-label inline-flex items-center gap-1 rounded-full px-2 py-0.5">
        <XCircle className="size-3" aria-hidden />À reconnecter
      </span>
    );
  }
  if (integration.connected) {
    return (
      <span className="bg-highlight text-highlight-foreground text-label inline-flex items-center gap-1 rounded-full px-2 py-0.5">
        <CheckCircle2 className="size-3" aria-hidden />
        Connecté
      </span>
    );
  }
  return (
    <span className="bg-signal-caution/10 text-signal-caution text-label inline-flex items-center gap-1 rounded-full px-2 py-0.5">
      <CircleDashed className="size-3" aria-hidden />À connecter
    </span>
  );
}

function RowSyncBadge({ state }: { state: RowSyncState }) {
  if (state === 'running') {
    return (
      <span className="text-muted-foreground text-label inline-flex items-center gap-1 rounded-full px-2 py-0.5">
        <Loader2 className="size-3 animate-spin" aria-hidden />
        Sync…
      </span>
    );
  }
  if (state === 'done') {
    return (
      <span className="bg-primary/10 text-primary text-label inline-flex items-center gap-1 rounded-full px-2 py-0.5">
        <CheckCircle2 className="size-3" aria-hidden />À jour
      </span>
    );
  }
  return (
    <span className="bg-destructive/10 text-destructive text-label inline-flex items-center gap-1 rounded-full px-2 py-0.5">
      <XCircle className="size-3" aria-hidden />
      Échec
    </span>
  );
}

async function syncIntegration(id: IntegrationId): Promise<string> {
  switch (id) {
    case 'strava': {
      const d = await runStravaSync();
      return `${d.imported} activité(s) importée(s)`;
    }
    case 'garmin': {
      const d = await runGarminSync();
      return `${d.updated} jour(s) santé · ${d.activities.imported} séance(s)`;
    }
    case 'withings': {
      const d = await runWithingsSync();
      return `${d.imported} mesure(s) · ${d.updated} mise(s) à jour`;
    }
    case 'renpho': {
      const d = await runRenphoSync();
      return `${d.imported} mesure(s) · ${d.updated} mise(s) à jour`;
    }
    case 'google': {
      const d = await runGoogleSync();
      return `${d.pushed} événement(s) · ${d.updated} mis à jour`;
    }
    case 'myfitnesspal': {
      const d = await runMfpSync();
      return `${d.synced} jour(s) synchronisé(s)`;
    }
  }
}

function ClassProviderRow({
  integration,
  dataClass,
  prefs,
  syncState,
  onOpen,
  onPrefsChange,
}: {
  integration: IntegrationDefinition;
  dataClass: DataClassId;
  prefs: IntegrationSourcePrefs;
  syncState?: RowSyncState;
  onOpen: () => void;
  onPrefsChange: (next: IntegrationSourcePrefs) => void;
}) {
  const classPrefs = prefs.classes[dataClass];
  const isEnabled = classPrefs.enabled.includes(integration.id);
  const isPrimary = classPrefs.primary === integration.id;
  const catalog = getCatalogProviderByIntegration(integration.id);
  const classTypes = catalog?.dataTypesByClass[dataClass]?.join(' · ');

  async function patch(action: 'enable' | 'disable' | 'setPrimary'): Promise<void> {
    let optimistic: IntegrationSourcePrefs;
    if (action === 'enable') {
      optimistic = enableProviderForClass(prefs, dataClass, integration.id);
    } else if (action === 'disable') {
      optimistic = disableProviderForClass(prefs, dataClass, integration.id);
    } else {
      optimistic = setPrimaryForClass(prefs, dataClass, integration.id);
    }
    onPrefsChange(optimistic);
    const response = await fetch('/api/integrations/source-prefs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, dataClass, provider: integration.id }),
    });
    if (!response.ok) {
      onPrefsChange(prefs);
      toast.error('Impossible de mettre à jour la source');
      return;
    }
    const data = (await response.json()) as { prefs: IntegrationSourcePrefs };
    onPrefsChange(data.prefs);
  }

  return (
    <div className="analysis-panel rounded-analysis-lg flex flex-col gap-3 p-4">
      <button
        className="group hover:border-primary/25 focus-visible:ring-primary/35 flex w-full items-start justify-between gap-3 text-left focus-visible:ring-2 focus-visible:outline-hidden"
        type="button"
        onClick={onOpen}
      >
        <div className="flex items-start gap-3">
          <IntegrationLogo className="size-10 shrink-0" id={integration.id} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{integration.name}</p>
              {integration.badge === 'legacy' && (
                <span className="bg-muted text-muted-foreground text-label rounded-full px-2 py-0.5">
                  Historique
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-xs">{classTypes ?? integration.tagline}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              {integrationStatusLabel(integration)}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge integration={integration} />
          <FadePresence
            className="flex"
            presenceKey={syncState ?? 'idle'}
            show={Boolean(syncState)}
          >
            {syncState ? <RowSyncBadge state={syncState} /> : null}
          </FadePresence>
        </div>
      </button>

      {integration.connected ? (
        <div className="border-analysis-border border-t pt-3">
          <ClassSourceControls
            className="mt-0"
            isEnabled={isEnabled}
            isPrimary={isPrimary}
            onSetPrimary={() => void patch('setPrimary')}
            onToggleEnabled={(next) => void patch(next ? 'enable' : 'disable')}
          />
        </div>
      ) : null}
    </div>
  );
}

async function syncAllConnectedIntegrations(
  connected: IntegrationDefinition[],
  setRowSync: React.Dispatch<React.SetStateAction<Partial<Record<IntegrationId, RowSyncState>>>>,
): Promise<{ results: string[]; errors: string[] }> {
  const results: string[] = [];
  const errors: string[] = [];

  for (const integration of connected) {
    setRowSync((prev) => ({ ...prev, [integration.id]: 'running' }));
    try {
      const summary = await syncIntegration(integration.id);
      results.push(`${integration.name} : ${summary}`);
      setRowSync((prev) => ({ ...prev, [integration.id]: 'done' }));
    } catch (err) {
      errors.push(
        `${integration.name} : ${err instanceof Error ? err.message : 'erreur inconnue'}`,
      );
      setRowSync((prev) => ({ ...prev, [integration.id]: 'error' }));
    }
  }

  return { results, errors };
}

export function IntegrationsHub({
  payload,
  initialPrefs,
}: {
  payload: IntegrationsPayload;
  initialPrefs: IntegrationSourcePrefs;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const integrations = useMemo(() => buildIntegrations(payload), [payload]);
  const byId = useMemo(
    () =>
      Object.fromEntries(integrations.map((i) => [i.id, i])) as Record<
        IntegrationId,
        IntegrationDefinition
      >,
    [integrations],
  );
  const [prefs, setPrefs] = useState(initialPrefs);
  const [openId, setOpenId] = useState<IntegrationId | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [rowSync, setRowSync] = useState<Partial<Record<IntegrationId, RowSyncState>>>({});
  const { offline, guardDisabled, offlineLabel } = useOfflineGuard();

  // An integration modal left open would reopen itself on the way back.
  useResetWhenHidden(() => setOpenId(null));

  const connected = integrations.filter((i) => i.connected);
  const active = openId ? integrations.find((i) => i.id === openId) : null;

  async function handleSyncAll() {
    if (guardDisabled) {
      return;
    }
    if (connected.length === 0) {
      toast.info('Aucune source connectée', {
        description: 'Connecte au moins une application pour synchroniser.',
      });
      return;
    }

    setSyncingAll(true);
    setRowSync({});
    const loadingToast = toast.loading('Synchronisation en cours', {
      description: `${connected.length} source${connected.length > 1 ? 's' : ''} à synchroniser.`,
    });

    try {
      const { results, errors } = await syncAllConnectedIntegrations(connected, setRowSync);

      await invalidateAfterProviderSync(queryClient);
      router.refresh();

      if (results.length > 0) {
        toast.success('Synchronisation terminée', {
          description: results.join(' · '),
        });
      }
      if (errors.length > 0) {
        toast.error('Certaines sources ont échoué', {
          description: errors.join(' · '),
        });
      }
    } finally {
      toast.close(loadingToast);
      setSyncingAll(false);
      window.setTimeout(() => setRowSync({}), 2200);
    }
  }

  return (
    <section className="space-y-6">
      <div className="analysis-panel rounded-analysis-lg flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <p className="text-sm font-medium">Sources de données</p>
          <p className="text-muted-foreground text-xs">
            {connected.length} sur {integrations.length} connectée
            {connected.length > 1 ? 's' : ''} — un compte, plusieurs classes
          </p>
        </div>
        <Button
          disabled={guardDisabled || syncingAll || connected.length === 0}
          onClick={handleSyncAll}
        >
          <RefreshCw className={cn('size-4', syncingAll && 'animate-spin')} aria-hidden />
          {guardedActionLabel(offline, offlineLabel, 'Tout synchroniser', {
            active: syncingAll,
            label: 'Synchronisation…',
          })}
        </Button>
      </div>

      {DATA_CLASSES.map((dataClass) => {
        const providers = providersForClass(dataClass.id).filter(
          (p) => p.status === 'available' && p.integrationId,
        );
        return (
          <div key={dataClass.id} className="space-y-3">
            <div>
              <h2 className="text-sm font-medium">{dataClass.label}</h2>
              <p className="text-muted-foreground text-xs">{dataClass.description}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {providers.map((provider) => {
                const integration = byId[provider.integrationId!];
                if (!integration) {
                  return null;
                }
                return (
                  <ClassProviderRow
                    key={`${dataClass.id}-${integration.id}`}
                    dataClass={dataClass.id}
                    integration={integration}
                    prefs={prefs}
                    syncState={rowSync[integration.id]}
                    onOpen={() => setOpenId(integration.id)}
                    onPrefsChange={setPrefs}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      <Dialog open={openId !== null} onOpenChange={(open) => !open && setOpenId(null)}>
        <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-md">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>{active.name}</DialogTitle>
                <DialogDescription>{active.tagline}</DialogDescription>
              </DialogHeader>
              <IntegrationModalContent integration={active} onUpdated={() => router.refresh()} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
