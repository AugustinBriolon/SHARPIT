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

export type RepairAction = 'noop' | 'mark-applied' | 'mark-rolled-back';

/** Pure decision: snapshot migration failed — was the schema left complete? */
export function decideSnapshotRepair(artifactsComplete: boolean): RepairAction {
  return artifactsComplete ? 'mark-applied' : 'mark-rolled-back';
}

/**
 * Pure decision: orphan drop-default migration failed.
 * The first statement failed (column missing), so nothing was applied — always roll back.
 */
export function decideOrphanDropDefaultRepair(failed: boolean): RepairAction {
  return failed ? 'mark-rolled-back' : 'noop';
}
