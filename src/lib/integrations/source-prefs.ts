import type { IntegrationId } from '@/lib/integrations/shared/client-sync';
import {
  DATA_CLASSES,
  type DataClassId,
  providerCoversClass,
  PROVIDER_CATALOG,
} from '@/lib/integrations/provider-catalog';

export type ClassSourcePrefs = {
  primary: IntegrationId | null;
  enabled: IntegrationId[];
};

export type IntegrationSourcePrefs = {
  version: 1;
  classes: Record<DataClassId, ClassSourcePrefs>;
};

function emptyClassPrefs(): ClassSourcePrefs {
  return { primary: null, enabled: [] };
}

export function emptySourcePrefs(): IntegrationSourcePrefs {
  const classes = Object.fromEntries(
    DATA_CLASSES.map((classDef) => [classDef.id, emptyClassPrefs()]),
  ) as Record<DataClassId, ClassSourcePrefs>;
  return { version: 1, classes };
}

/** Legacy defaults when prefs were never set: connected providers feed every class they cover. */
export function legacyDefaultsFromConnected(
  connected: readonly IntegrationId[],
): IntegrationSourcePrefs {
  const prefs = emptySourcePrefs();

  for (const classDef of DATA_CLASSES) {
    const enabled = connected.filter((id) => providerCoversClass(id, classDef.id));
    prefs.classes[classDef.id] = {
      enabled,
      primary: pickDefaultPrimary(classDef.id, enabled),
    };
  }
  return prefs;
}

function pickDefaultPrimary(classId: DataClassId, enabled: IntegrationId[]): IntegrationId | null {
  if (enabled.length === 0) {
    return null;
  }
  if (classId === 'activities') {
    if (enabled.includes('garmin')) {
      return 'garmin';
    }
    if (enabled.includes('strava')) {
      return 'strava';
    }
  }
  if (classId === 'wearable_health') {
    if (enabled.includes('garmin')) {
      return 'garmin';
    }
  }
  if (classId === 'body') {
    if (enabled.includes('withings')) {
      return 'withings';
    }
    if (enabled.includes('renpho')) {
      return 'renpho';
    }
  }
  if (classId === 'nutrition' && enabled.includes('myfitnesspal')) {
    return 'myfitnesspal';
  }
  if (classId === 'calendar' && enabled.includes('google')) {
    return 'google';
  }
  return enabled[0] ?? null;
}

export function parseSourcePrefs(raw: unknown): IntegrationSourcePrefs | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  if (obj.version !== 1 || !obj.classes || typeof obj.classes !== 'object') {
    return null;
  }

  const classes = obj.classes as Record<string, unknown>;
  const result = emptySourcePrefs();

  for (const classDef of DATA_CLASSES) {
    const entry = classes[classDef.id];
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const e = entry as Record<string, unknown>;
    const enabled = Array.isArray(e.enabled)
      ? (e.enabled.filter((id): id is IntegrationId => typeof id === 'string') as IntegrationId[])
      : [];
    const primary =
      typeof e.primary === 'string' && enabled.includes(e.primary as IntegrationId)
        ? (e.primary as IntegrationId)
        : (enabled[0] ?? null);
    result.classes[classDef.id] = { primary, enabled: [...new Set(enabled)] };
  }
  return result;
}

/**
 * Resolve prefs for product reads. Null / invalid JSON → legacy defaults from
 * currently connected accounts (preserve pre-prefs behaviour).
 */
export function resolveSourcePrefs(
  raw: unknown,
  connected: readonly IntegrationId[],
): IntegrationSourcePrefs {
  const parsed = parseSourcePrefs(raw);
  if (!parsed) {
    return legacyDefaultsFromConnected(connected);
  }
  return sanitizePrefs(parsed, connected);
}

