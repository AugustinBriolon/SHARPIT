import { describe, expect, it } from 'vitest';
import {
  diffAnalysisEvidence,
  runAnalysisRecalcWithRollback,
  selectEvidenceRowsToKeep,
  type AnalysisEvidenceRecord,
} from './analysis-evidence';

function evidence(
  overrides: Partial<
    Omit<AnalysisEvidenceRecord, 'verdict' | 'inputs'> & {
      verdict?: Partial<AnalysisEvidenceRecord['verdict']>;
      inputs?: Partial<AnalysisEvidenceRecord['inputs']>;
    }
  > = {},
): AnalysisEvidenceRecord {
  return {
    id: overrides.id ?? 'id',
    athleteId: overrides.athleteId ?? 'ath',
    trainingDayId: overrides.trainingDayId ?? '2026-09-15',
    snapshotId: overrides.snapshotId ?? null,
    createdAt: overrides.createdAt ?? new Date('2026-09-15T08:00:00Z'),
    inputs: {
      sleepNightAgeHours: 8,
      morningHrvAgeHours: 4,
      hrvBaselineDays: 14,
      loadSyncAgeHours: 12,
      loadDaysCoveredIn7: 6,
      recoveryDimensionCount: 4,
      hasSportContext: true,
      intensityAdviceRequested: true,
      gaps: [],
      ...overrides.inputs,
    },
    verdict: {
      overallVerdict: 'TRAIN_SMART',
      confidence: 0.8,
      confidenceTier: 'HIGH',
      packTier: 'FULL',
      rationaleCodes: ['reasoning.topAction.trainSmart.rationale'],
      allowsHardVerdict: true,
      ...overrides.verdict,
    },
  };
}

describe('selectEvidenceRowsToKeep', () => {
  it('keeps at most 5 newest rows within 14 days', () => {
    const now = new Date('2026-09-15T12:00:00Z');
    const rows = Array.from({ length: 7 }, (_, i) => ({
      id: `r${i}`,
      createdAt: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
    }));
    const { keep, purge } = selectEvidenceRowsToKeep(rows, now);
    expect(keep).toHaveLength(5);
    expect(purge).toHaveLength(2);
  });

  it('purges rows older than 14 days even under the count cap', () => {
    const now = new Date('2026-09-15T12:00:00Z');
    const rows = [
      { id: 'fresh', createdAt: new Date('2026-09-14T12:00:00Z') },
      { id: 'old', createdAt: new Date('2026-08-01T12:00:00Z') },
    ];
    const { keep, purge } = selectEvidenceRowsToKeep(rows, now);
    expect(keep.map((r) => r.id)).toEqual(['fresh']);
    expect(purge.map((r) => r.id)).toEqual(['old']);
  });
});

describe('diffAnalysisEvidence', () => {
  it('lists short FR field changes between A and B', () => {
    const a = evidence({ verdict: { overallVerdict: 'TRAIN_HARD', packTier: 'FULL' } });
    const b = evidence({
      verdict: { overallVerdict: 'TRAIN_SMART', packTier: 'PARTIAL' },
      inputs: { gaps: ['SLEEP_STALE'] },
    });
    const lines = diffAnalysisEvidence(a, b);
    expect(lines.some((l) => l.field === 'Verdict')).toBe(true);
    expect(lines.some((l) => l.field === 'Fiabilité pack')).toBe(true);
    expect(lines.some((l) => l.field === 'Gaps')).toBe(true);
  });
});

describe('runAnalysisRecalcWithRollback', () => {
  it('returns B on success and keeps previous A', async () => {
    const a = evidence({ id: 'a' });
    const b = evidence({ id: 'b', verdict: { overallVerdict: 'RECOVER' } });
    const result = await runAnalysisRecalcWithRollback({
      captureA: async () => a,
      runB: async () => b,
      restoreA: async () => {
        throw new Error('should not restore');
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result.id).toBe('b');
      expect(result.previous.id).toBe('a');
    }
  });

  it('rolls back to A when B fails', async () => {
    const a = evidence({ id: 'a' });
    let restored: string | null = null;
    const result = await runAnalysisRecalcWithRollback({
      captureA: async () => a,
      runB: async () => {
        throw new Error('engine boom');
      },
      restoreA: async (prev) => {
        restored = prev.id;
      },
    });
    expect(result.ok).toBe(false);
    expect(restored).toBe('a');
  });
});
