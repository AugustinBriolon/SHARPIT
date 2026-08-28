import type {
  GarminExerciseRef,
  GarminMatchConfidence,
} from '@/lib/integrations/garmin/garmin-exercise-map';
import { canonicalizeGarminExerciseRef } from '@/lib/integrations/garmin/garmin-exercise-map';
import { isSet } from '@/lib/util/value';
import { getGarminTaxonomyEntry } from '@/lib/integrations/garmin/garmin-exercise-taxonomy';
import type { StrengthRestMode } from '@/lib/planned-session/strength/strength-prescription';
import {
  ITERATIONS_CONDITION,
  LAP_BUTTON_CONDITION,
  POUND_UNIT,
  REPS_CONDITION,
  SPORT_STRENGTH,
  STEP_INTERVAL,
  STEP_REPEAT,
  STEP_REST,
  StepOrder,
  TIME_CONDITION,
  baseExecutableStep,
  type StepBag,
} from '@/lib/integrations/garmin/garmin-workout-enums';

/** Default step length for a timed movement with no explicit duration. */
const DEFAULT_ISOMETRIC_SEC = 30;
/** Mobility / soft-tissue work is held, never counted in reps. */
const DEFAULT_MOBILITY_SEC = 45;
/** Connect parent for stretches and soft-tissue work. */
const MOBILITY_CATEGORY = 'WARM_UP';

export type StrengthWorkoutSetInput = {
  exercise: string;
  exerciseCatalogId?: string | null;
  sets: number;
  reps: number;
  durationSec?: number | null;
  weightKg?: number | null;
  restSec?: number | null;
  /** Default lap — press Lap on watch to end rest. */
  restMode?: StrengthRestMode | null;
  notes?: string | null;
  /** Pre-resolved Garmin enums (skips mapping). */
  garmin?: (GarminExerciseRef & { confidence?: GarminMatchConfidence | null }) | null;
};

export type BuildStrengthWorkoutInput = {
  workoutName: string;
  description?: string | null;
  sets: StrengthWorkoutSetInput[];
};

/** What the watch will actually display for one prescribed exercise. */
export type StrengthWorkoutMappedStep = {
  /** Athlete-facing label as prescribed in SHARPIT. */
  exercise: string;
  /** Garmin FR label shown on the watch. */
  watchLabel: string;
  category: string;
  exerciseName: string;
  /** How the label was resolved — 'fallback' means an approximate watch name. */
  confidence: GarminMatchConfidence;
};

export type BuildStrengthWorkoutResult = {
  payload: Record<string, unknown>;
  mappedCount: number;
  mapped: StrengthWorkoutMappedStep[];
  skipped: Array<{ exercise: string; reason: string }>;
};

function kgToLbs(kg: number): number {
  return Math.round(kg * 2.2046226218 * 10) / 10;
}

function usesDurationForSet(set: StrengthWorkoutSetInput, garmin: GarminExerciseRef): boolean {
  return (
    set.reps === undefined ||
    set.reps === null ||
    set.reps <= 0 ||
    (garmin.category === MOBILITY_CATEGORY && set.reps <= 1)
  );
}

function applyDurationEndCondition(
  step: StepBag,
  set: StrengthWorkoutSetInput,
  garmin: GarminExerciseRef,
): void {
  const defaultSec =
    garmin.category === MOBILITY_CATEGORY ? DEFAULT_MOBILITY_SEC : DEFAULT_ISOMETRIC_SEC;
  step.endCondition = TIME_CONDITION;
  step.endConditionValue =
    isSet(set.durationSec) && set.durationSec > 0 ? set.durationSec : defaultSec;
}

function applyExerciseEndCondition(
  step: StepBag,
  set: StrengthWorkoutSetInput,
  garmin: GarminExerciseRef,
): void {
  if (usesDurationForSet(set, garmin)) {
    applyDurationEndCondition(step, set, garmin);
    return;
  }
  step.endCondition = REPS_CONDITION;
  step.endConditionValue = Math.max(1, set.reps || 1);
}

function buildExerciseStep(
  order: StepOrder,
  childStepId: number | null,
  set: StrengthWorkoutSetInput,
  garmin: GarminExerciseRef,
): StepBag {
  const step = baseExecutableStep(order.nextOrder(), STEP_INTERVAL, childStepId);
  step.category = garmin.category;
  step.exerciseName = garmin.exerciseName;
  const exerciseLabel = set.exercise?.trim() || '';
  const notes = set.notes?.trim();
  step.description = notes ? `${exerciseLabel} — ${notes}` : exerciseLabel;

  applyExerciseEndCondition(step, set, garmin);

  if (isSet(set.weightKg) && set.weightKg > 0) {
    step.weightValue = kgToLbs(set.weightKg);
    step.weightUnit = POUND_UNIT;
  }

  return step;
}

