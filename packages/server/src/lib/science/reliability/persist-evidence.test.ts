import { beforeEach, describe, expect, it, vi } from 'vitest';

const athleteHasHealthDataConsent = vi.fn();
const persistAnalysisEvidence = vi.fn();
const computePackTier = vi.fn();
const buildPackInputsFromSnapshot = vi.fn();

vi.mock('@sharpit/server/lib/privacy/consent-store', () => ({
  athleteHasHealthDataConsent: (...args: unknown[]) => athleteHasHealthDataConsent(...args),
}));

vi.mock('@sharpit/server/lib/science/reliability/analysis-evidence-store', () => ({
  persistAnalysisEvidence: (...args: unknown[]) => persistAnalysisEvidence(...args),
}));

vi.mock('@sharpit/core/science/pack-tier', () => ({
  computePackTier: (...args: unknown[]) => computePackTier(...args),
}));

vi.mock('@sharpit/server/lib/science/reliability/pack-inputs-from-snapshot', () => ({
  buildPackInputsFromSnapshot: (...args: unknown[]) => buildPackInputsFromSnapshot(...args),
}));

vi.mock('@sharpit/server/infrastructure/athlete-state/snapshot-repository', () => ({
  getLatestAthleteSnapshot: vi.fn(),
  saveAthleteSnapshot: vi.fn(),
}));

describe('persistEvidenceFromSnapshot health consent gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildPackInputsFromSnapshot.mockReturnValue({ sleepNightAgeHours: 8 });
    computePackTier.mockReturnValue({
      packTier: 'FULL',
      gaps: [],
      allowsHardVerdict: true,
    });
  });

  it('does not persist evidence when health consent is missing', async () => {
    athleteHasHealthDataConsent.mockResolvedValue(false);
    const { persistEvidenceFromSnapshot } =
      await import('@sharpit/server/lib/science/reliability/persist-evidence');

    await persistEvidenceFromSnapshot({
      athleteId: 'ath-1',
      trainingDayId: '2026-09-15',
      snapshotId: 'snap-1',
      todaysDecision: 'TRAIN_SMART',
      confidence: 0.8,
      decision: { overallVerdict: 'TRAIN_SMART', confidenceTier: 'HIGH', primaryDecision: null },
      reasoning: { topAction: null },
    } as never);

    expect(athleteHasHealthDataConsent).toHaveBeenCalledWith('ath-1');
    expect(persistAnalysisEvidence).not.toHaveBeenCalled();
  });

  it('persists evidence when health consent is present', async () => {
    athleteHasHealthDataConsent.mockResolvedValue(true);
    const { persistEvidenceFromSnapshot } =
      await import('@sharpit/server/lib/science/reliability/persist-evidence');

    await persistEvidenceFromSnapshot({
      athleteId: 'ath-1',
      trainingDayId: '2026-09-15',
      snapshotId: 'snap-1',
      todaysDecision: 'TRAIN_SMART',
      confidence: 0.8,
      decision: {
        overallVerdict: 'TRAIN_SMART',
        confidenceTier: 'HIGH',
        primaryDecision: { rationaleCode: 'r1' },
      },
      reasoning: { topAction: { rationaleCode: 'r2' } },
    } as never);

    expect(persistAnalysisEvidence).toHaveBeenCalledOnce();
  });
});
