import type { DailyPhaseResolution } from '@/lib/daily-phase/types';
import type { PhaseNarrative } from '@/lib/daily-phase/narrative';
import { DAILY_PHASE_PRIMARY_QUESTION, DAILY_PHASE_WHY_FOCUS } from '@/lib/daily-phase/types';

export function mockDailyPhase(
  overrides: Partial<DailyPhaseResolution> = {},
): DailyPhaseResolution {
  const phase = overrides.phase ?? 'MORNING';
  return {
    phase,
    phaseLabel: 'Matin',
    primaryQuestion: DAILY_PHASE_PRIMARY_QUESTION[phase],
    whyFocus: DAILY_PHASE_WHY_FOCUS[phase],
    briefingPhase: 'morning',
    signals: {
      sessionStatus: 'NONE_TODAY',
      completedSessionCount: 0,
      plannedSessionCount: 0,
      remainingPlannedCount: 0,
      lastActivityAt: null,
      nextPlannedStartAt: null,
      localHour: 8,
      dailyStrainAvailable: false,
      newSessionSincePriorSnapshot: false,
      newInferenceSincePriorSnapshot: false,
      minutesSinceLastActivity: null,
      minutesSinceSnapshotGenerated: null,
      priorPhase: null,
      sleepLoggedTonight: false,
      resolvedBecause: 'test',
      ...overrides.signals,
    },
    ...overrides,
  };
}

export function mockPhaseNarrative(overrides: Partial<PhaseNarrative> = {}): PhaseNarrative {
  return {
    heroEyebrow: DAILY_PHASE_PRIMARY_QUESTION.MORNING,
    heroHeadline: 'Journée propice à l’effort',
    heroSubline: 'Synchronise ton état avant de décider.',
    whyFocus: 'readiness',
    posture: 'push',
    postureLabel: 'Feu vert',
    focusPriority: null,
    goalLine: null,
    adaptationReminders: [],
    ...overrides,
  };
}
