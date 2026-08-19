const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snacks: 'Collations',
};

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snacks'];

export function formatMealLabel(rawName: string): string {
  const key = rawName.trim().toLowerCase();
  return MEAL_LABELS[key] ?? rawName.charAt(0).toUpperCase() + rawName.slice(1);
}

export function mealSortIndex(rawName: string): number {
  const key = rawName.trim().toLowerCase();
  const index = MEAL_ORDER.indexOf(key);
  return index === -1 ? MEAL_ORDER.length : index;
}
