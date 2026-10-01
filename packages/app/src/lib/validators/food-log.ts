import { z } from 'zod';
import { FOOD_MEALS } from '@sharpit/app/lib/nutrition/food-log/food-log-math';

const trainingDayId = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const grams = z.coerce.number().positive().max(5000);
const per100g = z.coerce.number().min(0).max(1000);

/** A new entry: a known product (scanned, searched, own) or a quick add typed in by hand. */
export const foodLogEntryCreateSchema = z
  .object({
    trainingDayId,
    meal: z.enum(FOOD_MEALS),
    grams,
    productId: z.string().min(1).optional(),
    quick: z
      .object({
        name: z.string().trim().min(1).max(120),
        kcal: z.coerce.number().min(0).max(10000),
        protein: z.coerce.number().min(0).max(1000).default(0),
        carbs: z.coerce.number().min(0).max(1000).default(0),
        fat: z.coerce.number().min(0).max(1000).default(0),
      })
      .optional(),
  })
  .refine((value) => Boolean(value.productId) !== Boolean(value.quick), {
    message: 'Un aliment ou une saisie rapide, pas les deux.',
  });

export const foodLogEntryUpdateSchema = z
  .object({ grams: grams.optional(), meal: z.enum(FOOD_MEALS).optional() })
  .refine((value) => value.grams !== undefined || value.meal !== undefined, {
    message: 'Rien à modifier.',
  });

export const customFoodSchema = z.object({
  name: z.string().trim().min(1).max(120),
  brand: z.string().trim().max(80).nullable().optional(),
  kcalPer100g: z.coerce.number().min(0).max(1000),
  proteinPer100g: per100g,
  carbsPer100g: per100g,
  fatPer100g: per100g,
  fiberPer100g: per100g.nullable().optional(),
  sugarPer100g: per100g.nullable().optional(),
  servingGrams: grams.nullable().optional(),
});

const target = (max: number) => z.coerce.number().min(0).max(max).nullable().optional();

/** The athlete's own daily targets; null clears one. */
export const nutritionTargetsSchema = z.object({
  kcal: z.coerce.number().int().min(800).max(8000).nullable().optional(),
  proteinG: target(600),
  carbsG: target(1500),
  fatG: target(500),
});

export type FoodLogEntryCreateInput = z.infer<typeof foodLogEntryCreateSchema>;
export type FoodLogEntryUpdateInput = z.infer<typeof foodLogEntryUpdateSchema>;
export type CustomFoodInput = z.infer<typeof customFoodSchema>;
export type NutritionTargetsInput = z.infer<typeof nutritionTargetsSchema>;
