import type { IntegrationId } from '@/lib/integrations/shared/client-sync';

export type DataClassId = 'activities' | 'wearable_health' | 'body' | 'nutrition' | 'calendar';

export type ProviderStatus = 'available' | 'coming_soon';

export type ProviderAuthKind = 'oauth' | 'credentials' | 'none';

export type CatalogProvider = {
  /** Stable catalog id (may differ from IntegrationId for coming-soon entries). */
  id: string;
  name: string;
  /** Short blurb for account-level cards. */
  tagline: string;
  status: ProviderStatus;
  classes: DataClassId[];
  /** Linked IntegrationId when the provider can be connected today. */
  integrationId?: IntegrationId;
  authKind: ProviderAuthKind;
  oauthPath?: string;
  /** Per-class data type chips for settings modals. */
  dataTypesByClass: Partial<Record<DataClassId, string[]>>;
};

export type DataClassDefinition = {
  id: DataClassId;
  label: string;
  description: string;
};

export const DATA_CLASSES: DataClassDefinition[] = [
  {
    id: 'activities',
    label: 'Activités',
    description: 'Séances réalisées — course, vélo, natation, force…',
  },
  {
    id: 'wearable_health',
    label: 'Santé wearable',
    description: 'Sommeil, HRV, FC repos, stress, readiness',
  },
  {
    id: 'body',
    label: 'Corps',
    description: 'Poids et composition corporelle',
  },
  {
    id: 'nutrition',
    label: 'Nutrition',
    description: 'Calories et macros',
  },
  {
    id: 'calendar',
    label: 'Agenda',
    description: 'Planning et disponibilités',
  },
];

/**
 * Unified provider catalog — onboarding and settings share this source of truth.
 * Multi-class providers (Garmin) appear under every class they can cover; account
 * connection remains once.
 */
export const PROVIDER_CATALOG: CatalogProvider[] = [
  {
    id: 'garmin',
    name: 'Garmin',
    tagline: 'Montre & Connect — séances et santé',
    status: 'available',
    classes: ['activities', 'wearable_health'],
    integrationId: 'garmin',
    authKind: 'credentials',
    dataTypesByClass: {
      activities: ['Course', 'Vélo', 'Natation', 'Force'],
      wearable_health: ['Sommeil', 'HRV', 'FC repos', 'Stress'],
    },
  },
  {
    id: 'strava',
    name: 'Strava',
    tagline: 'Activités & séances',
    status: 'available',
    classes: ['activities'],
    integrationId: 'strava',
    authKind: 'oauth',
    oauthPath: '/api/strava/connect',
    dataTypesByClass: {
      activities: ['Course', 'Vélo', 'Natation', 'Records'],
    },
  },
  {
    id: 'withings',
    name: 'Withings',
    tagline: 'Balance & composition corporelle',
    status: 'available',
    classes: ['body'],
    integrationId: 'withings',
    authKind: 'oauth',
    oauthPath: '/api/withings/connect',
    dataTypesByClass: {
      body: ['Poids', 'Masse grasse', 'Muscle', 'Os'],
    },
  },
  {
    id: 'renpho',
    name: 'Renpho',
    tagline: 'Composition corporelle',
    status: 'available',
    classes: ['body'],
    integrationId: 'renpho',
    authKind: 'credentials',
    dataTypesByClass: {
      body: ['Poids', 'Masse grasse', 'Muscle'],
    },
  },
  {
    id: 'myfitnesspal',
    name: 'MyFitnessPal',
    tagline: 'Nutrition & macros',
    status: 'available',
    classes: ['nutrition'],
    integrationId: 'myfitnesspal',
    authKind: 'credentials',
    dataTypesByClass: {
      nutrition: ['Calories', 'Protéines', 'Glucides', 'Lipides'],
    },
  },
  {
    id: 'google',
    name: 'Google Calendar',
    tagline: 'Planning & disponibilités',
    status: 'available',
    classes: ['calendar'],
    integrationId: 'google',
    authKind: 'oauth',
    oauthPath: '/api/google/connect',
    dataTypesByClass: {
      calendar: ['Agenda', 'Créneaux', 'Séances planifiées'],
    },
  },
  {
    id: 'polar',
    name: 'Polar',
    tagline: 'Montre & cardio',
    status: 'coming_soon',
    classes: ['activities', 'wearable_health'],
    authKind: 'none',
    dataTypesByClass: {
      activities: ['Séances'],
      wearable_health: ['Sommeil', 'HRV'],
    },
  },
  {
    id: 'apple-watch',
    name: 'Apple Watch',
    tagline: 'Santé Apple',
    status: 'coming_soon',
    classes: ['activities', 'wearable_health'],
    authKind: 'none',
    dataTypesByClass: {
      activities: ['Séances'],
      wearable_health: ['Sommeil', 'Santé'],
    },
  },
];

export function dataClassLabel(id: DataClassId): string {
  return DATA_CLASSES.find((c) => c.id === id)?.label ?? id;
}

export function getCatalogProvider(id: string): CatalogProvider | undefined {
  return PROVIDER_CATALOG.find((p) => p.id === id);
}

export function getCatalogProviderByIntegration(
  integrationId: IntegrationId,
): CatalogProvider | undefined {
  return PROVIDER_CATALOG.find((p) => p.integrationId === integrationId);
}

export function providersForClass(classId: DataClassId): CatalogProvider[] {
  return PROVIDER_CATALOG.filter((p) => p.classes.includes(classId));
}

export function availableProvidersForClass(classId: DataClassId): CatalogProvider[] {
  return providersForClass(classId).filter((p) => p.status === 'available' && p.integrationId);
}

export function providerCoversClass(integrationId: IntegrationId, classId: DataClassId): boolean {
  const provider = getCatalogProviderByIntegration(integrationId);
  return Boolean(provider?.classes.includes(classId));
}

export function oauthConnectHref(
  oauthPath: string,
  returnTo: string,
  dataClass?: DataClassId,
): string {
  const url = new URL(oauthPath, 'http://local.invalid');
  url.searchParams.set('returnTo', returnTo);
  if (dataClass) url.searchParams.set('dataClass', dataClass);
  return `${url.pathname}${url.search}`;
}
