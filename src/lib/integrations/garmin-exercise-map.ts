import { normalizeExerciseKey } from '@/lib/exercises/normalize';
import { resolveGarminExerciseFallback } from '@/lib/integrations/garmin-exercise-fallback';
import {
  getGarminTaxonomyEntry,
  matchGarminTaxonomy,
  type GarminExerciseMatch,
  type GarminMatchConfidence,
} from '@/lib/integrations/garmin-exercise-taxonomy';

/** Garmin Connect workout exercise identity (category + leaf name). */
export type GarminExerciseRef = {
  category: string;
  exerciseName: string;
};

export type { GarminExerciseMatch, GarminMatchConfidence };

/**
 * Fallback display-only ref — Connect createWorkout rejects category UNKNOWN.
 * Never send this in a workout payload; use canonicalize + skip instead.
 */
export const GARMIN_UNKNOWN_EXERCISE: GarminExerciseRef = {
  category: 'UNKNOWN',
  exerciseName: 'UNKNOWN',
};

/**
 * Known Garmin strength categories (parent enums).
 * Used to infer category when we only reverse-resolve a leaf name.
 * Note: bodyweight dips live under SUSPENSION (there is no DIP parent in Connect workouts).
 */
const GARMIN_CATEGORIES = [
  'BANDED_EXERCISES',
  'BENCH_PRESS',
  'SHOULDER_PRESS',
  'OLYMPIC_LIFT',
  'HIP_STABILITY',
  'HIP_RAISE',
  'LEG_RAISE',
  'PULL_UP',
  'PUSH_UP',
  'DEADLIFT',
  'SQUAT',
  'LUNGE',
  'PLANK',
  'CARRY',
  'CURL',
  'ROW',
  'CARDIO',
  'CRUNCH',
  'CALF_RAISE',
  'TRICEPS_EXTENSION',
  'LATERAL_RAISE',
  'SHRUG',
  'SUSPENSION',
  'WARM_UP',
  'MOVE',
] as const;

/**
 * Force category ownership from the FIT/Connect taxonomy.
 * Fixes stale aliases / persisted refs (e.g. DIP → must be SUSPENSION).
 */
export function canonicalizeGarminExerciseRef(
  ref: GarminExerciseRef | null | undefined,
): GarminExerciseRef | null {
  if (!ref?.exerciseName?.trim()) return null;
  const entry = getGarminTaxonomyEntry(ref.exerciseName.trim());
  if (!entry) return null;
  return { category: entry.category, exerciseName: entry.leaf };
}

/**
 * Normalized label / catalog id → Garmin enums.
 * Prefer leaf names (BARBELL_BENCH_PRESS) over bare categories — Connect blanks bare parents.
 */
