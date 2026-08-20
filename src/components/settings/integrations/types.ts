import type { IntegrationId } from '@/lib/integrations/shared/client-sync';

export const INTEGRATION_CATALOG: Array<{
  id: IntegrationId;
  name: string;
  tagline: string;
  badge?: 'recommended' | 'legacy';
}> = [
  { id: 'strava', name: 'Strava', tagline: 'Activités & séances' },
  { id: 'garmin', name: 'Garmin', tagline: 'Santé & wearable' },
  {
    id: 'withings',
    name: 'Withings',
    tagline: 'Balance & composition corporelle',
    badge: 'recommended',
  },
  { id: 'renpho', name: 'Renpho', tagline: 'Composition corporelle' },
  { id: 'google', name: 'Google Calendar', tagline: 'Planning & disponibilités' },
  { id: 'myfitnesspal', name: 'MyFitnessPal', tagline: 'Nutrition & macros' },
];

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

  return [
    {
      id: 'strava',
      name: 'Strava',
      tagline: 'Activités & séances',
      dataTypes: ['Course', 'Vélo', 'Natation', 'Records'],
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
    {
      id: 'garmin',
      name: 'Garmin',
      tagline: 'Santé & wearable',
      dataTypes: ['Sommeil', 'HRV', 'FC repos', 'Stress'],
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
    {
      id: 'withings',
      name: 'Withings',
      tagline: 'Balance & composition corporelle',
      dataTypes: ['Poids', 'Masse grasse', 'Muscle', 'Os'],
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
    {
      id: 'renpho',
      name: 'Renpho',
      tagline: withingsConnected ? 'Historique conservé' : 'Composition corporelle',
      dataTypes: ['Poids', 'Masse grasse', 'Muscle'],
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
    {
      id: 'google',
      name: 'Google Calendar',
      tagline: 'Planning & disponibilités',
      dataTypes: ['Agenda', 'Créneaux', 'Séances planifiées'],
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
    {
      id: 'myfitnesspal',
      name: 'MyFitnessPal',
      tagline: 'Nutrition & macros',
      dataTypes: ['Calories', 'Protéines', 'Glucides', 'Lipides'],
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
  ];
}

export function integrationConnectCta(integration: IntegrationDefinition): string {
  const verb = integration.needsReconnect ? 'Reconnecter' : 'Connecter';
  return `${verb} ${integration.name}`;
}

export function integrationConnectBody(integration: IntegrationDefinition, idle: string): string {
  if (!integration.needsReconnect) return idle;
  return `La connexion ${integration.name} a expiré. Reconnecte-la pour reprendre la synchro.`;
}
