import {
  ACCOMPLISHMENT_WINDOW_MINUTES,
  END_OF_DAY_HOUR_FALLBACK,
  LATE_DAY_HOUR_FALLBACK,
  RECOVERY_TO_END_OF_DAY_MINUTES,
  REST_DAY_PREP_SNAPSHOT_AGE_MINUTES,
} from '@/lib/daily-phase/constants';
import { isAccomplishmentWindow, isPreSessionWindow } from '@/lib/daily-phase/session-window';
import {
  DAILY_PHASE_BRIEFING_BUCKET,
  DAILY_PHASE_LABEL,
  DAILY_PHASE_PRIMARY_QUESTION,
  DAILY_PHASE_WHY_FOCUS,
  type DailyPhase,
  type DailyPhaseInput,
  type DailyPhaseResolution,
  type DailyPhaseSignals,
} from '@/lib/daily-phase/types';

type ResolveResult = { phase: DailyPhase; because: string };

function buildSignals(input: DailyPhaseInput, because: string): DailyPhaseSignals {
  const { dayContext, athlete, localHour } = input;
  return {
    ...dayContext,
    localHour,
    dailyStrainAvailable: athlete.dailyStrainAvailable,
    newSessionSincePriorSnapshot: athlete.newSessionSincePriorSnapshot,
    newInferenceSincePriorSnapshot: athlete.newInferenceSincePriorSnapshot,
    minutesSinceLastActivity: athlete.minutesSinceLastActivity,
    minutesSinceSnapshotGenerated: athlete.minutesSinceSnapshotGenerated,
    priorPhase: athlete.priorPhase,
    sleepLoggedTonight: athlete.sleepLoggedTonight,
    resolvedBecause: because,
  };
}

function toResolution(input: DailyPhaseInput, result: ResolveResult): DailyPhaseResolution {
  const { phase, because } = result;
  return {
    phase,
    phaseLabel: DAILY_PHASE_LABEL[phase],
    primaryQuestion: DAILY_PHASE_PRIMARY_QUESTION[phase],
    whyFocus: DAILY_PHASE_WHY_FOCUS[phase],
    briefingPhase: DAILY_PHASE_BRIEFING_BUCKET[phase],
    signals: buildSignals(input, because),
  };
}

function shouldEndOfDay(input: DailyPhaseInput): ResolveResult | null {
  const { dayContext, athlete, localHour } = input;

  if (athlete.sleepLoggedTonight) {
    return { phase: 'END_OF_DAY', because: 'sleep_logged_tonight' };
  }

  const trainingDone =
    dayContext.completedSessionCount > 0 && dayContext.remainingPlannedCount === 0;
  const restDay = dayContext.sessionStatus === 'NONE_TODAY';

  if (trainingDone && athlete.minutesSinceLastActivity != null) {
    if (athlete.minutesSinceLastActivity >= RECOVERY_TO_END_OF_DAY_MINUTES) {
      if (athlete.priorPhase === 'RECOVERY_WINDOW' || athlete.dailyStrainAvailable) {
        return { phase: 'END_OF_DAY', because: 'recovery_window_exhausted' };
      }
    }
  }

  if (restDay && athlete.priorPhase === 'RECOVERY_WINDOW') {
    if (
      athlete.newInferenceSincePriorSnapshot ||
      (athlete.minutesSinceSnapshotGenerated != null &&
        athlete.minutesSinceSnapshotGenerated >= REST_DAY_PREP_SNAPSHOT_AGE_MINUTES * 2)
    ) {
      return { phase: 'END_OF_DAY', because: 'rest_day_preparation_complete' };
    }
  }

  if (localHour >= END_OF_DAY_HOUR_FALLBACK) {
    return { phase: 'END_OF_DAY', because: 'time_fallback_late_night' };
  }

  if (
    localHour >= LATE_DAY_HOUR_FALLBACK &&
    trainingDone &&
    athlete.minutesSinceLastActivity != null &&
    athlete.minutesSinceLastActivity >= ACCOMPLISHMENT_WINDOW_MINUTES
  ) {
    return { phase: 'END_OF_DAY', because: 'time_fallback_late_day_post_training' };
  }

  return null;
}