const BY_LABEL: Readonly<Record<string, GarminExerciseRef>> = {
  // Bench
  'bench press': { category: 'BENCH_PRESS', exerciseName: 'BENCH_PRESS' },
  'barbell bench press': { category: 'BENCH_PRESS', exerciseName: 'BARBELL_BENCH_PRESS' },
  'developpe couche': { category: 'BENCH_PRESS', exerciseName: 'BENCH_PRESS' },
  'developpe couche barre': { category: 'BENCH_PRESS', exerciseName: 'BARBELL_BENCH_PRESS' },
  'dumbbell bench press': { category: 'BENCH_PRESS', exerciseName: 'DUMBBELL_BENCH_PRESS' },
  'developpe couche halteres': { category: 'BENCH_PRESS', exerciseName: 'DUMBBELL_BENCH_PRESS' },

  // Push-up
  'push up': { category: 'PUSH_UP', exerciseName: 'PUSH_UP' },
  pushup: { category: 'PUSH_UP', exerciseName: 'PUSH_UP' },
  pompe: { category: 'PUSH_UP', exerciseName: 'PUSH_UP' },
  pompes: { category: 'PUSH_UP', exerciseName: 'PUSH_UP' },

  // Dip — Connect workout parent is SUSPENSION (not a DIP category)
  dip: { category: 'SUSPENSION', exerciseName: 'DIP' },
  dips: { category: 'SUSPENSION', exerciseName: 'DIP' },
  'chest dip': { category: 'SUSPENSION', exerciseName: 'DIP' },
  'bodyweight dip': { category: 'SUSPENSION', exerciseName: 'DIP' },
  'body weight dip': { category: 'SUSPENSION', exerciseName: 'DIP' },
  'dip avec poids du corps': { category: 'SUSPENSION', exerciseName: 'DIP' },
  // Loaded dips stay the same movement — the vest / belt is a qualifier, not a variant
  'dip leste': { category: 'SUSPENSION', exerciseName: 'DIP' },
  'dips lestes': { category: 'SUSPENSION', exerciseName: 'DIP' },
  'dips avec poids du corps': { category: 'SUSPENSION', exerciseName: 'DIP' },
  'dip en suspension': { category: 'SUSPENSION', exerciseName: 'DIP' },

  // Squat
  squat: { category: 'SQUAT', exerciseName: 'SQUAT' },
  'barbell squat': { category: 'SQUAT', exerciseName: 'BACK_SQUAT' },
  'barbell full squat': { category: 'SQUAT', exerciseName: 'BACK_SQUAT' },
  'back squat': { category: 'SQUAT', exerciseName: 'BACK_SQUAT' },
  'front squat': { category: 'SQUAT', exerciseName: 'FRONT_SQUAT' },
  'goblet squat': { category: 'SQUAT', exerciseName: 'GOBLET_SQUAT' },
  'dumbbell goblet squat': { category: 'SQUAT', exerciseName: 'GOBLET_SQUAT' },
  'kettlebell goblet squat': { category: 'SQUAT', exerciseName: 'GOBLET_SQUAT' },
  'air squat': { category: 'SQUAT', exerciseName: 'BODY_WEIGHT_SQUAT' },
  'bodyweight squat': { category: 'SQUAT', exerciseName: 'BODY_WEIGHT_SQUAT' },
  'body weight squat': { category: 'SQUAT', exerciseName: 'BODY_WEIGHT_SQUAT' },
  'squat sans charge': { category: 'SQUAT', exerciseName: 'BODY_WEIGHT_SQUAT' },
  'bulgarian split squat': { category: 'SQUAT', exerciseName: 'BULGARIAN_SPLIT_SQUAT' },
  'squat bulgare': { category: 'SQUAT', exerciseName: 'BULGARIAN_SPLIT_SQUAT' },
  'squat bulgare avec barre': { category: 'SQUAT', exerciseName: 'BULGARIAN_SPLIT_SQUAT' },
  'squat bulgare avec barre a disques': {
    category: 'SQUAT',
    exerciseName: 'BULGARIAN_SPLIT_SQUAT',
  },
  'split squat': { category: 'SQUAT', exerciseName: 'SPLIT_SQUAT' },

  // Deadlift
  deadlift: { category: 'DEADLIFT', exerciseName: 'DEADLIFT' },
  'barbell deadlift': { category: 'DEADLIFT', exerciseName: 'DEADLIFT' },
  souleve: { category: 'DEADLIFT', exerciseName: 'DEADLIFT' },
  'souleve de terre': { category: 'DEADLIFT', exerciseName: 'DEADLIFT' },
  'romanian deadlift': { category: 'DEADLIFT', exerciseName: 'ROMANIAN_DEADLIFT' },
  'sumo deadlift': { category: 'DEADLIFT', exerciseName: 'SUMO_DEADLIFT' },

  // Pull-up
  'pull up': { category: 'PULL_UP', exerciseName: 'PULL_UP' },
  pullup: { category: 'PULL_UP', exerciseName: 'PULL_UP' },
  traction: { category: 'PULL_UP', exerciseName: 'PULL_UP' },
  tractions: { category: 'PULL_UP', exerciseName: 'PULL_UP' },
  'chin up': { category: 'PULL_UP', exerciseName: 'CHIN_UP' },

  // Curl
  curl: { category: 'CURL', exerciseName: 'CURL' },
  'dumbbell curl': { category: 'CURL', exerciseName: 'DUMBBELL_CURL' },
  'dumbbell biceps curl': { category: 'CURL', exerciseName: 'DUMBBELL_CURL' },
  'curl halteres': { category: 'CURL', exerciseName: 'DUMBBELL_CURL' },

  // Row
  'bent over row': { category: 'ROW', exerciseName: 'BENT_OVER_ROW' },
  'barbell bent over row': { category: 'ROW', exerciseName: 'BENT_OVER_ROW' },
  rowing: { category: 'ROW', exerciseName: 'BENT_OVER_ROW' },
  'dumbbell row': { category: 'ROW', exerciseName: 'DUMBBELL_ROW' },

  // Shoulder
  'overhead press': { category: 'SHOULDER_PRESS', exerciseName: 'OVERHEAD_PRESS' },
  'dumbbell shoulder press': {
    category: 'SHOULDER_PRESS',
    exerciseName: 'DUMBBELL_SHOULDER_PRESS',
  },
  'lateral raise': { category: 'LATERAL_RAISE', exerciseName: 'DUMBBELL_LATERAL_RAISE' },
  'dumbbell lateral raise': { category: 'LATERAL_RAISE', exerciseName: 'DUMBBELL_LATERAL_RAISE' },
  'elevation laterale': { category: 'LATERAL_RAISE', exerciseName: 'DUMBBELL_LATERAL_RAISE' },

  // Lunge
  lunge: { category: 'LUNGE', exerciseName: 'LUNGE' },
  fente: { category: 'LUNGE', exerciseName: 'LUNGE' },
  fentes: { category: 'LUNGE', exerciseName: 'LUNGE' },
  'walking lunge': { category: 'LUNGE', exerciseName: 'WALKING_LUNGE' },
  'reverse lunge': { category: 'LUNGE', exerciseName: 'REVERSE_LUNGE' },
  'weighted lunge': { category: 'LUNGE', exerciseName: 'WEIGHTED_LUNGE' },

  // Plank / core
  plank: { category: 'PLANK', exerciseName: 'PLANK' },
  planche: { category: 'PLANK', exerciseName: 'PLANK' },
  'la planche': { category: 'PLANK', exerciseName: 'PLANK' },
  'posture de la planche': { category: 'PLANK', exerciseName: 'PLANK' },
  'side plank': { category: 'PLANK', exerciseName: 'SIDE_PLANK' },
  crunch: { category: 'CRUNCH', exerciseName: 'CRUNCH' },
  'crunch floor': { category: 'CRUNCH', exerciseName: 'CRUNCH' },
  abdominaux: { category: 'CRUNCH', exerciseName: 'CRUNCH' },
  abdominal: { category: 'CRUNCH', exerciseName: 'CRUNCH' },
  abs: { category: 'CRUNCH', exerciseName: 'CRUNCH' },
  'sit up': { category: 'CRUNCH', exerciseName: 'SIT_UP' },
  'sit-up': { category: 'CRUNCH', exerciseName: 'SIT_UP' },

  // Hip
  'hip thrust': { category: 'HIP_RAISE', exerciseName: 'HIP_THRUST' },
  'barbell hip thrust': { category: 'HIP_RAISE', exerciseName: 'HIP_THRUST' },
  'glute bridge': {
    category: 'BANDED_EXERCISES',
    exerciseName: 'BANDED_EXERCISES_GLUTE_BRIDGE',
  },
  'barbell glute bridge': {
    category: 'BANDED_EXERCISES',
    exerciseName: 'BANDED_EXERCISES_GLUTE_BRIDGE',
  },
  'kettlebell swing': { category: 'HIP_RAISE', exerciseName: 'KETTLEBELL_SWING' },

  // Cardio helpers
  burpee: { category: 'CARDIO', exerciseName: 'BURPEE' },
  'jump rope': { category: 'CARDIO', exerciseName: 'JUMP_ROPE' },
  'jumping jack': { category: 'CARDIO', exerciseName: 'JUMPING_JACK' },
  'mountain climber': { category: 'CARDIO', exerciseName: 'MOUNTAIN_CLIMBER' },

  // Mobility / stretch — Garmin workout catalog parents these under WARM_UP
  // (activity auto-detect may report category STRETCH; Connect workouts need WARM_UP).
  'etirement 90 90': { category: 'WARM_UP', exerciseName: 'STRETCH_90_90' },
  'etirement 9090': { category: 'WARM_UP', exerciseName: 'STRETCH_90_90' },
  '90 90': { category: 'WARM_UP', exerciseName: 'STRETCH_90_90' },
  'stretch 90 90': { category: 'WARM_UP', exerciseName: 'STRETCH_90_90' },
  'etirement chat et vache': { category: 'WARM_UP', exerciseName: 'STRETCH_CAT_COW' },
  'chat et vache': { category: 'WARM_UP', exerciseName: 'STRETCH_CAT_COW' },
  'cat cow': { category: 'WARM_UP', exerciseName: 'STRETCH_CAT_COW' },
  'etirement posture de l enfant': { category: 'WARM_UP', exerciseName: 'STRETCH_CHILDS_POSE' },
  'posture de l enfant': { category: 'WARM_UP', exerciseName: 'STRETCH_CHILDS_POSE' },
  'child pose': { category: 'WARM_UP', exerciseName: 'STRETCH_CHILDS_POSE' },
  "child's pose": { category: 'WARM_UP', exerciseName: 'STRETCH_CHILDS_POSE' },
  'childs pose': { category: 'WARM_UP', exerciseName: 'STRETCH_CHILDS_POSE' },
  'etirement piriforme': { category: 'WARM_UP', exerciseName: 'STRETCH_PIRIFORMIS' },
  'piriformis stretch': { category: 'WARM_UP', exerciseName: 'STRETCH_PIRIFORMIS' },
  'seated piriformis stretch': { category: 'WARM_UP', exerciseName: 'STRETCH_PIRIFORMIS' },
  'glissement du nerf sciatique': { category: 'WARM_UP', exerciseName: 'STRETCH_PIRIFORMIS' },
  'nerf sciatique': { category: 'WARM_UP', exerciseName: 'STRETCH_PIRIFORMIS' },
  'sciatic nerve glide': { category: 'WARM_UP', exerciseName: 'STRETCH_PIRIFORMIS' },
  'nerve glide': { category: 'WARM_UP', exerciseName: 'STRETCH_PIRIFORMIS' },
  clamshell: { category: 'BANDED_EXERCISES', exerciseName: 'CLAM_SHELLS' },
  'clam shell': { category: 'BANDED_EXERCISES', exerciseName: 'CLAM_SHELLS' },
  'clam shells': { category: 'BANDED_EXERCISES', exerciseName: 'CLAM_SHELLS' },
  clamshells: { category: 'BANDED_EXERCISES', exerciseName: 'CLAM_SHELLS' },
  'clamshell avec elastique': { category: 'BANDED_EXERCISES', exerciseName: 'CLAM_SHELLS' },
  'clam shell avec elastique': { category: 'BANDED_EXERCISES', exerciseName: 'CLAM_SHELLS' },
  'massage voute plantaire': { category: 'WARM_UP', exerciseName: 'STRETCH_CALF' },
  'massage voute plantaire boule': { category: 'WARM_UP', exerciseName: 'STRETCH_CALF' },
  'relachement fessier': { category: 'WARM_UP', exerciseName: 'GLUTES_STRETCH' },
  'relachement fessier boule': { category: 'WARM_UP', exerciseName: 'GLUTES_STRETCH' },
  'massage lateral cuisse': { category: 'WARM_UP', exerciseName: 'STRETCH_LYING_IT_BAND' },
  'massage lateral cuisse boule': { category: 'WARM_UP', exerciseName: 'STRETCH_LYING_IT_BAND' },
  'etirement ischios': { category: 'WARM_UP', exerciseName: 'STRETCH_HAMSTRING' },
  'etirement ischios assiste au bandeau': {
    category: 'WARM_UP',
    exerciseName: 'STRETCH_HAMSTRING',
  },
  ischios: { category: 'WARM_UP', exerciseName: 'STRETCH_HAMSTRING' },
  'auto massage': { category: 'WARM_UP', exerciseName: 'STRETCH_CAT_COW' },
  'auto massage foam roller': { category: 'WARM_UP', exerciseName: 'STRETCH_CAT_COW' },
  'foam roller': { category: 'WARM_UP', exerciseName: 'STRETCH_CAT_COW' },
};

