import { describe, expect, it } from 'vitest';
import {
  decideOrphanDropDefaultRepair,
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