function resolveWithCompletedSession(input: DailyPhaseInput, refDate: Date): ResolveResult | null {
  const { dayContext, athlete } = input;

  if (dayContext.completedSessionCount === 0) return null;

  const accomplishment = isAccomplishmentWindow(
    athlete.minutesSinceLastActivity,
    athlete.newSessionSincePriorSnapshot,
  );

  if (accomplishment) {
    return { phase: 'SESSION_COMPLETED', because: 'session_recently_completed' };
  }

  if (dayContext.remainingPlannedCount > 0 && isPreSessionWindow(dayContext, refDate, refDate)) {
    return { phase: 'BEFORE_SESSION', because: 'next_planned_session_approaching' };
  }

  if (dayContext.remainingPlannedCount === 0) {
    return { phase: 'RECOVERY_WINDOW', because: 'post_session_adaptation_window' };
  }

  return { phase: 'RECOVERY_WINDOW', because: 'between_sessions_recovery' };
}

function resolvePlannedOnly(input: DailyPhaseInput, refDate: Date): ResolveResult | null {
  const { dayContext } = input;

  if (dayContext.sessionStatus !== 'PLANNED_ONLY') return null;

  if (isPreSessionWindow(dayContext, refDate, refDate)) {
    return { phase: 'BEFORE_SESSION', because: 'planned_session_pre_window' };
  }

  return { phase: 'MORNING', because: 'planned_session_later_today' };
}

function resolveRestDay(input: DailyPhaseInput): ResolveResult | null {
  const { dayContext, athlete } = input;

  if (dayContext.sessionStatus !== 'NONE_TODAY') return null;

  const inferenceReady =
    athlete.newInferenceSincePriorSnapshot ||
    athlete.newObservationsSincePriorSnapshot ||
    (athlete.recommendationAvailable && athlete.adviceActionable);

  const evolvedPastMorning =
    athlete.priorPhase === 'MORNING' ||
    athlete.priorPhase === 'RECOVERY_WINDOW' ||
    (athlete.minutesSinceSnapshotGenerated != null &&
      athlete.minutesSinceSnapshotGenerated >= REST_DAY_PREP_SNAPSHOT_AGE_MINUTES);

  if (inferenceReady && evolvedPastMorning) {
    return { phase: 'RECOVERY_WINDOW', because: 'rest_day_recovery_preparation' };
  }

  return { phase: 'MORNING', because: 'rest_day_morning_focus' };
}

/**
 * Resolve the athlete's current Daily Phase.
 *
 * Priority: session status → athlete state → local time (fallback).
 */
export function resolveDailyPhase(
  input: DailyPhaseInput,
  refDate: Date = new Date(),
): DailyPhaseResolution {
  const endOfDay = shouldEndOfDay(input);
  if (endOfDay) return toResolution(input, endOfDay);

  const postSession = resolveWithCompletedSession(input, refDate);
  if (postSession) return toResolution(input, postSession);

  const planned = resolvePlannedOnly(input, refDate);
  if (planned) return toResolution(input, planned);

  const restDay = resolveRestDay(input);
  if (restDay) return toResolution(input, restDay);

  return toResolution(input, { phase: 'MORNING', because: 'default_morning' });
}

export function isForwardAdvicePhase(phase: DailyPhase): boolean {
  return phase === 'MORNING' || phase === 'BEFORE_SESSION';
}

export function isPostTrainingPhase(phase: DailyPhase): boolean {
  return phase === 'SESSION_COMPLETED' || phase === 'RECOVERY_WINDOW' || phase === 'END_OF_DAY';
}