/** Catalog id → Garmin when label matching is weak but we already resolved media. */
const BY_CATALOG_ID: Readonly<Record<string, GarminExerciseRef>> = {
  '0025': { category: 'BENCH_PRESS', exerciseName: 'BARBELL_BENCH_PRESS' },
  '0289': { category: 'BENCH_PRESS', exerciseName: 'DUMBBELL_BENCH_PRESS' },
  '0662': { category: 'PUSH_UP', exerciseName: 'PUSH_UP' },
  '0251': { category: 'SUSPENSION', exerciseName: 'DIP' },
  '0043': { category: 'SQUAT', exerciseName: 'BACK_SQUAT' },
  '1685': { category: 'SQUAT', exerciseName: 'BODY_WEIGHT_SQUAT' },
  '0534': { category: 'SQUAT', exerciseName: 'GOBLET_SQUAT' },
  '1760': { category: 'SQUAT', exerciseName: 'GOBLET_SQUAT' },
  '0099': { category: 'SQUAT', exerciseName: 'BULGARIAN_SPLIT_SQUAT' },
  '2810': { category: 'SQUAT', exerciseName: 'SPLIT_SQUAT' },
  '0032': { category: 'DEADLIFT', exerciseName: 'DEADLIFT' },
  '0652': { category: 'PULL_UP', exerciseName: 'PULL_UP' },
  '0294': { category: 'CURL', exerciseName: 'DUMBBELL_CURL' },
  '0027': { category: 'ROW', exerciseName: 'BENT_OVER_ROW' },
  '0334': { category: 'LATERAL_RAISE', exerciseName: 'DUMBBELL_LATERAL_RAISE' },
  '0054': { category: 'LUNGE', exerciseName: 'LUNGE' },
  '0464': { category: 'PLANK', exerciseName: 'PLANK' },
  '0274': { category: 'CRUNCH', exerciseName: 'CRUNCH' },
  '0001': { category: 'CRUNCH', exerciseName: 'SIT_UP' },
  '3562': { category: 'HIP_RAISE', exerciseName: 'HIP_THRUST' },
  '1409': {
    category: 'BANDED_EXERCISES',
    exerciseName: 'BANDED_EXERCISES_GLUTE_BRIDGE',
  },
  // Mobility catalog ids (Gym visual closest matches)
  '2567': { category: 'WARM_UP', exerciseName: 'STRETCH_90_90' },
  '1512': { category: 'WARM_UP', exerciseName: 'STRETCH_CAT_COW' },
  '1710': { category: 'WARM_UP', exerciseName: 'STRETCH_CHILDS_POSE' },
  '3006': { category: 'BANDED_EXERCISES', exerciseName: 'CLAM_SHELLS' },
};

