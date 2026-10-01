import type { FoodLogEntry, FoodProduct } from '@prisma/client';
import { prisma } from '@sharpit/db/client';
import {
  portionNutrients,
  projectFoodLogDay,
  type FoodMealKey,
  type LoggedEntry,
} from '@sharpit/app/lib/nutrition/food-log/food-log-math';
import type { MappedFood } from '@sharpit/app/lib/nutrition/food-log/open-food-facts';
import { SHARPIT_NUTRITION_PROVIDER } from '@sharpit/app/lib/nutrition/food-log/nutrition-source';
import type {
  CustomFoodInput,
  FoodLogEntryCreateInput,
  FoodLogEntryUpdateInput,
  NutritionTargetsInput,
} from '@sharpit/app/lib/validators/food-log';
import { observationEngine } from '@sharpit/server/lib/engines/observation-engine';
import { fetchOffProduct } from './open-food-facts-client';

/**
 * The in-app food log (ADR-061). Entries are the source; the day's `DailyNutrition` row
 * (`provider: sharpit`) and its NUTRITION observation are recomputed from them on every change,
 * so every existing reader — page, widget, coach, analysis, FUEL — sees the log unchanged.
 */

/** OFF products are re-read after a month: brands reformulate. */
const OFF_CACHE_DAYS = 30;

export class FoodLogNotFoundError extends Error {}

export function foodLogDayDate(trainingDayId: string): Date {
  return new Date(`${trainingDayId}T00:00:00.000Z`);
}

function trainingDayIdOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function asLogged(entry: FoodLogEntry): LoggedEntry {
  return {
    meal: entry.meal as FoodMealKey,
    name: entry.name,
    brand: entry.brand,
    kcal: entry.kcal,
    protein: entry.protein,
    carbs: entry.carbs,
    fat: entry.fat,
    fiber: entry.fiber,
    sugar: entry.sugar,
  };
}

async function loadTargets(athleteId: string) {
  const profile = await prisma.athleteProfile.findUnique({
    where: { id: athleteId },
    select: {
      nutritionTargetKcal: true,
      nutritionTargetProteinG: true,
      nutritionTargetCarbsG: true,
      nutritionTargetFatG: true,
    },
  });
  return {
    goalCalories: profile?.nutritionTargetKcal ?? null,
    goalProtein: profile?.nutritionTargetProteinG ?? null,
    goalCarbohydrates: profile?.nutritionTargetCarbsG ?? null,
    goalFat: profile?.nutritionTargetFatG ?? null,
  };
}

async function ingestDayObservation(
  athleteId: string,
  trainingDayId: string,
  entries: FoodLogEntry[],
) {
  const day = projectFoodLogDay(entries.map(asLogged));
  const targets = await loadTargets(athleteId);
  try {
    await observationEngine.ingest(athleteId, {
      type: 'NUTRITION',
      source: 'MANUAL',
      timestamp: new Date(`${trainingDayId}T12:00:00Z`),
      receivedAt: new Date(),
      energyKcal: day.calories,
      proteinG: day.protein,
      carbohydratesG: day.carbohydrates,
      fatG: day.fat,
      fiberG: day.fiber ?? undefined,
      sugarG: day.sugar ?? undefined,
      goalEnergyKcal: targets.goalCalories ?? undefined,
      goalProteinG: targets.goalProtein ?? undefined,
      goalCarbohydratesG: targets.goalCarbohydrates ?? undefined,
      goalFatG: targets.goalFat ?? undefined,
      diaryComplete: false,
      entryCount: entries.length,
    });
  } catch (error) {
    // The log is written; FUEL catches up on the next change. Never fail the athlete's write.
    console.error('[food-log] observation ingest failed:', error);
  }
}

/** Rebuilds the day's SHARPIT row from its entries; an emptied day loses its row. */
export async function recomputeFoodLogDay(athleteId: string, trainingDayId: string): Promise<void> {
  const date = foodLogDayDate(trainingDayId);
  const entries = await prisma.foodLogEntry.findMany({
    where: { athleteId, date },
    orderBy: { createdAt: 'asc' },
  });
  const key = {
    athleteId_date_provider: { athleteId, date, provider: SHARPIT_NUTRITION_PROVIDER },
  };

  if (entries.length === 0) {
    await prisma.dailyNutrition.deleteMany({
      where: { athleteId, date, provider: SHARPIT_NUTRITION_PROVIDER },
    });
    return;
  }

  const day = projectFoodLogDay(entries.map(asLogged));
  const fields = { ...day, ...(await loadTargets(athleteId)) };
  await prisma.dailyNutrition.upsert({
    where: key,
    create: { athleteId, date, provider: SHARPIT_NUTRITION_PROVIDER, ...fields },
    update: fields,
  });
  await ingestDayObservation(athleteId, trainingDayId, entries);
}

