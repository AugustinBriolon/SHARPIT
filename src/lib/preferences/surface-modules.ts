/**
 * Athlete-facing surface modules — what the athlete wants visible in chrome
 * (navbar / hubs). Persistence is local for now; nav wiring comes later.
 */

export const SURFACE_MODULE_IDS = ['nutrition', 'strength', 'biology', 'journal'] as const;

export type SurfaceModuleId = (typeof SURFACE_MODULE_IDS)[number];

export type SurfaceModulesPrefs = {
  version: 1;
  modules: Record<SurfaceModuleId, boolean>;
};

export const DEFAULT_SURFACE_MODULES: SurfaceModulesPrefs = {
  version: 1,
  modules: {
    nutrition: true,
    strength: true,
    biology: true,
    journal: true,
  },
};

export const SURFACE_MODULES_STORAGE_KEY = 'sharpit.surfaceModules.v1';

export const SURFACE_MODULE_COPY: Record<
  SurfaceModuleId,
  { title: string; description: string; stub?: boolean }
> = {
  nutrition: {
    title: 'Nutrition',
    description: 'Repas et carburant du jour dans la navigation.',
  },
  strength: {
    title: 'Renfo',
    description: 'Force et musculation comme destination visible.',
  },
  biology: {
    title: 'Biologie',
    description: 'Composition et signaux corporels hors du seul hub Réglages.',
  },
  journal: {
    title: 'Journal',
    description: 'Café, humeur, hydratation et signaux du jour.',
  },
};

export function parseSurfaceModulesPrefs(raw: unknown): SurfaceModulesPrefs {
  if (!raw || typeof raw !== 'object') {
    return structuredClone(DEFAULT_SURFACE_MODULES);
  }
  const record = raw as { version?: unknown; modules?: unknown };
  if (record.version !== 1 || !record.modules || typeof record.modules !== 'object') {
    return structuredClone(DEFAULT_SURFACE_MODULES);
  }
  const modules = { ...DEFAULT_SURFACE_MODULES.modules };
  for (const id of SURFACE_MODULE_IDS) {
    const value = (record.modules as Record<string, unknown>)[id];
    if (typeof value === 'boolean') {
      modules[id] = value;
    }
  }
  return { version: 1, modules };
}

export function readSurfaceModulesFromStorage(
  storage: Pick<Storage, 'getItem'> | null | undefined = typeof window === 'undefined'
    ? null
    : window.localStorage,
): SurfaceModulesPrefs {
  if (!storage) {
    return structuredClone(DEFAULT_SURFACE_MODULES);
  }
  try {
    const raw = storage.getItem(SURFACE_MODULES_STORAGE_KEY);
    if (!raw) {
      return structuredClone(DEFAULT_SURFACE_MODULES);
    }
    return parseSurfaceModulesPrefs(JSON.parse(raw) as unknown);
  } catch {
    return structuredClone(DEFAULT_SURFACE_MODULES);
  }
}

export function writeSurfaceModulesToStorage(
  prefs: SurfaceModulesPrefs,
  storage: Pick<Storage, 'setItem'> | null | undefined = typeof window === 'undefined'
    ? null
    : window.localStorage,
): void {
  if (!storage) {
    return;
  }
  storage.setItem(SURFACE_MODULES_STORAGE_KEY, JSON.stringify(prefs));
}
