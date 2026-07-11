/**
 * PHYSICAL HEALTH ENGINE — Domain Types (Phase 1)
 *
 * Persistent physiological memory for long-term physical conditions.
 * Observations are evidence. Condition state is inferred (Phase 2 engine).
 *
 * @see docs/models/PHYSICAL_HEALTH_ENGINE.md
 */

// ─────────────────────────────────────────────────────────────────────────────
// Taxonomy
// ─────────────────────────────────────────────────────────────────────────────

/** Anatomically localized vs whole-body / systemic conditions. */
export type ConditionScope = 'LOCALIZED' | 'SYSTEMIC';

export type ConditionType =
  | 'PAIN'
  | 'INJURY'
  | 'DISCOMFORT'
  | 'MOBILITY_LIMITATION'
  | 'POSTURE_ISSUE'
  | 'MUSCULAR_TIGHTNESS'
  | 'JOINT_STIFFNESS'
  | 'INSTABILITY'
  | 'RECURRING_PHYSICAL'
  | 'OTHER';

/** Inferred lifecycle status — written by engine (Phase 2) or seeded at migration. */
export type ConditionStatus =
  'NEW' | 'ACTIVE' | 'IMPROVING' | 'STABLE' | 'WORSENING' | 'RESOLVED' | 'RECURRENT';

export type EpisodeStatus = 'ACTIVE' | 'IMPROVING' | 'STABLE' | 'WORSENING' | 'RESOLVED';

export type ObservationContext =
  | 'BEFORE_SESSION'
  | 'DURING_SESSION'
  | 'AFTER_SESSION'
  | 'MORNING_CHECKIN'
  | 'EVENING_CHECKIN'
  | 'MANUAL'
  | 'COACH_CONVERSATION'
  | 'INTEGRATION'
  | 'LEGACY_MIGRATION';

export type ObservationSource = 'ATHLETE' | 'COACH_AI' | 'SYSTEM_MIGRATION' | 'INTEGRATION';

/**
 * Functional impact of a condition at a point in time.
 * Distinct from pain severity — e.g. pain 2/10 but unable to run.
 */
export type FunctionalImpact = 'NONE' | 'MILD' | 'MODERATE' | 'LIMITING' | 'STOPPED';

export type TrainingCapacityLevel = 'FULL' | 'REDUCED' | 'LIMITED' | 'UNABLE';

export type ConditionTrend = 'IMPROVING' | 'STABLE' | 'WORSENING' | 'UNKNOWN';

export type KnowledgeHypothesisType =
  'TRIGGER' | 'RECOVERY_DURATION' | 'RECURRENCE_PATTERN' | 'OTHER';

export type KnowledgeConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';

// ─────────────────────────────────────────────────────────────────────────────
// Core entities (domain — persistence mirrors in Prisma)
// ─────────────────────────────────────────────────────────────────────────────

export type Condition = {
  readonly id: string;
  readonly scope: ConditionScope;
  readonly type: ConditionType;
  /** Localized: "Achilles tendon". Systemic: "Global mobility". */
  readonly bodyRegion: string;
  readonly side: 'LEFT' | 'RIGHT' | 'BILATERAL' | 'NA';
  readonly label: string;
  readonly diagnosis: string | null;
  /** Inferred state — not a raw pain score. */
  readonly status: ConditionStatus;
  readonly severity: number;
  readonly confidence: number;
  readonly affectsTraining: boolean;
  readonly startedAt: Date;
  readonly resolvedAt: Date | null;
  readonly lastObservationAt: Date | null;
  readonly recurrenceCount: number;
  readonly observationCount: number;
  readonly estimatedRecoveryDays: number | null;
  /** Athlete- or coach-entered only. Never inferred in Phase 1. */
  readonly primaryTriggerManual: string | null;
  readonly legacyPhysicalNoteId: string | null;
};

export type ConditionEpisode = {
  readonly id: string;
  readonly conditionId: string;
  readonly episodeNumber: number;
  readonly status: EpisodeStatus;
  readonly startedAt: Date;
  readonly resolvedAt: Date | null;
  readonly peakSeverity: number | null;
  readonly estimatedRecoveryDays: number | null;
  readonly triggerHypothesis: string | null;
};

export type ConditionObservation = {
  readonly id: string;
  readonly conditionId: string | null;
  readonly episodeId: string | null;
  readonly observedAt: Date;
  readonly context: ObservationContext;
  readonly source: ObservationSource;
  /**
   * false = no symptom during this context (evidence, not resolution).
   * true = symptom reported or severity provided.
   */
  readonly symptomPresent: boolean;
  readonly severityReported: number | null;
  readonly functionalImpact: FunctionalImpact | null;
  readonly bodyRegion: string;
  readonly side: Condition['side'];
  readonly type: ConditionType;
  readonly comment: string | null;
  readonly activityId: string | null;
  readonly plannedSessionId: string | null;
  readonly trainingDayId: string | null;
  readonly externalId: string | null;
  readonly legacyPhysicalCheckinId: string | null;
};

/**
 * Functional capacity snapshot — separates symptoms from what the athlete can do.
 */
export type FunctionalCapacity = {
  readonly id: string;
  readonly conditionId: string;
  readonly observationId: string | null;
  readonly assessedAt: Date;
  readonly painSeverity: number | null;
  readonly trainingCapacity: TrainingCapacityLevel;
  readonly comment: string | null;
};

/**
 * Personalized hypotheses (Phase 4 inference). Stored in Phase 1, never auto-populated.
 */
export type ConditionKnowledge = {
  readonly id: string;
  readonly conditionId: string;
  readonly hypothesisType: KnowledgeHypothesisType;
  readonly description: string;
  readonly confidence: KnowledgeConfidenceLevel;
  readonly evidenceCount: number;
  readonly isInferred: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

/** Inferred condition state produced by the engine (Phase 2). */
export type InferredConditionState = {
  readonly conditionId: string;
  readonly severity: number;
  readonly status: ConditionStatus;
  readonly trend: ConditionTrend;
  readonly confidence: number;
  readonly functionalCapacity: TrainingCapacityLevel | null;
  readonly evidenceObservationIds: readonly string[];
  readonly computedAt: Date;
};

// ─────────────────────────────────────────────────────────────────────────────
// Timeline (derived view)
// ─────────────────────────────────────────────────────────────────────────────

export type ConditionTimelineEventKind =
  | 'CONDITION_STARTED'
  | 'EPISODE_STARTED'
  | 'EPISODE_RESOLVED'
  | 'OBSERVATION'
  | 'FUNCTIONAL_CAPACITY'
  | 'KNOWLEDGE_ADDED'
  | 'STATUS_CHANGE';

export type ConditionTimelineEvent = {
  readonly at: Date;
  readonly kind: ConditionTimelineEventKind;
  readonly label: string;
  readonly observationId?: string;
  readonly episodeId?: string;
  readonly severityReported?: number | null;
  readonly symptomPresent?: boolean;
  readonly functionalImpact?: FunctionalImpact | null;
  readonly context?: ObservationContext;
};

export type ConditionTimeline = {
  readonly conditionId: string;
  readonly events: readonly ConditionTimelineEvent[];
};