export async function listFoodLogDay(athleteId: string, trainingDayId: string) {
  return prisma.foodLogEntry.findMany({
    where: { athleteId, date: foodLogDayDate(trainingDayId) },
    orderBy: { createdAt: 'asc' },
  });
}

async function productForEntry(athleteId: string, productId: string): Promise<FoodProduct> {
  const product = await prisma.foodProduct.findFirst({
    where: { id: productId, OR: [{ source: 'OFF' }, { ownerId: athleteId }] },
  });
  if (!product) {
    throw new FoodLogNotFoundError('Aliment introuvable');
  }
  return product;
}

function quickEntryFields(quick: NonNullable<FoodLogEntryCreateInput['quick']>) {
  return {
    productId: null,
    name: quick.name,
    brand: null,
    kcal: quick.kcal,
    protein: quick.protein,
    carbs: quick.carbs,
    fat: quick.fat,
    fiber: null,
    sugar: null,
  };
}

export async function addFoodLogEntry(athleteId: string, input: FoodLogEntryCreateInput) {
  const fields = input.productId
    ? await productEntryFields(athleteId, input.productId, input.grams)
    : quickEntryFields(input.quick!);
  const entry = await prisma.foodLogEntry.create({
    data: {
      athleteId,
      date: foodLogDayDate(input.trainingDayId),
      meal: input.meal,
      grams: input.grams,
      ...fields,
    },
  });
  await recomputeFoodLogDay(athleteId, input.trainingDayId);
  return entry;
}

async function productEntryFields(athleteId: string, productId: string, grams: number) {
  const product = await productForEntry(athleteId, productId);
  return {
    productId: product.id,
    name: product.name,
    brand: product.brand,
    ...portionNutrients(product, grams),
  };
}

async function ownedEntry(athleteId: string, id: string) {
  const entry = await prisma.foodLogEntry.findFirst({ where: { id, athleteId } });
  if (!entry) {
    throw new FoodLogNotFoundError('Entrée introuvable');
  }
  return entry;
}

/** A new portion rescales the snapshot; a quick add keeps its kcal per gram. */
async function rescaledNutrients(entry: FoodLogEntry, grams: number) {
  const product = entry.productId
    ? await prisma.foodProduct.findUnique({ where: { id: entry.productId } })
    : null;
  if (product) {
    return portionNutrients(product, grams);
  }
  const ratio = grams / entry.grams;
  const scale = (value: number | null) =>
    value === null ? null : Math.round(value * ratio * 10) / 10;
  return {
    kcal: scale(entry.kcal)!,
    protein: scale(entry.protein)!,
    carbs: scale(entry.carbs)!,
    fat: scale(entry.fat)!,
    fiber: scale(entry.fiber),
    sugar: scale(entry.sugar),
  };
}

export async function updateFoodLogEntry(
  athleteId: string,
  id: string,
  input: FoodLogEntryUpdateInput,
) {
  const entry = await ownedEntry(athleteId, id);
  const nutrients =
    input.grams !== undefined && input.grams !== entry.grams
      ? await rescaledNutrients(entry, input.grams)
      : {};
  const updated = await prisma.foodLogEntry.update({
    where: { id },
    data: { ...nutrients, grams: input.grams ?? entry.grams, meal: input.meal ?? entry.meal },
  });
  await recomputeFoodLogDay(athleteId, trainingDayIdOf(entry.date));
  return updated;
}

export async function deleteFoodLogEntry(athleteId: string, id: string): Promise<void> {
  const entry = await ownedEntry(athleteId, id);
  await prisma.foodLogEntry.delete({ where: { id } });
  await recomputeFoodLogDay(athleteId, trainingDayIdOf(entry.date));
}

