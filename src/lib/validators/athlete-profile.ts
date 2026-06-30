import { z } from 'zod';

const optionalInt = z.coerce.number().int().positive().optional().nullable();
const optionalPace = z.coerce.number().positive().optional().nullable();

export const athleteProfileSchema = z.object({
  ftpW: optionalInt,
  maxHr: optionalInt,
  lthr: optionalInt,
  runThresholdPaceSecPerKm: optionalPace,
});

export type AthleteProfileInput = z.infer<typeof athleteProfileSchema>;
