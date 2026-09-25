import { describe, expect, it } from 'vitest';
import { resolveSoftHeroPresentation } from './soft-hero';
import type { PackInputSignals } from '@/core/science/pack-tier';

function pack(overrides: Partial<PackInputSignals> = {}): PackInputSignals {
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

describe('resolveSoftHeroPresentation', () => {
  it('keeps hard verdicts when pack is FULL', () => {
    const result = resolveSoftHeroPresentation({
      packInput: pack(),
      engineVerdict: 'TRAIN_HARD',
      gapLabels: [],
    });
    expect(result.softHero).toBe(false);
    expect(result.hedgedHeadline).toBeNull();
    expect(result.displayVerdict).toBe('TRAIN_HARD');
  });

  it('hedges TRAIN_HARD when pack is PARTIAL', () => {
    const result = resolveSoftHeroPresentation({
      packInput: pack({ hrvBaselineDays: 10 }),
      engineVerdict: 'TRAIN_HARD',
      gapLabels: ['Baseline HRV partielle (moins de 14 j)'],
    });
    expect(result.softHero).toBe(true);
    expect(result.estimationChip).toBe('Estimation partielle');
    expect(result.hedgedHeadline).toContain('estimation partielle');
    expect(result.visibleGaps.length).toBeGreaterThan(0);
  });

  it('withholds intensity and shows CTA when INSUFFICIENT', () => {
    const result = resolveSoftHeroPresentation({
      packInput: pack({ recoveryDimensionCount: 1, hrvBaselineDays: 3 }),
      engineVerdict: 'TRAIN_SMART',
      gapLabels: ['Moins de 2 dimensions de récupération'],
    });
    expect(result.packTier).toBe('INSUFFICIENT');
    expect(result.withholdIntensityTopAction).toBe(true);
    expect(result.ctaCompleteSources).toBe(true);
    expect(result.displayVerdict).toBe('INSUFFICIENT_DATA');
  });
});