function isStale(product: FoodProduct): boolean {
  return Date.now() - product.fetchedAt.getTime() > OFF_CACHE_DAYS * 24 * 60 * 60 * 1000;
}

function productData(food: MappedFood) {
  return {
    name: food.name,
    brand: food.brand,
    kcalPer100g: food.kcalPer100g,
    proteinPer100g: food.proteinPer100g,
    carbsPer100g: food.carbsPer100g,
    fatPer100g: food.fatPer100g,
    fiberPer100g: food.fiberPer100g ?? null,
    sugarPer100g: food.sugarPer100g ?? null,
    servingGrams: food.servingGrams,
    servingLabel: food.servingLabel,
    fetchedAt: new Date(),
  };
}

/** Cached OFF product for a barcode, read from OFF when unknown or stale. */
export async function findProductByBarcode(barcode: string): Promise<FoodProduct | null> {
  const cached = await prisma.foodProduct.findUnique({ where: { barcode } });
  if (cached && !isStale(cached)) {
    return cached;
  }
  const food = await fetchOffProduct(barcode).catch((error) => {
    if (cached) {
      return null;
    }
    throw error;
  });
  if (!food) {
    return cached;
  }
  return prisma.foodProduct.upsert({
    where: { barcode },
    create: { source: 'OFF', barcode, ...productData(food) },
    update: productData(food),
  });
}

/** OFF search results cached as products, so an entry can point at what was picked. */
export async function cacheSearchResults(foods: MappedFood[]): Promise<FoodProduct[]> {
  return Promise.all(
    foods.map((food) =>
      prisma.foodProduct.upsert({
        where: { barcode: food.barcode },
        create: { source: 'OFF', barcode: food.barcode, ...productData(food) },
        update: productData(food),
      }),
    ),
  );
}

export async function searchOwnFoods(athleteId: string, query: string) {
  return prisma.foodProduct.findMany({
    where: { ownerId: athleteId, name: { contains: query, mode: 'insensitive' } },
    orderBy: { updatedAt: 'desc' },
    take: 10,
  });
}

export async function createCustomFood(athleteId: string, input: CustomFoodInput) {
  return prisma.foodProduct.create({
    data: {
      source: 'CUSTOM',
      ownerId: athleteId,
      name: input.name,
      brand: input.brand ?? null,
      kcalPer100g: input.kcalPer100g,
      proteinPer100g: input.proteinPer100g,
      carbsPer100g: input.carbsPer100g,
      fatPer100g: input.fatPer100g,
      fiberPer100g: input.fiberPer100g ?? null,
      sugarPer100g: input.sugarPer100g ?? null,
      servingGrams: input.servingGrams ?? null,
    },
  });
}

/** The foods the athlete logged lately, newest first, one per food. */
export async function recentFoods(athleteId: string, limit = 15) {
  const entries = await prisma.foodLogEntry.findMany({
    where: { athleteId, productId: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: limit * 4,
    select: { grams: true, product: true },
  });
  const seen = new Set<string>();
  return entries
    .filter((entry) => entry.product && !seen.has(entry.product.id) && seen.add(entry.product.id))
    .slice(0, limit)
    .map((entry) => ({ product: entry.product!, lastGrams: entry.grams }));
}

export async function getNutritionTargets(athleteId: string) {
  const targets = await loadTargets(athleteId);
  return {
    kcal: targets.goalCalories,
    proteinG: targets.goalProtein,
    carbsG: targets.goalCarbohydrates,
    fatG: targets.goalFat,
  };
}

/** Saves the targets, then gives today's logged row its new goals. */
export async function setNutritionTargets(
  athleteId: string,
  input: NutritionTargetsInput,
  trainingDayId: string,
) {
  await prisma.athleteProfile.update({
    where: { id: athleteId },
    data: {
      ...(input.kcal === undefined ? {} : { nutritionTargetKcal: input.kcal }),
      ...(input.proteinG === undefined ? {} : { nutritionTargetProteinG: input.proteinG }),
      ...(input.carbsG === undefined ? {} : { nutritionTargetCarbsG: input.carbsG }),
      ...(input.fatG === undefined ? {} : { nutritionTargetFatG: input.fatG }),
    },
  });
  await recomputeFoodLogDay(athleteId, trainingDayId);
  return getNutritionTargets(athleteId);
}
