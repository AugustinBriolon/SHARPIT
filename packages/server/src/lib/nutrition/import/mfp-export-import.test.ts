import { beforeEach, describe, expect, it, vi } from 'vitest';
import { strToU8, zipSync } from 'fflate';

vi.mock('@sharpit/db/client', () => ({
  prisma: {
    $transaction: vi.fn(),
    dailyNutrition: { deleteMany: vi.fn(), createMany: vi.fn(), findMany: vi.fn() },
  },
}));
vi.mock('@sharpit/server/lib/engines/observation-engine', () => ({
  observationEngine: { ingest: vi.fn().mockResolvedValue({ status: 'ACCEPTED' }) },
}));

const CSV = [
  'Date,Meal,Calories,Fat (g),Carbohydrates (g),Protein (g)',
  '2026-09-30,Breakfast,500,10,70,25',
  '2026-09-30,Dinner,700,25,60,45',
  '2026-10-01,Lunch,800,30,85,45',
  '2025-01-01,Lunch,600,20,70,30',
].join('\n');

const NOW = new Date('2026-10-01T18:00:00Z');

async function setup() {
  const { prisma } = await import('@sharpit/db/client');
  const { observationEngine } = await import('@sharpit/server/lib/engines/observation-engine');
  const module = await import('./mfp-export-import');
  vi.mocked(prisma.dailyNutrition.findMany).mockResolvedValue([
    { date: new Date('2026-10-01T00:00:00.000Z') },
  ] as never);
  return { prisma, observationEngine, ...module };
}

describe('importMfpExport', () => {
  beforeEach(() => vi.clearAllMocks());

  it('replaces the previous import with one row of meal totals per day', async () => {
    const { prisma, importMfpExport } = await setup();

    const result = await importMfpExport('athlete-1', strToU8(CSV), NOW);

    expect(result).toEqual({
      importedDays: 3,
      firstDay: '2025-01-01',
      lastDay: '2026-10-01',
      skippedRows: 0,
    });
    expect(prisma.dailyNutrition.deleteMany).toHaveBeenCalledWith({
      where: { athleteId: 'athlete-1', provider: 'myfitnesspal_import' },
    });
    const rows = vi.mocked(prisma.dailyNutrition.createMany).mock.calls[0]![0]!.data;
    expect((rows as Array<Record<string, unknown>>)[1]).toMatchObject({
      athleteId: 'athlete-1',
      date: new Date('2026-09-30T00:00:00.000Z'),
      provider: 'myfitnesspal_import',
      calories: 1200,
      protein: 70,
      carbohydrates: 130,
      fat: 35,
      complete: true,
    });
  });

  it('feeds FUEL only recent days no other source speaks for', async () => {
    const { observationEngine, importMfpExport } = await setup();

    await importMfpExport('athlete-1', strToU8(CSV), NOW);

    expect(observationEngine.ingest).toHaveBeenCalledTimes(1);
    expect(observationEngine.ingest).toHaveBeenCalledWith(
      'athlete-1',
      expect.objectContaining({
        type: 'NUTRITION',
        source: 'MYFITNESSPAL',
        timestamp: new Date('2026-09-30T12:00:00Z'),
        energyKcal: 1200,
      }),
    );
  });

  it('reads the nutrition CSV out of the ZIP MyFitnessPal emails', async () => {
    const { exportText } = await setup();
    const zip = zipSync({
      'Exercise-Summary.csv': strToU8('Date,Exercise'),
      'Nutrition-Summary-2024-01-01-to-2026-09-30.csv': strToU8(CSV),
    });

    expect(exportText(zip)).toBe(CSV);
    expect(() => exportText(zipSync({ 'Exercise.csv': strToU8('x') }))).toThrow(
      /fichier nutrition/,
    );
  });
});
