import { z } from 'zod';

/**
 * Which parts of SharpIt the athlete uses (Paramètres → Pages et widgets). A feature turned
 * off disappears everywhere it shows — its page, its Résumé card, its home-screen widget —
 * and nothing else changes: its data is kept and returns as it was when turned back on.
 * Stored versioned on `AthleteProfile.featurePrefs`; null or anything unreadable means every
 * feature on.
 */
export type FeaturePrefs = {
  version: 1;
  journal: boolean;
  nutrition: boolean;
  /** Corps: the body readout, the weight. */
  health: boolean;
  regularity: boolean;
};

export const DEFAULT_FEATURE_PREFS: FeaturePrefs = {
  version: 1,
  journal: true,
  nutrition: true,
  health: true,
  regularity: true,
};

/** PATCH body: any subset of the fields; the server merges and stores a full v1. */
export const featurePrefsPatchSchema = z
  .object({
    version: z.literal(1),
    journal: z.boolean(),
    nutrition: z.boolean(),
    health: z.boolean(),
    regularity: z.boolean(),
  })
  .partial()
  .strict();

export type FeaturePrefsPatch = z.infer<typeof featurePrefsPatchSchema>;

/** Stored value → full prefs; a missing field is on. */
export function resolveFeaturePrefs(stored: unknown): FeaturePrefs {
  const parsed = featurePrefsPatchSchema.safeParse(stored);
  if (!parsed.success) {
    return DEFAULT_FEATURE_PREFS;
  }
  return { ...DEFAULT_FEATURE_PREFS, ...parsed.data, version: 1 };
}

/** Applies a PATCH to what is stored; null turns every feature back on. */
export function mergeFeaturePrefs(stored: unknown, patch: FeaturePrefsPatch | null): FeaturePrefs {
  if (patch === null) {
    return DEFAULT_FEATURE_PREFS;
  }
  return { ...resolveFeaturePrefs(stored), ...patch, version: 1 };
}
