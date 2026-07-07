/**
 * Unblocks Prisma migrate deploy when a migration is stuck in "failed" state (P3009).
 * Runs before `prisma migrate deploy` on Vercel — no-op when the database is healthy.
 */
import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

const MIGRATION_NAME = '20260707_add_athlete_snapshot';

type FailedMigrationRow = {
  migration_name: string;
};

type ExistsRow = {
  exists: boolean;
};

const prisma = new PrismaClient();

function runResolve(flag: '--applied' | '--rolled-back'): void {
  execSync(`yarn prisma migrate resolve ${flag} ${MIGRATION_NAME}`, {
    stdio: 'inherit',
    env: process.env,
  });
}

async function migrationArtifactsExist(): Promise<boolean> {
  const [table, uniqueIndex, snapshotIndex, generatedIndex] = await Promise.all([
    prisma.$queryRaw<ExistsRow[]>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'AthleteSnapshotRecord'
      ) AS "exists"
    `,
    prisma.$queryRaw<ExistsRow[]>`
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'AthleteSnapshotRecord_athleteId_trainingDayId_key'
      ) AS "exists"
    `,
    prisma.$queryRaw<ExistsRow[]>`
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'AthleteSnapshotRecord_snapshotId_idx'
      ) AS "exists"
    `,
    prisma.$queryRaw<ExistsRow[]>`
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'AthleteSnapshotRecord_generatedAt_idx'
      ) AS "exists"
    `,
  ]);

  return [table, uniqueIndex, snapshotIndex, generatedIndex].every(
    (rows) => rows[0]?.exists === true,
  );
}

async function main(): Promise<void> {
  const failed = await prisma.$queryRaw<FailedMigrationRow[]>`
    SELECT migration_name
    FROM "_prisma_migrations"
    WHERE migration_name = ${MIGRATION_NAME}
      AND finished_at IS NULL
      AND rolled_back_at IS NULL
      AND started_at IS NOT NULL
  `;

  if (failed.length === 0) {
    return;
  }

  const complete = await migrationArtifactsExist();

  if (complete) {
    console.log(`[migrate-repair] ${MIGRATION_NAME} failed but schema exists — marking as applied`);
    runResolve('--applied');
    return;
  }

  console.log(`[migrate-repair] ${MIGRATION_NAME} failed — marking as rolled back for retry`);
  runResolve('--rolled-back');
}

main()
  .catch((error) => {
    console.error('[migrate-repair] Failed to repair migration state:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
