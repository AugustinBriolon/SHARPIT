import taxonomyJson from '@/data/garmin-exercise-taxonomy.json';
import {
  ANATOMY_CONCEPTS,
  EQUIPMENT_CONCEPTS,
  parseExercisePhrase,
  phraseConcepts,
  type ExercisePhrase,
} from '@/lib/exercises/lexicon';
import { normalizeExerciseKey } from '@/lib/exercises/normalize';

export type GarminTaxonomyEntry = {
  leaf: string;
  category: string;
  labelFr: string;
};

export type GarminMatchConfidence = 'exact' | 'alias' | 'fuzzy' | 'fallback';

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

type IndexedEntry = GarminTaxonomyEntry & {
  concepts: string[];
  conceptSet: Set<string>;
};

type TaxonomyIndex = {
  entries: IndexedEntry[];
  byNormLabel: Map<string, IndexedEntry>;
  byLeaf: Map<string, IndexedEntry>;
  /** Concept → inverse document frequency, so "piriforme" outweighs "extension". */
  idf: Map<string, number>;
};

let cachedIndex: TaxonomyIndex | null = null;

/**
 * Concept-based similarity. Weights are asymmetric on purpose: an athlete label
 * ("Pont fessier avec élastique et bascule du bassin") is longer and noisier than
 * the catalog label ("Pont avec élastique"), so covering the QUERY concepts matters
 * more than covering the candidate's, and the head concept anchors the movement.
 */
const WEIGHT_QUERY_COVERAGE = 0.55;
const WEIGHT_CANDIDATE_COVERAGE = 0.2;
const WEIGHT_HEAD = 0.15;
const WEIGHT_QUALIFIER = 0.1;
/** A candidate demanding gear the query never mentions is demoted, not excluded. */
const EQUIPMENT_PENALTY = 0.05;
/** IDF clamp — keeps an unknown word from dominating or vanishing. */
const MIN_IDF = 0.5;
const MAX_IDF = 3;
/** Body targets carry the athlete's intent — weight them above verbs and tools. */
const ANATOMY_WEIGHT_FACTOR = 2;
const MAX_EQUIPMENT_PENALTY = 0.15;
const MIN_FUZZY_SCORE = 0.42;

function conceptIdf(total: number, frequency: number): number {
  const raw = Math.log((total + 1) / (frequency + 1));
  return Math.min(MAX_IDF, Math.max(MIN_IDF, raw));
}

function indexEntry(entry: GarminTaxonomyEntry): IndexedEntry {
  const concepts = phraseConcepts(entry.labelFr, entry.leaf);
  return { ...entry, concepts, conceptSet: new Set(concepts) };
}

