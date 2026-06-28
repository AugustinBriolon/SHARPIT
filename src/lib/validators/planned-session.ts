import { ActivityType, SessionIntensity } from "@prisma/client";
import { z } from "zod";

const optionalNumber = z.coerce.number().optional().nullable();
const optionalString = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v === "" ? null : v));

export const activityTypeSchema = z.nativeEnum(ActivityType);
export const sessionIntensitySchema = z.nativeEnum(SessionIntensity);

const basePlannedSessionSchema = z.object({
  type: activityTypeSchema,
  date: z.coerce.date(),
  title: optionalString,
  description: optionalString,
  durationMin: optionalNumber,
  load: optionalNumber,
  intensity: sessionIntensitySchema.optional().nullable(),
  completed: z.coerce.boolean().optional(),
  goalId: optionalString,
});

export const createPlannedSessionSchema = basePlannedSessionSchema;
export const updatePlannedSessionSchema = basePlannedSessionSchema.partial();

export type CreatePlannedSessionInput = z.infer<
  typeof createPlannedSessionSchema
>;
export type UpdatePlannedSessionInput = z.infer<
  typeof updatePlannedSessionSchema
>;
