import { GoalHorizon, GoalKind } from "@prisma/client";
import { z } from "zod";

const optionalNumber = z.coerce.number().optional().nullable();
const optionalString = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v === "" ? null : v));

export const goalKindSchema = z.nativeEnum(GoalKind);
export const goalHorizonSchema = z.nativeEnum(GoalHorizon);

const baseGoalSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  kind: goalKindSchema,
  horizon: goalHorizonSchema.optional().nullable(),
  metricKey: optionalString,
  startValue: optionalNumber,
  currentValue: optionalNumber,
  targetValue: optionalNumber,
  unit: optionalString,
  lowerIsBetter: z.coerce.boolean().optional(),
  targetDate: z.coerce.date().optional().nullable(),
  location: optionalString,
  achieved: z.coerce.boolean().optional(),
  notes: optionalString,
});

export const createGoalSchema = baseGoalSchema.refine(
  (data) => data.kind !== GoalKind.RACE || Boolean(data.targetDate),
  { message: "Une course doit avoir une date", path: ["targetDate"] },
);

export const updateGoalSchema = baseGoalSchema.partial();

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
