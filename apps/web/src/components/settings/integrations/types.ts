import type { IntegrationId } from '@/lib/integrations/shared/client-sync';
import { PROVIDER_CATALOG } from '@/lib/integrations/provider-catalog';

export const INTEGRATION_CATALOG: Array<{
  id: IntegrationId;
  name: string;
  tagline: string;
  badge?: 'recommended' | 'legacy';
}> = PROVIDER_CATALOG.filter(
  (p): p is typeof p & { integrationId: IntegrationId } =>
    p.status === 'available' && p.integrationId !== null,
).map((p) => ({
  id: p.integrationId,
  name: p.name,
  tagline: p.tagline,
  badge: p.integrationId === 'withings' ? 'recommended' : undefined,
}));

export type IntegrationAccount = {
  label: string | null;
  lastSyncAt: string | null;
  extra?: Record<string, unknown>;
};

export type IntegrationDefinition = {
  id: IntegrationId;
  name: string;
  tagline: string;
  dataTypes: string[];
  configured: boolean;
  connected: boolean;
  needsReconnect?: boolean;
  account: IntegrationAccount | null;
  statusMessage?: string;
  /** Badge UI optionnel */
  badge?: 'recommended' | 'legacy';
};

export type IntegrationsPayload = {
  strava: {
    configured: boolean;
    account: {
      firstName: string | null;
      lastName: string | null;
      avatarUrl: string | null;
      lastSyncAt: string | null;
    } | null;
    needsReconnect?: boolean;
    statusMessage?: string;
  };
  garmin: {
    account: {
      displayName: string | null;
      fullName: string | null;
      lastSyncAt: string | null;
    } | null;
    needsReconnect?: boolean;
    statusMessage?: string;
  };
  withings: {
    configured: boolean;
    account: {
      displayName: string | null;
      lastSyncAt: string | null;
    } | null;
    needsReconnect?: boolean;
    statusMessage?: string;
  };
  renpho: {
    account: {
      email: string;
      displayName: string | null;
      lastSyncAt: string | null;
    } | null;
    needsReconnect?: boolean;
  };
  google: {
    configured: boolean;
    account: {
      email: string | null;
      targetCalendarId: string | null;
      targetCalendarName: string | null;
      lastSyncAt: string | null;
    } | null;
    needsReconnect?: boolean;
    statusMessage?: string;
  };
  myfitnesspal: {
    configured: boolean;
    account: {
      displayName: string | null;
      lastSyncAt: string | null;
    } | null;
    needsReconnect?: boolean;
  };
};

export { buildIntegrations } from '@/components/settings/integrations/build-integrations';

export function integrationConnectCta(integration: IntegrationDefinition): string {
  const verb = integration.needsReconnect ? 'Reconnecter' : 'Connecter';
  return `${verb} ${integration.name}`;
}

export function integrationConnectBody(integration: IntegrationDefinition, idle: string): string {
  if (!integration.needsReconnect) {
    return idle;
  }
  return `La connexion ${integration.name} a expiré. Reconnecte-la pour reprendre la synchro.`;
}
