import { describe, it, expect, afterEach } from 'vitest';
import {
  MfpSessionExpiredError,
  buildDayResult,
  parseNutrientGoalsForDate,
  parseRotatedSessionToken,
  refreshMfpSession,
  sumExerciseCalories,
} from './myfitnesspal';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures — shaped exactly like MFP's real read_diary response.
// ─────────────────────────────────────────────────────────────────────────────

function buildEntry(overrides: {
  meal_name?: string;
  description?: string;
  energy?: number;
  fat?: number | null;
  carbohydrates?: number | null;
  protein?: number | null;
  sugar?: number | null;
  fiber?: number | null;
}) {
  return {
    meal_name: overrides.meal_name ?? 'Lunch',
    food: { description: overrides.description ?? 'Test food' },
    nutritional_contents: {
      energy: { value: overrides.energy ?? 0, unit: 'calories' },
      fat: overrides.fat ?? null,
      carbohydrates: overrides.carbohydrates ?? null,
      protein: overrides.protein ?? null,
      sugar: overrides.sugar ?? null,
      fiber: overrides.fiber ?? null,
    },
  };
}

describe('buildDayResult', () => {
  it('groups entries by meal and sums totals across meals', () => {
    const entries = [
      buildEntry({
        meal_name: 'Lunch',
        description: 'FoodChéri - Nos linguine & meatballs',
        energy: 562.2,
        fat: 21.6,
        carbohydrates: 49.4,
        protein: 39.6,
        sugar: 5.9,
        fiber: 5.3,
      }),
      buildEntry({
        meal_name: 'Dinner',
        description: 'Chicken breast',
        energy: 165,
        fat: 3.6,
        carbohydrates: 0,
        protein: 31,
        sugar: 0,
        fiber: 0,
      }),
    ];

    const result = buildDayResult(entries, { status: null }, '2026-08-19');

    expect(result.date).toBe('2026-08-19');
    expect(result.meals).toHaveLength(2);
    expect(result.meals.map((m) => m.name)).toEqual(['lunch', 'dinner']);
    expect(result.totals.calories).toBeCloseTo(727.2);
    expect(result.totals.fat).toBeCloseTo(25.2);
    expect(result.totals.carbohydrates).toBeCloseTo(49.4);
    expect(result.totals.protein).toBeCloseTo(70.6);
    expect(result.totals.sugar).toBeCloseTo(5.9);
    expect(result.totals.fiber).toBeCloseTo(5.3);
  });

  it('defaults null nutrient fields to 0', () => {
    const entries = [buildEntry({ energy: 100 })];

    const result = buildDayResult(entries, { status: null }, '2026-08-19');

    expect(result.meals[0].entries[0]).toEqual({
      name: 'Test food',
      calories: 100,
      fat: 0,
      carbohydrates: 0,
      protein: 0,
      sugar: 0,
      fiber: 0,
    });
  });

  it('merges multiple entries within the same meal into one group', () => {
    const entries = [
      buildEntry({ meal_name: 'Breakfast', description: 'Toast', energy: 120 }),
      buildEntry({ meal_name: 'Breakfast', description: 'Coffee', energy: 5 }),
    ];

    const result = buildDayResult(entries, { status: null }, '2026-08-19');

    expect(result.meals).toHaveLength(1);
    expect(result.meals[0].entries).toHaveLength(2);
    expect(result.totals.calories).toBe(125);
  });

  it('marks the day complete only when the day-status endpoint reports a status', () => {
    const entries = [buildEntry({ energy: 100 })];

    expect(buildDayResult(entries, { status: null }, '2026-08-19').complete).toBe(false);
    expect(buildDayResult(entries, { status: 'complete' }, '2026-08-19').complete).toBe(true);
    expect(buildDayResult(entries, null, '2026-08-19').complete).toBe(false);
  });

  it('returns empty meals and zeroed totals for an empty day', () => {
    const result = buildDayResult([], { status: null }, '2026-08-19');

    expect(result.meals).toEqual([]);
    expect(result.totals).toEqual({
      calories: 0,
      fat: 0,
      carbohydrates: 0,
      protein: 0,
      sugar: 0,
      fiber: 0,
    });
  });
});

describe('parseNutrientGoalsForDate', () => {
  it('selects the goal bundle for the requested weekday', () => {
    const goals = parseNutrientGoalsForDate(
      [
        {
          valid_from: '2026-08-19',
          valid_to: '2100-01-01',
          daily_goals: [
            {
              day_of_week: 'wednesday',
              energy: { value: 2400, unit: 'calories' },
              protein: 180,
              carbohydrates: 270,
              fat: 67,
            },
          ],
        },
      ],
      '2026-08-19',
    );

    expect(goals).toEqual({
      calories: 2400,
      protein: 180,
      carbohydrates: 270,
      fat: 67,
      fiber: null,
      sugar: null,
    });
  });
});

describe('sumExerciseCalories', () => {
  it('ignores deleted exercise entries', () => {
    const total = sumExerciseCalories([
      { energy: { value: 12 }, exercise: { deleted: true } },
      { energy: { value: 300 } },
    ]);

    expect(total).toBe(300);
  });
});

describe('parseRotatedSessionToken', () => {
  const cookieName = '__Secure-next-auth.session-token';

  it('extracts the rotated token from a next-auth Set-Cookie header', () => {
    const headers = [
      'anon-device-id=abc; Domain=myfitnesspal.com; Path=/; Secure',
      `${cookieName}=rotated.jwt.value; Path=/; HttpOnly; Secure; SameSite=Lax`,
    ];

    expect(parseRotatedSessionToken(headers)).toBe('rotated.jwt.value');
  });

  it('returns null when MFP sends no session cookie back', () => {
    expect(parseRotatedSessionToken(['__cf_bm=noise; Path=/; Secure'])).toBeNull();
    expect(parseRotatedSessionToken([])).toBeNull();
  });

  it('ignores chunked session cookies rather than storing a partial token', () => {
    const headers = [
      `${cookieName}.0=first-half; Path=/; HttpOnly; Secure`,
      `${cookieName}.1=second-half; Path=/; HttpOnly; Secure`,
    ];

    expect(parseRotatedSessionToken(headers)).toBeNull();
  });

  it('treats a cleared session cookie as no rotation', () => {
    expect(
      parseRotatedSessionToken([`${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`]),
    ).toBeNull();
  });
});

describe('refreshMfpSession', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockSessionResponse(body: unknown, setCookie: string[] = []) {
    const headers = new Headers();
    for (const cookie of setCookie) {
      headers.append('set-cookie', cookie);
    }

    globalThis.fetch = (async () =>
      new Response(JSON.stringify(body), { status: 200, headers })) as typeof fetch;
  }

  it('rolls the cookie forward when MFP re-issues one', async () => {
    mockSessionResponse({ user: { name: 'athlete' } }, [
      '__Secure-next-auth.session-token=rotated.jwt; Path=/; HttpOnly; Secure',
    ]);

    const refreshed = await refreshMfpSession({ sessionToken: 'old.jwt' });

    expect(refreshed).toEqual({ sessionToken: 'rotated.jwt', rotated: true });
  });

  it('never reports expiry when the session endpoint answers without a user', async () => {
    // MFP answers 200 {} both for a dead cookie and for a request that never
    // carried a live one. Concluding expiry here revoked a valid credential in
    // production, so this must stay a plain failure the sync can shrug off.
    mockSessionResponse({});

    await expect(refreshMfpSession({ sessionToken: 'still.valid.jwt' })).rejects.not.toBeInstanceOf(
      MfpSessionExpiredError,
    );
  });
});
