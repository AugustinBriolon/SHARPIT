import type { ZodType } from 'zod';
import type { AddFoodLogEntryVars, UpdateFoodLogEntryVars } from '@/hooks/use-data';
import type {
  FoodLogEntryPayload,
  FoodProductPayload,
  NutritionTargetsPayload,
} from '@sharpit/app/lib/nutrition/food-log/food-log-day';
import {
  portionNutrients,
  type FoodMealKey,
  type PortionNutrients,
} from '@sharpit/app/lib/nutrition/food-log/food-log-math';
import {
  customFoodSchema,
  foodLogEntryCreateSchema,
  foodLogEntryUpdateSchema,
  nutritionTargetsSchema,
  type CustomFoodInput,
  type NutritionTargetsInput,
} from '@sharpit/app/lib/validators/food-log';

/**
 * The food log forms, read and checked against the shared schemas (ADR-061). Fields arrive as
 * typed text: a comma counts as a decimal point, a blank optional field stays unset.
 */

export type FormResult<T> = { ok: true; value: T } | { ok: false; message: string };

/** null for a blank field, NaN for text that is not a number — the schema then rejects it. */
export function parseDecimal(raw: FormDataEntryValue | null | undefined): number | null {
  const trimmed = typeof raw === 'string' ? raw.trim().replace(',', '.') : '';
  if (!trimmed) {
    return null;
  }
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : Number.NaN;
}

/**
 * A blank field left unset: a required one then fails rather than coercing to zero, an optional
 * one takes its schema default.
 */
function decimalOrUnset(raw: FormDataEntryValue | null | undefined): number | undefined {
  return parseDecimal(raw) ?? undefined;
}

function text(raw: FormDataEntryValue | null | undefined): string {
  return typeof raw === 'string' ? raw.trim() : '';
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Nom',
  brand: 'Marque',
  grams: 'Quantité',
  kcal: 'Calories',
  protein: 'Protéines',
  carbs: 'Glucides',
  fat: 'Lipides',
  kcalPer100g: 'Calories',
  proteinPer100g: 'Protéines',
  carbsPer100g: 'Glucides',
  fatPer100g: 'Lipides',
  servingGrams: 'Portion',
  proteinG: 'Protéines',
  carbsG: 'Glucides',
  fatG: 'Lipides',
};

function validated<T>(schema: ZodType<T>, raw: unknown): FormResult<T> {
  const parsed = schema.safeParse(raw);
  if (parsed.success) {
    return { ok: true, value: parsed.data };
  }
  const field = String(parsed.error.issues[0]?.path.at(-1) ?? '');
  const label = FIELD_LABELS[field];
  return { ok: false, message: label ? `Vérifie le champ « ${label} ».` : 'Saisie invalide.' };
}

/** The nutrients of the typed weight, live as it is typed; null until it reads as a weight. */
export function portionPreview(
  product: FoodProductPayload,
  gramsRaw: string,
): PortionNutrients | null {
  const grams = parseDecimal(gramsRaw);
  return grams !== null && grams > 0 && grams <= 5000 ? portionNutrients(product, grams) : null;
}

/** A picked product at the typed weight, with the nutrients the row shows until the server answers. */
export function buildPortionEntry(
  product: FoodProductPayload,
  gramsRaw: string,
  context: { meal: FoodMealKey; trainingDayId: string },
): FormResult<AddFoodLogEntryVars> {
  const result = validated(foodLogEntryCreateSchema, {
    ...context,
    grams: decimalOrUnset(gramsRaw),
    productId: product.id,
  });
  if (!result.ok) {
    return result;
  }
  const preview = { name: product.name, brand: product.brand ?? null };
  return {
    ok: true,
    value: {
      input: result.value,
      preview: { ...preview, ...portionNutrients(product, result.value.grams) },
    },
  };
}

/** A quick add typed in by hand: a name and its calories, macros optional. */
export function buildQuickEntry(
  form: FormData,
  context: { meal: FoodMealKey; trainingDayId: string },
): FormResult<AddFoodLogEntryVars> {
  const result = validated(foodLogEntryCreateSchema, {
    ...context,
    grams: decimalOrUnset(form.get('grams')),
    quick: {
      name: text(form.get('name')),
      kcal: decimalOrUnset(form.get('kcal')),
      protein: decimalOrUnset(form.get('protein')),
      carbs: decimalOrUnset(form.get('carbs')),
      fat: decimalOrUnset(form.get('fat')),
    },
  });
  if (!result.ok) {
    return result;
  }
  const { name, kcal, protein, carbs, fat } = result.value.quick!;
  return {
    ok: true,
    value: {
      input: result.value,
      preview: { name, brand: null, kcal, protein, carbs, fat, fiber: null, sugar: null },
    },
  };
}

/** The changed fields of an entry, or null when nothing changed and there is nothing to send. */
export function buildEntryUpdate(
  entry: FoodLogEntryPayload,
  draft: { grams: string; meal: FoodMealKey },
): FormResult<UpdateFoodLogEntryVars | null> {
  const grams = parseDecimal(draft.grams);
  const patch = {
    ...(grams === entry.grams ? {} : { grams: grams ?? Number.NaN }),
    ...(draft.meal === entry.meal ? {} : { meal: draft.meal }),
  };
  if (Object.keys(patch).length === 0) {
    return { ok: true, value: null };
  }
  const result = validated(foodLogEntryUpdateSchema, patch);
  return result.ok ? { ok: true, value: { id: entry.id, ...result.value } } : result;
}

/** The athlete's own food, per 100 g. */
export function buildCustomFood(form: FormData): FormResult<CustomFoodInput> {
  return validated(customFoodSchema, {
    name: text(form.get('name')),
    brand: text(form.get('brand')) || null,
    kcalPer100g: decimalOrUnset(form.get('kcalPer100g')),
    proteinPer100g: decimalOrUnset(form.get('proteinPer100g')),
    carbsPer100g: decimalOrUnset(form.get('carbsPer100g')),
    fatPer100g: decimalOrUnset(form.get('fatPer100g')),
    servingGrams: parseDecimal(form.get('servingGrams')),
  });
}

export const TARGET_FIELDS = [
  { name: 'kcal', label: 'Calories', unit: 'kcal' },
  { name: 'proteinG', label: 'Protéines', unit: 'g' },
  { name: 'carbsG', label: 'Glucides', unit: 'g' },
  { name: 'fatG', label: 'Lipides', unit: 'g' },
] as const satisfies ReadonlyArray<{
  name: keyof NutritionTargetsPayload;
  label: string;
  unit: string;
}>;

/** Every target as typed; a blank field clears that target. */
export function buildTargets(form: FormData): FormResult<NutritionTargetsInput> {
  return validated(
    nutritionTargetsSchema,
    Object.fromEntries(TARGET_FIELDS.map(({ name }) => [name, parseDecimal(form.get(name))])),
  );
}

/** The value a target field opens with: blank when unset. */
export function targetFieldValue(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}
