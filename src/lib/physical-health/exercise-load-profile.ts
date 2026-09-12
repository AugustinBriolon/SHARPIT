/**
 * What a prescribed exercise actually loads — the question the injury guards ask.
 *
 * The media catalog cannot answer it. Its `bodyPart` is a shelf label for a GIF
 * library, and matching a French prescription against English catalog names by
 * token overlap produced confident nonsense: "Étirement chat et vache" resolved
 * to "all fours squad stretch" (upper legs), so a spine mobility drill was read
 * as thigh loading. On real data that mis-classification did not merely add
 * noise — it inverted the guard, warning on the corrective work prescribed
 * *because* of the injury while staying silent on the Bulgarian split squat.
 *
 * So classification comes from declarations and curated data only, in order:
 *
 *   1. declared    — the coach states intent + pattern per exercise
 *   2. taxonomy    — 91 curated movements with FR labels (`movement-taxonomy`)
 *   3. watch       — Garmin Connect category, but only on an exact/alias match;
 *                    fuzzy matches name the wrong muscle often enough to lie
 *   4. unknown     — no claim, therefore no warning
 *
 * Unknown is a supported answer, deliberately. A guard that stays quiet is
 * merely incomplete; one that points at the wrong exercise teaches the athlete
 * to ignore it.
 *
 * Pure: no I/O, no React.
 */

import {
  resolveMovement,
  type MovementIntent,
  type MovementPattern,
} from '@/lib/exercises/movement-taxonomy';
import type { CatalogBodyPart } from '@/lib/physical-health/sensitive-zones';

export type LoadProfileSource = 'declared' | 'taxonomy' | 'watch' | 'unknown';

export type ExerciseLoadProfile = {
  /** Body groups put under load. Empty for mobility work and for unknowns. */
  groups: CatalogBodyPart[];
  /** True only when the movement loads those groups, as opposed to mobilising them. */
  loads: boolean;
  source: LoadProfileSource;
};

/** Anything carrying a prescribed movement, declared or legacy. */
export type ProfilableSet = {
  exercise: string;
  exerciseCatalogId?: string | null;
  intent?: MovementIntent | null;
  pattern?: MovementPattern | null;
  garmin?: { category?: string | null; confidence?: string | null } | null;
};

const NOTHING: ExerciseLoadProfile = { groups: [], loads: false, source: 'unknown' };

/** Biomechanical family → the groups it puts under load. */
const PATTERN_GROUPS: Readonly<Record<MovementPattern, readonly CatalogBodyPart[]>> = {
  SQUAT: ['upper legs'],
  SQUAT_UNILATERAL: ['upper legs'],
  HINGE: ['upper legs', 'back'],
  HINGE_UNILATERAL: ['upper legs', 'back'],
  HIP_EXTENSION: ['upper legs'],
  HIP_ABDUCTION: ['upper legs'],
  HORIZONTAL_PUSH: ['chest', 'upper arms'],
  VERTICAL_PUSH: ['shoulders', 'upper arms'],
  HORIZONTAL_PULL: ['back', 'upper arms'],
  VERTICAL_PULL: ['back', 'upper arms'],
  CALF_RAISE: ['lower legs'],
  ELBOW_FLEXION: ['upper arms'],
  ELBOW_EXTENSION: ['upper arms'],
  SHOULDER_ABDUCTION: ['shoulders'],
  CARRY: ['waist', 'back', 'lower arms'],
  CORE_ANTI_EXTENSION: ['waist'],
  CORE_ANTI_ROTATION: ['waist'],
  CORE_ANTI_LATERAL: ['waist'],
  CORE_FLEXION: ['waist'],
  CORE_ROTATION: ['waist'],
};

/** Intents that put tissue under load. Mobility and conditioning do not. */
const LOADING_INTENTS: ReadonlySet<MovementIntent> = new Set<MovementIntent>([
  'STRENGTH',
  'CORE',
  'PLYOMETRIC',
]);

