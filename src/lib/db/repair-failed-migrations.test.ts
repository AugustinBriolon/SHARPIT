import { describe, expect, it } from 'vitest';
import {
  BASELINE_MIGRATION,
  decideBaselineRepair,
} from '../../../scripts/repair-failed-migrations-logic';

describe('decideBaselineRepair', () => {
  it('exposes the squashed baseline name', () => {
    expect(BASELINE_MIGRATION).toBe('0_baseline');
  });

  it('is a no-op when the baseline is not failed', () => {
    expect(decideBaselineRepair({ failed: false, schemaAlreadyPresent: true })).toBe('noop');
  });

  it('marks applied when baseline failed on a database that already has the schema', () => {
    expect(decideBaselineRepair({ failed: true, schemaAlreadyPresent: true })).toBe('mark-applied');
  });

  it('marks rolled back when baseline failed and the schema is still missing', () => {
    expect(decideBaselineRepair({ failed: true, schemaAlreadyPresent: false })).toBe(
      'mark-rolled-back',
    );
  });
});
