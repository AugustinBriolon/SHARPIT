import {
  defaultPortionGrams,
  type FoodProductPayload,
  type FoodSearchPayload,
  type RecentFoodPayload,
} from '@sharpit/app/lib/nutrition/food-log/food-log-day';
import type { FoodMealKey } from '@sharpit/app/lib/nutrition/food-log/food-log-math';

/**
 * The add-food dialog as a state machine: search (or barcode) → portion, with the quick add and
 * the custom food as side steps. Pure, so every transition is tested without rendering.
 */

export type FoodAddStep = 'search' | 'portion' | 'quick' | 'custom';

export type PickedFood = { product: FoodProductPayload; lastGrams: number | null };

export type FoodAddState = {
  open: boolean;
  step: FoodAddStep;
  meal: FoodMealKey;
  query: string;
  picked: PickedFood | null;
  grams: string;
  error: string | null;
};

export type FoodAddAction =
  | { type: 'start'; meal: FoodMealKey }
  | { type: 'close' }
  | { type: 'query'; query: string }
  | { type: 'pick'; picked: PickedFood }
  | { type: 'grams'; grams: string }
  | { type: 'meal'; meal: FoodMealKey }
  | { type: 'step'; step: Exclude<FoodAddStep, 'portion'> }
  | { type: 'fail'; message: string };

export function initialFoodAddState(): FoodAddState {
  return {
    open: false,
    step: 'search',
    meal: 'BREAKFAST',
    query: '',
    picked: null,
    grams: '',
    error: null,
  };
}

function pickedState(state: FoodAddState, picked: PickedFood): FoodAddState {
  return {
    ...state,
    step: 'portion',
    picked,
    grams: String(defaultPortionGrams(picked.product, picked.lastGrams)),
    error: null,
  };
}

export function foodAddReducer(state: FoodAddState, action: FoodAddAction): FoodAddState {
  switch (action.type) {
    case 'start':
      return { ...initialFoodAddState(), open: true, meal: action.meal };
    // Only the visibility flips, so the closing dialog does not flash its first step.
    case 'close':
      return { ...state, open: false };
    case 'query':
      return { ...state, query: action.query, error: null };
    case 'pick':
      return pickedState(state, action.picked);
    case 'grams':
      return { ...state, grams: action.grams, error: null };
    case 'meal':
      return { ...state, meal: action.meal };
    case 'step':
      return { ...state, step: action.step, picked: null, error: null };
    case 'fail':
      return { ...state, error: action.message };
    default:
      return state;
  }
}

export type FoodSearchListing = 'recent' | 'hint' | 'results';

/** Recent foods before typing, a hint below two characters, results once there is a search. */
export function foodSearchListing(
  query: string,
  results: FoodSearchPayload | undefined,
  recent: RecentFoodPayload[],
): FoodSearchListing {
  const typed = query.trim();
  if (!typed) {
    return recent.length > 0 ? 'recent' : 'hint';
  }
  return typed.length >= 2 && results ? 'results' : 'hint';
}

/** The weight last logged for a product, so a search pick offers it like a recent one. */
export function lastGramsFor(recent: RecentFoodPayload[], productId: string): number | null {
  return recent.find((item) => item.product.id === productId)?.lastGrams ?? null;
}