function inferCategoryFromLeaf(exerciseName: string): string | null {
  // Workout catalog: STRETCH_* leaves belong to WARM_UP (not a STRETCH parent).
  if (exerciseName.startsWith('STRETCH_')) return 'WARM_UP';
  let best: string | null = null;
  for (const cat of GARMIN_CATEGORIES) {
    if (exerciseName === cat || exerciseName.includes(cat)) {
      if (!best || cat.length > best.length) best = cat;
    }
  }
  return best;
}

function matchFromRef(
  ref: GarminExerciseRef,
  confidence: GarminMatchConfidence,
  score: number,
): GarminExerciseMatch | null {
  const canon = canonicalizeGarminExerciseRef(ref);
  if (!canon) return null;
  const entry = getGarminTaxonomyEntry(canon.exerciseName);
  return {
    ref: canon,
    labelFr: entry?.labelFr ?? canon.exerciseName,
    confidence,
    score,
  };
}

/**
 * Resolve free-text / catalog id to a Garmin Connect exercise with confidence.
 * Order: catalog id → manual aliases → live FR invert → bundled taxonomy (exact/fuzzy)
 * → movement-family fallback. Only an empty label resolves to null.
 */
export function resolveGarminExerciseMatch(input: {
  exercise: string;
  exerciseCatalogId?: string | null;
  /** Optional inverted FR map: normalized label → leaf enum (BARBELL_BENCH_PRESS). */
  frLeafByLabel?: Map<string, string>;
}): GarminExerciseMatch | null {
  const catalogId = input.exerciseCatalogId?.trim();
  if (catalogId && BY_CATALOG_ID[catalogId]) {
    return matchFromRef(BY_CATALOG_ID[catalogId], 'alias', 1);
  }

  const key = normalizeExerciseKey(input.exercise);
  if (!key) return null;

  if (BY_LABEL[key]) {
    return matchFromRef(BY_LABEL[key], 'alias', 1);
  }

  const leaf = input.frLeafByLabel?.get(key);
  if (leaf) {
    const fromTaxonomy = getGarminTaxonomyEntry(leaf);
    if (fromTaxonomy) {
      return {
        ref: { category: fromTaxonomy.category, exerciseName: fromTaxonomy.leaf },
        labelFr: fromTaxonomy.labelFr,
        confidence: 'exact',
        score: 1,
      };
    }
    const category = inferCategoryFromLeaf(leaf);
    if (category) return matchFromRef({ category, exerciseName: leaf }, 'exact', 1);
  }

  const taxonomy = matchGarminTaxonomy(input.exercise);
  if (taxonomy) {
    const canon = canonicalizeGarminExerciseRef(taxonomy.ref);
    if (canon) return { ...taxonomy, ref: canon };
  }

  // Never leave a prescribed exercise unmapped — an approximate watch step keeps
  // the session intact, and the athlete's own label rides along in the step description.
  return resolveGarminExerciseFallback(input.exercise);
}

/**
 * Resolve a free-text / FR Garmin label (+ optional catalog id) to Connect enums.
 * Soft-fail: returns null when unknown.
 */
export function resolveGarminExerciseRef(input: {
  exercise: string;
  exerciseCatalogId?: string | null;
  /** Optional inverted FR map: normalized label → leaf enum (BARBELL_BENCH_PRESS). */
  frLeafByLabel?: Map<string, string>;
}): GarminExerciseRef | null {
  return resolveGarminExerciseMatch(input)?.ref ?? null;
}

/**
 * Invert Garmin FR properties (`exercise_type_X` → label) into normalized label → X.
 */
export function invertGarminExerciseLabelsFr(labels: Map<string, string>): Map<string, string> {
  const out = new Map<string, string>();
  for (const [propKey, frLabel] of labels) {
    if (!propKey.startsWith('exercise_type_')) continue;
    const leaf = propKey.slice('exercise_type_'.length);
    if (!leaf || leaf === 'UNKNOWN') continue;
    const norm = normalizeExerciseKey(frLabel);
    if (!norm) continue;
    // Prefer longer / more specific leaves when labels collide
    const prev = out.get(norm);
    if (!prev || leaf.length > prev.length) out.set(norm, leaf);
  }
  return out;
}
