import { NextRequest, NextResponse } from 'next/server';
import type { ZodType } from 'zod';
import {
  customFoodSchema,
  foodLogEntryCreateSchema,
  foodLogEntryUpdateSchema,
  nutritionTargetsSchema,
} from '@sharpit/app/lib/validators/food-log';
import { isBarcode } from '@sharpit/app/lib/nutrition/food-log/open-food-facts';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import {
  addFoodLogEntry,
  cacheSearchResults,
  createCustomFood,
  deleteFoodLogEntry,
  findProductByBarcode,
  FoodLogNotFoundError,
  getNutritionTargets,
  listFoodLogDay,
  recentFoods,
  searchOwnFoods,
  setNutritionTargets,
  updateFoodLogEntry,
} from '@sharpit/server/lib/nutrition/food-log/food-log-service';
import { searchOffProducts } from '@sharpit/server/lib/nutrition/food-log/open-food-facts-client';
import {
  checkRateLimit,
  rateLimitJsonResponse,
  rateLimiters,
} from '@sharpit/server/lib/rate-limit';

/**
 * The in-app food log (ADR-061): entries, foods (Open Food Facts and the athlete's own), and
 * targets. The log is the athlete's own data, open to every tier; only the coach's reading of it
 * is Pro.
 */

const DAY_ID = /^\d{4}-\d{2}-\d{2}$/;

async function parseBody<T>(request: NextRequest, schema: ZodType<T>) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  return parsed.success
    ? { ok: true as const, data: parsed.data }
    : {
        ok: false as const,
        response: NextResponse.json(
          { error: 'Saisie invalide', details: parsed.error.flatten() },
          { status: 400 },
        ),
      };
}

function failure(tag: string, error: unknown) {
  if (error instanceof FoodLogNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  console.error(`[api/v1/food-log] ${tag}`, error);
  return NextResponse.json({ error: 'Journal alimentaire indisponible' }, { status: 500 });
}

/** `GET /api/v1/food-log?trainingDayId=` — the day's entries, the targets and recent foods. */
export async function getDay(request: NextRequest) {
  const trainingDayId = request.nextUrl.searchParams.get('trainingDayId');
  if (!trainingDayId || !DAY_ID.test(trainingDayId)) {
    return NextResponse.json({ error: 'trainingDayId requis (YYYY-MM-DD)' }, { status: 400 });
  }
  try {
    const athleteId = await getCurrentAthleteId();
    const [entries, targets, recent] = await Promise.all([
      listFoodLogDay(athleteId, trainingDayId),
      getNutritionTargets(athleteId),
      recentFoods(athleteId),
    ]);
    return NextResponse.json({ trainingDayId, entries, targets, recent });
  } catch (error) {
    return failure('day', error);
  }
}

/** `POST /api/v1/food-log` — logs a product portion or a quick add. */
export async function addEntry(request: NextRequest) {
  try {
    const athleteId = await getCurrentAthleteId();
    const body = await parseBody(request, foodLogEntryCreateSchema);
    if (!body.ok) {
      return body.response;
    }
    return NextResponse.json(
      { entry: await addFoodLogEntry(athleteId, body.data) },
      { status: 201 },
    );
  } catch (error) {
    return failure('add', error);
  }
}

/** `PATCH /api/v1/food-log/[id]` — a new portion or meal. */
export async function updateEntry(request: NextRequest, id: string) {
  try {
    const athleteId = await getCurrentAthleteId();
    const body = await parseBody(request, foodLogEntryUpdateSchema);
    if (!body.ok) {
      return body.response;
    }
    return NextResponse.json({ entry: await updateFoodLogEntry(athleteId, id, body.data) });
  } catch (error) {
    return failure('update', error);
  }
}

/** `DELETE /api/v1/food-log/[id]`. */
export async function deleteEntry(id: string) {
  try {
    const athleteId = await getCurrentAthleteId();
    await deleteFoodLogEntry(athleteId, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return failure('delete', error);
  }
}

async function limited(athleteId: string) {
  const rateLimit = await checkRateLimit(rateLimiters.foodSearch, athleteId);
  return rateLimit.ok
    ? null
    : NextResponse.json(rateLimitJsonResponse(rateLimit).body, { status: 429 });
}

/** `GET /api/v1/food-log/foods?q=` — own foods first, then Open Food Facts. */
export async function searchFoods(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (query.length < 2 || query.length > 80) {
    return NextResponse.json({ error: 'Recherche de 2 à 80 caractères' }, { status: 400 });
  }
  try {
    const athleteId = await getCurrentAthleteId();
    const blocked = await limited(athleteId);
    if (blocked) {
      return blocked;
    }
    const [own, off] = await Promise.all([
      searchOwnFoods(athleteId, query),
      searchOffProducts(query)
        .then(cacheSearchResults)
        .catch((error) => {
          console.error('[api/v1/food-log] off search', error);
          return null;
        }),
    ]);
    return NextResponse.json({ own, products: off ?? [], offUnavailable: off === null });
  } catch (error) {
    return failure('search', error);
  }
}

/** `GET /api/v1/food-log/foods/barcode/[code]` — a scanned product, or 404. */
export async function foodByBarcode(code: string) {
  if (!isBarcode(code)) {
    return NextResponse.json({ error: 'Code-barres invalide' }, { status: 400 });
  }
  try {
    const athleteId = await getCurrentAthleteId();
    const blocked = await limited(athleteId);
    if (blocked) {
      return blocked;
    }
    const product = await findProductByBarcode(code);
    return product
      ? NextResponse.json({ product })
      : NextResponse.json({ error: 'Produit inconnu d’Open Food Facts' }, { status: 404 });
  } catch (error) {
    console.error('[api/v1/food-log] barcode', error);
    return NextResponse.json({ error: 'Open Food Facts ne répond pas' }, { status: 503 });
  }
}

/** `POST /api/v1/food-log/foods` — the athlete's own food. */
export async function addCustomFood(request: NextRequest) {
  try {
    const athleteId = await getCurrentAthleteId();
    const body = await parseBody(request, customFoodSchema);
    if (!body.ok) {
      return body.response;
    }
    return NextResponse.json(
      { product: await createCustomFood(athleteId, body.data) },
      { status: 201 },
    );
  } catch (error) {
    return failure('custom food', error);
  }
}

/** `PUT /api/v1/food-log/targets?trainingDayId=` — the daily targets; today's row follows. */
export async function putTargets(request: NextRequest) {
  const trainingDayId = request.nextUrl.searchParams.get('trainingDayId');
  if (!trainingDayId || !DAY_ID.test(trainingDayId)) {
    return NextResponse.json({ error: 'trainingDayId requis (YYYY-MM-DD)' }, { status: 400 });
  }
  try {
    const athleteId = await getCurrentAthleteId();
    const body = await parseBody(request, nutritionTargetsSchema);
    if (!body.ok) {
      return body.response;
    }
    return NextResponse.json({
      targets: await setNutritionTargets(athleteId, body.data, trainingDayId),
    });
  } catch (error) {
    return failure('targets', error);
  }
}
