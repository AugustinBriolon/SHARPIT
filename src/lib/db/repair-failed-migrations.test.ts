import { describe, expect, it } from 'vitest';
import {
  RENAMED_MULTI_TENANT_STACK,
  decideFailedTimestampedMultiTenantRepair,
  decideOrphanDropDefaultRepair,
  decideRenamedMultiTenantStackRepair,
  decideSnapshotRepair,
} from '../../../scripts/repair-failed-migrations-logic';

describe('decideSnapshotRepair', () => {
  it('marks applied when AthleteSnapshotRecord artifacts already exist', () => {
    expect(decideSnapshotRepair(true)).toBe('mark-applied');
  });

  it('marks rolled back when artifacts are missing so migrate can retry', () => {
    expect(decideSnapshotRepair(false)).toBe('mark-rolled-back');
  });
});

describe('decideOrphanDropDefaultRepair', () => {
  it('rolls back the pre-rename failed migration so timestamped folders can apply', () => {
    expect(decideOrphanDropDefaultRepair(true)).toBe('mark-rolled-back');
  });

  it('is a no-op when the orphan is not stuck failed', () => {
    expect(decideOrphanDropDefaultRepair(false)).toBe('noop');
  });
});

describe('decideRenamedMultiTenantStackRepair', () => {
  it('marks unfinished timestamped migrations applied when schema already has multi-tenant', () => {
    expect(
      decideRenamedMultiTenantStackRepair({
        multiTenantSchemaPresent: true,
        unfinishedTimestampedMigrations: [...RENAMED_MULTI_TENANT_STACK],
      }),
    ).toEqual({
      action: 'mark-applied',
      migrations: [...RENAMED_MULTI_TENANT_STACK],
    });
  });

  it('is a no-op when schema is not multi-tenant yet', () => {
    expect(
      decideRenamedMultiTenantStackRepair({
        multiTenantSchemaPresent: false,
        unfinishedTimestampedMigrations: [...RENAMED_MULTI_TENANT_STACK],
      }),
    ).toEqual({ action: 'noop' });
  });

  it('is a no-op when every timestamped migration is already applied', () => {
    expect(
      decideRenamedMultiTenantStackRepair({
        multiTenantSchemaPresent: true,
        unfinishedTimestampedMigrations: [],
      }),
    ).toEqual({ action: 'noop' });
  });
});

describe('decideFailedTimestampedMultiTenantRepair', () => {
  it('rolls back a failed timestamped migration when schema is incomplete', () => {
    expect(decideFailedTimestampedMultiTenantRepair(true, false)).toBe('mark-rolled-back');
  });

  it('is a no-op when not failed or when schema already present (stack repair handles it)', () => {
    expect(decideFailedTimestampedMultiTenantRepair(false, false)).toBe('noop');
    expect(decideFailedTimestampedMultiTenantRepair(true, true)).toBe('noop');
  });
});