/** Drop disconnected providers; keep primary ∈ enabled. */
export function sanitizePrefs(
  prefs: IntegrationSourcePrefs,
  connected: readonly IntegrationId[],
): IntegrationSourcePrefs {
  const connectedSet = new Set(connected);
  const next = emptySourcePrefs();

  for (const classDef of DATA_CLASSES) {
    const current = prefs.classes[classDef.id] ?? emptyClassPrefs();
    const enabled = current.enabled.filter(
      (id) => connectedSet.has(id) && providerCoversClass(id, classDef.id),
    );
    let { primary } = current;
    if (primary && !enabled.includes(primary)) {
      primary = enabled[0] ?? null;
    }
    if (!primary && enabled.length > 0) {
      primary = enabled[0] ?? null;
    }
    next.classes[classDef.id] = { primary, enabled };
  }
  return next;
}

export function isProviderEnabledForClass(
  prefs: IntegrationSourcePrefs,
  classId: DataClassId,
  provider: IntegrationId,
): boolean {
  return prefs.classes[classId]?.enabled.includes(provider) ?? false;
}

export function primaryForClass(
  prefs: IntegrationSourcePrefs,
  classId: DataClassId,
): IntegrationId | null {
  return prefs.classes[classId]?.primary ?? null;
}

/**
 * After connecting from a specific class: enable that class only (not other
 * classes the provider covers). Sets primary if this is the sole enabled source.
 */
export function enableProviderForClass(
  prefs: IntegrationSourcePrefs,
  classId: DataClassId,
  provider: IntegrationId,
): IntegrationSourcePrefs {
  if (!providerCoversClass(provider, classId)) {
    return prefs;
  }
  const next = clonePrefs(prefs);
  const slot = next.classes[classId];
  if (!slot.enabled.includes(provider)) {
    slot.enabled = [...slot.enabled, provider];
  }
  if (slot.enabled.length === 1 || slot.primary === null) {
    slot.primary = provider;
  }
  return next;
}

/**
 * After connecting from an account-level surface (settings modal) with no
 * data-class context: enable every class the provider can cover.
 */
export function enableProviderForAllCoveredClasses(
  prefs: IntegrationSourcePrefs,
  provider: IntegrationId,
): IntegrationSourcePrefs {
  let next = prefs;
  for (const classDef of DATA_CLASSES) {
    if (providerCoversClass(provider, classDef.id)) {
      next = enableProviderForClass(next, classDef.id, provider);
    }
  }
  return next;
}

export function disableProviderForClass(
  prefs: IntegrationSourcePrefs,
  classId: DataClassId,
  provider: IntegrationId,
): IntegrationSourcePrefs {
  const next = clonePrefs(prefs);
  const slot = next.classes[classId];
  slot.enabled = slot.enabled.filter((id) => id !== provider);
  if (slot.primary === provider) {
    slot.primary = slot.enabled[0] ?? null;
  }
  return next;
}

export function setPrimaryForClass(
  prefs: IntegrationSourcePrefs,
  classId: DataClassId,
  provider: IntegrationId,
): IntegrationSourcePrefs {
  if (!providerCoversClass(provider, classId)) {
    return prefs;
  }
  const next = clonePrefs(prefs);
  const slot = next.classes[classId];
  if (!slot.enabled.includes(provider)) {
    slot.enabled = [...slot.enabled, provider];
  }
  slot.primary = provider;
  return next;
}

/** Remove a disconnected account from every class. */
export function removeProviderEverywhere(
  prefs: IntegrationSourcePrefs,
  provider: IntegrationId,
): IntegrationSourcePrefs {
  let next = prefs;
  for (const classDef of DATA_CLASSES) {
    next = disableProviderForClass(next, classDef.id, provider);
  }
  return next;
}

function clonePrefs(prefs: IntegrationSourcePrefs): IntegrationSourcePrefs {
  const classes = Object.fromEntries(
    DATA_CLASSES.map((classDef) => [
      classDef.id,
      { ...prefs.classes[classDef.id], enabled: [...prefs.classes[classDef.id].enabled] },
    ]),
  ) as Record<DataClassId, ClassSourcePrefs>;
  return { version: 1, classes };
}

export function catalogIntegrationIds(): IntegrationId[] {
  return PROVIDER_CATALOG.filter((p) => p.integrationId).map((p) => p.integrationId!);
}
