import { BodyCompositionSource } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFindManyMeasurements = vi.fn();
const mockFindManyObservations = vi.fn();
const mockIngestBatch = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    bodyCompositionMeasurement: {
      findMany: (...args: unknown[]) => mockFindManyMeasurements(...args),
    },
    observation: {
      findMany: (...args: unknown[]) => mockFindManyObservations(...args),
    },
  },
}));

vi.mock('@/lib/engines/observation-engine', () => ({
  observationEngine: {
    ingestBatch: (...args: unknown[]) => mockIngestBatch(...args),
  },
}));

import { backfillBodyCompositionObservationsFromMeasurements } from './body-composition-observation-backfill';

describe('backfillBodyCompositionObservationsFromMeasurements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ingests only measurements missing from the observation registry', async () => {
    mockFindManyMeasurements.mockResolvedValue([
      {
        id: 'existing-row',
        source: BodyCompositionSource.WITHINGS,
        externalId: 'already-there',
        measuredAt: new Date('2026-07-01T08:00:00Z'),
        weightKg: 80,
        bodyFatPct: 15,
        musclePct: 40,
        waterPct: 55,
        boneKg: 3,
        visceralFat: 4,
        bmi: 23,
        updatedAt: new Date('2026-07-01T08:01:00Z'),
      },
      {
        id: 'missing-row',
        source: BodyCompositionSource.RENPHO,
        externalId: 'needs-backfill',
        measuredAt: new Date('2026-08-11T08:00:00Z'),
        weightKg: 79.5,
        bodyFatPct: 14,
        musclePct: 41,
        waterPct: 56,
        boneKg: 3.1,
        visceralFat: 3,
        bmi: 22.8,
        updatedAt: new Date('2026-08-11T08:01:00Z'),
      },
    ]);
    mockFindManyObservations.mockResolvedValue([{ externalId: 'already-there' }]);
    mockIngestBatch.mockResolvedValue({
      stats: { accepted: 1, flagged: 0, duplicates: 0, rejected: 0, total: 1 },
    });

    const result = await backfillBodyCompositionObservationsFromMeasurements('default', {
      since: new Date('2026-07-01T00:00:00Z'),
    });

    expect(result).toEqual({ scanned: 2, ingested: 1, skipped: 1 });
    expect(mockIngestBatch).toHaveBeenCalledOnce();
    expect(mockIngestBatch.mock.calls[0]?.[1]).toHaveLength(1);
    expect(mockIngestBatch.mock.calls[0]?.[1][0]).toMatchObject({
      type: 'BODY_COMPOSITION',
      source: 'RENPHO',
      externalId: 'needs-backfill',
      weightKg: 79.5,
    });
  });

  it('returns zero counts when no measurements are in scope', async () => {
    mockFindManyMeasurements.mockResolvedValue([]);

    const result = await backfillBodyCompositionObservationsFromMeasurements();

    expect(result).toEqual({ scanned: 0, ingested: 0, skipped: 0 });
    expect(mockIngestBatch).not.toHaveBeenCalled();
  });
});
