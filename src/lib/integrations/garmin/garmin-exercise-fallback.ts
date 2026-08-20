/**
 * Last-resort mapping to a valid Garmin Connect exercise.
 *
 * A prescribed exercise that reaches the watch under an approximate name is far
 * better than one silently dropped from the workout: the athlete still sees the
 * step, its sets/reps and its real SHARPIT label (carried in the step
 * description). Only genuinely empty labels resolve to nothing here.
 */
import { parseExercisePhrase } from '@/lib/exercises/lexicon';
import {
  getGarminTaxonomyEntry,
  type GarminExerciseMatch,
} from '@/lib/integrations/garmin/garmin-exercise-taxonomy';

/** Confidence reported for every fallback resolution. */
const FALLBACK_SCORE = 0.25;

type FallbackRule = {
  /** Matches when any of these concepts is present. */
  any: string[];
  /** …and all of these are present too. */
  requires?: string[];
  leaf: string;
};

/** Ordered — the most specific families first. */
const RULES: readonly FallbackRule[] = [
  { any: ['sciatic'], leaf: 'STRETCH_PIRIFORMIS' },
  { any: ['piriformis'], leaf: 'STRETCH_PIRIFORMIS' },

  // Mobility / soft-tissue work, routed by body target
  { any: ['hamstring'], requires: ['stretch'], leaf: 'STRETCH_HAMSTRING' },
  { any: ['hamstring'], requires: ['massage'], leaf: 'STRETCH_HAMSTRING' },
  { any: ['itband', 'thigh'], requires: ['stretch'], leaf: 'STRETCH_LYING_IT_BAND' },
  { any: ['itband', 'thigh'], requires: ['massage'], leaf: 'STRETCH_LYING_IT_BAND' },
  { any: ['foot'], requires: ['stretch'], leaf: 'STRETCH_CALF' },
  { any: ['foot'], requires: ['massage'], leaf: 'STRETCH_CALF' },
  { any: ['calf'], requires: ['stretch'], leaf: 'STRETCH_CALF' },
  { any: ['calf'], requires: ['massage'], leaf: 'STRETCH_CALF' },
  { any: ['quad', 'psoas'], requires: ['stretch'], leaf: 'STRETCH_HIP_FLEXOR_AND_QUAD' },
  { any: ['quad', 'psoas'], requires: ['massage'], leaf: 'STRETCH_HIP_FLEXOR_AND_QUAD' },
  { any: ['glute'], requires: ['stretch'], leaf: 'GLUTES_STRETCH' },
  { any: ['glute'], requires: ['massage'], leaf: 'GLUTES_STRETCH' },
  { any: ['hip'], requires: ['stretch'], leaf: 'STRETCH_HIP_FLEXOR_AND_QUAD' },
  { any: ['shoulder'], requires: ['stretch'], leaf: 'STRETCH_SHOULDER' },
  { any: ['back'], requires: ['stretch'], leaf: 'CAT_CAMEL' },
  { any: ['core'], requires: ['stretch'], leaf: 'STRETCH_ABS' },
  { any: ['adductor'], requires: ['stretch'], leaf: 'STRETCH_BUTTERFLY' },
  { any: ['ankle'], requires: ['stretch'], leaf: 'ANKLE_CIRCLES' },
  { any: ['ankle'], requires: ['mobility'], leaf: 'ANKLE_CIRCLES' },
  { any: ['stretch', 'massage', 'mobility'], leaf: 'CAT_CAMEL' },

  // Strength families
  { any: ['plank', 'hollow'], leaf: 'PLANK_PLANK' },
  { any: ['crunch'], leaf: 'CRUNCH' },
  { any: ['clamshell', 'abductor'], leaf: 'CLAM_SHELLS' },
  { any: ['bridge'], leaf: 'HIP_RAISE' },
  { any: ['deadlift'], leaf: 'DEADLIFT' },
  { any: ['squat'], leaf: 'SQUAT_SQUAT' },
  { any: ['lunge'], leaf: 'LUNGE' },
  { any: ['pushup'], leaf: 'PUSH_UP' },
  { any: ['pullup'], leaf: 'PULL_UP' },
  { any: ['row'], leaf: 'ROW' },
  { any: ['curl'], requires: ['hamstring'], leaf: 'HAMSTRING_CURLS' },
  { any: ['curl'], leaf: 'DUMBBELL_BICEPS_CURL' },
  { any: ['calf'], leaf: 'CALF_RAISES' },
  { any: ['raise'], requires: ['leg'], leaf: 'LYING_STRAIGHT_LEG_RAISE' },
  { any: ['press'], leaf: 'SHOULDER_PRESS' },
  { any: ['shoulder'], leaf: 'SHOULDER_PRESS' },
  { any: ['glute', 'hip'], leaf: 'HIP_RAISE' },
  { any: ['core'], leaf: 'PLANK_PLANK' },
  { any: ['band'], leaf: 'BANDED_EXERCISES_SQUAT' },
];

/** Unclassifiable label — a harmless mobility step rather than a missing one. */
const DEFAULT_LEAF = 'CAT_CAMEL';

function toMatch(leaf: string): GarminExerciseMatch | null {
  const entry = getGarminTaxonomyEntry(leaf);
  if (!entry) return null;
  return {
    ref: { category: entry.category, exerciseName: entry.leaf },
    labelFr: entry.labelFr,
    confidence: 'fallback',
    score: FALLBACK_SCORE,
  };
}

/**
 * Map any non-empty exercise label to a valid Connect exercise by movement family.
 * Returns null only when the label carries no usable text.
 */
export function resolveGarminExerciseFallback(rawLabel: string): GarminExerciseMatch | null {
  const { concepts, qualifiers } = parseExercisePhrase(rawLabel);
  const present = new Set([...concepts, ...qualifiers]);
  if (present.size === 0) return null;

  for (const rule of RULES) {
    if (!rule.any.some((concept) => present.has(concept))) continue;
    if (rule.requires && !rule.requires.every((concept) => present.has(concept))) continue;
    const match = toMatch(rule.leaf);
    if (match) return match;
  }

  return toMatch(DEFAULT_LEAF);
}
