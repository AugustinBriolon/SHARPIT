/**
 * Unblocks Prisma migrate deploy when a migration is stuck in "failed" state (P3009).
 * Runs before `prisma migrate deploy` on Vercel — no-op when the database is healthy.
 *
 * Handles two cases:
 * 1. `20260707_add_athlete_snapshot` — folder still exists; use `migrate resolve`.
 * 2. `20260824_drop_athlete_id_bootstrap_default` — renamed to a timestamped folder;
 *    `migrate resolve` cannot find the old name, so we mark it rolled-back via SQL.
 */
import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import {
  ORPHAN_DROP_DEFAULT_MIGRATION,
  SNAPSHOT_MIGRATION,
  decideOrphanDropDefaultRepair,
  decideSnapshotRepair,
} from './repair-failed-migrations-logic';

type FailedMigrationRow = {
  migration_name: string;
};

type ExistsRow = {
  exists: boolean;
};

const prisma = new PrismaClient();

function runResolve(migrationName: string, flag: '--applied' | '--rolled-back'): void {
  execSync(`yarn prisma migrate resolve ${flag} ${migrationName}`, {
    stdio: 'inherit',
    env: process.env,
  });
}

async function isFailed(migrationName: string): Promise<boolean> {
  const failed = await prisma.$queryRaw<FailedMigrationRow[]>`
    SELECT migration_name
    FROM "_prisma_migrations"
    WHERE migration_name = ${migrationName}
      AND finished_at IS NULL
      AND rolled_back_at IS NULL
      AND started_at IS NOT NULL
  `;
  return failed.length > 0;
}

async function markRolledBackViaSql(migrationName: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "_prisma_migrations"
    SET rolled_back_at = NOW()
    WHERE migration_name = ${migrationName}
      AND finished_at IS NULL
      AND rolled_back_at IS NULL
  `;
}

async function snapshotArtifactsExist(): Promise<boolean> {
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

async function repairSnapshotMigration(): Promise<void> {
  if (!(await isFailed(SNAPSHOT_MIGRATION))) {
    return;
  }

  const action = decideSnapshotRepair(await snapshotArtifactsExist());

  if (action === 'mark-applied') {
    console.info(
      `[migrate-repair] ${SNAPSHOT_MIGRATION} failed but schema exists — marking as applied`,
    );
    runResolve(SNAPSHOT_MIGRATION, '--applied');
    return;
  }

  console.info(`[migrate-repair] ${SNAPSHOT_MIGRATION} failed — marking as rolled back for retry`);
  runResolve(SNAPSHOT_MIGRATION, '--rolled-back');
}

async function repairOrphanDropDefaultMigration(): Promise<void> {
  const failed = await isFailed(ORPHAN_DROP_DEFAULT_MIGRATION);
  const action = decideOrphanDropDefaultRepair(failed);

  if (action === 'noop') {
    return;
  }

  console.info(
    `[migrate-repair] ${ORPHAN_DROP_DEFAULT_MIGRATION} failed under pre-rename name — marking rolled back so timestamped migrations can apply`,
  );
  await markRolledBackViaSql(ORPHAN_DROP_DEFAULT_MIGRATION);
}

async function main(): Promise<void> {
  await repairOrphanDropDefaultMigration();
  await repairSnapshotMigration();
}

main()
  .catch((error) => {
    console.error('[migrate-repair] Failed to repair migration state:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
