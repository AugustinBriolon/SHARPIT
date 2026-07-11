import { describe, expect, it } from 'vitest';
import { buildPlannedSessionAdvisories } from '@/core/decision/planned-session-advisory';

describe('planned-session-advisory', () => {
  it('asks to confirm location when exposure is unknown for outdoor sports', () => {
    const advisories = buildPlannedSessionAdvisories({
      sessionType: 'RUN',
      exposure: 'UNKNOWN',
      intensity: 'ENDURANCE',
      environment: null,
      scheduledHourLocal: 9,
    });
    expect(advisories[0]?.kind).toBe('CONFIRM_LOCATION');
  });

  it('recommends heat adjustments for high thermal stress', () => {
    const advisories = buildPlannedSessionAdvisories({
      sessionType: 'RUN',
      exposure: 'OUTDOOR',
      intensity: 'THRESHOLD',
      scheduledHourLocal: 14,
      environment: {
        applicability: 'OUTDOOR',
        thermalStressLevel: 'HIGH',
        trainingImpact: 'SIGNIFICANT',
        recoveryDemandAdjustment: 0.12,
        performanceAdjustment: -0.08,
        confidence: 0.8,
        dataCompleteness: 'COMPLETE',
        freshness: 'FRESH',
        providerId: 'open-meteo',
        computedAt: new Date().toISOString(),
      },
    });
    expect(advisories.some((a) => a.kind === 'REDUCE_INTENSITY')).toBe(true);
    expect(advisories.some((a) => a.kind === 'HYDRATION')).toBe(true);
  });
});
