import { describe, expect, it } from 'vitest';
import { buildPlannedSessionAdvisories } from '@/core/decision/planned-session-advisory';
import { forecastBadgeFromContext } from '@/lib/planned-session/forecast-badge';

describe('planned-session weather advisories', () => {
  it('adds rain risk when precipitation is expected', () => {
    const advisories = buildPlannedSessionAdvisories({
      sessionType: 'RUN',
      exposure: 'OUTDOOR',
      intensity: 'ENDURANCE',
      scheduledHourLocal: 9,
      environment: {
        applicability: 'OUTDOOR',
        thermalStressLevel: 'MODERATE',
        trainingImpact: 'MODERATE',
        recoveryDemandAdjustment: 0.05,
        performanceAdjustment: -0.02,
        confidence: 0.8,
        dataCompleteness: 'COMPLETE',
        freshness: 'FRESH',
        providerId: 'open-meteo-forecast',
        computedAt: new Date().toISOString(),
      },
      weatherSignals: {
        maxPrecipitationMm: 3.2,
        minTemperatureC: 12,
        maxWindMps: 4,
      },
    });

    expect(advisories.some((a) => a.kind === 'RAIN_RISK')).toBe(true);
  });
});

describe('forecastBadgeFromContext', () => {
  it('returns rain badge when rain advisory is present', () => {
    const badge = forecastBadgeFromContext(
      {
        intention: {
          sessionId: 's1',
          type: 'RUN',
          scheduledStart: new Date().toISOString(),
          scheduledEnd: new Date().toISOString(),
          durationMin: 60,
          intensity: 'ENDURANCE',
          exposure: 'OUTDOOR',
          location: { latitude: 48.92, longitude: 2.25 },
          locationType: 'ROAD',
          title: 'Run',
        },
        environment: {
          applicability: 'OUTDOOR',
          thermalStressLevel: 'MODERATE',
          trainingImpact: 'MODERATE',
          recoveryDemandAdjustment: null,
          performanceAdjustment: null,
          confidence: 0.8,
          dataCompleteness: 'COMPLETE',
          freshness: 'FRESH',
          providerId: 'open-meteo-forecast',
          computedAt: new Date().toISOString(),
        },
        advisories: [
          {
            kind: 'RAIN_RISK',
            priority: 2,
            headlineCode: 'planned.advisory.rainRisk.headline',
            rationaleCode: 'planned.advisory.rainRisk.rationale',
            confidence: 0.8,
          },
        ],
        preparation: [],
      },
      'OUTDOOR',
    );

    expect(badge?.label).toBe('Pluie probable');
    expect(badge?.tone).toBe('caution');
  });
});
