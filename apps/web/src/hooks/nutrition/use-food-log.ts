'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatApiErrorMessage, parseApiErrorBody } from '@/client/query/api-error';
import { queryKeys } from '@/client/query/keys';
import { tempId } from '@/client/query/optimistic';
import { sendJson } from '@/client/query/send-json';
import {
  patchFoodLogDay,
  refreshFoodLogReaders,
  rollbackFoodLogDay,
} from '@/hooks/nutrition/food-log-cache';
import {
  rescaleEntry,
  type FoodLogDayPayload,
  type FoodLogEntryPayload,
  type FoodProductPayload,
  type FoodSearchPayload,
  type NutritionTargetsPayload,
} from '@sharpit/app/lib/nutrition/food-log/food-log-day';
import type { FoodMealKey } from '@sharpit/app/lib/nutrition/food-log/food-log-math';
import type {
  CustomFoodInput,
  FoodLogEntryCreateInput,
  NutritionTargetsInput,
} from '@sharpit/app/lib/validators/food-log';
import { apiFetch } from '@sharpit/ui/client/query/api-fetch';

/** The in-app food log (ADR-061): one day's entries, the foods to pick from, the targets. */

const ENDPOINT = '/api/food-log';

async function readJsonOrThrow<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const body = parseApiErrorBody(await res.json().catch(() => null));
    throw new Error(formatApiErrorMessage(body ?? {}, fallback));
  }
  return (await res.json()) as T;
}

export function useFoodLogDay(trainingDayId: string) {
  return useQuery({
    queryKey: queryKeys.foodLogDay(trainingDayId),
    queryFn: async () =>
      readJsonOrThrow<FoodLogDayPayload>(
        await apiFetch(`${ENDPOINT}?trainingDayId=${encodeURIComponent(trainingDayId)}`),
        'Journal alimentaire indisponible.',
      ),
    staleTime: 60_000,
  });
}

const SEARCH_MIN = 2;
const SEARCH_MAX = 80;

export function isSearchableFoodQuery(query: string): boolean {
  const trimmed = query.trim();
  return trimmed.length >= SEARCH_MIN && trimmed.length <= SEARCH_MAX;
}

/** Search by name; the caller debounces the query so typing never floods the shared OFF quota. */
export function useFoodSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: queryKeys.foodSearch(trimmed),
    enabled: isSearchableFoodQuery(trimmed),
    queryFn: async () => {
      const res = await apiFetch(`${ENDPOINT}/foods?q=${encodeURIComponent(trimmed)}`);
      if (res.status === 429) {
        throw new Error('Trop de recherches d’affilée, réessaie dans une minute.');
      }
      return readJsonOrThrow<FoodSearchPayload>(res, 'Recherche indisponible.');
    },
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    retry: false,
  });
}

const BARCODE_ERRORS: Record<number, string> = {
  400: 'Code-barres invalide : 8, 12, 13 ou 14 chiffres.',
  404: 'Produit inconnu d’Open Food Facts.',
  503: 'Open Food Facts ne répond pas, réessaie dans un instant.',
};

async function fetchProductByBarcode(code: string): Promise<FoodProductPayload> {
  const res = await apiFetch(`${ENDPOINT}/foods/barcode/${encodeURIComponent(code)}`);
  if (BARCODE_ERRORS[res.status]) {
    throw new Error(BARCODE_ERRORS[res.status]);
  }
  const data = await readJsonOrThrow<{ product: FoodProductPayload }>(
    res,
    'Recherche indisponible.',
  );
  return data.product;
}

export function useFoodBarcodeLookup() {
  return useMutation({ mutationFn: fetchProductByBarcode });
}

export function useCreateCustomFood() {
  return useMutation({
    mutationFn: async (input: CustomFoodInput) => {
      const data = (await sendJson(`${ENDPOINT}/foods`, 'POST', input)) as {
        product: FoodProductPayload;
      };
      return data.product;
    },
  });
}

/** What the optimistic row shows until the server answers with the real entry. */
export type FoodLogEntryPreview = Pick<
  FoodLogEntryPayload,
  'name' | 'brand' | 'kcal' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'sugar'
>;

