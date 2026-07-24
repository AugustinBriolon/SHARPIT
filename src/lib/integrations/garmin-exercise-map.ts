import { normalizeExerciseKey } from '@/lib/exercises/normalize';

/** Garmin Connect workout exercise identity (category + leaf name). */
export type GarminExerciseRef = {
  category: string;
  exerciseName: string;
};

/**
 * Known Garmin strength categories (parent enums).
 * Used to infer category when we only reverse-resolve a leaf name.
 */
const GARMIN_CATEGORIES = [
  'BENCH_PRESS',
  'SHOULDER_PRESS',
  'OLYMPIC_LIFT',
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
  'DIP',
] as const;

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
  'push-up': { category: 'PUSH_UP', exerciseName: 'PUSH_UP' },
  pushup: { category: 'PUSH_UP', exerciseName: 'PUSH_UP' },
  pompe: { category: 'PUSH_UP', exerciseName: 'PUSH_UP' },
  pompes: { category: 'PUSH_UP', exerciseName: 'PUSH_UP' },

  // Dip
  dip: { category: 'DIP', exerciseName: 'DIP' },
  dips: { category: 'DIP', exerciseName: 'DIP' },
  'chest dip': { category: 'DIP', exerciseName: 'CHEST_DIP' },
  'bodyweight dip': { category: 'DIP', exerciseName: 'DIP' },
  'body weight dip': { category: 'DIP', exerciseName: 'DIP' },
  'dip avec poids du corps': { category: 'DIP', exerciseName: 'DIP' },
  'dips avec poids du corps': { category: 'DIP', exerciseName: 'DIP' },

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
  'pull-up': { category: 'PULL_UP', exerciseName: 'PULL_UP' },
  pullup: { category: 'PULL_UP', exerciseName: 'PULL_UP' },
  traction: { category: 'PULL_UP', exerciseName: 'PULL_UP' },
  tractions: { category: 'PULL_UP', exerciseName: 'PULL_UP' },
  'chin up': { category: 'PULL_UP', exerciseName: 'CHIN_UP' },
  'chin-up': { category: 'PULL_UP', exerciseName: 'CHIN_UP' },

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
  'glute bridge': { category: 'HIP_RAISE', exerciseName: 'GLUTE_BRIDGE' },
  'barbell glute bridge': { category: 'HIP_RAISE', exerciseName: 'GLUTE_BRIDGE' },
  'kettlebell swing': { category: 'HIP_RAISE', exerciseName: 'KETTLEBELL_SWING' },

  // Cardio helpers
  burpee: { category: 'CARDIO', exerciseName: 'BURPEE' },
  'jump rope': { category: 'CARDIO', exerciseName: 'JUMP_ROPE' },
  'jumping jack': { category: 'CARDIO', exerciseName: 'JUMPING_JACK' },
  'mountain climber': { category: 'CARDIO', exerciseName: 'MOUNTAIN_CLIMBER' },
};

/** Catalog id → Garmin when label matching is weak but we already resolved media. */
const BY_CATALOG_ID: Readonly<Record<string, GarminExerciseRef>> = {
  '0025': { category: 'BENCH_PRESS', exerciseName: 'BARBELL_BENCH_PRESS' },
  '0289': { category: 'BENCH_PRESS', exerciseName: 'DUMBBELL_BENCH_PRESS' },
  '0662': { category: 'PUSH_UP', exerciseName: 'PUSH_UP' },
  '0251': { category: 'DIP', exerciseName: 'DIP' },
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
  '1409': { category: 'HIP_RAISE', exerciseName: 'GLUTE_BRIDGE' },
};

function inferCategoryFromLeaf(exerciseName: string): string | null {
  let best: string | null = null;
  for (const cat of GARMIN_CATEGORIES) {
    if (exerciseName === cat || exerciseName.includes(cat)) {
      if (!best || cat.length > best.length) best = cat;
    }
  }
  return best;
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
  const catalogId = input.exerciseCatalogId?.trim();
  if (catalogId && BY_CATALOG_ID[catalogId]) return BY_CATALOG_ID[catalogId];

  const key = normalizeExerciseKey(input.exercise);
  if (!key) return null;

  if (BY_LABEL[key]) return BY_LABEL[key];

  const leaf = input.frLeafByLabel?.get(key);
  if (leaf) {
    const category = inferCategoryFromLeaf(leaf);
    if (category) return { category, exerciseName: leaf };
  }

  // Already a Garmin SNAKE enum pasted as label
  const asEnum = key.toUpperCase().replace(/\s+/g, '_');
  if (/^[A-Z][A-Z0-9_]+$/.test(asEnum)) {
    const category = inferCategoryFromLeaf(asEnum);
    if (category) return { category, exerciseName: asEnum };
  }

  return null;
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
