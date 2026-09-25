/**
 * Recomputes FUEL feature sets for every day with a NUTRITION observation.
 *
 * Use after backfilling BODY_COMPOSITION observations so proteinGPerKg and
 * carbohydratesGPerKg pick up the athlete's latest weight.
 *
 * Safe to re-run: computeDayFeatures writes a new version per day.
 *
 * Usage:
 *   yarn db:recompute:fuel-features --dry-run
 *   yarn db:recompute:fuel-features
 */
import { featureEngine } from '../src/lib/engines/feature-engine';
import { prisma } from '../src/lib/prisma';

const dryRun = process.argv.includes('--dry-run');
const ATHLETE_ID = 'default';

async function main() {
  const nutritionDays = await prisma.observation.findMany({
    where: { athleteId: ATHLETE_ID, type: 'NUTRITION' },
    select: { trainingDayId: true },
    distinct: ['trainingDayId'],
    orderBy: { trainingDayId: 'asc' },
  });

  const fuelBefore = await prisma.featureSet.count({
    where: { athleteId: ATHLETE_ID, category: 'FUEL', status: 'COMPUTED' },
  });

  console.log(`NUTRITION training days: ${nutritionDays.length}`);
  console.log(`COMPUTED FUEL feature sets: ${fuelBefore}\n`);

  if (dryRun) {
    console.log('dry-run: nothing recomputed.');
    return;
  }

  let recomputed = 0;
  let failed = 0;

  for (const { trainingDayId } of nutritionDays) {
    try {
      const day = await featureEngine.computeDayFeatures(ATHLETE_ID, trainingDayId);
      if (day.fuel !== 'PENDING') {
        recomputed += 1;
      }
    } catch (error) {
      failed += 1;
      console.error(`[recompute] failed for ${trainingDayId}`, error);
    }
  }

  const fuelAfter = await prisma.featureSet.count({
    where: { athleteId: ATHLETE_ID, category: 'FUEL', status: 'COMPUTED' },
  });

  console.log(`recomputed: ${recomputed}  failed: ${failed}`);
  console.log(`COMPUTED FUEL feature sets: ${fuelBefore} -> ${fuelAfter}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
