import { z } from 'zod';

export const mfpConnectSchema = z.object({
  sessionToken: z.string().min(1).max(8000),
  dataClass: z.string().optional().nullable(),
});
