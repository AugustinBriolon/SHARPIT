/**
 * Unblocks Prisma migrate deploy when a migration is stuck in "failed" state (P3009).
 * Runs before `prisma migrate deploy` on Vercel — no-op when the database is healthy.
 *
 * Handles:
 * 1. `20260707_add_athlete_snapshot` — folder still exists; use `migrate resolve`.
 * 2. Orphan pre-rename short names (`20260824_*`) — folders renamed; SQL roll-back.
 * 3. Renamed multi-tenant stack (`20260824104021_*` …) — schema already applied under
 *    old names or a failed re-run; mark timestamped migrations as applied.
 */
import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import {
  ORPHAN_MULTI_TENANT_STACK,
  RENAMED_MULTI_TENANT_STACK,
  SNAPSHOT_MIGRATION,
  TIMESTAMPED_MULTI_TENANT_MIGRATION,
  decideFailedTimestampedMultiTenantRepair,
  decideOrphanFailedRepair,
  decideRenamedMultiTenantStackRepair,
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

async function isSuccessfullyApplied(migrationName: string): Promise<boolean> {
  const applied = await prisma.$queryRaw<FailedMigrationRow[]>`
    SELECT migration_name
    FROM "_prisma_migrations"
    WHERE migration_name = ${migrationName}
      AND finished_at IS NOT NULL
      AND rolled_back_at IS NULL
  `;
  return applied.length > 0;
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

/** Multi-tenant phase 0 left `AthleteProfile.clerkUserId` NOT NULL — reliable probe. */
async function multiTenantSchemaPresent(): Promise<boolean> {
  const rows = await prisma.$queryRaw<ExistsRow[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'AthleteProfile'
        AND column_name = 'clerkUserId'
        AND is_nullable = 'NO'
    ) AS "exists"
  `;
  return rows[0]?.exists === true;
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

async function repairOrphanShortNameMigrations(): Promise<void> {
  for (const migrationName of ORPHAN_MULTI_TENANT_STACK) {
    const failed = await isFailed(migrationName);
    const action = decideOrphanFailedRepair(failed);

    if (action === 'noop') {
      continue;
    }

    console.info(
      `[migrate-repair] ${migrationName} failed under pre-rename name — marking rolled back so timestamped migrations can apply`,
    );
    await markRolledBackViaSql(migrationName);
  }
}

async function repairRenamedMultiTenantStack(): Promise<void> {
  const schemaPresent = await multiTenantSchemaPresent();

  const unfinished: string[] = [];
  for (const migrationName of RENAMED_MULTI_TENANT_STACK) {
    if (!(await isSuccessfullyApplied(migrationName))) {
      unfinished.push(migrationName);
    }
  }

  const stackDecision = decideRenamedMultiTenantStackRepair({
    multiTenantSchemaPresent: schemaPresent,
    unfinishedTimestampedMigrations: unfinished,
  });

  if (stackDecision.action === 'mark-applied') {
    for (const migrationName of stackDecision.migrations) {
      if (await isFailed(migrationName)) {
        console.info(
          `[migrate-repair] ${migrationName} failed but multi-tenant schema exists — marking as applied`,
        );
      } else {
        console.info(
          `[migrate-repair] ${migrationName} not recorded but multi-tenant schema exists — marking as applied`,
        );
      }
      runResolve(migrationName, '--applied');
    }
    return;
  }

  const failedRetry = decideFailedTimestampedMultiTenantRepair(
    await isFailed(TIMESTAMPED_MULTI_TENANT_MIGRATION),
    schemaPresent,
  );

  if (failedRetry === 'mark-rolled-back') {
    console.info(
      `[migrate-repair] ${TIMESTAMPED_MULTI_TENANT_MIGRATION} failed — marking as rolled back for retry`,
    );
    runResolve(TIMESTAMPED_MULTI_TENANT_MIGRATION, '--rolled-back');
  }
}

export async function main(): Promise<void> {
  await repairOrphanShortNameMigrations();
  await repairRenamedMultiTenantStack();
  await repairSnapshotMigration();
}

// Guarded so importing this module (e.g. from a test) doesn't trigger a real
// run — only executing it directly via `tsx scripts/repair-failed-migrations.ts` does.
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .catch((error) => {
      console.error('[migrate-repair] Failed to repair migration state:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
