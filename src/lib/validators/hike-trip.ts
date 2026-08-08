import { z } from 'zod';

export const createHikeTripSchema = z
  .object({
    name: z.string().trim().min(1, 'Nom requis'),
    activityIds: z.array(z.string().min(1)).min(2, 'Au moins deux randonnées'),
  })
  .refine((v) => new Set(v.activityIds).size >= 2, {
    message: 'Au moins deux randonnées distinctes',
    path: ['activityIds'],
  });

export const patchHikeTripSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    addActivityIds: z.array(z.string().min(1)).optional(),
    removeActivityIds: z.array(z.string().min(1)).optional(),
  })
  .refine(
    (v) =>
      v.name != null ||
      (v.addActivityIds?.length ?? 0) > 0 ||
      (v.removeActivityIds?.length ?? 0) > 0,
    { message: 'Aucune modification' },
  );

export type CreateHikeTripInput = z.infer<typeof createHikeTripSchema>;
export type PatchHikeTripInput = z.infer<typeof patchHikeTripSchema>;