function resolveRestMode(set: StrengthWorkoutSetInput): StrengthRestMode {
  if (set.restMode === 'time' && isSet(set.restSec) && set.restSec > 0) {
    return 'time';
  }
  return 'lap';
}

/** Rest after every set — Lap by default (not timed). */
function buildRestStep(
  order: StepOrder,
  childStepId: number | null,
  set: StrengthWorkoutSetInput,
): StepBag {
  const step = baseExecutableStep(order.nextOrder(), STEP_REST, childStepId);
  const mode = resolveRestMode(set);
  if (mode === 'time' && isSet(set.restSec) && set.restSec > 0) {
    step.endCondition = TIME_CONDITION;
    step.endConditionValue = set.restSec;
    step.description = `Repos ${set.restSec}s`;
  } else {
    step.endCondition = LAP_BUTTON_CONDITION;
    step.endConditionValue = null;
    step.description = 'Repos · Lap';
  }
  return step;
}

/**
 * Build a Garmin Connect strength workout payload from structured sets.
 * Callers resolve every exercise beforehand (family fallback included), so a skip here
 * means a truly invalid Garmin ref — Connect rejects UNKNOWN and stale parents like DIP.
 * `mapped` reports exactly what the watch will show, label by label.
 *
 * Rest is mandatory after every set (including the last) so transitions between
 * exercises also get a Lap/timed rest. Default rest ends on Lap button press.
 */
function appendStrengthSetGroup(input: {
  set: BuildStrengthWorkoutInput['sets'][number];
  order: StepOrder;
  workoutSteps: StepBag[];
  skipped: BuildStrengthWorkoutResult['skipped'];
  mapped: StrengthWorkoutMappedStep[];
}): void {
  const garmin = canonicalizeGarminExerciseRef(input.set.garmin);
  if (!garmin) {
    input.skipped.push({
      exercise: input.set.exercise,
      reason: 'hors catalogue montre (catégorie Garmin invalide ou inconnue)',
    });
    return;
  }

  const iterations = Math.max(1, input.set.sets || 1);
  const childId = input.order.nextChildId();
  const groupOrder = input.order.nextOrder();
  const children: StepBag[] = [
    buildExerciseStep(input.order, childId, input.set, garmin),
    buildRestStep(input.order, childId, input.set),
  ];
  input.workoutSteps.push({
    type: 'RepeatGroupDTO',
    stepOrder: groupOrder,
    stepType: STEP_REPEAT,
    childStepId: childId,
    numberOfIterations: iterations,
    workoutSteps: children,
    endCondition: ITERATIONS_CONDITION,
    endConditionValue: iterations,
    smartRepeat: false,
    skipLastRestStep: false,
  });
  input.mapped.push({
    exercise: input.set.exercise,
    watchLabel: getGarminTaxonomyEntry(garmin.exerciseName)?.labelFr ?? garmin.exerciseName,
    category: garmin.category,
    exerciseName: garmin.exerciseName,
    confidence: input.set.garmin?.confidence ?? 'fuzzy',
  });
}

export function buildStrengthWorkoutPayload(
  input: BuildStrengthWorkoutInput,
): BuildStrengthWorkoutResult {
  const order = new StepOrder();
  const workoutSteps: StepBag[] = [];
  const skipped: BuildStrengthWorkoutResult['skipped'] = [];
  const mapped: StrengthWorkoutMappedStep[] = [];

  for (const set of input.sets) {
    appendStrengthSetGroup({ set, order, workoutSteps, skipped, mapped });
  }

  const payload: Record<string, unknown> = {
    workoutName: input.workoutName.slice(0, 100),
    sportType: SPORT_STRENGTH,
    workoutSegments: [
      {
        segmentOrder: 1,
        sportType: SPORT_STRENGTH,
        workoutSteps,
      },
    ],
    estimatedDurationInSecs: 0,
    estimatedDistanceInMeters: 0,
  };

  if (input.description?.trim()) {
    payload.description = input.description.trim().slice(0, 1024);
  }

  return { payload, mappedCount: mapped.length, mapped, skipped };
}