/**
 * Garmin category → groups, for legacy sets carrying no declaration.
 * Deliberately partial: BANDED_EXERCISES, TOTAL_BODY and SUSPENSION each cover
 * movements on opposite sides of the body, so they resolve to nothing.
 */
const WATCH_CATEGORY_GROUPS: Readonly<Record<string, readonly CatalogBodyPart[]>> = {
  SQUAT: ['upper legs'],
  LUNGE: ['upper legs'],
  LEG_CURL: ['upper legs'],
  HIP_RAISE: ['upper legs'],
  HIP_STABILITY: ['upper legs'],
  HIP_SWING: ['upper legs'],
  DEADLIFT: ['upper legs', 'back'],
  CALF_RAISE: ['lower legs'],
  PLANK: ['waist'],
  CRUNCH: ['waist'],
  SIT_UP: ['waist'],
  LEG_RAISE: ['waist'],
  CORE: ['waist'],
  CHOP: ['waist'],
  HYPEREXTENSION: ['back'],
  PULL_UP: ['back', 'upper arms'],
  ROW: ['back', 'upper arms'],
  SHRUG: ['back'],
  BENCH_PRESS: ['chest', 'upper arms'],
  PUSH_UP: ['chest', 'upper arms'],
  FLYE: ['chest'],
  SHOULDER_PRESS: ['shoulders', 'upper arms'],
  LATERAL_RAISE: ['shoulders'],
  SHOULDER_STABILITY: ['shoulders'],
  CURL: ['upper arms'],
  TRICEPS_EXTENSION: ['upper arms'],
  CARRY: ['waist', 'back', 'lower arms'],
};

/** Garmin's bucket for stretching, foam rolling and warm-up drills. */
const WATCH_MOBILITY_CATEGORY = 'WARM_UP';

/** Only these matched the movement itself; fuzzy and fallback name a neighbour. */
const TRUSTED_WATCH_CONFIDENCE: ReadonlySet<string> = new Set(['exact', 'alias']);

function profileFrom(
  intent: MovementIntent,
  pattern: MovementPattern | null | undefined,
  source: LoadProfileSource,
): ExerciseLoadProfile {
  if (!LOADING_INTENTS.has(intent)) {
    return { groups: [], loads: false, source };
  }
  if (!pattern) {
    return { groups: [], loads: true, source };
  }
  return { groups: [...PATTERN_GROUPS[pattern]], loads: true, source };
}

function declaredProfile(set: ProfilableSet): ExerciseLoadProfile | null {
  return set.intent ? profileFrom(set.intent, set.pattern, 'declared') : null;
}

function taxonomyProfile(set: ProfilableSet): ExerciseLoadProfile | null {
  const movement = resolveMovement({
    exercise: set.exercise,
    exerciseCatalogId: set.exerciseCatalogId,
  });
  return movement ? profileFrom(movement.intent, movement.pattern, 'taxonomy') : null;
}

function watchProfile(set: ProfilableSet): ExerciseLoadProfile | null {
  const category = set.garmin?.category;
  const confidence = set.garmin?.confidence;
  if (!category || !confidence || !TRUSTED_WATCH_CONFIDENCE.has(confidence)) {
    return null;
  }
  if (category === WATCH_MOBILITY_CATEGORY) {
    return { groups: [], loads: false, source: 'watch' };
  }
  const groups = WATCH_CATEGORY_GROUPS[category];
  return groups ? { groups: [...groups], loads: true, source: 'watch' } : null;
}

/**
 * What this exercise loads. Never guesses: an unrecognised movement returns
 * `unknown`, which every caller must read as "no claim", not as "loads nothing".
 */
export function exerciseLoadProfile(set: ProfilableSet): ExerciseLoadProfile {
  return declaredProfile(set) ?? taxonomyProfile(set) ?? watchProfile(set) ?? NOTHING;
}
