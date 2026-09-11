/**
 * Rule checks between a declared diet and the logged day.
 *
 * Product checks match MyFitnessPal entry names against a small French/English
 * lexicon. They are deliberately conservative — a false "hors régime" is worse
 * than a missed one, because the model already reads every entry name.
 */

import { KETO_MAX_CARBS_G, LOW_CARB_MAX_CARBS_G } from './nutrition-analysis-bands';

export type DietConflict = {
  dietId: string;
  kind: 'product' | 'macro';
  meal: string | null;
  entry: string | null;
  detail: string;
};

type DietEntry = { meal: string; name: string };

const MEAT_AND_FISH = [
  'poulet',
  'boeuf',
  'porc',
  'jambon',
  'bacon',
  'lardon',
  'saucisse',
  'saucisson',
  'chorizo',
  'dinde',
  'veau',
  'agneau',
  'canard',
  'steak',
  'viande',
  'merguez',
  'salami',
  'rillettes',
  'thon',
  'saumon',
  'cabillaud',
  'crevette',
  'poisson',
  'sardine',
  'maquereau',
  'moule',
  'truite',
  'colin',
  'gelatine',
  'chicken',
  'beef',
  'pork',
  'ham',
  'turkey',
  'tuna',
  'salmon',
  'fish',
  'shrimp',
  'lamb',
  'sausage',
];

const DAIRY = [
  'lait',
  'fromage',
  'yaourt',
  'yogourt',
  'beurre',
  'emmental',
  'mozzarella',
  'parmesan',
  'skyr',
  'ricotta',
  'comte',
  'feta',
  'whey',
  'milk',
  'cheese',
  'yogurt',
  'butter',
];

const OTHER_ANIMAL = ['oeuf', 'oeufs', 'miel', 'egg', 'eggs', 'honey'];

const GLUTEN = [
  'pain',
  'pates',
  'ble',
  'baguette',
  'farine',
  'biscuit',
  'gateau',
  'pizza',
  'semoule',
  'couscous',
  'boulgour',
  'seigle',
  'orge',
  'croissant',
  'brioche',
  'bread',
  'pasta',
  'wheat',
  'barley',
  'rye',
];

/** Plant alternatives that reuse an animal word ("lait d'amande", "yaourt soja"). */
const PLANT_MARKERS = [
  'soja',
  'soy',
  'amande',
  'avoine',
  'coco',
  'riz',
  'vegetal',
  'vegetale',
  'vegan',
  'oat',
  'almond',
  'vegetarien',
  'cacahuete',
  'cacahuetes',
  'arachide',
  'peanut',
];

const GLUTEN_FREE_MARKERS = ['sans gluten', 'gluten free', 'gluten-free'];

const DIET_PRODUCT_LEXICON: Record<string, readonly string[]> = {
  vegetarian: MEAT_AND_FISH,
  vegan: [...MEAT_AND_FISH, ...DAIRY, ...OTHER_ANIMAL],
  dairy_free: DAIRY,
  gluten_free: GLUTEN,
};

const DIET_CARB_CEILING_G: Record<string, number> = {
  keto: KETO_MAX_CARBS_G,
  low_carb: LOW_CARB_MAX_CARBS_G,
};

/**
 * Tightest carbohydrate ceiling among the declared diets, or null. When set, the
 * endurance carbohydrate bands do not apply — the athlete chose to train low-carb.
 */
export function dietCarbCeilingG(dietIds: readonly string[]): number | null {
  const ceilings = dietIds
    .map((dietId) => DIET_CARB_CEILING_G[dietId])
    .filter((ceiling) => ceiling !== undefined);
  return ceilings.length > 0 ? Math.min(...ceilings) : null;
}

/** Lowercase, accents stripped, ligatures expanded — "Bœuf haché" → "boeuf hache". */
export function normalizeFoodName(name: string): string {
  return name
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function words(normalized: string): Set<string> {
  return new Set(normalized.split(/[^a-z]+/).filter(Boolean));
}

function isExempt(dietId: string, normalized: string, tokens: Set<string>): boolean {
  if (dietId === 'gluten_free') {
    return GLUTEN_FREE_MARKERS.some((marker) => normalized.includes(marker));
  }
  return PLANT_MARKERS.some((marker) => tokens.has(marker));
}

/** First lexicon word the entry name contains, or null when it fits the diet. */
export function productConflictWord(dietId: string, name: string): string | null {
  const lexicon = DIET_PRODUCT_LEXICON[dietId];
  if (!lexicon) {
    return null;
  }
  const normalized = normalizeFoodName(name);
  const tokens = words(normalized);
  if (isExempt(dietId, normalized, tokens)) {
    return null;
  }
  return lexicon.find((word) => tokens.has(word)) ?? null;
}

function productConflicts(dietId: string, entries: readonly DietEntry[]): DietConflict[] {
  return entries.flatMap((entry) => {
    const word = productConflictWord(dietId, entry.name);
    return word
      ? [{ dietId, kind: 'product' as const, meal: entry.meal, entry: entry.name, detail: word }]
      : [];
  });
}

function macroConflict(dietId: string, carbohydratesG: number): DietConflict | null {
  const ceiling = DIET_CARB_CEILING_G[dietId];
  if (ceiling === undefined || carbohydratesG <= ceiling) {
    return null;
  }
  return {
    dietId,
    kind: 'macro',
    meal: null,
    entry: null,
    detail: `${Math.round(carbohydratesG)} g de glucides pour un plafond de ${ceiling} g`,
  };
}

export function findDietConflicts(input: {
  dietIds: readonly string[];
  entries: readonly DietEntry[];
  carbohydratesG: number;
}): DietConflict[] {
  return input.dietIds.flatMap((dietId) => {
    const macro = macroConflict(dietId, input.carbohydratesG);
    return [...productConflicts(dietId, input.entries), ...(macro ? [macro] : [])];
  });
}
