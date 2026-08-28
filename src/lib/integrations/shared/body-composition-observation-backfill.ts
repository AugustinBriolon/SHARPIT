import { startOfDay, subDays } from 'date-fns';

import { bodyCompositionMeasurementToObservation } from '@/core/adapters/body-composition-measurement-adapter';
import type { RawObservation } from '@/core/observation/types';
import { observationEngine } from '@/lib/engines/observation-engine';
import { prisma } from '@/lib/prisma';

export type BodyCompositionObservationBackfillResult = {
  scanned: number;
  ingested: number;
  skipped: number;
};

function collectMissingObservations(
  rows: Awaited<
    ReturnType<typeof prisma.bodyCompositionMeasurement.findMany>
  >,
  existingIds: Set<string>,
): { raws: RawObservation[]; skipped: number } {
  const raws: RawObservation[] = [];
  let skipped = 0;

  for (const row of rows) {
    if (existingIds.has(row.externalId)) {
      skipped += 1;
      continue;
    }

    const raw = bodyCompositionMeasurementToObservation(row);
    if (!raw) {
      skipped += 1;
      continue;
    }

    raws.push(raw);
  }

  return { raws, skipped };
}

/**
 * Backfills Observation records from BodyCompositionMeasurement rows that
 * predate the Observation Engine pipeline (or missed ingest on prior syncs).
 *
 * Idempotent: deduplicates by externalId via ObservationEngine.ingest.
 */
export async function backfillBodyCompositionObservationsFromMeasurements(
  athleteId: string,
  options?: { days?: number; since?: Date },
): Promise<BodyCompositionObservationBackfillResult> {
  const since = options?.since ?? subDays(startOfDay(new Date()), options?.days ?? 365 * 3);

  const rows = await prisma.bodyCompositionMeasurement.findMany({
    where: {
      athleteId,
      measuredAt: { gte: since },
      weightKg: { gt: 0 },
    },
    orderBy: { measuredAt: 'asc' },
  });

  if (rows.length === 0) {
    return { scanned: 0, ingested: 0, skipped: 0 };
  }

  const externalIds = rows.map((row) => row.externalId);
  const existing = await prisma.observation.findMany({
    where: {
      athleteId,
      type: 'BODY_COMPOSITION',
      externalId: { in: externalIds },
    },
    select: { externalId: true },
  });
  const existingIds = new Set(
    existing.map((row) => row.externalId).filter((id): id is string => id !== null),
  );

  const { raws, skipped } = collectMissingObservations(rows, existingIds);

  if (raws.length === 0) {
    return { scanned: rows.length, ingested: 0, skipped };
  }

  const result = await observationEngine.ingestBatch(athleteId, raws);

  return {
    scanned: rows.length,
    ingested: result.stats.accepted + result.stats.flagged,
    skipped: skipped + result.stats.duplicates + result.stats.rejected,
  };
}
