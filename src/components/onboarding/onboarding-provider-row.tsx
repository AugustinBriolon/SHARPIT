import type { CatalogProvider, DataClassId } from '@/lib/integrations/provider-catalog';
import type { IntegrationId } from '@/lib/integrations/shared/client-sync';
import type { IntegrationSourcePrefs } from '@/lib/integrations/source-prefs';
import { ClassSourceControls } from '@/components/integrations/class-source-controls';
import { IntegrationLogo } from '@/components/settings/integrations/logos';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function ProviderConnectAction({
  soon,
  isConnected,
  integrationId,
  onConnect,
}: {
  soon: boolean;
  isConnected: boolean;
  integrationId: IntegrationId | null;
  onConnect: () => void;
}) {
  if (soon) {
    return <span className="text-muted-foreground shrink-0 text-xs">Bientôt</span>;
  }
  if (!isConnected && integrationId) {
    return (
      <Button className="shrink-0" size="sm" type="button" variant="secondary" onClick={onConnect}>
        Connecter
      </Button>
    );
  }
  return null;
}

function ProviderIdentity({
  integrationId,
  providerName,
  dataClassId,
  provider,
}: {
  integrationId: IntegrationId | null;
  providerName: string;
  dataClassId: DataClassId;
  provider: CatalogProvider;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      {integrationId ? (
        <IntegrationLogo className="size-9 shrink-0 rounded-lg" id={integrationId} />
      ) : (
        <span
          className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-medium"
          aria-hidden
        >
          {providerName.slice(0, 1)}
        </span>
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium">{providerName}</p>
        <p className="text-muted-foreground text-xs text-pretty">
          {provider.dataTypesByClass[dataClassId]?.join(' · ') ?? provider.tagline}
        </p>
      </div>
    </div>
  );
}

function providerRowClassName({
  soon,
  isPrimary,
}: {
  soon: boolean;
  isPrimary: boolean;
}) {
  return cn(
    'rounded-analysis w-full border px-3 py-3 text-left',
    soon && 'border-analysis-border/60 opacity-55',
    !soon && 'border-analysis-border',
    isPrimary && 'bg-muted/20',
  );
}

function providerConnectionFlags(
  integrationId: IntegrationId | null,
  connected: Set<string>,
  classPrefs: IntegrationSourcePrefs['classes'][DataClassId],
) {
  const isConnected = integrationId !== null && connected.has(integrationId);
  const isEnabled = integrationId !== null && classPrefs.enabled.includes(integrationId);
  const isPrimary = integrationId !== null && classPrefs.primary === integrationId;
  return { isConnected, isEnabled, isPrimary };
}

export function OnboardingProviderRow({
  provider,
  dataClassId,
  classPrefs,
  connected,
  onConnect,
  onSetPrimary,
  onToggleUse,
}: {
  provider: CatalogProvider;
  dataClassId: DataClassId;
  classPrefs: IntegrationSourcePrefs['classes'][DataClassId];
  connected: Set<string>;
  onConnect: () => void;
  onSetPrimary: (integrationId: IntegrationId) => void;
  onToggleUse: (integrationId: IntegrationId, enable: boolean) => void;
}) {
  const soon = provider.status === 'coming_soon';
  const integrationId = provider.integrationId ?? null;
  const { isConnected, isEnabled, isPrimary } = providerConnectionFlags(
    integrationId,
    connected,
    classPrefs,
  );

  return (
    <li>
      <div className={providerRowClassName({ soon, isPrimary })}>
        <div className="flex items-start justify-between gap-3">
          <ProviderIdentity
            dataClassId={dataClassId}
            integrationId={integrationId}
            provider={provider}
            providerName={provider.name}
          />
          <ProviderConnectAction
            integrationId={integrationId}
            isConnected={isConnected}
            soon={soon}
            onConnect={onConnect}
          />
        </div>

        {isConnected && integrationId ? (
          <ClassSourceControls
            isEnabled={isEnabled}
            isPrimary={isPrimary}
            onSetPrimary={() => onSetPrimary(integrationId)}
            onToggleEnabled={(next) => onToggleUse(integrationId, next)}
          />
        ) : null}
      </div>
    </li>
  );
}
