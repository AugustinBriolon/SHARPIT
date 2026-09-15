import { describe, expect, it } from 'vitest';
import {
  ANALYSIS_EVIDENCE_MIGRATION,
  BASELINE_MIGRATION,
  decideAnalysisEvidenceRepair,
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

describe('decideAnalysisEvidenceRepair', () => {
  it('exposes the analysis evidence migration name', () => {
    expect(ANALYSIS_EVIDENCE_MIGRATION).toBe('20260915090000_analysis_evidence_snapshot');
  });

  it('is a no-op when the migration is not failed', () => {
    expect(decideAnalysisEvidenceRepair({ failed: false, tableAlreadyPresent: true })).toBe(
      'noop',
    );
  });

  it('marks applied when failed but AnalysisEvidenceSnapshot already exists', () => {
    expect(decideAnalysisEvidenceRepair({ failed: true, tableAlreadyPresent: true })).toBe(
      'mark-applied',
    );
  });

  it('marks rolled back when failed and the table is missing', () => {
    expect(decideAnalysisEvidenceRepair({ failed: true, tableAlreadyPresent: false })).toBe(
      'mark-rolled-back',
    );
  });
});
