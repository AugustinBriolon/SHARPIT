/**
 * Garmin Connect workout protocol enums, shared by every sport payload builder.
 *
 * These ids are Connect's own and are not negotiable — they mirror what the
 * @flow-js/garmin-connect workout builder emits. Keep them in one place so a
 * protocol change is a single edit rather than a hunt across sports.
 */

export type GarminSportTypeDto = {
  sportTypeId: number;
  sportTypeKey: string;
  displayOrder: number;
};

export type GarminStepTypeDto = {
  stepTypeId: number;
  stepTypeKey: string;
  displayOrder: number;
};

export type GarminConditionDto = {
  conditionTypeId: number;
  conditionTypeKey: string;
  displayOrder: number;
  displayable: boolean;
};

export const SPORT_RUNNING: GarminSportTypeDto = {
  sportTypeId: 1,
  sportTypeKey: 'running',
  displayOrder: 1,
};

export const SPORT_CYCLING: GarminSportTypeDto = {
  sportTypeId: 2,
  sportTypeKey: 'cycling',
  displayOrder: 2,
};

export const SPORT_SWIMMING: GarminSportTypeDto = {
  sportTypeId: 4,
  sportTypeKey: 'swimming',
  displayOrder: 4,
};

export const SPORT_STRENGTH: GarminSportTypeDto = {
  sportTypeId: 5,
  sportTypeKey: 'strength_training',
  displayOrder: 5,
};

export const STEP_WARMUP: GarminStepTypeDto = {
  stepTypeId: 1,
  stepTypeKey: 'warmup',
  displayOrder: 1,
};
export const STEP_COOLDOWN: GarminStepTypeDto = {
  stepTypeId: 2,
  stepTypeKey: 'cooldown',
  displayOrder: 2,
};
export const STEP_INTERVAL: GarminStepTypeDto = {
  stepTypeId: 3,
  stepTypeKey: 'interval',
  displayOrder: 3,
};
export const STEP_RECOVERY: GarminStepTypeDto = {
  stepTypeId: 4,
  stepTypeKey: 'recovery',
  displayOrder: 4,
};
export const STEP_REST: GarminStepTypeDto = {
  stepTypeId: 5,
  stepTypeKey: 'rest',
  displayOrder: 5,
};
export const STEP_REPEAT: GarminStepTypeDto = {
  stepTypeId: 6,
  stepTypeKey: 'repeat',
  displayOrder: 6,
};

/** Open-ended step — ends when the athlete presses Lap on the watch. */
export const LAP_BUTTON_CONDITION: GarminConditionDto = {
  conditionTypeId: 1,
  conditionTypeKey: 'lap.button',
  displayOrder: 1,
  displayable: true,
};
export const TIME_CONDITION: GarminConditionDto = {
  conditionTypeId: 2,
  conditionTypeKey: 'time',
  displayOrder: 2,
  displayable: true,
};
export const DISTANCE_CONDITION: GarminConditionDto = {
  conditionTypeId: 3,
  conditionTypeKey: 'distance',
  displayOrder: 3,
  displayable: true,
};
export const ITERATIONS_CONDITION: GarminConditionDto = {
  conditionTypeId: 7,
  conditionTypeKey: 'iterations',
  displayOrder: 7,
  displayable: false,
};
export const REPS_CONDITION: GarminConditionDto = {
  conditionTypeId: 10,
  conditionTypeKey: 'reps',
  displayOrder: 10,
  displayable: true,
};

export const NO_TARGET = {
  workoutTargetTypeId: 1,
  workoutTargetTypeKey: 'no.target',
  displayOrder: 1,
} as const;

export const POWER_TARGET = {
  workoutTargetTypeId: 2,
  workoutTargetTypeKey: 'power.zone',
  displayOrder: 2,
} as const;

export const CADENCE_TARGET = {
  workoutTargetTypeId: 3,
  workoutTargetTypeKey: 'cadence',
  displayOrder: 3,
} as const;

/** Connect uses the same target type for an explicit bpm range and a zone index. */
export const HR_TARGET = {
  workoutTargetTypeId: 4,
  workoutTargetTypeKey: 'heart.rate.zone',
  displayOrder: 4,
} as const;

/** Values are a speed range in metres per second, ascending. */
export const PACE_TARGET = {
  workoutTargetTypeId: 6,
  workoutTargetTypeKey: 'pace.zone',
  displayOrder: 6,
} as const;

export const DEFAULT_STROKE = { strokeTypeId: 0, strokeTypeKey: null, displayOrder: 0 } as const;
export const DEFAULT_EQUIPMENT = {
  equipmentTypeId: 0,
  equipmentTypeKey: null,
  displayOrder: 0,
} as const;

export const METER_UNIT = { unitKey: 'meter' } as const;
export const KILOMETER_UNIT = { unitKey: 'kilometer' } as const;

export const POUND_UNIT = {
  unitId: 9,
  unitKey: 'pound',
  factor: 453.59237,
} as const;

export type StepBag = Record<string, unknown>;

/** Sequential stepOrder / childStepId allocation across a whole workout. */
export class StepOrder {
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

/**
 * An executable step with every field Connect expects present and nulled.
 * Connect rejects payloads with missing keys, so callers overwrite rather than add.
 */
export function baseExecutableStep(
  stepOrder: number,
  stepType: GarminStepTypeDto,
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
