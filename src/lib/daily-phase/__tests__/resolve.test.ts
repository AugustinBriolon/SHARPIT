import { describe, expect, it } from 'vitest';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';
import { buildDailyPhaseDayContext } from '@/lib/daily-phase/day-context';
import {
  resolveDailyPhase,
  isForwardAdvicePhase,
  isPostTrainingPhase,
} from '@/lib/daily-phase/resolve';
import type { DailyPhaseAthleteSignals, DailyPhaseInput } from '@/lib/daily-phase/types';
import { DAILY_PHASE_PRIMARY_QUESTION } from '@/lib/daily-phase/types';

const TRAINING_DAY = new Date('2026-07-07T12:00:00');

function activity(partial: Partial<ClientActivity> & { id: string; date: Date }): ClientActivity {
  return {
    type: 'RUN',
    title: 'Sortie',
    duration: 3600,
    load: 70,
    ...partial,
  } as ClientActivity;
}

function planned(
  partial: Partial<ClientPlannedSession> & { id: string; date: Date },
): ClientPlannedSession {
  return {
    type: 'BIKE',
    title: 'Endurance',
    durationMin: 90,
    completed: false,
    activityId: null,
    ...partial,
  } as ClientPlannedSession;
}

function baseAthlete(overrides: Partial<DailyPhaseAthleteSignals> = {}): DailyPhaseAthleteSignals {
  return {
    recommendationAvailable: true,
    adviceActionable: true,
    dailyStrainAvailable: false,
    newSessionSincePriorSnapshot: false,
    newInferenceSincePriorSnapshot: false,
    newObservationsSincePriorSnapshot: false,
    minutesSinceLastActivity: null,
    minutesSinceSnapshotGenerated: 30,
    priorPhase: null,
    sleepLoggedTonight: false,
    ...overrides,
  };
}

function resolveAt(
  refDate: Date,
  activities: ClientActivity[],
  plannedSessions: ClientPlannedSession[],
  athleteOverrides: Partial<DailyPhaseAthleteSignals> = {},
) {
  const dayContext = buildDailyPhaseDayContext(refDate, activities, plannedSessions);
  const input: DailyPhaseInput = {
    dayContext,
    athlete: baseAthlete(athleteOverrides),
    localHour: refDate.getHours(),
  };
  return resolveDailyPhase(input, refDate);
}

describe('resolveDailyPhase — session status priority', () => {
  it('morning with planned session later (early day)', () => {
    const ref = new Date('2026-07-07T08:00:00');
    const result = resolveAt(
      ref,
      [],
      [planned({ id: 'p1', date: TRAINING_DAY, startTime: '18:00' })],
    );
    expect(result.phase).toBe('MORNING');
    expect(result.signals.resolvedBecause).toBe('planned_session_later_today');
  });

  it('before session within pre-window', () => {
    const ref = new Date('2026-07-07T16:00:00');
    const result = resolveAt(
      ref,
      [],
      [planned({ id: 'p1', date: TRAINING_DAY, startTime: '18:00' })],
    );
    expect(result.phase).toBe('BEFORE_SESSION');
  });

  it('session completed at 08:00 → immediate post-session narrative', () => {
    const ref = new Date('2026-07-07T08:30:00');
    const result = resolveAt(
      ref,
      [activity({ id: 'a1', date: new Date('2026-07-07T07:45:00'), load: 55 })],
      [],
      { newSessionSincePriorSnapshot: true, minutesSinceLastActivity: 45 },
    );
    expect(result.phase).toBe('SESSION_COMPLETED');
    expect(result.primaryQuestion).toBe(DAILY_PHASE_PRIMARY_QUESTION.SESSION_COMPLETED);
  });

  it('session completed at 21:30 → post-session before end-of-day', () => {
    const ref = new Date('2026-07-07T21:30:00');
    const result = resolveAt(
      ref,
      [activity({ id: 'a1', date: new Date('2026-07-07T20:45:00'), load: 40 })],
      [],
      { newSessionSincePriorSnapshot: true, minutesSinceLastActivity: 45 },
    );
    expect(result.phase).toBe('SESSION_COMPLETED');
    expect(result.phase).not.toBe('END_OF_DAY');
  });

  it('after accomplishment window → recovery window (not evening by clock)', () => {
    const ref = new Date('2026-07-07T10:30:00');
    const result = resolveAt(
      ref,
      [activity({ id: 'a1', date: new Date('2026-07-07T08:00:00'), load: 60 })],
      [],
      { minutesSinceLastActivity: 150, dailyStrainAvailable: true },
    );
    expect(result.phase).toBe('RECOVERY_WINDOW');
    expect(result.signals.resolvedBecause).toBe('post_session_adaptation_window');
  });

  it('double session: recovery between sessions until pre-window', () => {
    const ref = new Date('2026-07-07T14:00:00');
    const result = resolveAt(
      ref,
      [activity({ id: 'a1', date: new Date('2026-07-07T08:00:00'), load: 50 })],
      [planned({ id: 'p1', date: TRAINING_DAY, startTime: '18:00' })],
      { minutesSinceLastActivity: 360 },
    );
    expect(result.phase).toBe('RECOVERY_WINDOW');
    expect(result.signals.resolvedBecause).toBe('between_sessions_recovery');
  });

  it('double session: before second session in pre-window', () => {
    const ref = new Date('2026-07-07T16:30:00');
    const result = resolveAt(
      ref,
      [activity({ id: 'a1', date: new Date('2026-07-07T08:00:00') })],
      [planned({ id: 'p1', date: TRAINING_DAY, startTime: '18:00' })],
      { minutesSinceLastActivity: 510 },
    );
    expect(result.phase).toBe('BEFORE_SESSION');
  });

  it('never before_session without planned remaining', () => {
    const ref = new Date('2026-07-07T17:00:00');
    const result = resolveAt(ref, [], []);
    expect(result.phase).not.toBe('BEFORE_SESSION');
  });
});

