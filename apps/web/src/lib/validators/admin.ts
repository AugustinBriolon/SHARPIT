import { z } from 'zod';

export const setAthleteTierSchema = z.object({
  tier: z.enum(['FREE', 'PRO']),
});
