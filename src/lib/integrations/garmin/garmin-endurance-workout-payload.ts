import {
  DISTANCE_CONDITION,
  KILOMETER_UNIT,
  LAP_BUTTON_CONDITION,
  METER_UNIT,
  PACE_TARGET,
  POWER_TARGET,
  CADENCE_TARGET,
  HR_TARGET,
  SPORT_CYCLING,
  SPORT_RUNNING,
  SPORT_SWIMMING,
  SWIM_STROKE_BY_KEY,
  STEP_COOLDOWN,
  STEP_INTERVAL,
  STEP_RECOVERY,
  STEP_REPEAT,
  STEP_REST,
  STEP_WARMUP,
  StepOrder,
  ITERATIONS_CONDITION,
  TIME_CONDITION,
  baseExecutableStep,
  type GarminSportTypeDto,
  type GarminStepTypeDto,
  type StepBag,
} from '@/lib/integrations/garmin/garmin-workout-enums';
import {
  KIND_LABEL_FR,
  METER_DISPLAY_CEILING_M,
  STROKE_LABEL_FR,
  formatDurationLabel,
  formatTargetLabel,
} from '@/lib/planned-session/endurance/endurance-preview';
import {
  endurancePlannedMeters,
  endurancePlannedSeconds,
  enduranceStepCount,
  type EnduranceDuration,
  type EndurancePrescription,
  type EnduranceSport,
  type EnduranceStep,
  type EnduranceStepKind,
} from '@/lib/planned-session/endurance/endurance-prescription';
import {
  resolveEnduranceTarget,
  type AthleteThresholds,
  type ResolvedTarget,
} from '@/lib/planned-session/endurance/endurance-targets';

const SPORT_BY_KEY: Record<EnduranceSport, GarminSportTypeDto> = {
  RUN: SPORT_RUNNING,
  BIKE: SPORT_CYCLING,
  SWIM: SPORT_SWIMMING,
};

const STEP_TYPE_BY_KIND: Record<EnduranceStepKind, GarminStepTypeDto> = {
  warmup: STEP_WARMUP,
  interval: STEP_INTERVAL,
  recovery: STEP_RECOVERY,
  rest: STEP_REST,
  cooldown: STEP_COOLDOWN,
};

/** What the watch will actually display for one prescribed step. */
export type EnduranceWorkoutMappedStep = {
  kind: EnduranceStepKind;
  /** Duration as the athlete will read it, e.g. "8 min" or "400 m". */
  durationLabel: string;
  /** Resolved target band, or null when the step is free. */
  targetLabel: string | null;
  /** Stroke shown on the watch, or null when unspecified / not a swim. */
  strokeLabel: string | null;
};

export type BuildEnduranceWorkoutInput = {
  workoutName: string;
  description?: string | null;
  prescription: EndurancePrescription;
  /** Current athlete references — resolution happens here, at push time. */
  thresholds: AthleteThresholds;
};

export type BuildEnduranceWorkoutResult = {
  payload: Record<string, unknown>;
  stepCount: number;
  mapped: EnduranceWorkoutMappedStep[];
  /** Targets that could not be resolved, athlete-facing. */
  warnings: string[];
};

function applyDuration(step: StepBag, duration: EnduranceDuration): void {
  if (duration.type === 'time') {
    step.endCondition = TIME_CONDITION;
    step.endConditionValue = duration.seconds;
    return;
  }
  if (duration.type === 'distance') {
    step.endCondition = DISTANCE_CONDITION;
    step.endConditionValue = duration.meters;
    step.preferredEndConditionUnit =
      duration.meters < METER_DISPLAY_CEILING_M ? METER_UNIT : KILOMETER_UNIT;
    return;
  }
  step.endCondition = LAP_BUTTON_CONDITION;
  step.endConditionValue = null;
}

/** Connect carries every band in targetValueOne/Two, ascending. */
function applyTarget(step: StepBag, resolved: ResolvedTarget): void {
  switch (resolved.metric) {
    case 'pace':
      step.targetType = PACE_TARGET;
      step.targetValueOne = resolved.speedMsMin;
      step.targetValueTwo = resolved.speedMsMax;
      return;
    case 'hr':
      step.targetType = HR_TARGET;
      step.targetValueOne = resolved.bpmMin;
      step.targetValueTwo = resolved.bpmMax;
      return;
    case 'power':
      step.targetType = POWER_TARGET;
      step.targetValueOne = resolved.wattsMin;
      step.targetValueTwo = resolved.wattsMax;
      return;
    case 'cadence':
      step.targetType = CADENCE_TARGET;
      step.targetValueOne = resolved.min;
      step.targetValueTwo = resolved.max;
      return;
    default:
      return;
  }
}

