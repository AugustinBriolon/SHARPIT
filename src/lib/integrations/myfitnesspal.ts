const MFP_BASE = 'https://www.myfitnesspal.com';
const SESSION_COOKIE_NAME = '__Secure-next-auth.session-token';

export function isMfpConfigured() {
  return true;
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export type MfpSession = {
  sessionToken: string;
};

export class MfpSessionExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MfpSessionExpiredError';
  }
}

function mfpHeaders(sessionToken: string): Record<string, string> {
  return {
    Cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
    Accept: 'application/json',
  };
}

async function mfpGet<T>(path: string, session: MfpSession): Promise<T> {
  const res = await fetch(`${MFP_BASE}${path}`, { headers: mfpHeaders(session.sessionToken) });
  if (res.status === 401 || res.status === 403) {
    throw new MfpSessionExpiredError(
      'Session MyFitnessPal expirée. Reconnecte-toi avec un nouveau cookie de session.',
    );
  }
  if (!res.ok) {
    throw new Error(`MFP request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Diary via authenticated JSON API
// ---------------------------------------------------------------------------

export type MfpScrapedMeal = {
  name: string;
  entries: Array<{
    name: string;
    calories: number;
    fat: number;
    carbohydrates: number;
    protein: number;
    sugar: number;
    fiber: number;
  }>;
};

export type MfpDayResult = {
  date: string;
  meals: MfpScrapedMeal[];
  totals: {
    calories: number;
    fat: number;
    carbohydrates: number;
    protein: number;
    sugar: number;
    fiber: number;
  };
  complete: boolean;
};

type MfpDiaryEntry = {
  meal_name?: string;
  food?: {
    description?: string;
  };
  nutritional_contents?: {
    energy?: { value: number; unit: string };
    fat?: number | null;
    carbohydrates?: number | null;
    protein?: number | null;
    sugar?: number | null;
    fiber?: number | null;
  };
};

type MfpDayStatus = {
  status: string | null;
};

function num(value: number | null | undefined): number {
  return value ?? 0;
}

/** Pure grouping/aggregation, kept separate from fetching so it can be unit-tested with fixtures. */
export function buildDayResult(
  entries: MfpDiaryEntry[],
  dayStatus: MfpDayStatus | null,
  dateStr: string,
): MfpDayResult {
  const mealsByName = new Map<string, MfpScrapedMeal>();

  for (const entry of entries) {
    const mealName = (entry.meal_name ?? '').toLowerCase();
    const nutrients = entry.nutritional_contents ?? {};

    if (!mealsByName.has(mealName)) {
      mealsByName.set(mealName, { name: mealName, entries: [] });
    }

    mealsByName.get(mealName)!.entries.push({
      name: entry.food?.description ?? '',
      calories: num(nutrients.energy?.value),
      fat: num(nutrients.fat),
      carbohydrates: num(nutrients.carbohydrates),
      protein: num(nutrients.protein),
      sugar: num(nutrients.sugar),
      fiber: num(nutrients.fiber),
    });
  }

  const meals = Array.from(mealsByName.values());

  const totals = { calories: 0, fat: 0, carbohydrates: 0, protein: 0, sugar: 0, fiber: 0 };
  for (const meal of meals) {
    for (const entry of meal.entries) {
      totals.calories += entry.calories;
      totals.fat += entry.fat;
      totals.carbohydrates += entry.carbohydrates;
      totals.protein += entry.protein;
      totals.sugar += entry.sugar;
      totals.fiber += entry.fiber;
    }
  }

  return { date: dateStr, meals, totals, complete: Boolean(dayStatus?.status) };
}

export async function fetchDiaryDay(session: MfpSession, dateStr: string): Promise<MfpDayResult> {
  const [rawEntries, dayStatus] = await Promise.all([
    mfpGet<MfpDiaryEntry[] | { items?: MfpDiaryEntry[] }>(
      `/api/services/diary/read_diary?entry_date=${dateStr}&fields=all&types=food_entry`,
      session,
    ),
    mfpGet<MfpDayStatus>(`/api/services/diary/read_day?date=${dateStr}`, session).catch(() => null),
  ]);

  const entries = Array.isArray(rawEntries) ? rawEntries : (rawEntries.items ?? []);

  return buildDayResult(entries, dayStatus, dateStr);
}

export async function fetchDisplayName(session: MfpSession): Promise<string | null> {
  const user = await mfpGet<{ email?: string; username?: string }>('/api/services/users', session);
  return user.email ?? user.username ?? null;
}
