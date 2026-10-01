'use client';

import { useReducer } from 'react';
import {
  foodAddReducer,
  foodSearchListing,
  initialFoodAddState,
  lastGramsFor,
  type FoodAddAction,
  type FoodAddState,
} from '@/components/nutrition/food-log/food-add-flow-state';
import {
  buildCustomFood,
  buildPortionEntry,
  buildQuickEntry,
  type FormResult,
} from '@/components/nutrition/food-log/food-log-forms';
import {
  type AddFoodLogEntryVars,
  useAddFoodLogEntry,
  useCreateCustomFood,
  useFoodBarcodeLookup,
  useFoodSearch,
} from '@/hooks/use-data';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import type {
  FoodProductPayload,
  RecentFoodPayload,
} from '@sharpit/app/lib/nutrition/food-log/food-log-day';
import type { FoodMealKey } from '@sharpit/app/lib/nutrition/food-log/food-log-math';

const SEARCH_DEBOUNCE_MS = 350;

function errorMessage(error: unknown): string | null {
  return error instanceof Error ? error.message : null;
}

function useFoodAddSearch(state: FoodAddState, recent: RecentFoodPayload[]) {
  const debounced = useDebouncedValue(state.query, SEARCH_DEBOUNCE_MS);
  const searching = state.open && state.step === 'search';
  const search = useFoodSearch(searching ? debounced : '');
  const results = search.data;
  return {
    results,
    listing: foodSearchListing(state.query, results, recent),
    searchError: state.error ?? errorMessage(search.error),
  };
}

type Dispatch = (action: FoodAddAction) => void;

/** The writes behind the dialog: logging an entry, a barcode read, a custom food. */
function useFoodAddWrites(
  trainingDayId: string,
  dispatch: Dispatch,
  pick: (product: FoodProductPayload) => void,
) {
  const add = useAddFoodLogEntry(trainingDayId);
  const barcode = useFoodBarcodeLookup();
  const customFood = useCreateCustomFood();
  // A form that fails its check stays open with the reason.
  const reject = (message: string) => dispatch({ type: 'fail', message });
  const onError = (error: unknown) => reject(errorMessage(error) ?? 'Saisie invalide.');

  return {
    barcodePending: barcode.isPending,
    customPending: customFood.isPending,
    // Instant: the row appears and the dialog closes; a failure rolls it back with a toast.
    log: (result: FormResult<AddFoodLogEntryVars>) => {
      if (!result.ok) {
        return reject(result.message);
      }
      add.mutate(result.value);
      dispatch({ type: 'close' });
    },
    lookupBarcode: (code: string) => barcode.mutate(code, { onSuccess: pick, onError }),
    createFood: (form: FormData) => {
      const result = buildCustomFood(form);
      if (!result.ok) {
        return reject(result.message);
      }
      customFood.mutate(result.value, { onSuccess: pick, onError });
    },
  };
}

function stateSetters(dispatch: Dispatch) {
  return {
    start: (meal: FoodMealKey) => dispatch({ type: 'start', meal }),
    close: () => dispatch({ type: 'close' }),
    setQuery: (query: string) => dispatch({ type: 'query', query }),
    setGrams: (grams: string) => dispatch({ type: 'grams', grams }),
    setMeal: (meal: FoodMealKey) => dispatch({ type: 'meal', meal }),
    showStep: (step: 'search' | 'quick' | 'custom') => dispatch({ type: 'step', step }),
  };
}

export function useFoodAddFlow(trainingDayId: string, recent: RecentFoodPayload[]) {
  const [state, dispatch] = useReducer(foodAddReducer, undefined, initialFoodAddState);
  const pickProduct = (product: FoodProductPayload) =>
    dispatch({ type: 'pick', picked: { product, lastGrams: lastGramsFor(recent, product.id) } });
  const { log, ...writes } = useFoodAddWrites(trainingDayId, dispatch, pickProduct);
  const context = { meal: state.meal, trainingDayId };

  return {
    state,
    recent,
    ...useFoodAddSearch(state, recent),
    ...writes,
    ...stateSetters(dispatch),
    pickProduct,
    logPortion: () =>
      state.picked && log(buildPortionEntry(state.picked.product, state.grams, context)),
    logQuick: (form: FormData) => log(buildQuickEntry(form, context)),
  };
}

export type FoodAddFlow = ReturnType<typeof useFoodAddFlow>;
