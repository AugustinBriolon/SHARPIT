'use client';

import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CheckCircle2, CircleDashed, Loader2, Unplug, XCircle } from 'lucide-react';
import { FadePresence } from '@/components/motion';
import { ClassSourceControls } from '@/components/integrations/class-source-controls';
import { IntegrationLogo } from '@/components/settings/integrations/logos';
import type { IntegrationDefinition } from '@/components/settings/integrations/types';
import { toast } from '@/components/ui/toast';
import {
  getCatalogProviderByIntegration,
  type DataClassId,
} from '@/lib/integrations/provider-catalog';
import {
  disableProviderForClass,
  enableProviderForClass,
  setPrimaryForClass,
  type IntegrationSourcePrefs,
} from '@/lib/integrations/source-prefs';
import { patchIntegrationSourcePrefsStrict } from '@/lib/query/fetchers';
import type { RowSyncState } from '@/components/settings/integrations/hub-sync';

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

async function patchClassProviderPrefs({
  action,
  dataClass,
  integrationId,
  prefs,
  onPrefsChange,
}: {
  action: 'enable' | 'disable' | 'setPrimary';
  dataClass: DataClassId;
  integrationId: IntegrationDefinition['id'];
  prefs: IntegrationSourcePrefs;
  onPrefsChange: (next: IntegrationSourcePrefs) => void;
}): Promise<void> {
  let optimistic: IntegrationSourcePrefs;
  if (action === 'enable') {
    optimistic = enableProviderForClass(prefs, dataClass, integrationId);
  } else if (action === 'disable') {
    optimistic = disableProviderForClass(prefs, dataClass, integrationId);
  } else {
    optimistic = setPrimaryForClass(prefs, dataClass, integrationId);
  }
  onPrefsChange(optimistic);
  try {
    const data = await patchIntegrationSourcePrefsStrict({
      action,
      dataClass,
      provider: integrationId,
    });
    onPrefsChange(data.prefs);
  } catch {
    onPrefsChange(prefs);
    toast.error('Impossible de mettre à jour la source');
  }
}

function ClassProviderRowHeader({
  integration,
  dataClass,
  syncState,
  onOpen,
}: {
  integration: IntegrationDefinition;
  dataClass: DataClassId;
  syncState?: RowSyncState;
  onOpen: () => void;
}) {
  const catalog = getCatalogProviderByIntegration(integration.id);
  const classTypes = catalog?.dataTypesByClass[dataClass]?.join(' · ');

  return (
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
        <FadePresence className="flex" presenceKey={syncState ?? 'idle'} show={Boolean(syncState)}>
          {syncState ? <RowSyncBadge state={syncState} /> : null}
        </FadePresence>
      </div>
    </button>
  );
}

function ClassProviderSourceControls({
  integration,
  dataClass,
  prefs,
  onPrefsChange,
}: {
  integration: IntegrationDefinition;
  dataClass: DataClassId;
  prefs: IntegrationSourcePrefs;
  onPrefsChange: (next: IntegrationSourcePrefs) => void;
}) {
  const classPrefs = prefs.classes[dataClass];
  const isEnabled = classPrefs.enabled.includes(integration.id);
  const isPrimary = classPrefs.primary === integration.id;

  function patch(action: 'enable' | 'disable' | 'setPrimary') {
    void patchClassProviderPrefs({
      action,
      dataClass,
      integrationId: integration.id,
      prefs,
      onPrefsChange,
    });
  }

  return (
    <div className="border-analysis-border border-t pt-3">
      <ClassSourceControls
        className="mt-0"
        isEnabled={isEnabled}
        isPrimary={isPrimary}
        onSetPrimary={() => patch('setPrimary')}
        onToggleEnabled={(next) => patch(next ? 'enable' : 'disable')}
      />
    </div>
  );
}

export function ClassProviderRow({
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
  return (
    <div className="analysis-panel rounded-analysis-lg flex flex-col gap-3 p-4">
      <ClassProviderRowHeader
        dataClass={dataClass}
        integration={integration}
        syncState={syncState}
        onOpen={onOpen}
      />
      {integration.connected ? (
        <ClassProviderSourceControls
          dataClass={dataClass}
          integration={integration}
          prefs={prefs}
          onPrefsChange={onPrefsChange}
        />
      ) : null}
    </div>
  );
}
