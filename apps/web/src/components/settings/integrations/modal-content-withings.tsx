'use client';

import {
  IntegrationAccountSummary,
  IntegrationManageStage,
  IntegrationSyncActions,
} from '@/components/settings/integrations/modal-parts';
import {
  EnvSetupBlock,
  IntegrationModalHeader,
  type IntegrationContentProps,
} from '@/components/settings/integrations/modal-content-shared';
import { useWithingsContentState } from '@/components/settings/integrations/withings-content-hooks';
import {
  integrationConnectBody,
  integrationConnectCta,
} from '@/components/settings/integrations/types';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function WithingsNotConfigured({ integration }: IntegrationContentProps) {
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
          <code className="text-xs">ngrok</code>, <code className="text-xs">cloudflared</code>) puis
          définis{' '}
          <code className="text-xs">WITHINGS_REDIRECT_URI=https://…/api/withings/callback</code>{' '}
          dans <code className="text-xs">.env</code> et enregistre la même URL chez Withings.
        </p>
      </EnvSetupBlock>
    </div>
  );
}

function WithingsNotConnected({ integration }: IntegrationContentProps) {
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

function WithingsConnectedManage({
  integration,
  state,
}: IntegrationContentProps & {
  state: ReturnType<typeof useWithingsContentState>;
}) {
  return (
    <IntegrationManageStage
      confirmDescription="Les mesures importées sont conservées."
      confirmTitle="Déconnecter Withings ?"
      disconnecting={state.disconnecting}
      stage={state.stage}
      onCancelConfirm={() => state.setStage('manage')}
      onConfirmDisconnect={state.handleDisconnect}
    >
      <IntegrationModalHeader integration={integration} />
      <IntegrationAccountSummary
        label={integration.account?.label}
        lastSyncAt={integration.account?.lastSyncAt}
      />
      <IntegrationSyncActions
        importingAll={state.importingAll}
        syncing={state.syncing}
        onDisconnect={() => state.setStage('confirm')}
        onFullImport={() => state.handleSync(true)}
        onSync={() => state.handleSync(false)}
      />
      {integration.statusMessage && (
        <p aria-live="polite" className="text-muted-foreground text-sm">
          {integration.statusMessage}
        </p>
      )}
    </IntegrationManageStage>
  );
}

export function WithingsContent({ integration, onUpdated, onSyncStart }: IntegrationContentProps) {
  const state = useWithingsContentState(onUpdated, onSyncStart);

  if (!integration.configured) {
    return <WithingsNotConfigured integration={integration} />;
  }
  if (!integration.connected) {
    return <WithingsNotConnected integration={integration} />;
  }
  return <WithingsConnectedManage integration={integration} state={state} />;
}
