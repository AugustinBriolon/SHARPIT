import type {
  IntegrationDefinition,
  IntegrationsPayload,
} from '@/components/settings/integrations/types';
import { INTEGRATION_CATALOG } from '@/components/settings/integrations/types';
import { getCatalogProviderByIntegration } from '@/lib/integrations/provider-catalog';
import type { IntegrationId } from '@/lib/integrations/shared/client-sync';

type IntegrationBase = Omit<IntegrationDefinition, 'dataTypes' | 'tagline' | 'name'>;

function buildStravaIntegration(payload: IntegrationsPayload): IntegrationBase {
  const stravaName = payload.strava.account
    ? [payload.strava.account.firstName, payload.strava.account.lastName].filter(Boolean).join(' ')
    : null;
  return {
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
  };
}

function buildGarminIntegration(payload: IntegrationsPayload): IntegrationBase {
  return {
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
  };
}

function buildWithingsIntegration(payload: IntegrationsPayload): IntegrationBase {
  return {
    id: 'withings',
    configured: payload.withings.configured,
    connected: Boolean(payload.withings.account) && !payload.withings.needsReconnect,
    needsReconnect: Boolean(payload.withings.needsReconnect),
    badge: 'recommended',
    account: payload.withings.account
      ? {
          label: payload.withings.account.displayName ?? 'Compte Withings',
          lastSyncAt: payload.withings.account.lastSyncAt,
        }
      : null,
    statusMessage: payload.withings.statusMessage,
  };
}

function buildRenphoIntegration(
  payload: IntegrationsPayload,
  withingsConnected: boolean,
): IntegrationBase {
  return {
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
  };
}

function buildGoogleIntegration(payload: IntegrationsPayload): IntegrationBase {
  return {
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
  };
}

function buildMyFitnessPalIntegration(payload: IntegrationsPayload): IntegrationBase {
  return {
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
  };
}

function integrationById(
  payload: IntegrationsPayload,
  withingsConnected: boolean,
): Record<IntegrationId, IntegrationBase> {
  return {
    strava: buildStravaIntegration(payload),
    garmin: buildGarminIntegration(payload),
    withings: buildWithingsIntegration(payload),
    renpho: buildRenphoIntegration(payload, withingsConnected),
    google: buildGoogleIntegration(payload),
    myfitnesspal: buildMyFitnessPalIntegration(payload),
  };
}

function catalogTagline(
  entryId: IntegrationId,
  defaultTagline: string,
  withingsConnected: boolean,
) {
  if (entryId === 'renpho' && withingsConnected) {
    return 'Historique conservé';
  }
  return defaultTagline;
}

export function buildIntegrations(payload: IntegrationsPayload): IntegrationDefinition[] {
  const withingsConnected = Boolean(payload.withings.account);
  const byId = integrationById(payload, withingsConnected);

  return INTEGRATION_CATALOG.map((entry) => {
    const catalog = getCatalogProviderByIntegration(entry.id);
    const base = byId[entry.id];
    const allTypes = catalog ? Object.values(catalog.dataTypesByClass).flat() : [];
    return {
      ...base,
      name: entry.name,
      tagline: catalogTagline(entry.id, entry.tagline, withingsConnected),
      dataTypes: [...new Set(allTypes)],
      badge: base.badge ?? entry.badge,
    };
  });
}
