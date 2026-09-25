'use client';

import {
  IntegrationAccountCard,
  IntegrationManageStage,
  IntegrationNotConnectedView,
  IntegrationNotConfiguredView,
  IntegrationStatusMessage,
  IntegrationSyncActions,
} from '@/components/settings/integrations/modal-parts';
import {
  IntegrationModalHeader,
  RecordChangesBanner,
  type IntegrationContentProps,
} from '@/components/settings/integrations/modal-content-shared';
import { useStravaContentState } from '@/components/settings/integrations/strava-content-hooks';

function StravaNotConfigured({ integration }: IntegrationContentProps) {
  return (
    <IntegrationNotConfiguredView integration={integration}>
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
    </IntegrationNotConfiguredView>
  );
}

function StravaConnectedManage({ integration, onUpdated, onSyncStart }: IntegrationContentProps) {
  const state = useStravaContentState(integration, onUpdated, onSyncStart);

  return (
    <IntegrationManageStage
      confirmDescription="Les séances importées sont conservées."
      confirmTitle="Déconnecter Strava ?"
      disconnecting={state.disconnecting}
      stage={state.stage}
      onCancelConfirm={() => state.setStage('manage')}
      onConfirmDisconnect={state.handleDisconnect}
    >
      <IntegrationModalHeader integration={integration} />
      <IntegrationAccountCard
        avatarUrl={state.avatarUrl}
        label={integration.account?.label}
        lastSyncAt={integration.account?.lastSyncAt}
      />
      <IntegrationSyncActions
        fullImportingLabel="Récupération…"
        fullImportLabel="Données détaillées"
        importingAll={state.backfilling}
        syncing={state.syncing}
        onDisconnect={() => state.setStage('confirm')}
        onFullImport={state.handleBackfill}
        onSync={state.handleSync}
      />
      <RecordChangesBanner changes={state.syncRecordChanges} />
      <IntegrationStatusMessage message={integration.statusMessage} />
    </IntegrationManageStage>
  );
}

export function StravaContent({ integration, onUpdated, onSyncStart }: IntegrationContentProps) {
  if (!integration.configured) {
    return <StravaNotConfigured integration={integration} />;
  }
  if (!integration.connected) {
    return (
      <IntegrationNotConnectedView
        body="Connecte Strava pour importer automatiquement tes activités course, vélo et natation."
        connectHref="/api/strava/connect?returnTo=/settings/integrations"
        integration={integration}
      />
    );
  }
  return (
    <StravaConnectedManage
      integration={integration}
      onSyncStart={onSyncStart}
      onUpdated={onUpdated}
    />
  );
}
