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

export type MfpSessionRefresh = {
  sessionToken: string;
  rotated: boolean;
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

type SetCookieCapableHeaders = Headers & { getSetCookie?: () => string[] };

function readSetCookieHeaders(res: Response): string[] {
  const headers = res.headers as SetCookieCapableHeaders;
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }

  const single = headers.get('set-cookie');
  return single ? [single] : [];
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

/**
 * Extracts a rotated session cookie from a `Set-Cookie` header list.
 *
 * Pure so it can be unit-tested without hitting MFP. Chunked next-auth cookies
 * (`…session-token.0`, `.1`) are deliberately ignored: the stored credential is a
 * single-value cookie, and half a token is worse than no rotation at all.
 */
export function parseRotatedSessionToken(setCookieHeaders: string[]): string | null {
  for (const header of setCookieHeaders) {
    const [pair] = header.split(';');
    const separator = pair.indexOf('=');
    if (separator === -1) {
      continue;
    }

    const name = pair.slice(0, separator).trim();
    if (name !== SESSION_COOKIE_NAME) {
      continue;
    }

    const value = pair.slice(separator + 1).trim();
    return value.length > 0 ? value : null;
  }
  return null;
}

/**
 * Touches MFP's next-auth session endpoint to keep the credential alive.
 *
 * next-auth re-issues its JWT cookie once a session is older than `updateAge`, so
 * calling this on every sync rolls the ~30-day expiry forward indefinitely and
 * removes the manual re-paste. Returns the token to use from now on.
 *
 * This function never reports expiry. The endpoint answers `200 {}` both for a
 * dead cookie and for a request that never carried a live one — a Cloudflare
 * interstitial, an edge hiccup, a throttle — and those are indistinguishable
 * from here. Treating that as expiry once revoked a still-valid credential in
 * production and forced a manual reconnect, which is the exact pain rotation
 * exists to remove. Only a 401/403 on a real diary read may conclude expiry.
 */
export async function refreshMfpSession(session: MfpSession): Promise<MfpSessionRefresh> {
  const res = await fetch(`${MFP_BASE}/api/auth/session`, {
    headers: mfpHeaders(session.sessionToken),
  });

  if (!res.ok) {
    throw new Error(`MFP session refresh failed: ${res.status}`);
  }

  const payload = (await res.json().catch(() => ({}))) as { user?: unknown };
  if (!payload.user) {
    throw new Error('MFP session refresh returned no user; keeping the stored cookie');
  }

  const rotatedToken = parseRotatedSessionToken(readSetCookieHeaders(res));
  if (!rotatedToken || rotatedToken === session.sessionToken) {
    return { sessionToken: session.sessionToken, rotated: false };
  }

  return { sessionToken: rotatedToken, rotated: true };
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
  goals: MfpNutrientGoals | null;
  exerciseCalories: number;
};

export type MfpNutrientGoals = {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
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

type MfpNutrientGoalDay = {
  day_of_week?: string;
  energy?: { value?: number; unit?: string };
  protein?: number | null;
  carbohydrates?: number | null;
  fat?: number | null;
  fiber?: number | null;
  sugar?: number | null;
};

type MfpNutrientGoalBundle = {
  valid_from?: string;
  valid_to?: string;
  daily_goals?: MfpNutrientGoalDay[];
  default_goal?: MfpNutrientGoalDay;
};

type MfpExerciseEntry = {
  type?: string;
  energy?: { value?: number; unit?: string };
  exercise?: { deleted?: boolean };
};

function num(value: number | null | undefined): number {
  return value ?? 0;
}

/** Maps a calendar date to MFP's english day_of_week key. */
export function nutrientGoalDayKey(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const keys = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ] as const;
  return keys[weekday];
}

/** Pure parser — unit-tested against live MFP nutrient-goals payloads. */
export function parseNutrientGoalsForDate(
  bundles: MfpNutrientGoalBundle[],
  dateStr: string,
): MfpNutrientGoals | null {
  if (!Array.isArray(bundles) || bundles.length === 0) {
    return null;
  }

  const bundle =
    bundles.find((item) => {
      if (!item.valid_from) {
        return true;
      }
      return item.valid_from <= dateStr && (item.valid_to === null || item.valid_to >= dateStr);
    }) ?? bundles[0];

  const dayKey = nutrientGoalDayKey(dateStr);
  const dayGoal =
    bundle.daily_goals?.find((goal) => goal.day_of_week?.toLowerCase() === dayKey) ??
    bundle.default_goal ??
    null;

  if (!dayGoal?.energy?.value) {
    return null;
  }

  return {
    calories: Math.round(dayGoal.energy.value),
    protein: Math.round(num(dayGoal.protein)),
    carbohydrates: Math.round(num(dayGoal.carbohydrates)),
    fat: Math.round(num(dayGoal.fat)),
    fiber: dayGoal.fiber !== null ? Math.round(dayGoal.fiber) : null,
    sugar: dayGoal.sugar !== null ? Math.round(dayGoal.sugar) : null,
  };
}

export function sumExerciseCalories(entries: MfpExerciseEntry[]): number {
  return entries.reduce((sum, entry) => {
    if (entry.exercise?.deleted) {
      return sum;
    }
    return sum + num(entry.energy?.value);
  }, 0);
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

  return {
    date: dateStr,
    meals,
    totals,
    complete: Boolean(dayStatus?.status),
    goals: null,
    exerciseCalories: 0,
  };
}

export async function fetchNutrientGoals(
  session: MfpSession,
  dateStr: string,
): Promise<MfpNutrientGoals | null> {
  const bundles = await mfpGet<MfpNutrientGoalBundle[]>(
    `/api/services/nutrient-goals?date=${dateStr}`,
    session,
  ).catch(() => null);

  if (!bundles) {
    return null;
  }
  return parseNutrientGoalsForDate(bundles, dateStr);
}

async function fetchExerciseEntries(
  session: MfpSession,
  dateStr: string,
): Promise<MfpExerciseEntry[]> {
  const raw = await mfpGet<MfpExerciseEntry[] | { items?: MfpExerciseEntry[] }>(
    `/api/services/diary/read_diary?entry_date=${dateStr}&fields=all&types=exercise_entry`,
    session,
  ).catch(() => []);

  return Array.isArray(raw) ? raw : (raw.items ?? []);
}

export async function fetchDiaryDay(session: MfpSession, dateStr: string): Promise<MfpDayResult> {
  const [rawEntries, dayStatus, goals, exerciseEntries] = await Promise.all([
    mfpGet<MfpDiaryEntry[] | { items?: MfpDiaryEntry[] }>(
      `/api/services/diary/read_diary?entry_date=${dateStr}&fields=all&types=food_entry`,
      session,
    ),
    mfpGet<MfpDayStatus>(`/api/services/diary/read_day?date=${dateStr}`, session).catch(() => null),
    fetchNutrientGoals(session, dateStr),
    fetchExerciseEntries(session, dateStr),
  ]);

  const entries = Array.isArray(rawEntries) ? rawEntries : (rawEntries.items ?? []);
  const base = buildDayResult(entries, dayStatus, dateStr);

  return {
    ...base,
    goals,
    exerciseCalories: Math.round(sumExerciseCalories(exerciseEntries)),
  };
}

export async function fetchDisplayName(session: MfpSession): Promise<string | null> {
  const user = await mfpGet<{ email?: string; username?: string }>('/api/services/users', session);
  return user.email ?? user.username ?? null;
}
