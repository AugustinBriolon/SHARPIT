import { describe, expect, it } from 'vitest';
import { buildEnvironmentPresentationContext } from '@/lib/presentation/environment';
import type { EnvironmentalDecisionSnapshot } from '@/core/inference/environment/types';

describe('environment presentation', () => {
  it('hides context when training impact is none', () => {
    const snapshot: EnvironmentalDecisionSnapshot = {
      thermalStressLevel: 'MODERATE',
      recoveryDemandAdjustment: 0,
      fatigueAdjustment: 0,
      performanceAdjustment: 0,
      trainingImpact: 'NONE',
      confidence: 0.8,
      computedAt: '2026-07-10T08:00:00.000Z',
    };

    const ctx = buildEnvironmentPresentationContext(snapshot);
    expect(ctx.visible).toBe(false);
  });

  it('surfaces summary when training impact is significant', () => {
    const snapshot: EnvironmentalDecisionSnapshot = {
      thermalStressLevel: 'HIGH',
      recoveryDemandAdjustment: 0.09,
      fatigueAdjustment: 0.04,
      performanceAdjustment: -0.04,
      trainingImpact: 'SIGNIFICANT',
      confidence: 0.85,
      computedAt: '2026-07-10T08:00:00.000Z',
    };

    const ctx = buildEnvironmentPresentationContext(snapshot);
    expect(ctx.visible).toBe(true);
    expect(ctx.summaryLine).toContain('environnement');
    expect(ctx.detailLine).toContain('récupération');
  });
});
