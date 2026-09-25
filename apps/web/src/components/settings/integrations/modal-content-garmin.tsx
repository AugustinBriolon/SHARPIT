'use client';

import {
  IntegrationAccountSummary,
  IntegrationManageStage,
  IntegrationNotConnectedView,
  IntegrationSyncActions,
} from '@/components/settings/integrations/modal-parts';
import {
  IntegrationModalHeader,
  RecordChangesBanner,
  type IntegrationContentProps,
} from '@/components/settings/integrations/modal-content-shared';
import { useGarminContentState } from '@/components/settings/integrations/garmin-content-hooks';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

function GarminTokenImportForm({
  connecting,
  error,
  onSubmit,
}: {
  connecting: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="space-y-3" onSubmit={(e) => void onSubmit(e)}>
      <p className="text-muted-foreground text-xs leading-relaxed">
        Fallback laptop : <code className="text-foreground">python3 scripts/garmin-login.py</code>{' '}
        puis colle le JSON, ou <code className="text-foreground">yarn garmin:import-tokens</code>.
      </p>
      <div className="space-y-2">
        <Label htmlFor="garmin-token-store">Jetons DI (garmin_tokens.json)</Label>
        <Textarea
          autoComplete="off"
          className="[field-sizing:fixed] max-h-40 min-h-24 font-mono text-xs"
          id="garmin-token-store"
          name="tokenStore"
          placeholder='{"di_token":"…","di_refresh_token":"…","di_client_id":"…"}'
          rows={5}
          spellCheck={false}
          required
        />
      </div>
      {error && (
        <p aria-live="assertive" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <Button className="w-full sm:w-auto" disabled={connecting} type="submit">
        {connecting ? 'Import…' : 'Importer les jetons'}
      </Button>
    </form>
  );
}

function GarminAdvancedImportForm({
  connecting,
  error,
  showAdvancedImport,
  onToggleAdvanced,
  onSubmit,
}: {
  connecting: boolean;
  error: string | null;
  showAdvancedImport: boolean;
  onToggleAdvanced: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <>
      <button
        className="text-muted-foreground text-xs underline-offset-2 hover:underline"
        type="button"
        onClick={onToggleAdvanced}
      >
        {showAdvancedImport ? 'Masquer l’import avancé' : 'Import avancé (jetons DI / laptop)'}
      </button>
      {showAdvancedImport ? (
        <GarminTokenImportForm connecting={connecting} error={error} onSubmit={onSubmit} />
      ) : null}
    </>
  );
}

function GarminConnectedManage({
  integration,
  state,
}: IntegrationContentProps & {
  state: ReturnType<typeof useGarminContentState>;
}) {
  return (
    <IntegrationManageStage
      confirmTitle="Déconnecter Garmin ?"
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
      <RecordChangesBanner changes={state.syncRecordChanges} />
    </IntegrationManageStage>
  );
}

export function GarminContent({ integration, onUpdated, onSyncStart }: IntegrationContentProps) {
  const state = useGarminContentState(integration, onUpdated, onSyncStart);

  if (!integration.connected) {
    return (
      <div className="space-y-4">
        <IntegrationNotConnectedView
          body="Tu t’identifies sur Garmin dans Sharpit (téléphone OK). Le mot de passe reste chez Garmin — Sharpit reçoit uniquement un ticket de session."
          connectHref="/api/garmin/connect?returnTo=/settings/integrations"
          integration={integration}
        />
        <GarminAdvancedImportForm
          connecting={state.connecting}
          error={state.error}
          showAdvancedImport={state.showAdvancedImport}
          onSubmit={state.handleImportTokens}
          onToggleAdvanced={() => state.setShowAdvancedImport((v) => !v)}
        />
      </div>
    );
  }

  return <GarminConnectedManage integration={integration} state={state} />;
}
