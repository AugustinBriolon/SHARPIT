import type { IntegrationId } from '@/lib/integrations/client-sync';

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
    statusMessage?: string;
  };
  garmin: {
    account: {
      displayName: string | null;
      fullName: string | null;
      lastSyncAt: string | null;
    } | null;
  };
  withings: {
    configured: boolean;
    account: {
      displayName: string | null;
      lastSyncAt: string | null;
    } | null;
    statusMessage?: string;
  };
  renpho: {
    account: {
      email: string;
      displayName: string | null;
      lastSyncAt: string | null;
    } | null;
  };
  google: {
    configured: boolean;
    account: {
      email: string | null;
      targetCalendarId: string | null;
      targetCalendarName: string | null;
      lastSyncAt: string | null;
    } | null;
    statusMessage?: string;
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
      connected: Boolean(payload.strava.account),
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
      connected: Boolean(payload.garmin.account),
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
      connected: withingsConnected,
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
      connected: Boolean(payload.renpho.account),
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
      connected: Boolean(payload.google.account),
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
  ];
}
