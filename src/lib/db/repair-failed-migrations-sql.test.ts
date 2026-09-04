import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ORPHAN_DROP_DEFAULT_MIGRATION,
  ORPHAN_ENCRYPT_TOKENS_MIGRATION,
  ORPHAN_MULTI_TENANT_MIGRATION,
  RENAMED_MULTI_TENANT_STACK,
  SNAPSHOT_MIGRATION,
} from '../../../scripts/repair-failed-migrations-logic';

const queryRawMock = vi.fn();
const executeRawMock = vi.fn();
const execSyncMock = vi.fn();

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(function PrismaClientMock(this: unknown) {
    return {
      $queryRaw: queryRawMock,
      $executeRaw: executeRawMock,
      $disconnect: vi.fn().mockResolvedValue(undefined),
    };
  }),
}));

vi.mock('node:child_process', () => ({
  execSync: execSyncMock,
}));

/** Reconstructs the raw SQL text from a tagged-template call's strings array. */
function sqlOf(strings: TemplateStringsArray): string {
  return strings.join('¶');
}

/** Healthy-database scenario: everything already applied, nothing failed anywhere,
 * except whichever orphan names the test explicitly marks as stuck failed. */
function mockHealthyDbWithFailedOrphans(failedOrphans: Set<string>) {
  queryRawMock.mockImplementation((strings: TemplateStringsArray, ...values: unknown[]) => {
    const sql = sqlOf(strings);
    const migrationName = values[0] as string | undefined;

    if (sql.includes('finished_at IS NULL') && sql.includes('started_at IS NOT NULL')) {
      // isFailed(migrationName)
      const isFailed =
        migrationName !== undefined && migrationName !== null && failedOrphans.has(migrationName);
      return Promise.resolve(isFailed ? [{ migration_name: migrationName }] : []);
    }
    if (sql.includes('finished_at IS NOT NULL')) {
      // isSuccessfullyApplied(migrationName) — everything else is healthy/applied.
      return Promise.resolve([{ migration_name: migrationName }]);
    }
    if (sql.includes('clerkUserId')) {
      // multiTenantSchemaPresent — already migrated.
      return Promise.resolve([{ exists: true }]);
    }
    // snapshotArtifactsExist's 4 probes.
    return Promise.resolve([{ exists: true }]);
  });
  executeRawMock.mockResolvedValue(undefined);
}

describe('repair-failed-migrations (SQL predicates + raw UPDATE)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('SQL-rolls-back exactly the orphan migrations that are stuck failed, and leaves the rest alone', async () => {
    mockHealthyDbWithFailedOrphans(new Set([ORPHAN_DROP_DEFAULT_MIGRATION]));
    const { main } = await import('../../../scripts/repair-failed-migrations');

    await main();

    // Only the one stuck-failed orphan got a raw rollback UPDATE.
    const rolledBack = executeRawMock.mock.calls
      .filter(([strings]) =>
        sqlOf(strings as TemplateStringsArray).includes('rolled_back_at = NOW()'),
      )
      .map(([, ...values]) => values[0]);
    expect(rolledBack).toEqual([ORPHAN_DROP_DEFAULT_MIGRATION]);

    // Nothing named a healthy orphan or the renamed stack should be resolved via the CLI.
    for (const [, ...args] of execSyncMock.mock.calls) {
      expect(String(args)).not.toContain(ORPHAN_MULTI_TENANT_MIGRATION);
      expect(String(args)).not.toContain(ORPHAN_ENCRYPT_TOKENS_MIGRATION);
    }
  });

  it('does not touch the database when nothing is stuck failed', async () => {
    mockHealthyDbWithFailedOrphans(new Set());
    const { main } = await import('../../../scripts/repair-failed-migrations');

    await main();

    expect(executeRawMock).not.toHaveBeenCalled();
    expect(execSyncMock).not.toHaveBeenCalled();
  });

  it('marks the renamed stack applied via the CLI when multi-tenant schema is already present and a migration is unfinished', async () => {
    queryRawMock.mockImplementation((strings: TemplateStringsArray, ...values: unknown[]) => {
      const sql = sqlOf(strings);
      const migrationName = values[0] as string | undefined;
      if (sql.includes('finished_at IS NULL') && sql.includes('started_at IS NOT NULL')) {
        return Promise.resolve([]); // no orphans failed
      }
      if (sql.includes('finished_at IS NOT NULL')) {
        // Every renamed-stack migration except the first is applied.
        const applied = migrationName !== RENAMED_MULTI_TENANT_STACK[0];
        return Promise.resolve(applied ? [{ migration_name: migrationName }] : []);
      }
      if (sql.includes('clerkUserId')) {
        return Promise.resolve([{ exists: true }]); // schema already present
      }
      return Promise.resolve([{ exists: true }]);
    });
    executeRawMock.mockResolvedValue(undefined);
    const { main } = await import('../../../scripts/repair-failed-migrations');

    await main();

    expect(execSyncMock).toHaveBeenCalledWith(
      expect.stringContaining(`migrate resolve --applied ${RENAMED_MULTI_TENANT_STACK[0]}`),
      expect.anything(),
    );
  });

  it('resolves the snapshot migration as applied via the CLI when its artifacts already exist', async () => {
    queryRawMock.mockImplementation((strings: TemplateStringsArray, ...values: unknown[]) => {
      const sql = sqlOf(strings);
      const migrationName = values[0] as string | undefined;
      if (sql.includes('finished_at IS NULL') && sql.includes('started_at IS NOT NULL')) {
        return Promise.resolve(
          migrationName === SNAPSHOT_MIGRATION ? [{ migration_name: migrationName }] : [],
        );
      }
      if (sql.includes('finished_at IS NOT NULL')) {
        return Promise.resolve([{ migration_name: migrationName }]);
      }
      if (sql.includes('clerkUserId')) {
        return Promise.resolve([{ exists: true }]);
      }
      return Promise.resolve([{ exists: true }]); // snapshot artifacts present
    });
    executeRawMock.mockResolvedValue(undefined);
    const { main } = await import('../../../scripts/repair-failed-migrations');

    await main();

    expect(execSyncMock).toHaveBeenCalledWith(
      expect.stringContaining(`migrate resolve --applied ${SNAPSHOT_MIGRATION}`),
      expect.anything(),
    );
  });
});
