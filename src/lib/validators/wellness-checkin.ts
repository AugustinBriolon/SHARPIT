import { z } from 'zod';

export const wellnessCheckinSchema = z.object({
  mood: z.number().int().min(1).max(5),
  energyLevel: z.number().int().min(1).max(5),
  perceivedSoreness: z.number().int().min(0).max(10),
});

export type WellnessCheckinPayload = z.infer<typeof wellnessCheckinSchema>;
