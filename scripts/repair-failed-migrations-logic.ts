/**
 * Pure repair decisions for unblockable Prisma migrate failures (P3009).
 * Kept free of PrismaClient / side effects so unit tests can import it safely.
 */

export const BASELINE_MIGRATION = '0_baseline';

/** Failed when table was pre-created (42P07) before migrate deploy finished. */
export const ANALYSIS_EVIDENCE_MIGRATION = '20260915090000_analysis_evidence_snapshot';

export type RepairAction = 'noop' | 'mark-applied' | 'mark-rolled-back';

/**
 * Squashed history: `0_baseline` replays the full schema. On a database that
 * already applied the pre-squash stack, CREATE TYPE fails (42710) and leaves a
 * failed row. When the living schema is already present, mark applied so
 * `migrate deploy` can continue with incremental migrations.
 *
 * If the baseline failed and the schema is missing, roll back so deploy retries
 * (fresh / empty databases).
 */
export function decideBaselineRepair(input: {
  failed: boolean;
  schemaAlreadyPresent: boolean;
}): RepairAction {
  if (!input.failed) {
    return 'noop';
  }
  return input.schemaAlreadyPresent ? 'mark-applied' : 'mark-rolled-back';
}

/**
 * Analysis evidence table may already exist (manual / half-applied create) while
 * the migration row is stuck failed (P3009 / 42P07). Mark applied when the
 * living table is present; otherwise roll back so idempotent SQL can retry.
 */
export function decideAnalysisEvidenceRepair(input: {
  failed: boolean;
  tableAlreadyPresent: boolean;
}): RepairAction {
  if (!input.failed) {
    return 'noop';
  }
  return input.tableAlreadyPresent ? 'mark-applied' : 'mark-rolled-back';
}
