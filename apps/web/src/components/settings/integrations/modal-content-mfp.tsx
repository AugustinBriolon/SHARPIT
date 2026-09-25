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
import { useMfpContentState } from '@/components/settings/integrations/mfp-content-hooks';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

function MfpConnectForm({
  connecting,
  connectError,
}: {
  connecting: boolean;
  connectError: string | null;
}) {
  return (
    <>
      <p className="text-muted-foreground text-sm leading-relaxed">
        Connecte MyFitnessPal pour importer ton journal alimentaire : calories, protéines, glucides
        et lipides.
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
    </>
  );
}

function MfpConnectedManage({
  integration,
  state,
}: IntegrationContentProps & {
  state: ReturnType<typeof useMfpContentState>;
}) {
  return (
    <IntegrationManageStage
      confirmDescription="Les données nutritionnelles importées sont conservées."
      confirmTitle="Déconnecter MyFitnessPal ?"
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
        syncing={state.syncing}
        onDisconnect={() => state.setStage('confirm')}
        onSync={state.handleSync}
      />
    </IntegrationManageStage>
  );
}

export function MfpContent({ integration, onUpdated, onSyncStart }: IntegrationContentProps) {
  const state = useMfpContentState(onUpdated, onSyncStart);

  if (!integration.connected) {
    return (
      <form className="min-w-0 space-y-4" onSubmit={state.handleConnect}>
        <IntegrationModalHeader integration={integration} />
        <MfpConnectForm connectError={state.connectError} connecting={state.connecting} />
      </form>
    );
  }

  return <MfpConnectedManage integration={integration} state={state} />;
}
