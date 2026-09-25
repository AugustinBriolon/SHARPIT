/**
 * Import a python-garminconnect ≥ 0.3 `garmin_tokens.json` into the local DB
 * (encrypts with this environment's SECRET_ENCRYPTION_KEY).
 *
 * Usage:
 *   yarn garmin:import-tokens ./garmin_tokens.json [athleteId]
 *
 * If athleteId is omitted and exactly one AthleteProfile exists, it is used.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { prisma } from '@/lib/prisma';
import { importGarminDiTokenStore } from '@/lib/integrations/garmin/garmin-sync';

async function main() {
  const [, , fileArg, athleteArg] = process.argv;
  if (!fileArg) {
    console.error('Usage: yarn garmin:import-tokens <garmin_tokens.json> [athleteId]');
    process.exit(1);
  }

  const path = resolve(fileArg);
  const raw = JSON.parse(readFileSync(path, 'utf8')) as unknown;

  let athleteId = athleteArg;
  if (!athleteId) {
    const athletes = await prisma.athleteProfile.findMany({ select: { id: true }, take: 2 });
    if (athletes.length !== 1 || !athletes[0]) {
      console.error('Pass athleteId explicitly when the DB does not have exactly one athlete.');
      process.exit(1);
    }
    athleteId = athletes[0].id;
  }

  const profile = await importGarminDiTokenStore(athleteId, raw);
  console.info(`Garmin DI tokens imported for athlete ${athleteId}`);
  console.info(`  displayName: ${profile.displayName ?? '(none)'}`);
  console.info('Cron/API sync will refresh these tokens — no email/password SSO.');
}

main()
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
