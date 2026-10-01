import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));
vi.mock('@sharpit/server/lib/auth/current-athlete', () => ({
  getCurrentAthleteId: vi.fn().mockResolvedValue('athlete-1'),
}));
vi.mock('@sharpit/server/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ ok: true }),
  rateLimitJsonResponse: vi.fn(() => ({ body: { error: 'Trop de requêtes' }, status: 429 })),
  rateLimiters: { foodSearch: {} },
}));
vi.mock('@sharpit/server/lib/nutrition/food-log/open-food-facts-client', () => ({
  searchOffProducts: vi.fn(),
}));
vi.mock('@sharpit/server/lib/nutrition/food-log/food-log-service', () => {
  class FoodLogNotFoundError extends Error {}
  return {
    FoodLogNotFoundError,
    addFoodLogEntry: vi.fn(),
    cacheSearchResults: vi.fn(),
    createCustomFood: vi.fn(),
    deleteFoodLogEntry: vi.fn(),
    findProductByBarcode: vi.fn(),
    getNutritionTargets: vi.fn(),
    listFoodLogDay: vi.fn(),
    recentFoods: vi.fn(),
    searchOwnFoods: vi.fn(),
    setNutritionTargets: vi.fn(),
    updateFoodLogEntry: vi.fn(),
  };
});

const BASE = 'https://api.sharpit.app/api/food-log';

function json(method: string, path: string, body: unknown) {
  return new NextRequest(`${BASE}${path}`, { method, body: JSON.stringify(body) });
}

const service = () => import('@sharpit/server/lib/nutrition/food-log/food-log-service');

describe('/api/food-log', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('reads a day with its targets and recent foods', async () => {
    const { GET } = await import('./handler');
    const log = await service();
    vi.mocked(log.listFoodLogDay).mockResolvedValue([]);
    vi.mocked(log.getNutritionTargets).mockResolvedValue({ kcal: 2600 } as never);
    vi.mocked(log.recentFoods).mockResolvedValue([]);

    const response = await GET(new NextRequest(`${BASE}?trainingDayId=2026-10-01`));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      trainingDayId: '2026-10-01',
      entries: [],
      targets: { kcal: 2600 },
      recent: [],
    });
    expect(log.listFoodLogDay).toHaveBeenCalledWith('athlete-1', '2026-10-01');
  });

  it('asks for the day', async () => {
    const { GET } = await import('./handler');
    expect((await GET(new NextRequest(BASE))).status).toBe(400);
  });

  it('logs a valid entry and refuses an invalid one', async () => {
    const { POST } = await import('./handler');
    const log = await service();
    vi.mocked(log.addFoodLogEntry).mockResolvedValue({ id: 'e1' } as never);

    const created = await POST(
      json('POST', '', { trainingDayId: '2026-10-01', meal: 'LUNCH', grams: 120, productId: 'p1' }),
    );
    expect(created.status).toBe(201);

    const refused = await POST(json('POST', '', { trainingDayId: '2026-10-01', meal: 'LUNCH' }));
    expect(refused.status).toBe(400);
    expect(log.addFoodLogEntry).toHaveBeenCalledTimes(1);
  });

  it("answers 404 for a food or entry that is not the athlete's", async () => {
    const { POST } = await import('./handler');
    const log = await service();
    vi.mocked(log.addFoodLogEntry).mockRejectedValue(
      new log.FoodLogNotFoundError('Aliment introuvable'),
    );

    const response = await POST(
      json('POST', '', { trainingDayId: '2026-10-01', meal: 'LUNCH', grams: 120, productId: 'x' }),
    );

    expect(response.status).toBe(404);
  });

  it('deletes an entry', async () => {
    const { DELETE } = await import('./[id]/handler');
    const log = await service();

    const response = await DELETE(new NextRequest(`${BASE}/e1`, { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'e1' }),
    });

    expect(response.status).toBe(204);
    expect(log.deleteFoodLogEntry).toHaveBeenCalledWith('athlete-1', 'e1');
  });
});

describe('/api/food-log/foods', () => {
  beforeEach(() => vi.clearAllMocks());

  it('searches own foods and Open Food Facts, and says when OFF is down', async () => {
    const { GET } = await import('./foods/handler');
    const log = await service();
    const { searchOffProducts } =
      await import('@sharpit/server/lib/nutrition/food-log/open-food-facts-client');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(log.searchOwnFoods).mockResolvedValue([{ id: 'own' }] as never);
    vi.mocked(searchOffProducts).mockRejectedValue(new Error('503'));

    const body = await (await GET(new NextRequest(`${BASE}/foods?q=skyr`))).json();

    expect(body).toEqual({ own: [{ id: 'own' }], products: [], offUnavailable: true });
  });

  it('refuses a one-letter search', async () => {
    const { GET } = await import('./foods/handler');
    expect((await GET(new NextRequest(`${BASE}/foods?q=s`))).status).toBe(400);
  });

  it('answers 404 for a barcode Open Food Facts does not know, 400 for a non-barcode', async () => {
    const { GET } = await import('./foods/barcode/[code]/handler');
    const log = await service();
    vi.mocked(log.findProductByBarcode).mockResolvedValue(null);
    const read = (code: string) =>
      GET(new NextRequest(`${BASE}/foods/barcode/${code}`), { params: Promise.resolve({ code }) });

    expect((await read('3017620422003')).status).toBe(404);
    expect((await read('abc')).status).toBe(400);
  });
});

describe('/api/food-log/targets', () => {
  it("saves the targets and gives today's row its goals", async () => {
    const { PUT } = await import('./targets/handler');
    const log = await service();
    vi.mocked(log.setNutritionTargets).mockResolvedValue({ kcal: 2600 } as never);

    const response = await PUT(json('PUT', '/targets?trainingDayId=2026-10-01', { kcal: 2600 }));

    expect(response.status).toBe(200);
    expect(log.setNutritionTargets).toHaveBeenCalledWith('athlete-1', { kcal: 2600 }, '2026-10-01');
  });
});
