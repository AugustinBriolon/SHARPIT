'use client';

import {
  IntegrationAccountSummary,
  IntegrationManageStage,
  IntegrationSyncActions,
} from '@/components/settings/integrations/modal-parts';
import {
  IntegrationModalHeader,
  type IntegrationContentProps,
} from '@/components/settings/integrations/modal-content-shared';
import { useRenphoContentState } from '@/components/settings/integrations/renpho-content-hooks';
import {
  integrationConnectBody,
  integrationConnectCta,
} from '@/components/settings/integrations/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function RenphoConnectForm({
  integration,
  connecting,
  error,
  onSubmit,
}: IntegrationContentProps & {
  connecting: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
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

function RenphoConnectedManage({
  integration,
  state,
}: IntegrationContentProps & {
  state: ReturnType<typeof useRenphoContentState>;
}) {
  return (
    <IntegrationManageStage
      confirmTitle="Déconnecter Renpho ?"
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
    </IntegrationManageStage>
  );
}

export function RenphoContent({ integration, onUpdated, onSyncStart }: IntegrationContentProps) {
  const state = useRenphoContentState(onUpdated, onSyncStart);

  if (!integration.connected) {
    return (
      <RenphoConnectForm
        connecting={state.connecting}
        error={state.error}
        integration={integration}
        onSubmit={state.handleConnect}
      />
    );
  }

  return <RenphoConnectedManage integration={integration} state={state} />;
}
