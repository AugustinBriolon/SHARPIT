import { z } from 'zod';
import { ACTIVITY_FEELING_SCALE } from '@sharpit/app/lib/activity/feeling/activity-feeling-scale';

const feelingValues = ACTIVITY_FEELING_SCALE.map((option) => option.value) as [string, ...string[]];

/**
 * The athlete's verdict on a whole brick (ADR-059). Every field is optional and
 * nullable: the client saves as the athlete fills it in, and null clears a field.
 */
export const brickEvaluationSchema = z.object({
  brickGroupId: z.string().min(1),
  rpe: z.coerce.number().int().min(1).max(10).optional().nullable(),
  transitionRating: z.coerce.number().int().min(1).max(5).optional().nullable(),
  feeling: z.enum(feelingValues).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type BrickEvaluationInput = z.infer<typeof brickEvaluationSchema>;
export type BrickEvaluationFields = Omit<BrickEvaluationInput, 'brickGroupId'>;
