import { describe, expect, it } from 'vitest';
import { buildAthleteSnapshot } from '@/lib/athlete-state/snapshot-builder';
import type { TodayState } from '@/hooks/use-today';

const baseFreshness = {
  athleteId: 'default',
  trainingDayId: '2026-07-07',
  computedAt: '2026-07-07T08:00:00.000Z',
  domains: [],
  providers: [],
  overallFresh: true,
  primaryProductMessage: null,
};

const baseTodayState: TodayState = {
  reasoning: null,
  decision: null,
  physicalHealth: null,
  environment: null,
  recovery: null,
  fatigue: null,
  adaptation: null,
  dailyStrain: null,
};

const baseSleepCoach = {
  recommendedBedtimeMin: 22 * 60 + 30,
  recommendedDurationMin: 480,
  debt7Min: null,
  hasData: false,
};

describe('buildAthleteSnapshot daily phase', () => {
  it('embeds dailyPhase and phaseNarrative on snapshot', () => {
    const refDate = new Date('2026-07-07T08:00:00');
    const snapshot = buildAthleteSnapshot({
      athleteId: 'default',
      trainingDayId: '2026-07-07',
      todayState: baseTodayState,
      freshness: baseFreshness,
      briefing: null,
      phaseContext: {
        refDate,
        activities: [],
        plannedSessions: [],
        goals: [],
        sleepCoach: baseSleepCoach,
        sleepBedtimeTargetMin: null,
        priorSnapshot: null,
        latestSessionObservationAt: null,
        sleepLoggedTonight: false,
      },
    });

    expect(snapshot.dailyPhase.phase).toBe('MORNING');
    expect(snapshot.phaseNarrative.heroEyebrow).toContain('compte');
  });

  it('switches to session_completed after morning activity', () => {
    const refDate = new Date('2026-07-07T08:30:00');
    const snapshot = buildAthleteSnapshot({
      athleteId: 'default',
      trainingDayId: '2026-07-07',
      todayState: {
        ...baseTodayState,
        dailyStrain: {
          available: true,
          strainScore: 11,
          dailyTss: 60,
          tier: 'STRUCTURED_SESSION',
          source: 'SESSION_FEATURE_TRIMP',
          dominantContributor: 'TRAINING',
          confidence: 0.8,
          structuredSessionDetected: true,
          fallbackUsed: false,
          contributions: {
            training: {
              available: true,
              contributor: 'TRAINING',
              load: 60,
              score: 11,
              confidence: 0.8,
              source: 'SESSION_FEATURE_TRIMP',
            },
            cardiovascular: {
              available: false,
              contributor: 'CARDIOVASCULAR',
              load: null,
              score: null,
              confidence: 0,
              source: 'UNKNOWN',
            },
            movement: {
              available: false,
              contributor: 'MOVEMENT',
              load: null,
              score: null,
              confidence: 0,
              source: 'UNKNOWN',
            },
          },
          trace: {
            sessionCount: 1,
            activityCount: 1,
            sessionMethods: ['HR'],
            cardiovascularSignals: {
              stress: null,
              recoveryScore: null,
              bodyBattery: null,
              calories: null,
            },
          },
        },
      },
      freshness: baseFreshness,
      briefing: null,
      phaseContext: {
        refDate,
        activities: [
          {
            id: 'a1',
            date: new Date('2026-07-07T07:45:00'),
            type: 'RUN',
            load: 60,
            duration: 3600,
            title: 'Sortie',
          },
        ],
        plannedSessions: [],
        goals: [],
        sleepCoach: baseSleepCoach,
        sleepBedtimeTargetMin: null,
        priorSnapshot: null,
        latestSessionObservationAt: new Date('2026-07-07T08:00:00'),
        sleepLoggedTonight: false,
      },
    });

    expect(snapshot.dailyPhase.phase).toBe('SESSION_COMPLETED');
    expect(snapshot.phaseNarrative.heroHeadline).toMatch(/exigeante|Course/);
  });
});
