import { z } from 'zod';

export const wellnessCheckinSchema = z.object({
  mood: z.number().int().min(1).max(5),
  energyLevel: z.number().int().min(1).max(5),
  perceivedSoreness: z.number().int().min(0).max(10),
  stressLevel: z.number().int().min(1).max(5),
  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null)),
});

export type WellnessCheckinPayload = z.infer<typeof wellnessCheckinSchema>;
