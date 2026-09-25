import { z } from 'zod';

export const renphoConnectSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(200),
  dataClass: z.string().optional().nullable(),
});
