import catalogJson from '@/data/exercises-catalog.json';
import { EXERCISE_ALIASES } from '@/lib/exercises/aliases';
import {
  exerciseGifUrl,
  exerciseThumbUrl,
  EXERCISE_MEDIA_ATTRIBUTION,
} from '@/lib/exercises/media';
import { exerciseTokens, normalizeExerciseKey } from '@/lib/exercises/normalize';
import type { ExerciseCatalogEntry, ResolvedExerciseMedia } from '@/lib/exercises/types';

const CATALOG = catalogJson as ExerciseCatalogEntry[];

type CatalogIndex = {
  byId: Map<string, ExerciseCatalogEntry>;
  byName: Map<string, ExerciseCatalogEntry>;
};

let cachedIndex: CatalogIndex | null = null;

function getIndex(): CatalogIndex {
  if (cachedIndex) {
    return cachedIndex;
  }
  const byId = new Map<string, ExerciseCatalogEntry>();
  const byName = new Map<string, ExerciseCatalogEntry>();
  for (const entry of CATALOG) {
    byId.set(entry.id, entry);
    byName.set(normalizeExerciseKey(entry.name), entry);
  }
  cachedIndex = { byId, byName };
  return cachedIndex;
}

function toResolved(entry: ExerciseCatalogEntry): ResolvedExerciseMedia {
  return {
    catalogId: entry.id,
    name: entry.name,
    bodyPart: entry.bodyPart,
    equipment: entry.equipment,
    target: entry.target,
    thumbUrl: exerciseThumbUrl(entry.id, entry.mediaId),
    gifUrl: exerciseGifUrl(entry.id, entry.mediaId),
    attribution: EXERCISE_MEDIA_ATTRIBUTION,
  };
}

function tokenScore(queryTokens: string[], candidateName: string): number {
  const cand = new Set(exerciseTokens(candidateName));
  if (cand.size === 0 || queryTokens.length === 0) {
    return 0;
  }
  let hit = 0;
  for (const t of queryTokens) {
    if (cand.has(t)) {
      hit += 1;
    }
  }
  return hit / Math.max(queryTokens.length, cand.size);
}

function lookupCatalogEntry(
  key: string,
  byId: Map<string, ExerciseCatalogEntry>,
  byName: Map<string, ExerciseCatalogEntry>,
): ResolvedExerciseMedia | null {
  const aliasId = EXERCISE_ALIASES[key];
  if (aliasId) {
    const aliased = byId.get(aliasId);
    if (aliased) {
      return toResolved(aliased);
    }
  }

  const exact = byName.get(key);
  return exact ? toResolved(exact) : null;
}

function resolveByTokenScore(tokens: string[]): ResolvedExerciseMedia | null {
  let best: ExerciseCatalogEntry | null = null;
  let bestScore = 0;
  for (const entry of CATALOG) {
    const score = tokenScore(tokens, entry.name);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  if (!best || bestScore < 0.6) {
    return null;
  }
  return toResolved(best);
}

export function resolveExerciseMedia(rawLabel: string): ResolvedExerciseMedia | null {
  const key = normalizeExerciseKey(rawLabel);
  if (!key) {
    return null;
  }

  const { byId, byName } = getIndex();
  const direct = lookupCatalogEntry(key, byId, byName);
  if (direct) {
    return direct;
  }

  const stripped = key.replace(/^exercise type /, '');
  if (stripped !== key) {
    const strippedMatch = lookupCatalogEntry(stripped, byId, byName);
    if (strippedMatch) {
      return strippedMatch;
    }
  }

  const tokens = exerciseTokens(key);
  if (tokens.length < 2) {
    return null;
  }

  return resolveByTokenScore(tokens);
}

/** Test helper — catalog size without bundling concerns. */
export function exerciseCatalogSize(): number {
  return CATALOG.length;
}

/** Direct lookup when a catalog id was already persisted on StrengthSet. */
export function getExerciseMediaByCatalogId(
  catalogId: string | null | undefined,
): ResolvedExerciseMedia | null {
  if (!catalogId) {
    return null;
  }
  const entry = getIndex().byId.get(catalogId);
  return entry ? toResolved(entry) : null;
}

/**
 * Resolve media for a strength set: prefer persisted catalog id, else match by label.
 */
export function resolveStrengthSetMedia(input: {
  exercise: string;
  exerciseCatalogId?: string | null;
}): ResolvedExerciseMedia | null {
  return (
    getExerciseMediaByCatalogId(input.exerciseCatalogId) ?? resolveExerciseMedia(input.exercise)
  );
}
