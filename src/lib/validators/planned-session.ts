import { ActivityType, SessionIntensity } from '@prisma/client';
import { z } from 'zod';
import { isEquipmentItemId } from '@/lib/equipment/catalog';
import { strengthPrescriptionSchema } from '@/lib/planned-session/strength-prescription';

const optionalNumber = z.coerce.number().optional().nullable();
const optionalString = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v === '' ? null : v));

export const plannedSessionExposureSchema = z.enum(['INDOOR', 'OUTDOOR', 'UNKNOWN']);
export const plannedSessionLocationTypeSchema = z.enum([
  'TRACK',
  'ROAD',
  'TRAIL',
  'POOL',
  'GYM',
  'TRAINER',
  'UNKNOWN',
]);

export const activityTypeSchema = z.nativeEnum(ActivityType);
export const sessionIntensitySchema = z.nativeEnum(SessionIntensity);

const contextualFields = {
  exposureSetting: plannedSessionExposureSchema.optional().nullable(),
  locationLabel: optionalString,
  locationLat: optionalNumber,
  locationLng: optionalNumber,
  locationType: plannedSessionLocationTypeSchema.optional().nullable(),
};

const optionalStrengthPrescription = strengthPrescriptionSchema
  .nullable()
  .optional()
  .transform((v) => {
    if (v == null) return null;
    if (v.sets.length === 0) return null;
    return v;
  });

const optionalAccessories = z
  .array(z.string())
  .max(20)
  .nullable()
  .optional()
  .transform((v) => {
    if (v == null) return null;
    const ids = v.filter(isEquipmentItemId);
    return ids.length > 0 ? ids : null;
  });

const basePlannedSessionSchema = z.object({
  type: activityTypeSchema,
  date: z.coerce.date(),
  startTime: optionalString,
  title: optionalString,
  description: optionalString,
  strengthPrescription: optionalStrengthPrescription,
  accessories: optionalAccessories,
  durationMin: optionalNumber,
  load: optionalNumber,
  intensity: sessionIntensitySchema.optional().nullable(),
  completed: z.coerce.boolean().optional(),
  goalId: optionalString,
  ...contextualFields,
});

function requireSessionDetails(data: {
  type: ActivityType;
  description?: string | null;
  strengthPrescription?: { sets: unknown[] } | null;
}) {
  if (data.type === ActivityType.STRENGTH) {
    if (!data.strengthPrescription?.sets?.length) {
      return {
        message: 'Au moins un exercice est requis pour une séance de musculation.',
        path: ['strengthPrescription'] as const,
      };
    }
    return null;
  }
  if (!(data.description ?? '').trim()) {
    return {
      message: 'Le déroulé de la séance est requis (description).',
      path: ['description'] as const,
    };
  }
  return null;
}

export const createPlannedSessionSchema = basePlannedSessionSchema
  .superRefine((data, ctx) => {
    const issue = requireSessionDetails(data);
    if (!issue) return;
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: issue.message, path: [...issue.path] });
  })
  .transform((data) => ({
    ...data,
    strengthPrescription: data.type === ActivityType.STRENGTH ? data.strengthPrescription : null,
  }));

export const updatePlannedSessionSchema = basePlannedSessionSchema
  .partial()
  .superRefine((data, ctx) => {
    // Only enforce when type/description/prescription are part of the patch.
    if (
      data.type == null &&
      data.description === undefined &&
      data.strengthPrescription === undefined
    ) {
      return;
    }
    const { type } = data;
    if (type == null) return;
    const issue = requireSessionDetails({
      type,
      description: data.description,
      strengthPrescription: data.strengthPrescription,
    });
    if (!issue) return;
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: issue.message, path: [...issue.path] });
  })
  .transform((data) => {
    if (data.type != null && data.type !== ActivityType.STRENGTH) {
      return { ...data, strengthPrescription: null };
    }
    return data;
  });

export type CreatePlannedSessionInput = z.infer<typeof createPlannedSessionSchema>;
export type UpdatePlannedSessionInput = z.infer<typeof updatePlannedSessionSchema>;

const brickLegSchema = z.object({
  type: activityTypeSchema,
  title: optionalString,
  description: optionalString,
  durationMin: optionalNumber,
  load: optionalNumber,
  intensity: sessionIntensitySchema.optional().nullable(),
});

export const createBrickSchema = z.object({
  date: z.coerce.date(),
  startTime: optionalString,
  legs: z.array(brickLegSchema).min(2, 'Un brick nécessite au moins 2 jambes'),
});

export type CreateBrickInput = z.infer<typeof createBrickSchema>;
