import { z } from 'zod';

export const garminImportTokensSchema = z.object({
  tokenStore: z.union([z.string().min(20).max(200_000), z.record(z.string(), z.unknown())]),
  dataClass: z.string().optional().nullable(),
});
