import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sharpit/db/client', () => ({
  prisma: {
    foodLogEntry: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    foodProduct: { findFirst: vi.fn(), findUnique: vi.fn(), upsert: vi.fn() },
    dailyNutrition: { upsert: vi.fn(), deleteMany: vi.fn() },
    athleteProfile: { findUnique: vi.fn(), update: vi.fn() },
  },
}));
vi.mock('@sharpit/server/lib/engines/observation-engine', () => ({
  observationEngine: { ingest: vi.fn() },
}));
vi.mock('./open-food-facts-client', () => ({ fetchOffProduct: vi.fn() }));

const SKYR = {
  id: 'p-skyr',
  source: 'OFF',
  barcode: '5690845000621',
  name: 'Skyr',
  brand: 'Isey',
  kcalPer100g: 62,
  proteinPer100g: 11,
  carbsPer100g: 4,
  fatPer100g: 0.2,
  fiberPer100g: null,
  sugarPer100g: 4,
  fetchedAt: new Date(),
};

const DAY = new Date('2026-10-01T00:00:00.000Z');

function storedEntry(patch: object = {}) {
  return {
    id: 'e1',
    athleteId: 'athlete-1',
    date: DAY,
    meal: 'BREAKFAST',
    productId: 'p-skyr',
    name: 'Skyr',
    brand: 'Isey',
    grams: 150,
    kcal: 93,
    protein: 16.5,
    carbs: 6,
    fat: 0.3,
    fiber: null,
    sugar: 6,
    createdAt: DAY,
    ...patch,
  };
}

async function setup() {
  const { prisma } = await import('@sharpit/db/client');
  const service = await import('./food-log-service');
  const { observationEngine } = await import('@sharpit/server/lib/engines/observation-engine');
  vi.mocked(prisma.athleteProfile.findUnique).mockResolvedValue({
    nutritionTargetKcal: 2600,
    nutritionTargetProteinG: 140,
    nutritionTargetCarbsG: null,
    nutritionTargetFatG: null,
  } as never);
  return { prisma, service, observationEngine };
}

describe('food log service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('logs a portion of a product, snapshotting its nutrients, then rebuilds the day', async () => {
    const { prisma, service, observationEngine } = await setup();
    vi.mocked(prisma.foodProduct.findFirst).mockResolvedValue(SKYR as never);
    vi.mocked(prisma.foodLogEntry.create).mockResolvedValue(storedEntry() as never);
    vi.mocked(prisma.foodLogEntry.findMany).mockResolvedValue([storedEntry()] as never);

    await service.addFoodLogEntry('athlete-1', {
      trainingDayId: '2026-10-01',
      meal: 'BREAKFAST',
      grams: 150,
      productId: 'p-skyr',
    });

    expect(prisma.foodLogEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ kcal: 93, protein: 16.5, name: 'Skyr', productId: 'p-skyr' }),
    });
    expect(prisma.dailyNutrition.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          athleteId_date_provider: { athleteId: 'athlete-1', date: DAY, provider: 'sharpit' },
        },
        create: expect.objectContaining({ calories: 93, goalCalories: 2600, goalProtein: 140 }),
      }),
    );
    expect(observationEngine.ingest).toHaveBeenCalledWith(
      'athlete-1',
      expect.objectContaining({
        type: 'NUTRITION',
        source: 'MANUAL',
        energyKcal: 93,
        entryCount: 1,
      }),
    );
  });

  it("never logs another athlete's own food", async () => {
    const { prisma, service } = await setup();
    vi.mocked(prisma.foodProduct.findFirst).mockResolvedValue(null);

    await expect(
      service.addFoodLogEntry('athlete-1', {
        trainingDayId: '2026-10-01',
        meal: 'LUNCH',
        grams: 100,
        productId: 'someone-elses',
      }),
    ).rejects.toBeInstanceOf(service.FoodLogNotFoundError);
    expect(prisma.foodProduct.findFirst).toHaveBeenCalledWith({
      where: { id: 'someone-elses', OR: [{ source: 'OFF' }, { ownerId: 'athlete-1' }] },
    });
    expect(prisma.foodLogEntry.create).not.toHaveBeenCalled();
  });

  it('drops the day row when its last entry is deleted', async () => {
    const { prisma, service, observationEngine } = await setup();
    vi.mocked(prisma.foodLogEntry.findFirst).mockResolvedValue(storedEntry() as never);
    vi.mocked(prisma.foodLogEntry.findMany).mockResolvedValue([]);

    await service.deleteFoodLogEntry('athlete-1', 'e1');

    expect(prisma.dailyNutrition.deleteMany).toHaveBeenCalledWith({
      where: { athleteId: 'athlete-1', date: DAY, provider: 'sharpit' },
    });
    expect(prisma.dailyNutrition.upsert).not.toHaveBeenCalled();
    expect(observationEngine.ingest).not.toHaveBeenCalled();
  });

  it('rescales a quick add by its own kcal per gram', async () => {
    const { prisma, service } = await setup();
    const quick = storedEntry({ productId: null, grams: 200, kcal: 400, protein: 20 });
    vi.mocked(prisma.foodLogEntry.findFirst).mockResolvedValue(quick as never);
    vi.mocked(prisma.foodLogEntry.update).mockResolvedValue(quick as never);
    vi.mocked(prisma.foodLogEntry.findMany).mockResolvedValue([quick] as never);

    await service.updateFoodLogEntry('athlete-1', 'e1', { grams: 100 });

    expect(prisma.foodLogEntry.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: expect.objectContaining({ grams: 100, kcal: 200, protein: 10 }),
    });
  });

  it('serves a fresh cached barcode without calling Open Food Facts', async () => {
    const { prisma, service } = await setup();
    const { fetchOffProduct } = await import('./open-food-facts-client');
    vi.mocked(prisma.foodProduct.findUnique).mockResolvedValue(SKYR as never);

    expect(await service.findProductByBarcode('5690845000621')).toBe(SKYR);
    expect(fetchOffProduct).not.toHaveBeenCalled();
  });

  it('keeps a stale cached product when Open Food Facts is down', async () => {
    const { prisma, service } = await setup();
    const { fetchOffProduct } = await import('./open-food-facts-client');
    const stale = { ...SKYR, fetchedAt: new Date('2025-01-01') };
    vi.mocked(prisma.foodProduct.findUnique).mockResolvedValue(stale as never);
    vi.mocked(fetchOffProduct).mockRejectedValue(new Error('503'));

    expect(await service.findProductByBarcode('5690845000621')).toBe(stale);
  });
});
