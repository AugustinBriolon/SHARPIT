/**
 * Daily Phase — athlete-centric day context for Context-Aware Today.
 *
 * Priority: session status → athlete state → local time (fallback only).
 */

export type DailyPhase =
  'MORNING' | 'BEFORE_SESSION' | 'SESSION_COMPLETED' | 'RECOVERY_WINDOW' | 'END_OF_DAY';

export type DailyPhaseSessionStatus =
  'NONE_TODAY' | 'PLANNED_ONLY' | 'COMPLETED_ONLY' | 'COMPLETED_WITH_REMAINING';

export type DailyPhaseWhyFocus =
  'readiness' | 'session_prep' | 'session_review' | 'adaptation_recovery' | 'tomorrow_impact';

export type BriefingPhaseBucket = 'morning' | 'midday' | 'afternoon' | 'evening';

export type DailyPhaseAthleteSignals = {
  recommendationAvailable: boolean;
  adviceActionable: boolean;
  dailyStrainAvailable: boolean;
  newSessionSincePriorSnapshot: boolean;
  newInferenceSincePriorSnapshot: boolean;
  newObservationsSincePriorSnapshot: boolean;
  /** Minutes since the most recent activity today, if any. */
  minutesSinceLastActivity: number | null;
  /** Minutes since the current snapshot was generated (or ref if first). */
  minutesSinceSnapshotGenerated: number | null;
  /** Phase on the prior snapshot for the same training day, if known. */
  priorPhase: DailyPhase | null;
  /** Evening sleep observation logged for tonight (wrap-up signal). */
  sleepLoggedTonight: boolean;
};

export type DailyPhaseDayContext = {
  sessionStatus: DailyPhaseSessionStatus;
  completedSessionCount: number;
  plannedSessionCount: number;
  remainingPlannedCount: number;
  lastActivityAt: string | null;
  nextPlannedStartAt: string | null;
};

export type DailyPhaseInput = {
  dayContext: DailyPhaseDayContext;
  athlete: DailyPhaseAthleteSignals;
  localHour: number;
};

export type DailyPhaseSignals = DailyPhaseDayContext &
  Pick<
    DailyPhaseAthleteSignals,
    | 'dailyStrainAvailable'
    | 'newSessionSincePriorSnapshot'
    | 'newInferenceSincePriorSnapshot'
    | 'minutesSinceLastActivity'
    | 'minutesSinceSnapshotGenerated'
    | 'priorPhase'
    | 'sleepLoggedTonight'
  > & {
    localHour: number;
    resolvedBecause: string;
  };

export type DailyPhaseResolution = {
  phase: DailyPhase;
  phaseLabel: string;
  primaryQuestion: string;
  whyFocus: DailyPhaseWhyFocus;
  briefingPhase: BriefingPhaseBucket;
  signals: DailyPhaseSignals;
};

export const DAILY_PHASE_PRIMARY_QUESTION: Record<DailyPhase, string> = {
  MORNING: "Qu'est-ce qui compte aujourd'hui ?",
  BEFORE_SESSION: "Comment aborder la séance d'aujourd'hui ?",
  SESSION_COMPLETED: "Qu'a accompli l'entraînement d'aujourd'hui ?",
  RECOVERY_WINDOW: "Que faire maintenant pour maximiser l'adaptation ?",
  END_OF_DAY: "Comment aujourd'hui change-t-il demain ?",
};

export const DAILY_PHASE_LABEL: Record<DailyPhase, string> = {
  MORNING: 'Matin',
  BEFORE_SESSION: 'Avant la séance',
  SESSION_COMPLETED: 'Séance terminée',
  RECOVERY_WINDOW: 'Fenêtre de récupération',
  END_OF_DAY: 'Fin de journée',
};

export const DAILY_PHASE_WHY_FOCUS: Record<DailyPhase, DailyPhaseWhyFocus> = {
  MORNING: 'readiness',
  BEFORE_SESSION: 'session_prep',
  SESSION_COMPLETED: 'session_review',
  RECOVERY_WINDOW: 'adaptation_recovery',
  END_OF_DAY: 'tomorrow_impact',
};

export const DAILY_PHASE_BRIEFING_BUCKET: Record<DailyPhase, BriefingPhaseBucket> = {
  MORNING: 'morning',
  BEFORE_SESSION: 'midday',
  SESSION_COMPLETED: 'afternoon',
  RECOVERY_WINDOW: 'evening',
  END_OF_DAY: 'evening',
};
