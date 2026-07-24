/**
 * Decision Memory — domain types.
 *
 * Connects what SHARPIT recommended (LLM proposal + Gate verdict + physiological
 * context), what the athlete decided, and what happened afterward. A separate
 * aggregate from DecisionRecord (per-engine-run inference audit) — see
 * docs/adr/ADR-006-decision-memory-aggregate.md.
 *
 * Not a physiological engine: everything here reads already-computed
 * AthleteSnapshot/DecisionState and history. No new inference.
 */

import type {
  CoachingDecisionActionSource,
  CoachingDecisionActionType,
  CoachingDecisionSource,
  CoachingDecisionStatus,
  CoachingOutcomeStatus,
} from '@prisma/client';
import type { GateProposal, GateSessionResult } from '@/lib/plan-gate/types';
import type { SessionAnalysis } from '@/lib/validators/coach';

export type {
  CoachingDecisionActionSource,
  CoachingDecisionActionType,
  CoachingDecisionSource,
  CoachingDecisionStatus,
  CoachingOutcomeStatus,
};

/** Frozen subset of AthleteSnapshot/DecisionState at recommendation time — embedded, never referenced. */
export type DecisionSnapshotContext = {
  readonly confidence: number | null;
  readonly confidenceTier: string | null;
  readonly overallVerdict: string | null;
  readonly limitingFactorSystem: string | null;
  readonly physicalHealthCapacity: string | null;
  readonly fatigueTrainingCapacity: string | null;
  /** Present when the decision is a morning session recalibration (V1). */
  readonly morningRecalibration?: {
    readonly direction: 'DOWN' | 'UP';
    readonly changeSummary: string;
    readonly why: string;
    readonly fromIntensity: string | null;
    readonly toIntensity: string | null;
    readonly fromDurationMin: number | null;
    readonly toDurationMin: number | null;
    readonly fromLoad: number | null;
    readonly toLoad: number | null;
    readonly fromDescription?: string | null;
    readonly toDescription?: string | null;
    readonly sessionType?: string;
  };
};

export type CoachingDecisionRecord = {
  readonly id: string;
  readonly athleteId: string;
  readonly trainingDayId: string;
  readonly source: CoachingDecisionSource;
  readonly status: CoachingDecisionStatus;
  readonly proposal: GateProposal;
  readonly gateResult: GateSessionResult;
  readonly snapshotContext: DecisionSnapshotContext;
  readonly snapshotIdAtRecommendation: string | null;
  readonly createdAt: Date;
};

export type CoachingDecisionActionRecord = {
  readonly id: string;
  readonly decisionId: string;
  readonly actionType: CoachingDecisionActionType;
  readonly occurredAt: Date;
  readonly source: CoachingDecisionActionSource;
  readonly rationale: string | null;
  readonly resultingPlannedSessionId: string | null;
};

/** A decision with its full append-only action log and outcome (if evaluated) — read-only, for presentation. */
export type CoachingDecisionWithHistory = CoachingDecisionRecord & {
  readonly actions: readonly CoachingDecisionActionRecord[];
  readonly outcome: OutcomeEvaluation | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Session execution (derived, not persisted)
// ─────────────────────────────────────────────────────────────────────────────

export type SessionExecutionState =
  'NOT_SCHEDULED' | 'SCHEDULED' | 'COMPLETED' | 'SKIPPED' | 'SUPERSEDED';

// ─────────────────────────────────────────────────────────────────────────────
// Outcome evaluation
// ─────────────────────────────────────────────────────────────────────────────

export type ExecutionMatch = {
  readonly plannedDurationMin: number | null;
  readonly actualDurationSec: number | null;
  readonly plannedLoad: number | null;
  readonly actualLoad: number | null;
  readonly verdict: SessionAnalysis['verdict'] | null;
  readonly complianceScore: number | null;
};

export type SubjectiveResponse = {
  readonly rpe: number | null;
  readonly feeling: string | null;
};

export type ShortTermRecoveryResponse = {
  readonly daysObserved: number;
  readonly readinessValues: (number | null)[];
  readonly fatigueIndexValues: (number | null)[];
};

export type SafetySignal = {
  readonly newOrWorseningSymptomCount: number;
  readonly observations: readonly {
    readonly observedAt: string;
    readonly severityReported: number | null;
    readonly comment: string | null;
  }[];
};

/**
 * Retrospective evaluation of one decision. Deliberately has no `success`/`quality`
 * field — only structured evidence buckets, explicit limitations, and a confidence
 * derived from evidence completeness, never from athlete compliance.
 */
export type OutcomeEvaluation = {
  readonly outcomeStatus: CoachingOutcomeStatus;
  readonly executionMatch: ExecutionMatch | null;
  readonly subjectiveResponse: SubjectiveResponse | null;
  readonly shortTermRecoveryResponse: ShortTermRecoveryResponse | null;
  readonly safetySignal: SafetySignal | null;
  readonly limitations: readonly string[];
  readonly confidence: number;
};

export type OutcomeEvaluationInput = {
  readonly sessionDate: Date;
  readonly now: Date;
  readonly plannedFields: {
    readonly durationMin: number | null;
    readonly load: number | null;
  };
  readonly linkedActivity: {
    readonly duration: number | null;
    readonly load: number | null;
    readonly rpe: number | null;
    readonly feeling: string | null;
  } | null;
  readonly sessionAnalysis: SessionAnalysis | null;
  /** ConditionObservation rows with plannedSessionId set, within the outcome window. */
  readonly conditionObservations: readonly {
    readonly observedAt: Date;
    readonly symptomPresent: boolean;
    readonly severityReported: number | null;
    readonly comment: string | null;
  }[];
  /** Whatever AthleteSnapshotRecord rows exist for trainingDayId+1..+3 — may be fewer than 3. */
  readonly recoverySnapshots: readonly {
    readonly readiness: number | null;
    readonly fatigueIndex: number | null;
  }[];
};