export type AddFoodLogEntryVars = {
  input: FoodLogEntryCreateInput;
  preview: FoodLogEntryPreview;
};

function optimisticEntry({ input, preview }: AddFoodLogEntryVars): FoodLogEntryPayload {
  return {
    ...preview,
    id: tempId(),
    date: `${input.trainingDayId}T00:00:00.000Z`,
    meal: input.meal,
    productId: input.productId ?? null,
    grams: input.grams,
  };
}

function withEntries(
  day: FoodLogDayPayload,
  update: (entries: FoodLogEntryPayload[]) => FoodLogEntryPayload[],
): FoodLogDayPayload {
  return { ...day, entries: update(day.entries) };
}

export function useAddFoodLogEntry(trainingDayId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ input }: AddFoodLogEntryVars) => {
      const data = (await sendJson(ENDPOINT, 'POST', input)) as { entry: FoodLogEntryPayload };
      return data.entry;
    },
    onMutate: (vars) =>
      patchFoodLogDay(queryClient, trainingDayId, (day) =>
        withEntries(day, (entries) => [...entries, optimisticEntry(vars)]),
      ),
    onError: (error, _vars, context) =>
      rollbackFoodLogDay(queryClient, trainingDayId, context, error),
    onSettled: () => refreshFoodLogReaders(queryClient, trainingDayId),
  });
}

export type UpdateFoodLogEntryVars = { id: string; grams?: number; meal?: FoodMealKey };

function updatedEntry(entry: FoodLogEntryPayload, vars: UpdateFoodLogEntryVars) {
  const resized =
    vars.grams !== undefined && vars.grams !== entry.grams
      ? rescaleEntry(entry, vars.grams)
      : entry;
  return { ...resized, meal: vars.meal ?? entry.meal };
}

export function useUpdateFoodLogEntry(trainingDayId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: UpdateFoodLogEntryVars) =>
      sendJson(`${ENDPOINT}/${encodeURIComponent(id)}`, 'PATCH', patch),
    onMutate: (vars) =>
      patchFoodLogDay(queryClient, trainingDayId, (day) =>
        withEntries(day, (entries) =>
          entries.map((entry) => (entry.id === vars.id ? updatedEntry(entry, vars) : entry)),
        ),
      ),
    onError: (error, _vars, context) =>
      rollbackFoodLogDay(queryClient, trainingDayId, context, error),
    onSettled: () => refreshFoodLogReaders(queryClient, trainingDayId),
  });
}

export function useDeleteFoodLogEntry(trainingDayId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => sendJson(`${ENDPOINT}/${encodeURIComponent(id)}`, 'DELETE'),
    onMutate: (id) =>
      patchFoodLogDay(queryClient, trainingDayId, (day) =>
        withEntries(day, (entries) => entries.filter((entry) => entry.id !== id)),
      ),
    onError: (error, _id, context) =>
      rollbackFoodLogDay(queryClient, trainingDayId, context, error),
    onSettled: () => refreshFoodLogReaders(queryClient, trainingDayId),
  });
}

function mergedTargets(
  current: NutritionTargetsPayload,
  input: NutritionTargetsInput,
): NutritionTargetsPayload {
  return {
    kcal: input.kcal === undefined ? current.kcal : input.kcal,
    proteinG: input.proteinG === undefined ? current.proteinG : input.proteinG,
    carbsG: input.carbsG === undefined ? current.carbsG : input.carbsG,
    fatG: input.fatG === undefined ? current.fatG : input.fatG,
  };
}

export function useSaveNutritionTargets(trainingDayId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NutritionTargetsInput) => {
      const url = `${ENDPOINT}/targets?trainingDayId=${encodeURIComponent(trainingDayId)}`;
      const data = (await sendJson(url, 'PUT', input)) as { targets: NutritionTargetsPayload };
      return data.targets;
    },
    onMutate: (input) =>
      patchFoodLogDay(queryClient, trainingDayId, (day) => ({
        ...day,
        targets: mergedTargets(day.targets, input),
      })),
    onError: (error, _input, context) =>
      rollbackFoodLogDay(queryClient, trainingDayId, context, error),
    onSettled: () => refreshFoodLogReaders(queryClient, trainingDayId),
  });
}