describe('resolveDailyPhase — athlete state priority', () => {
  it('rest day evolves to recovery preparation without hard 18:00 transition', () => {
    const ref = new Date('2026-07-07T14:00:00');
    const result = resolveAt(ref, [], [], {
      priorPhase: 'MORNING',
      newInferenceSincePriorSnapshot: true,
      minutesSinceSnapshotGenerated: 180,
    });
    expect(result.phase).toBe('RECOVERY_WINDOW');
    expect(result.signals.resolvedBecause).toBe('rest_day_recovery_preparation');
  });

  it('rest day stays morning until inference evolves', () => {
    const ref = new Date('2026-07-07T14:00:00');
    const result = resolveAt(ref, [], [], {
      priorPhase: null,
      minutesSinceSnapshotGenerated: 15,
    });
    expect(result.phase).toBe('MORNING');
  });

  it('end of day from sleep logged (not clock)', () => {
    const ref = new Date('2026-07-07T20:00:00');
    const result = resolveAt(
      ref,
      [activity({ id: 'a1', date: new Date('2026-07-07T08:00:00') })],
      [],
      {
        sleepLoggedTonight: true,
        minutesSinceLastActivity: 720,
        dailyStrainAvailable: true,
        priorPhase: 'RECOVERY_WINDOW',
      },
    );
    expect(result.phase).toBe('END_OF_DAY');
    expect(result.signals.resolvedBecause).toBe('sleep_logged_tonight');
  });

  it('end of day after recovery window exhausted post-training', () => {
    const ref = new Date('2026-07-07T20:00:00');
    const result = resolveAt(
      ref,
      [activity({ id: 'a1', date: new Date('2026-07-07T08:00:00') })],
      [],
      {
        minutesSinceLastActivity: 300,
        dailyStrainAvailable: true,
        priorPhase: 'RECOVERY_WINDOW',
      },
    );
    expect(result.phase).toBe('END_OF_DAY');
    expect(result.signals.resolvedBecause).toBe('recovery_window_exhausted');
  });

  it('new session observation forces session_completed even late evening', () => {
    const ref = new Date('2026-07-07T21:45:00');
    const result = resolveAt(
      ref,
      [activity({ id: 'a1', date: new Date('2026-07-07T21:30:00') })],
      [],
      { newSessionSincePriorSnapshot: true, minutesSinceLastActivity: 15 },
    );
    expect(result.phase).toBe('SESSION_COMPLETED');
  });
});

describe('resolveDailyPhase — time fallback only', () => {
  it('uses 22:00 fallback when signals ambiguous on rest day', () => {
    const ref = new Date('2026-07-07T22:30:00');
    const result = resolveAt(ref, [], [], { priorPhase: 'MORNING' });
    expect(result.phase).toBe('END_OF_DAY');
    expect(result.signals.resolvedBecause).toBe('time_fallback_late_night');
  });

  it('does not jump to end_of_day at 18:00 on rest day', () => {
    const ref = new Date('2026-07-07T18:00:00');
    const result = resolveAt(ref, [], [], {
      priorPhase: 'MORNING',
      minutesSinceSnapshotGenerated: 30,
      recommendationAvailable: false,
      adviceActionable: false,
    });
    expect(result.phase).not.toBe('END_OF_DAY');
    expect(result.phase).toBe('MORNING');
  });
});

describe('resolveDailyPhase — unique questions per phase', () => {
  it('exposes distinct primary questions', () => {
    const questions = Object.values(DAILY_PHASE_PRIMARY_QUESTION);
    expect(new Set(questions).size).toBe(questions.length);
  });
});

describe('phase guards', () => {
  it('forward advice only morning and before_session', () => {
    expect(isForwardAdvicePhase('MORNING')).toBe(true);
    expect(isForwardAdvicePhase('BEFORE_SESSION')).toBe(true);
    expect(isForwardAdvicePhase('RECOVERY_WINDOW')).toBe(false);
  });

  it('post training phases include recovery window', () => {
    expect(isPostTrainingPhase('SESSION_COMPLETED')).toBe(true);
    expect(isPostTrainingPhase('RECOVERY_WINDOW')).toBe(true);
    expect(isPostTrainingPhase('END_OF_DAY')).toBe(true);
    expect(isPostTrainingPhase('MORNING')).toBe(false);
  });
});

describe('buildDailyPhaseDayContext', () => {
  it('derives completed_with_remaining status', () => {
    const ref = new Date('2026-07-07T12:00:00');
    const ctx = buildDailyPhaseDayContext(
      ref,
      [activity({ id: 'a1', date: ref })],
      [planned({ id: 'p1', date: TRAINING_DAY })],
    );
    expect(ctx.sessionStatus).toBe('COMPLETED_WITH_REMAINING');
    expect(ctx.remainingPlannedCount).toBe(1);
  });
});
