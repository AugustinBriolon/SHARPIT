import type { IntegrationId } from '@/lib/integrations/shared/client-sync';
import {
  getCatalogProviderByIntegration,
  PROVIDER_CATALOG,
} from '@/lib/integrations/provider-catalog';

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

export function buildIntegrations(payload: IntegrationsPayload): IntegrationDefinition[] {
  const stravaName = payload.strava.account
    ? [payload.strava.account.firstName, payload.strava.account.lastName].filter(Boolean).join(' ')
    : null;

  const withingsConnected = Boolean(payload.withings.account);

  const byId: Record<
    IntegrationId,
    Omit<IntegrationDefinition, 'dataTypes' | 'tagline' | 'name'>
  > = {
    strava: {
      id: 'strava',
      configured: payload.strava.configured,
      connected: Boolean(payload.strava.account) && !payload.strava.needsReconnect,
      needsReconnect: Boolean(payload.strava.needsReconnect),
      account: payload.strava.account
        ? {
            label: stravaName || 'Compte Strava',
            lastSyncAt: payload.strava.account.lastSyncAt,
            extra: { avatarUrl: payload.strava.account.avatarUrl },
          }
        : null,
      statusMessage: payload.strava.statusMessage,
    },
    garmin: {
      id: 'garmin',
      configured: true,
      connected: Boolean(payload.garmin.account) && !payload.garmin.needsReconnect,
      needsReconnect: Boolean(payload.garmin.needsReconnect),
      account: payload.garmin.account
        ? {
            label:
              payload.garmin.account.fullName ??
              payload.garmin.account.displayName ??
              'Compte Garmin',
            lastSyncAt: payload.garmin.account.lastSyncAt,
          }
        : null,
    },
    withings: {
      id: 'withings',
      configured: payload.withings.configured,
      connected: withingsConnected && !payload.withings.needsReconnect,
      needsReconnect: Boolean(payload.withings.needsReconnect),
      badge: 'recommended',
      account: payload.withings.account
        ? {
            label: payload.withings.account.displayName ?? 'Compte Withings',
            lastSyncAt: payload.withings.account.lastSyncAt,
          }
        : null,
      statusMessage: payload.withings.statusMessage,
    },
    renpho: {
      id: 'renpho',
      configured: true,
      connected: Boolean(payload.renpho.account) && !payload.renpho.needsReconnect,
      needsReconnect: Boolean(payload.renpho.needsReconnect),
      badge: withingsConnected ? 'legacy' : undefined,
      account: payload.renpho.account
        ? {
            label: payload.renpho.account.displayName ?? payload.renpho.account.email,
            lastSyncAt: payload.renpho.account.lastSyncAt,
          }
        : null,
    },
    google: {
      id: 'google',
      configured: payload.google.configured,
      connected: Boolean(payload.google.account) && !payload.google.needsReconnect,
      needsReconnect: Boolean(payload.google.needsReconnect),
      account: payload.google.account
        ? {
            label: payload.google.account.email ?? 'Compte Google',
            lastSyncAt: payload.google.account.lastSyncAt,
            extra: {
              targetCalendarId: payload.google.account.targetCalendarId,
              targetCalendarName: payload.google.account.targetCalendarName,
            },
          }
        : null,
      statusMessage: payload.google.statusMessage,
    },
    myfitnesspal: {
      id: 'myfitnesspal',
      configured: payload.myfitnesspal.configured,
      connected: Boolean(payload.myfitnesspal.account) && !payload.myfitnesspal.needsReconnect,
      needsReconnect: Boolean(payload.myfitnesspal.needsReconnect),
      account: payload.myfitnesspal.account
        ? {
            label: payload.myfitnesspal.account.displayName ?? 'Compte MyFitnessPal',
            lastSyncAt: payload.myfitnesspal.account.lastSyncAt,
          }
        : null,
    },
  };

  return INTEGRATION_CATALOG.map((entry) => {
    const catalog = getCatalogProviderByIntegration(entry.id);
    const base = byId[entry.id];
    const allTypes = catalog ? Object.values(catalog.dataTypesByClass).flat() : [];
    return {
      ...base,
      name: entry.name,
      // Renpho's static catalog tagline loses the point once Withings is also
      // connected — the athlete needs to know why a second body source is
      // still listed.
      tagline: entry.id === 'renpho' && withingsConnected ? 'Historique conservé' : entry.tagline,
      dataTypes: [...new Set(allTypes)],
      badge: base.badge ?? entry.badge,
    };
  });
}

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
