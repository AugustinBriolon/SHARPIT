import { z } from 'zod';

/** Structured output of the nutrition day reading — see docs/product/NUTRITION_DAY_ANALYSIS.md. */
export const nutritionDayReadingSchema = z.object({
  verdict: z.object({
    headline: z
      .string()
      .describe(
        'Verdict de la journée en une phrase courte (max ~90 caractères), orienté décision.',
      ),
    tone: z
      .enum(['on_track', 'watch', 'off_track'])
      .describe(
        'on_track = journée alignée, watch = un point à surveiller, off_track = écart net.',
      ),
  }),
  findings: z
    .array(
      z.object({
        job: z.enum(['fuel', 'quality', 'diet', 'weight']),
        text: z
          .string()
          .describe('Un constat en 1 à 2 phrases, avec le chiffre des faits qui le prouve.'),
      }),
    )
    .min(1)
    .max(3)
    .describe('2 à 3 constats (1 seul si la journée est trop peu renseignée).'),
  action: z.object({
    text: z.string().describe('Une action concrète et réaliste, en une phrase.'),
  }),
  flaggedEntries: z
    .array(
      z.object({
        meal: z.string().describe('Libellé du repas tel que fourni dans les faits.'),
        entry: z.string().describe("Nom de l'aliment tel que fourni dans les faits."),
        reason: z.enum(['diet_conflict', 'ultra_processed']),
      }),
    )
    .max(8),
});

export type NutritionDayReading = z.infer<typeof nutritionDayReadingSchema>;
