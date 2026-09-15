import { describe, expect, it } from 'vitest';
import {
  computePackTier,
  isHardVerdictRequiringFull,
  type PackInputSignals,
} from './pack-tier';

function fullPack(overrides: Partial<PackInputSignals> = {}): PackInputSignals {
  return {
    sleepNightAgeHours: 8,
    morningHrvAgeHours: 4,
    hrvBaselineDays: 14,
    loadSyncAgeHours: 12,
    loadDaysCoveredIn7: 6,
    recoveryDimensionCount: 4,
    hasSportContext: true,
    intensityAdviceRequested: true,
    ...overrides,
  };
}

describe('computePackTier', () => {
  it('returns FULL when all Science grille criteria are met', () => {
    const result = computePackTier(fullPack());
    expect(result.packTier).toBe('FULL');
    expect(result.allowsHardVerdict).toBe(true);
    expect(result.withholdIntensityTopAction).toBe(false);
    expect(result.gaps).toEqual([]);
  });

  it('returns INSUFFICIENT when fewer than 2 recovery dimensions', () => {
    const result = computePackTier(fullPack({ recoveryDimensionCount: 1 }));
    expect(result.packTier).toBe('INSUFFICIENT');
    expect(result.withholdIntensityTopAction).toBe(true);
    expect(result.allowsHardVerdict).toBe(false);
    expect(result.gaps).toContain('RECOVERY_DIMENSIONS_LOW');
  });

  it('returns INSUFFICIENT when HRV baseline is under 7 days', () => {
    const result = computePackTier(fullPack({ hrvBaselineDays: 5 }));
    expect(result.packTier).toBe('INSUFFICIENT');
    expect(result.withholdIntensityTopAction).toBe(true);
    expect(result.gaps).toContain('BASELINE_SHORT');
  });

  it('returns PARTIAL for incomplete but usable pack (baseline 7–13d)', () => {
    const result = computePackTier(fullPack({ hrvBaselineDays: 10 }));
    expect(result.packTier).toBe('PARTIAL');
    expect(result.allowsHardVerdict).toBe(false);
    expect(result.gaps).toContain('BASELINE_PARTIAL');
  });

  it('returns soft-hero tier when sleep is stale', () => {
    const result = computePackTier(fullPack({ sleepNightAgeHours: 30 }));
    expect(result.packTier).not.toBe('FULL');
    expect(result.allowsHardVerdict).toBe(false);
    expect(result.gaps).toContain('SLEEP_STALE');
  });

  it('returns soft-hero tier when load coverage is under 5/7', () => {
    const result = computePackTier(fullPack({ loadDaysCoveredIn7: 3 }));
    expect(result.packTier).not.toBe('FULL');
    expect(result.gaps).toContain('LOAD_SPARSE');
  });

  it('requires sport context when intensity advice is requested', () => {
    const result = computePackTier(
      fullPack({ hasSportContext: false, intensityAdviceRequested: true }),
    );
    expect(result.packTier).not.toBe('FULL');
    expect(result.gaps).toContain('SPORT_CONTEXT_MISSING');
  });

  it('allows missing sport context when intensity is not requested', () => {
    const result = computePackTier(
      fullPack({ hasSportContext: false, intensityAdviceRequested: false }),
    );
    expect(result.packTier).toBe('FULL');
  });

  it('prefers LOW when several severe gaps remain after INSUFFICIENT filter', () => {
    const result = computePackTier(
      fullPack({
        sleepNightAgeHours: null,
        morningHrvAgeHours: null,
        loadDaysCoveredIn7: 2,
        hrvBaselineDays: 10,
        recoveryDimensionCount: 2,
      }),
    );
    expect(result.packTier).toBe('LOW');
    expect(result.allowsHardVerdict).toBe(false);
  });
});

describe('isHardVerdictRequiringFull', () => {
  it('flags TRAIN_HARD, RACE_READY, and assertive TRAIN_SMART', () => {
    expect(isHardVerdictRequiringFull('TRAIN_HARD')).toBe(true);
    expect(isHardVerdictRequiringFull('RACE_READY')).toBe(true);
    expect(isHardVerdictRequiringFull('TRAIN_SMART')).toBe(true);
    expect(isHardVerdictRequiringFull('TRAIN_EASY')).toBe(false);
    expect(isHardVerdictRequiringFull('RECOVER')).toBe(false);
  });
});
