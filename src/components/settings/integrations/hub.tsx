'use client';

import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ChevronRight, CircleDashed, RefreshCw, Unplug } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
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
  runGarminSync,
  runGoogleSync,
  runRenphoSync,
  runStravaSync,
  runWithingsSync,
  type IntegrationId,
} from '@/lib/integrations/client-sync';
import { invalidateAfterProviderSync } from '@/lib/query/invalidate-after-provider-sync';
import { cn } from '@/lib/utils';

const IntegrationModalContent = dynamic(
  () =>
    import('@/components/settings/integrations/modal-content').then(
      (mod) => mod.IntegrationModalContent,
    ),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full" /> },
);

function syncLabel(lastSyncAt: string | null): string {
  if (!lastSyncAt) return 'Jamais synchronisé';
  return formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true, locale: fr });
}

function integrationStatusLabel(integration: IntegrationDefinition): string {
  if (integration.connected) {
    return syncLabel(integration.account?.lastSyncAt ?? null);
  }
  if (integration.configured) return 'Clique pour connecter';
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

function IntegrationCard({
  integration,
  onOpen,
}: {
  integration: IntegrationDefinition;
  onOpen: () => void;
}) {
  return (
    <button
      className="analysis-panel group hover:border-primary/25 hover:bg-primary/5 focus-visible:ring-primary/35 rounded-analysis-lg pressable-lg flex w-full flex-col p-4 text-left focus-visible:ring-2 focus-visible:outline-hidden"
      type="button"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-3">
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
            <p className="text-muted-foreground text-xs">{integration.tagline}</p>
          </div>
        </div>
        <StatusBadge integration={integration} />
      </div>

      <div className="mt-4 flex items-end justify-between gap-2">
        <div>
          {integration.connected && integration.account?.label && (
            <p className="text-sm font-medium">{integration.account.label}</p>
          )}
          <p className="text-muted-foreground text-xs">{integrationStatusLabel(integration)}</p>
        </div>
        <span className="text-primary inline-flex items-center gap-0.5 text-xs font-medium opacity-70 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
          Gérer
          <ChevronRight className="size-3.5" aria-hidden />
        </span>
      </div>
    </button>
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
  }
}

export function IntegrationsHub({ payload }: { payload: IntegrationsPayload }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const integrations = useMemo(() => buildIntegrations(payload), [payload]);
  const [openId, setOpenId] = useState<IntegrationId | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const { offline, guardDisabled, offlineLabel } = useOfflineGuard();

  // An integration modal left open would reopen itself on the way back.
  useResetWhenHidden(() => setOpenId(null));

  const connected = integrations.filter((i) => i.connected);
  const active = openId ? integrations.find((i) => i.id === openId) : null;

  async function handleSyncAll() {
    if (guardDisabled) return;
    if (connected.length === 0) {
      toast.info('Aucune source connectée', {
        description: 'Connecte au moins une application pour synchroniser.',
      });
      return;
    }

    setSyncingAll(true);
    const loadingToast = toast.loading('Synchronisation en cours', {
      description: `${connected.length} source${connected.length > 1 ? 's' : ''} à synchroniser.`,
    });
    const results: string[] = [];
    const errors: string[] = [];

    try {
      for (const integration of connected) {
        try {
          const summary = await syncIntegration(integration.id);
          results.push(`${integration.name} : ${summary}`);
        } catch (err) {
          errors.push(
            `${integration.name} : ${err instanceof Error ? err.message : 'erreur inconnue'}`,
          );
        }
      }

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
    }
  }

  return (
    <section className="space-y-4">
      <div className="analysis-panel rounded-analysis-lg flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <p className="text-sm font-medium">Sources de données</p>
          <p className="text-muted-foreground text-xs">
            {connected.length} sur {integrations.length} connectée
            {connected.length > 1 ? 's' : ''}
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

      <div className="grid gap-3 sm:grid-cols-2">
        {integrations.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            onOpen={() => setOpenId(integration.id)}
          />
        ))}
      </div>

      <Dialog open={openId != null} onOpenChange={(open) => !open && setOpenId(null)}>
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