/** Everything a step needs beyond itself: how to resolve targets, where to report. */
type BuildContext = {
  sport: EnduranceSport;
  thresholds: AthleteThresholds;
  mapped: EnduranceWorkoutMappedStep[];
  warnings: Set<string>;
};

function buildStep(
  order: StepOrder,
  childStepId: number | null,
  step: EnduranceStep,
  context: BuildContext,
): StepBag {
  const bag = baseExecutableStep(order.nextOrder(), STEP_TYPE_BY_KIND[step.kind], childStepId);
  applyDuration(bag, step.duration);

  const { resolved, warnings } = resolveEnduranceTarget(
    step.target,
    context.thresholds,
    context.sport,
  );
  warnings.forEach((warning) => context.warnings.add(warning));

  // Connect only reads a stroke on a pool workout; on land it must stay unset.
  const stroke = context.sport === 'SWIM' ? (step.stroke ?? null) : null;
  if (stroke) bag.strokeType = SWIM_STROKE_BY_KEY[stroke];
  applyTarget(bag, resolved);

  const targetLabel = formatTargetLabel(resolved);
  const notes = step.notes?.trim();
  const parts = [
    KIND_LABEL_FR[step.kind],
    stroke ? STROKE_LABEL_FR[stroke] : null,
    targetLabel,
    notes,
  ].filter(Boolean);
  bag.description = parts.join(' · ').slice(0, 512);

  context.mapped.push({
    kind: step.kind,
    durationLabel: formatDurationLabel(step.duration),
    targetLabel,
    strokeLabel: stroke ? STROKE_LABEL_FR[stroke] : null,
  });
  return bag;
}

/**
 * Build a Garmin Connect endurance workout payload from a structured prescription.
 *
 * Relative targets are resolved here against the thresholds passed in, so the
 * numbers that reach the watch are always the athlete's current ones. A step whose
 * target cannot be resolved is still sent, without guidance, and the reason is
 * reported in `warnings` rather than silently dropped.
 */
export function buildEnduranceWorkoutPayload(
  input: BuildEnduranceWorkoutInput,
): BuildEnduranceWorkoutResult {
  const { prescription, thresholds } = input;
  const sportType = SPORT_BY_KEY[prescription.sport];
  const order = new StepOrder();
  const context: BuildContext = {
    sport: prescription.sport,
    thresholds,
    mapped: [],
    warnings: new Set<string>(),
  };
  const workoutSteps: StepBag[] = [];

  for (const block of prescription.blocks) {
    if (block.kind === 'step') {
      workoutSteps.push(buildStep(order, null, block.step, context));
      continue;
    }

    const childId = order.nextChildId();
    const groupOrder = order.nextOrder();
    const children = block.steps.map((step) => buildStep(order, childId, step, context));
    workoutSteps.push({
      type: 'RepeatGroupDTO',
      stepOrder: groupOrder,
      stepType: STEP_REPEAT,
      childStepId: childId,
      numberOfIterations: block.iterations,
      workoutSteps: children,
      endCondition: ITERATIONS_CONDITION,
      endConditionValue: block.iterations,
      smartRepeat: false,
      skipLastRestStep: false,
    });
  }

  const payload: Record<string, unknown> = {
    workoutName: input.workoutName.slice(0, 100),
    sportType,
    workoutSegments: [{ segmentOrder: 1, sportType, workoutSteps }],
    estimatedDurationInSecs: endurancePlannedSeconds(prescription),
    estimatedDistanceInMeters: endurancePlannedMeters(prescription),
  };

  if (prescription.sport === 'SWIM' && prescription.poolLengthM != null) {
    payload.poolLength = prescription.poolLengthM;
    payload.poolLengthUnit = METER_UNIT;
  }

  if (input.description?.trim()) {
    payload.description = input.description.trim().slice(0, 1024);
  }

  return {
    payload,
    stepCount: enduranceStepCount(prescription),
    mapped: context.mapped,
    warnings: [...context.warnings],
  };
}
