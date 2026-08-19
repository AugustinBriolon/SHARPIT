/* eslint-disable no-console -- script CLI : sortie console attendue */
/**
 * Backfills BODY_COMPOSITION observations from stored BodyCompositionMeasurement rows.
 *
 * Provider syncs historically wrote to BodyCompositionMeasurement only; observations
 * were created on first import. Re-syncs treated rows as updates and skipped ingest,
 * leaving a gap in the observation registry.
 *
 * Idempotent: ObservationEngine deduplicates by externalId.
 *
 * Usage:
 *   yarn db:backfill:body-composition-observations --dry-run
 *   yarn db:backfill:body-composition-observations
 */
import { backfillBodyCompositionObservationsFromMeasurements } from '../src/lib/integrations/body-composition-observation-backfill';
import { prisma } from '../src/lib/prisma';

const dryRun = process.argv.includes('--dry-run');

async function main() {
  const [measurementCount, observationCount] = await Promise.all([
    prisma.bodyCompositionMeasurement.count({ where: { weightKg: { gt: 0 } } }),
    prisma.observation.count({ where: { type: 'BODY_COMPOSITION' } }),
  ]);

  console.log(`body composition measurements: ${measurementCount}`);
  console.log(`existing BODY_COMPOSITION observations: ${observationCount}\n`);

  if (dryRun) {
    console.log('dry-run: no observations will be written');
    return;
  }

  const result = await backfillBodyCompositionObservationsFromMeasurements();
  console.log(
    `backfill complete — scanned: ${result.scanned}, ingested: ${result.ingested}, skipped: ${result.skipped}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
