import { z } from 'zod';

/** Sports that Garmin Connect can render as a structured endurance workout. */
export const enduranceSportSchema = z.enum(['RUN', 'BIKE', 'SWIM']);
export type EnduranceSport = z.infer<typeof enduranceSportSchema>;

export const enduranceStepKindSchema = z.enum([
  'warmup',
  'interval',
  'recovery',
  'rest',
  'cooldown',
]);
export type EnduranceStepKind = z.infer<typeof enduranceStepKindSchema>;

/** Step duration bounds, shared by the schema and by derived prescriptions. */
export const STEP_MIN_SECONDS = 5;
export const STEP_MAX_SECONDS = 6 * 3600;

/** How a step ends on the watch. `lap` = open-ended, athlete presses Lap. */
export const enduranceDurationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('time'),
    seconds: z.coerce.number().int().min(STEP_MIN_SECONDS).max(STEP_MAX_SECONDS),
  }),
  z.object({
    type: z.literal('distance'),
    meters: z.coerce.number().int().min(25).max(200_000),
  }),
  z.object({ type: z.literal('lap') }),
]);
export type EnduranceDuration = z.infer<typeof enduranceDurationSchema>;

export const enduranceMetricSchema = z.enum(['none', 'pace', 'hr', 'power', 'cadence']);
export type EnduranceMetric = z.infer<typeof enduranceMetricSchema>;

/** Which athlete reference a heart-rate band is anchored on. */
export const enduranceHrRefSchema = z.enum(['auto', 'lthr', 'maxhr']);
export type EnduranceHrRef = z.infer<typeof enduranceHrRefSchema>;

/**
 * A step target.
 *
 * Relative band (`pctMin` / `pctMax`) is the default and is resolved against the
 * athlete thresholds *at push time*, so a session planned weeks ahead leaves with
 * today's numbers. Percentages are always expressed on an ascending
 * easier -> harder scale (speed for pace, watts for power, bpm for hr).
 *
 * Absolute override (`absEasy` / `absHard`) wins over the relative band when set.
 * Named by intent rather than min/max because pace inverts: for pace the unit is
 * seconds per kilometre, so `absEasy` is the *larger* number.
 */
export const enduranceTargetSchema = z.object({
  metric: enduranceMetricSchema,
  hrRef: enduranceHrRefSchema.nullable().optional(),
  pctMin: z.coerce.number().min(20).max(250).nullable().optional(),
  pctMax: z.coerce.number().min(20).max(250).nullable().optional(),
  absEasy: z.coerce.number().min(0).max(2000).nullable().optional(),
  absHard: z.coerce.number().min(0).max(2000).nullable().optional(),
});
export type EnduranceTarget = z.infer<typeof enduranceTargetSchema>;

/**
 * Stroke for a pool step. `mixed` is Connect's "whatever you like" rather than a
 * stroke in its own right; omitting the field leaves the step unspecified, which
 * is what a plain swim wants.
 */
export const swimStrokeSchema = z.enum(['free', 'back', 'breast', 'fly', 'im', 'drill', 'mixed']);
export type SwimStroke = z.infer<typeof swimStrokeSchema>;

export const enduranceStepSchema = z.object({
  kind: enduranceStepKindSchema,
  duration: enduranceDurationSchema,
  target: enduranceTargetSchema,
  /** SWIM only — ignored by Connect for land sports. */
  stroke: swimStrokeSchema.nullable().optional(),
  notes: z.string().trim().max(240).nullable().optional(),
});
export type EnduranceStep = z.infer<typeof enduranceStepSchema>;

/**
 * One top-level entry of the workout: either a single step, or a repeat group.
 * Garmin nests one level only — a repeat group holds steps, never other groups.
 */
export const enduranceBlockSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('step'), step: enduranceStepSchema }),
  z.object({
    kind: z.literal('repeat'),
    iterations: z.coerce.number().int().min(1).max(30),
    steps: z.array(enduranceStepSchema).min(1).max(6),
  }),
]);
export type EnduranceBlock = z.infer<typeof enduranceBlockSchema>;

export const endurancePrescriptionSchema = z.object({
  version: z.literal(1),
  sport: enduranceSportSchema,
  /** SWIM only — Garmin requires it to render a pool workout. */
  poolLengthM: z.coerce.number().min(10).max(100).nullable().optional(),
  blocks: z.array(enduranceBlockSchema).min(1).max(30),
});
export type EndurancePrescription = z.infer<typeof endurancePrescriptionSchema>;

export const NO_TARGET: EnduranceTarget = { metric: 'none' };

/** Soft-parse Json from DB — invalid / empty → null. */
export function parseEndurancePrescription(raw: unknown): EndurancePrescription | null {
  if ((raw === undefined || raw === null)) {
    return null;
  }
  const parsed = endurancePrescriptionSchema.safeParse(raw);
  if (!parsed.success) {
    return null;
  }
  if (parsed.data.blocks.length === 0) {
    return null;
  }
  return parsed.data;
}

/** Flatten blocks into executable steps, repeat groups expanded. */
export function enduranceStepCount(prescription: EndurancePrescription): number {
  return prescription.blocks.reduce((total, block) => {
    if (block.kind === 'step') {
      return total + 1;
    }
    return total + block.iterations * block.steps.length;
  }, 0);
}

/** Planned duration in seconds — distance and lap steps contribute nothing. */
export function endurancePlannedSeconds(prescription: EndurancePrescription): number {
  const stepSeconds = (step: EnduranceStep): number =>
    step.duration.type === 'time' ? step.duration.seconds : 0;

  return prescription.blocks.reduce((total, block) => {
    if (block.kind === 'step') {
      return total + stepSeconds(block.step);
    }
    const perIteration = block.steps.reduce((sum, step) => sum + stepSeconds(step), 0);
    return total + block.iterations * perIteration;
  }, 0);
}

/** Planned distance in metres — time and lap steps contribute nothing. */
export function endurancePlannedMeters(prescription: EndurancePrescription): number {
  const stepMeters = (step: EnduranceStep): number =>
    step.duration.type === 'distance' ? step.duration.meters : 0;

  return prescription.blocks.reduce((total, block) => {
    if (block.kind === 'step') {
      return total + stepMeters(block.step);
    }
    const perIteration = block.steps.reduce((sum, step) => sum + stepMeters(step), 0);
    return total + block.iterations * perIteration;
  }, 0);
}

/**
 * Build a one-step prescription from what a plain planned session already carries.
 *
 * Most existing sessions have a duration and an intensity but no structure. Rather
 * than refusing to send them, they go to the watch as a single timed step with the
 * intensity's target band — no intervals, but real guidance. Callers should tell
 * the athlete the session was derived rather than prescribed.
 */
export function singleStepPrescription(input: {
  sport: EnduranceSport;
  durationMin: number;
  target: EnduranceTarget;
}): EndurancePrescription {
  const seconds = Math.min(
    STEP_MAX_SECONDS,
    Math.max(STEP_MIN_SECONDS, Math.round(input.durationMin * 60)),
  );

  return {
    version: 1,
    sport: input.sport,
    blocks: [
      {
        kind: 'step',
        step: {
          kind: 'interval',
          duration: { type: 'time', seconds },
          target: input.target,
        },
      },
    ],
  };
}

/** Map the app's ActivityType onto a sport Garmin can render, or null. */
export function enduranceSportFromActivityType(type: string): EnduranceSport | null {
  if (type === 'RUN' || type === 'BIKE' || type === 'SWIM') {
    return type;
  }
  return null;
}
