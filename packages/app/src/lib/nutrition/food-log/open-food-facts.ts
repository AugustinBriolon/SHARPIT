import type { FoodPer100g } from './food-log-math';
import {
  computeFoodHealth,
  levelFromAmount,
  type FoodHealthAssessment,
  type NutrientFlags,
  type NutrientLevel,
  type NutriScoreLetter,
} from './food-health-score';

/**
 * Open Food Facts products → the food log's shape (ADR-061). Data © Open Food Facts
 * contributors, ODbL: shown with its attribution wherever a product is picked.
 */

export const OPEN_FOOD_FACTS_ATTRIBUTION = 'Données Open Food Facts (ODbL)';

/** The fields asked of OFF, for a barcode read and a search alike. */
export const OFF_FIELDS = [
  'code',
  'product_name',
  'product_name_fr',
  'brands',
  'nutriments',
  'serving_quantity',
  'serving_size',
  'nutriscore_grade',
  'nova_group',
  'nutrient_levels',
  'additives_tags',
] as const;

export type OffNutriments = Partial<Record<string, number | string>>;

export type OffNutrientLevels = Partial<
  Record<'fat' | 'salt' | 'saturated-fat' | 'sugars', string>
>;

export type OffProduct = {
  code?: string;
  product_name?: string;
  product_name_fr?: string;
  brands?: string | string[];
  nutriments?: OffNutriments;
  serving_quantity?: number | string;
  serving_size?: string;
  nutriscore_grade?: string;
  nova_group?: number | string;
  nutrient_levels?: OffNutrientLevels;
  additives_tags?: string[];
};

export type MappedFood = FoodPer100g & {
  barcode: string;
  name: string;
  brand: string | null;
  servingGrams: number | null;
  servingLabel: string | null;
  saltPer100g: number | null;
  saturatedFatPer100g: number | null;
  health: FoodHealthAssessment;
};

function numberOf(value: unknown): number | null {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/** kcal per 100 g, from kJ when OFF only carries energy in kJ. */
function kcalPer100g(nutriments: OffNutriments): number | null {
  const kcal = numberOf(nutriments['energy-kcal_100g']);
  if (kcal !== null) {
    return kcal;
  }
  const kj = numberOf(nutriments['energy-kj_100g']) ?? numberOf(nutriments['energy_100g']);
  return kj === null ? null : Math.round(kj / 4.184);
}

function firstBrand(brands: OffProduct['brands']): string | null {
  const list = Array.isArray(brands) ? brands : (brands ?? '').split(',');
  const brand = list.map((item) => item.trim()).find(Boolean);
  return brand ?? null;
}

function asNutriScore(value: unknown): NutriScoreLetter | null {
  if (typeof value !== 'string') {
    return null;
  }
  const letter = value.trim().toLowerCase();
  return letter === 'a' || letter === 'b' || letter === 'c' || letter === 'd' || letter === 'e'
    ? letter
    : null;
}

function asNova(value: unknown): 1 | 2 | 3 | 4 | null {
  const n = typeof value === 'string' ? Number(value) : value;
  return n === 1 || n === 2 || n === 3 || n === 4 ? n : null;
}

function asLevel(value: unknown): NutrientLevel {
  return value === 'low' || value === 'moderate' || value === 'high' ? value : 'unknown';
}

function nutrientFlagsFromOff(
  levels: OffNutrientLevels | undefined,
  nutriments: OffNutriments,
): NutrientFlags {
  return {
    sugars:
      asLevel(levels?.sugars) !== 'unknown'
        ? asLevel(levels?.sugars)
        : levelFromAmount('sugars', numberOf(nutriments['sugars_100g'])),
    salt:
      asLevel(levels?.salt) !== 'unknown'
        ? asLevel(levels?.salt)
        : levelFromAmount('salt', numberOf(nutriments['salt_100g'])),
    saturatedFat:
      asLevel(levels?.['saturated-fat']) !== 'unknown'
        ? asLevel(levels?.['saturated-fat'])
        : levelFromAmount('saturatedFat', numberOf(nutriments['saturated-fat_100g'])),
  };
}

/**
 * A product the log can use, or null: no name or no energy and macros means a half-filled OFF
 * entry, and logging it would show a meal as zero.
 */
export function mapOffProduct(product: OffProduct): MappedFood | null {
  const nutriments = product.nutriments ?? {};
  const name = (product.product_name_fr || product.product_name || '').trim();
  const kcal = kcalPer100g(nutriments);
  const protein = numberOf(nutriments['proteins_100g']);
  const carbs = numberOf(nutriments['carbohydrates_100g']);
  const fat = numberOf(nutriments['fat_100g']);
  if (
    !product.code ||
    !name ||
    kcal === null ||
    protein === null ||
    carbs === null ||
    fat === null
  ) {
    return null;
  }
  const servingGrams = numberOf(product.serving_quantity);
  const sugarPer100g = numberOf(nutriments['sugars_100g']);
  const saltPer100g = numberOf(nutriments['salt_100g']);
  const saturatedFatPer100g = numberOf(nutriments['saturated-fat_100g']);
  const nutrientLevels = nutrientFlagsFromOff(product.nutrient_levels, nutriments);
  return {
    barcode: product.code,
    name,
    brand: firstBrand(product.brands),
    kcalPer100g: kcal,
    proteinPer100g: protein,
    carbsPer100g: carbs,
    fatPer100g: fat,
    fiberPer100g: numberOf(nutriments['fiber_100g']),
    sugarPer100g,
    saltPer100g,
    saturatedFatPer100g,
    servingGrams: servingGrams && servingGrams > 0 ? servingGrams : null,
    servingLabel: product.serving_size?.trim() || null,
    health: computeFoodHealth({
      nutriScore: asNutriScore(product.nutriscore_grade),
      nova: asNova(product.nova_group),
      nutrientLevels,
      additiveTags: product.additives_tags ?? [],
    }),
  };
}

/** EAN-8, UPC-A, EAN-13 and GTIN-14: digits only, the lengths a scanner reads. */
export function isBarcode(value: string): boolean {
  return /^(\d{8}|\d{12,14})$/.test(value);
}
