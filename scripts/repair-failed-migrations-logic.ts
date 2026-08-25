/**
 * Pure repair decisions for unblockable Prisma migrate failures (P3009).
 * Kept free of PrismaClient / side effects so unit tests can import it safely.
 */

/** Legacy folder still present — resolve via Prisma CLI. */
export const SNAPSHOT_MIGRATION = '20260707_add_athlete_snapshot';

/**
 * Failed under the pre-rename name. Folder was renamed to
 * `20260824140136_drop_athlete_id_bootstrap_default`, so Prisma resolve cannot
 * target the old name. SQL rollback is the only unblock path.
 */
export const ORPHAN_DROP_DEFAULT_MIGRATION = '20260824_drop_athlete_id_bootstrap_default';

/** Pre-rename names — folders no longer exist; failed rows must be SQL-rolled-back. */
export const ORPHAN_MULTI_TENANT_MIGRATION = '20260824_multi_tenant_phase_0';
export const ORPHAN_ENCRYPT_TOKENS_MIGRATION = '20260824_encrypt_provider_tokens';

export const ORPHAN_MULTI_TENANT_STACK = [
  ORPHAN_MULTI_TENANT_MIGRATION,
  ORPHAN_DROP_DEFAULT_MIGRATION,
  ORPHAN_ENCRYPT_TOKENS_MIGRATION,
] as const;

/** Post-rename folders that replace the short-name stack above. */
export const TIMESTAMPED_MULTI_TENANT_MIGRATION = '20260824104021_multi_tenant_phase_0';
export const TIMESTAMPED_DROP_DEFAULT_MIGRATION =
  '20260824140136_drop_athlete_id_bootstrap_default';
export const TIMESTAMPED_ENCRYPT_TOKENS_MIGRATION = '20260824150642_encrypt_provider_tokens';

export const RENAMED_MULTI_TENANT_STACK = [
  TIMESTAMPED_MULTI_TENANT_MIGRATION,
  TIMESTAMPED_DROP_DEFAULT_MIGRATION,
  TIMESTAMPED_ENCRYPT_TOKENS_MIGRATION,
] as const;

export type RepairAction = 'noop' | 'mark-applied' | 'mark-rolled-back';

/** Pure decision: snapshot migration failed — was the schema left complete? */
export function decideSnapshotRepair(artifactsComplete: boolean): RepairAction {
  return artifactsComplete ? 'mark-applied' : 'mark-rolled-back';
}

/**
 * Pure decision: orphan pre-rename migration failed.
 * Folder is gone — always roll back via SQL so deploy is not blocked by P3009.
 */
export function decideOrphanDropDefaultRepair(failed: boolean): RepairAction {
  return failed ? 'mark-rolled-back' : 'noop';
}

/** Alias — same rule for every orphan short-name failure in the multi-tenant rename. */
export const decideOrphanFailedRepair = decideOrphanDropDefaultRepair;

/**
 * When multi-tenant columns already exist (applied under pre-rename names, or a
 * previous partial run), re-running the timestamped SQL fails (indexes already
 * dropped, columns already present). Mark every unfinished timestamped stack
 * migration as applied so `migrate deploy` can proceed.
 */
export function decideRenamedMultiTenantStackRepair(input: {
  multiTenantSchemaPresent: boolean;
  unfinishedTimestampedMigrations: readonly string[];
}): { action: 'noop' } | { action: 'mark-applied'; migrations: readonly string[] } {
  if (!input.multiTenantSchemaPresent || input.unfinishedTimestampedMigrations.length === 0) {
    return { action: 'noop' };
  }
  return { action: 'mark-applied', migrations: input.unfinishedTimestampedMigrations };
}

/**
 * Failed timestamped multi-tenant with no schema yet — roll back so deploy retries.
 * (If schema is present, `decideRenamedMultiTenantStackRepair` marks applied instead.)
 */
export function decideFailedTimestampedMultiTenantRepair(
  failed: boolean,
  multiTenantSchemaPresent: boolean,
): RepairAction {
  if (!failed || multiTenantSchemaPresent) {
    return 'noop';
  }
  return 'mark-rolled-back';
}
