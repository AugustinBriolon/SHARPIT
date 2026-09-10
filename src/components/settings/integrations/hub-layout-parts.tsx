'use client';

import dynamic from 'next/dynamic';
import { RefreshCw } from 'lucide-react';
import { ClassProviderRow } from '@/components/settings/integrations/hub-parts';
import { syncAllButtonLabel } from '@/components/settings/integrations/hub-hooks';
import type { RowSyncState } from '@/components/settings/integrations/hub-sync';
import type { IntegrationDefinition } from '@/components/settings/integrations/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { DATA_CLASSES, providersForClass } from '@/lib/integrations/provider-catalog';
import type { IntegrationId } from '@/lib/integrations/shared/client-sync';
import type { IntegrationSourcePrefs } from '@/lib/integrations/source-prefs';
import { cn } from '@/lib/utils';

const IntegrationModalContent = dynamic(
  () =>
    import('@/components/settings/integrations/modal-content').then(
      (mod) => mod.IntegrationModalContent,
    ),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full" /> },
);

export function IntegrationsHubToolbar({
  connectedCount,
  totalCount,
  guardDisabled,
  syncingAll,
  offline,
  offlineLabel,
  onSyncAll,
}: {
  connectedCount: number;
  totalCount: number;
  guardDisabled: boolean;
  syncingAll: boolean;
  offline: boolean;
  offlineLabel: string;
  onSyncAll: () => void;
}) {
  return (
    <div className="analysis-panel rounded-analysis-lg flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div>
        <p className="text-sm font-medium">Sources de données</p>
        <p className="text-muted-foreground text-xs">
          {connectedCount} sur {totalCount} connectée
          {connectedCount > 1 ? 's' : ''} — un compte, plusieurs classes
        </p>
      </div>
      <Button disabled={guardDisabled || syncingAll || connectedCount === 0} onClick={onSyncAll}>
        <RefreshCw className={cn('size-4', syncingAll && 'animate-spin')} aria-hidden />
        {syncAllButtonLabel(offline, offlineLabel, syncingAll)}
      </Button>
    </div>
  );
}

export function IntegrationsHubClassSections({
  byId,
  prefs,
  rowSync,
  onOpen,
  onPrefsChange,
}: {
  byId: Record<IntegrationId, IntegrationDefinition>;
  prefs: IntegrationSourcePrefs;
  rowSync: Partial<Record<IntegrationId, RowSyncState>>;
  onOpen: (id: IntegrationId) => void;
  onPrefsChange: (next: IntegrationSourcePrefs) => void;
}) {
  return DATA_CLASSES.map((dataClass) => {
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
                onOpen={() => onOpen(integration.id)}
                onPrefsChange={onPrefsChange}
              />
            );
          })}
        </div>
      </div>
    );
  });
}

export function IntegrationsHubModal({
  active,
  open,
  onOpenChange,
  onUpdated,
  onSyncStart,
}: {
  active: IntegrationDefinition | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
  onSyncStart: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-md">
        {active && (
          <>
            <DialogHeader>
              <DialogTitle>{active.name}</DialogTitle>
              <DialogDescription>{active.tagline}</DialogDescription>
            </DialogHeader>
            <IntegrationModalContent
              integration={active}
              onSyncStart={onSyncStart}
              onUpdated={onUpdated}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
