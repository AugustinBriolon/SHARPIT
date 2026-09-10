'use client';

import { useIntegrationsHub } from '@/components/settings/integrations/hub-hooks';
import {
  IntegrationsHubClassSections,
  IntegrationsHubModal,
  IntegrationsHubToolbar,
} from '@/components/settings/integrations/hub-layout-parts';
import type { IntegrationsPayload } from '@/components/settings/integrations/types';
import type { IntegrationSourcePrefs } from '@/lib/integrations/source-prefs';

export function IntegrationsHub({
  payload,
  initialPrefs,
}: {
  payload: IntegrationsPayload;
  initialPrefs: IntegrationSourcePrefs;
}) {
  const hub = useIntegrationsHub(payload, initialPrefs);

  return (
    <section className="space-y-6">
      <IntegrationsHubToolbar
        connectedCount={hub.connected.length}
        guardDisabled={hub.guardDisabled}
        offline={hub.offline}
        offlineLabel={hub.offlineLabel}
        syncingAll={hub.syncingAll}
        totalCount={hub.integrations.length}
        onSyncAll={() => void hub.handleSyncAll()}
      />
      <IntegrationsHubClassSections
        byId={hub.byId}
        prefs={hub.prefs}
        rowSync={hub.rowSync}
        onOpen={hub.setOpenId}
        onPrefsChange={hub.setPrefs}
      />
      <IntegrationsHubModal
        active={hub.active}
        open={hub.openId !== null}
        onOpenChange={(open) => !open && hub.setOpenId(null)}
        onSyncStart={() => hub.setOpenId(null)}
        onUpdated={() => hub.router.refresh()}
      />
    </section>
  );
}
