import type { GarminExerciseRef } from '@/lib/integrations/garmin-exercise-map';
import { canonicalizeGarminExerciseRef } from '@/lib/integrations/garmin-exercise-map';
import type { StrengthRestMode } from '@/lib/planned-session/strength-prescription';

const SPORT_STRENGTH = {
  sportTypeId: 5,
  sportTypeKey: 'strength_training',
  displayOrder: 5,
} as const;

const STEP_INTERVAL = { stepTypeId: 3, stepTypeKey: 'interval', displayOrder: 3 };
const STEP_REST = { stepTypeId: 5, stepTypeKey: 'rest', displayOrder: 5 };
const STEP_REPEAT = { stepTypeId: 6, stepTypeKey: 'repeat', displayOrder: 6 };

const REPS_CONDITION = {
  conditionTypeId: 10,
  conditionTypeKey: 'reps',
  displayOrder: 10,
  displayable: true,
};

const TIME_CONDITION = {
  conditionTypeId: 2,
  conditionTypeKey: 'time',
  displayOrder: 2,
  displayable: true,
};

/** Open-ended rest — ends when athlete presses Lap on the watch. */
const LAP_BUTTON_CONDITION = {
  conditionTypeId: 1,
  conditionTypeKey: 'lap.button',
  displayOrder: 1,
  displayable: true,
};

const ITERATIONS_CONDITION = {
  conditionTypeId: 7,
  conditionTypeKey: 'iterations',
  displayOrder: 7,
  displayable: false,
};

const NO_TARGET = {
  workoutTargetTypeId: 1,
  workoutTargetTypeKey: 'no.target',
  displayOrder: 1,
};

const DEFAULT_STROKE = { strokeTypeId: 0, strokeTypeKey: null, displayOrder: 0 };
const DEFAULT_EQUIPMENT = { equipmentTypeId: 0, equipmentTypeKey: null, displayOrder: 0 };

const POUND_UNIT = {
  unitId: 9,
  unitKey: 'pound',
  factor: 453.59237,
};

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
  garmin?: GarminExerciseRef | null;
};

export type BuildStrengthWorkoutInput = {
  workoutName: string;
  description?: string | null;
  sets: StrengthWorkoutSetInput[];
};

export type BuildStrengthWorkoutResult = {
  payload: Record<string, unknown>;
  mappedCount: number;
  skipped: Array<{ exercise: string; reason: string }>;
};

type StepBag = Record<string, unknown>;

class StepOrder {
  private order = 0;
  private childId = 0;

  nextOrder(): number {
    this.order += 1;
    return this.order;
  }

  nextChildId(): number {
    this.childId += 1;
    return this.childId;
  }
}

function kgToLbs(kg: number): number {
  return Math.round(kg * 2.2046226218 * 10) / 10;
}

function baseExecutable(
  stepOrder: number,
  stepType: typeof STEP_INTERVAL | typeof STEP_REST,
  childStepId: number | null,
): StepBag {
  return {
    type: 'ExecutableStepDTO',
    stepOrder,
    stepType,
    childStepId,
    description: null,
    targetType: NO_TARGET,
    targetValueOne: null,
    targetValueTwo: null,
    targetValueUnit: null,
    zoneNumber: null,
    secondaryTargetType: null,
    secondaryTargetValueOne: null,
    secondaryTargetValueTwo: null,
    secondaryTargetValueUnit: null,
    secondaryZoneNumber: null,
    endConditionZone: null,
    preferredEndConditionUnit: null,
    endConditionCompare: null,
    strokeType: DEFAULT_STROKE,
    equipmentType: DEFAULT_EQUIPMENT,
    category: null,
    exerciseName: null,
    weightValue: null,
    weightUnit: null,
  };
}

function buildExerciseStep(
  order: StepOrder,
  childStepId: number | null,
  set: StrengthWorkoutSetInput,
  garmin: GarminExerciseRef,
): StepBag {
  const step = baseExecutable(order.nextOrder(), STEP_INTERVAL, childStepId);
  step.category = garmin.category;
  step.exerciseName = garmin.exerciseName;
  const exerciseLabel = set.exercise?.trim() || '';
  const notes = set.notes?.trim();
  step.description = notes ? `${exerciseLabel} — ${notes}` : exerciseLabel;

  const useDuration = set.reps == null || set.reps <= 0;

  if (useDuration) {
    step.endCondition = TIME_CONDITION;
    step.endConditionValue = set.durationSec != null && set.durationSec > 0 ? set.durationSec : 30;
  } else {
    step.endCondition = REPS_CONDITION;
    step.endConditionValue = Math.max(1, set.reps || 1);
  }

  if (set.weightKg != null && set.weightKg > 0) {
    step.weightValue = kgToLbs(set.weightKg);
    step.weightUnit = POUND_UNIT;
  }

  return step;
}

function resolveRestMode(set: StrengthWorkoutSetInput): StrengthRestMode {
  if (set.restMode === 'time' && set.restSec != null && set.restSec > 0) return 'time';
  return 'lap';
}

/** Rest after every set — Lap by default (not timed). */
function buildRestStep(
  order: StepOrder,
  childStepId: number | null,
  set: StrengthWorkoutSetInput,
): StepBag {
  const step = baseExecutable(order.nextOrder(), STEP_REST, childStepId);
  const mode = resolveRestMode(set);
  if (mode === 'time' && set.restSec != null && set.restSec > 0) {
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
 * Unmapped / invalid-category exercises are skipped (Connect rejects UNKNOWN / stale parents
 * like DIP — bodyweight dips must use SUSPENSION). Original label stays available via skip reason.
 *
 * Rest is mandatory after every set (including the last) so transitions between
 * exercises also get a Lap/timed rest. Default rest ends on Lap button press.
 */
export function buildStrengthWorkoutPayload(
  input: BuildStrengthWorkoutInput,
): BuildStrengthWorkoutResult {
  const order = new StepOrder();
  const workoutSteps: StepBag[] = [];
  const skipped: BuildStrengthWorkoutResult['skipped'] = [];
  let mappedCount = 0;

  for (const set of input.sets) {
    const garmin = canonicalizeGarminExerciseRef(set.garmin);
    if (!garmin) {
      skipped.push({
        exercise: set.exercise,
        reason: 'hors catalogue montre (catégorie Garmin invalide ou inconnue)',
      });
      continue;
    }

    const iterations = Math.max(1, set.sets || 1);
    const childId = order.nextChildId();
    const groupOrder = order.nextOrder();
    const children: StepBag[] = [
      buildExerciseStep(order, childId, set, garmin),
      buildRestStep(order, childId, set),
    ];
    workoutSteps.push({
      type: 'RepeatGroupDTO',
      stepOrder: groupOrder,
      stepType: STEP_REPEAT,
      childStepId: childId,
      numberOfIterations: iterations,
      workoutSteps: children,
      endCondition: ITERATIONS_CONDITION,
      endConditionValue: iterations,
      smartRepeat: false,
      // Keep rest after the last set too (inter-exercise transition + end buffer).
      skipLastRestStep: false,
    });
    mappedCount += 1;
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

  return { payload, mappedCount, skipped };
}
