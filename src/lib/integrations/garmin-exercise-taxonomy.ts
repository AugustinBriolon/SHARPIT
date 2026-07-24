import taxonomyJson from '@/data/garmin-exercise-taxonomy.json';
import { exerciseTokens, normalizeExerciseKey } from '@/lib/exercises/normalize';

export type GarminTaxonomyEntry = {
  leaf: string;
  category: string;
  labelFr: string;
};

export type GarminMatchConfidence = 'exact' | 'alias' | 'fuzzy';

export type GarminExerciseMatch = {
  ref: { category: string; exerciseName: string };
  labelFr: string;
  confidence: GarminMatchConfidence;
  score: number;
};

type TaxonomyFile = {
  version: number;
  entries: GarminTaxonomyEntry[];
};

const DATA = taxonomyJson as TaxonomyFile;

type TaxonomyIndex = {
  entries: GarminTaxonomyEntry[];
  byNormLabel: Map<string, GarminTaxonomyEntry>;
  byLeaf: Map<string, GarminTaxonomyEntry>;
};

let cachedIndex: TaxonomyIndex | null = null;

function tokenScore(queryTokens: string[], candidateTokens: Set<string>): number {
  if (candidateTokens.size === 0 || queryTokens.length === 0) return 0;
  let hit = 0;
  for (const token of queryTokens) {
    if (candidateTokens.has(token)) hit += 1;
  }
  return hit / Math.max(queryTokens.length, candidateTokens.size);
}

function entryTokenSet(entry: GarminTaxonomyEntry): Set<string> {
  return new Set([...exerciseTokens(entry.labelFr), ...exerciseTokens(entry.leaf)]);
}

function getIndex(): TaxonomyIndex {
  if (cachedIndex) return cachedIndex;
  const byNormLabel = new Map<string, GarminTaxonomyEntry>();
  const byLeaf = new Map<string, GarminTaxonomyEntry>();
  for (const entry of DATA.entries) {
    byLeaf.set(entry.leaf, entry);
    const norm = normalizeExerciseKey(entry.labelFr);
    if (!norm) continue;
    const prev = byNormLabel.get(norm);
    // Prefer longer / more specific leaves on label collisions
    if (!prev || entry.leaf.length > prev.leaf.length) byNormLabel.set(norm, entry);
  }
  cachedIndex = { entries: DATA.entries, byNormLabel, byLeaf };
  return cachedIndex;
}

/** Test helper — bundled taxonomy size. */
export function garminTaxonomySize(): number {
  return DATA.entries.length;
}

export function getGarminTaxonomyEntry(leaf: string): GarminTaxonomyEntry | null {
  return getIndex().byLeaf.get(leaf) ?? null;
}

/**
 * Match free-text (FR/EN) against the full Garmin Connect exercise catalog.
 * Soft-fail: null when confidence too low.
 */
export function matchGarminTaxonomy(
  rawLabel: string,
  options?: { minFuzzyScore?: number },
): GarminExerciseMatch | null {
  const key = normalizeExerciseKey(rawLabel);
  if (!key) return null;

  const { byNormLabel, byLeaf, entries } = getIndex();

  const exact = byNormLabel.get(key);
  if (exact) {
    return {
      ref: { category: exact.category, exerciseName: exact.leaf },
      labelFr: exact.labelFr,
      confidence: 'exact',
      score: 1,
    };
  }

  // Already a Connect leaf enum
  const asEnum = key.toUpperCase().replace(/\s+/g, '_');
  if (/^[A-Z][A-Z0-9_]+$/.test(asEnum)) {
    const byLeafHit = byLeaf.get(asEnum);
    if (byLeafHit) {
      return {
        ref: { category: byLeafHit.category, exerciseName: byLeafHit.leaf },
        labelFr: byLeafHit.labelFr,
        confidence: 'exact',
        score: 1,
      };
    }
  }

  const tokens = exerciseTokens(key);
  if (tokens.length === 0) return null;

  const minFuzzy = options?.minFuzzyScore ?? 0.45;
  let best: GarminTaxonomyEntry | null = null;
  let bestScore = 0;
  for (const entry of entries) {
    const cand = entryTokenSet(entry);
    let score = tokenScore(tokens, cand);
    // Single distinctive token (e.g. "piriforme") → require containment
    if (tokens.length === 1) {
      const [token] = tokens;
      if (token.length < 4 || !cand.has(token)) continue;
      score = Math.max(score, 0.7);
    }
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  if (!best || bestScore < minFuzzy) return null;
  // Need at least 2 token hits when query is multi-token, else noise wins
  if (tokens.length >= 2) {
    const hits = tokens.filter((t) => entryTokenSet(best).has(t)).length;
    if (hits < 2 && bestScore < 0.55) return null;
  }

  return {
    ref: { category: best.category, exerciseName: best.leaf },
    labelFr: best.labelFr,
    confidence: 'fuzzy',
    score: bestScore,
  };
}

/** Suggest top-N Garmin catalog matches for picker / coach disambiguation. */
export function suggestGarminTaxonomy(
  rawLabel: string,
  limit = 5,
): Array<GarminExerciseMatch & { score: number }> {
  const key = normalizeExerciseKey(rawLabel);
  if (!key) return [];
  const tokens = exerciseTokens(key);
  if (tokens.length === 0) return [];

  const exact = matchGarminTaxonomy(rawLabel);
  if (exact?.confidence === 'exact') return [exact];

  const scored: GarminExerciseMatch[] = [];
  for (const entry of getIndex().entries) {
    const cand = entryTokenSet(entry);
    let score = tokenScore(tokens, cand);
    if (tokens.length === 1) {
      const [token] = tokens;
      if (token.length >= 4 && cand.has(token)) score = Math.max(score, 0.7);
      else if (token.length >= 4) {
        const normLabel = normalizeExerciseKey(entry.labelFr);
        if (normLabel.includes(token)) score = Math.max(score, 0.55);
        else continue;
      } else continue;
    }
    if (score < 0.35) continue;
    scored.push({
      ref: { category: entry.category, exerciseName: entry.leaf },
      labelFr: entry.labelFr,
      confidence: 'fuzzy',
      score,
    });
  }
  scored.sort((a, b) => b.score - a.score || a.labelFr.localeCompare(b.labelFr));
  return scored.slice(0, Math.max(1, limit));
}
