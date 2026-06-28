import { BodySide, PhysicalCategory, PhysicalStatus } from "@prisma/client";
import { z } from "zod";

const optionalString = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v === "" ? null : v));

const optionalSeverity = z.coerce.number().int().min(0).max(10).optional().nullable();

const baseSchema = z.object({
  category: z.nativeEnum(PhysicalCategory),
  status: z.nativeEnum(PhysicalStatus).optional(),
  title: z.string().min(1, "Titre requis"),
  bodyPart: optionalString,
  side: z.nativeEnum(BodySide).optional(),
  severity: optionalSeverity,
  description: optionalString,
  affectsTraining: z.coerce.boolean().optional(),
  startDate: z.coerce.date().optional(),
  resolvedAt: z.coerce.date().optional().nullable(),
});

export const createPhysicalNoteSchema = baseSchema;
export const updatePhysicalNoteSchema = baseSchema.partial();

export const createCheckinSchema = z.object({
  severity: optionalSeverity,
  comment: optionalString,
  date: z.coerce.date().optional(),
});

export type CreatePhysicalNoteInput = z.infer<typeof createPhysicalNoteSchema>;
export type UpdatePhysicalNoteInput = z.infer<typeof updatePhysicalNoteSchema>;
export type CreateCheckinInput = z.infer<typeof createCheckinSchema>;