function getIndex(): TaxonomyIndex {
  if (cachedIndex) return cachedIndex;
  const entries: IndexedEntry[] = [];
  const byNormLabel = new Map<string, IndexedEntry>();
  const byLeaf = new Map<string, IndexedEntry>();
  for (const raw of DATA.entries) {
    const entry = indexEntry(raw);
    entries.push(entry);
    byLeaf.set(entry.leaf, entry);
    const norm = normalizeExerciseKey(entry.labelFr);
    if (!norm) continue;
    const prev = byNormLabel.get(norm);
    // Prefer longer / more specific leaves on label collisions
    if (!prev || entry.leaf.length > prev.leaf.length) byNormLabel.set(norm, entry);
  }
  const documentFrequency = new Map<string, number>();
  for (const entry of entries) {
    for (const concept of entry.conceptSet) {
      documentFrequency.set(concept, (documentFrequency.get(concept) ?? 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  for (const [concept, frequency] of documentFrequency) {
    idf.set(concept, conceptIdf(entries.length, frequency));
  }

  cachedIndex = { entries, byNormLabel, byLeaf, idf };
  return cachedIndex;
}

/** Test helper — bundled taxonomy size. */
export function garminTaxonomySize(): number {
  return DATA.entries.length;
}

export function getGarminTaxonomyEntry(leaf: string): GarminTaxonomyEntry | null {
  const entry = getIndex().byLeaf.get(leaf);
  return entry ? { leaf: entry.leaf, category: entry.category, labelFr: entry.labelFr } : null;
}

type EntryScore = {
  score: number;
  hits: number;
  headMatch: boolean;
};

function scoreEntry(
  query: ExercisePhrase,
  entry: IndexedEntry,
  idf: Map<string, number>,
): EntryScore {
  if (query.concepts.length === 0 || entry.concepts.length === 0) {
    return { score: 0, hits: 0, headMatch: false };
  }

  const weightOf = (concept: string) =>
    (idf.get(concept) ?? MAX_IDF) * (ANATOMY_CONCEPTS.has(concept) ? ANATOMY_WEIGHT_FACTOR : 1);

  let hits = 0;
  let hitWeight = 0;
  let queryWeight = 0;
  for (const concept of query.concepts) {
    const weight = weightOf(concept);
    queryWeight += weight;
    if (entry.conceptSet.has(concept)) {
      hits += 1;
      hitWeight += weight;
    }
  }
  if (hits === 0) return { score: 0, hits: 0, headMatch: false };

  const headMatch = entry.conceptSet.has(query.concepts[0]);

  let qualifierHits = 0;
  for (const qualifier of query.qualifiers) {
    if (entry.conceptSet.has(qualifier)) qualifierHits += 1;
  }
  const qualifierRatio = query.qualifiers.length > 0 ? qualifierHits / query.qualifiers.length : 0;

  const queryConceptSet = new Set(query.concepts);
  let unwantedEquipment = 0;
  for (const concept of entry.concepts) {
    if (EQUIPMENT_CONCEPTS.has(concept) && !queryConceptSet.has(concept)) unwantedEquipment += 1;
  }

  const score =
    WEIGHT_QUERY_COVERAGE * (hitWeight / queryWeight) +
    WEIGHT_CANDIDATE_COVERAGE * (hits / entry.concepts.length) +
    (headMatch ? WEIGHT_HEAD : 0) +
    WEIGHT_QUALIFIER * qualifierRatio -
    Math.min(MAX_EQUIPMENT_PENALTY, unwantedEquipment * EQUIPMENT_PENALTY);

  return { score: Math.max(0, score), hits, headMatch };
}

function toMatch(
  entry: GarminTaxonomyEntry,
  confidence: GarminMatchConfidence,
  score: number,
): GarminExerciseMatch {
  return {
    ref: { category: entry.category, exerciseName: entry.leaf },
    labelFr: entry.labelFr,
    confidence,
    score,
  };
}

/** Exact hits only: normalized FR label, or an already-canonical leaf enum. */
function matchExact(rawLabel: string): GarminExerciseMatch | null {
  const key = normalizeExerciseKey(rawLabel);
  if (!key) return null;
  const { byNormLabel, byLeaf } = getIndex();

  const byLabel = byNormLabel.get(key);
  if (byLabel) return toMatch(byLabel, 'exact', 1);

  const asEnum = key.toUpperCase().replace(/\s+/g, '_');
  if (/^[A-Z][A-Z0-9_]+$/.test(asEnum)) {
    const leafHit = byLeaf.get(asEnum);
    if (leafHit) return toMatch(leafHit, 'exact', 1);
  }
  return null;
}

type RankedEntry = { entry: IndexedEntry; scored: EntryScore };

function rankEntries(rawLabel: string): { query: ExercisePhrase; ranked: RankedEntry[] } {
  const query = parseExercisePhrase(rawLabel);
  if (query.concepts.length === 0) return { query, ranked: [] };

  const { entries, idf } = getIndex();
  const ranked: RankedEntry[] = [];
  for (const entry of entries) {
    const scored = scoreEntry(query, entry, idf);
    if (scored.score <= 0) continue;
    ranked.push({ entry, scored });
  }
  ranked.sort(
    (a, b) =>
      b.scored.score - a.scored.score ||
      a.entry.concepts.length - b.entry.concepts.length ||
      a.entry.labelFr.localeCompare(b.entry.labelFr),
  );
  return { query, ranked };
}

/**
 * Match free-text (FR/EN) against the full Garmin Connect exercise catalog.
 * Soft-fail: null when no candidate clears the confidence floor — callers that
 * must always produce a watch step fall back via `garmin-exercise-fallback`.
 */
export function matchGarminTaxonomy(
  rawLabel: string,
  options?: { minFuzzyScore?: number },
): GarminExerciseMatch | null {
  const exact = matchExact(rawLabel);
  if (exact) return exact;

  const { ranked } = rankEntries(rawLabel);
  const [best] = ranked;
  if (!best) return null;

  const floor = options?.minFuzzyScore ?? MIN_FUZZY_SCORE;
  if (best.scored.score < floor) return null;
  // One incidental token hit is noise unless it is the head of the movement.
  if (!best.scored.headMatch && best.scored.hits < 2) return null;

  return toMatch(best.entry, 'fuzzy', best.scored.score);
}

/** Suggest top-N Garmin catalog matches for picker / coach disambiguation. */
export function suggestGarminTaxonomy(rawLabel: string, limit = 5): GarminExerciseMatch[] {
  const exact = matchExact(rawLabel);
  if (exact) return [exact];

  const { ranked } = rankEntries(rawLabel);
  return ranked
    .filter(({ scored }) => scored.score >= 0.3)
    .slice(0, Math.max(1, limit))
    .map(({ entry, scored }) => toMatch(entry, 'fuzzy', scored.score));
}
