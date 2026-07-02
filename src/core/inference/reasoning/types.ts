/**
 * REASONING ENGINE v1 — Domain Types
 *
 * Types specific to the Reasoning Engine.
 * Implements the type contracts defined in docs/models/REASONING_ENGINE.md §4.
 *
 * Key design: the Reasoning Engine does not compute physiological scores.
 * It reasons over already-computed AthleteState from the Digital Twin.
 */

import type { DataCompleteness, AthleteState } from '@/core/digital-twin/types';

// ─────────────────────────────────────────────────────────────────────────────
// Re-export digital twin reasoning types for convenience
// ─────────────────────────────────────────────────────────────────────────────

export type {
  OverallVerdict,
  SystemAttentionPriority,
  PhysiologicalConsistency,
  FindingSeverity,
  FindingCategory,
  ReasoningFinding,
  OpportunityType,
  OpportunityTimeWindow,
  ReasoningOpportunity,
  ConflictType,
  ReasoningConflict,
  ReasoningState,
} from '@/core/digital-twin/types';
export type { DataCompleteness, AthleteState };

// ─────────────────────────────────────────────────────────────────────────────
// Model input
// ─────────────────────────────────────────────────────────────────────────────

export type ReasoningModelInput = {
  readonly trainingDayId: string;
  readonly athleteId: string;
  readonly athleteState: AthleteState;
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal direction type (consistency computation)
// ─────────────────────────────────────────────────────────────────────────────

export type PhysiologicalDirection = 'TRAIN' | 'EASY' | 'REST' | 'UNKNOWN';

export type ModelDirections = {
  readonly recovery: PhysiologicalDirection;
  readonly fatigue: PhysiologicalDirection;
  readonly adaptation: PhysiologicalDirection;
};

// ─────────────────────────────────────────────────────────────────────────────
// Ephemeral signals
// ─────────────────────────────────────────────────────────────────────────────

export type ReasoningSignals = {
  readonly overallVerdict: import('@/core/digital-twin/types').OverallVerdict;
  readonly physiologicalConsistency: import('@/core/digital-twin/types').PhysiologicalConsistency;
  readonly consistencyScore: number;
  readonly availableModelCount: number;
  readonly modelDirections: ModelDirections;
  readonly conflictCount: number;
  readonly opportunityCount: number;
  readonly keyFindingCount: number;
  readonly hasRecoveryState: boolean;
  readonly hasFatigueState: boolean;
  readonly hasAdaptationState: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// Model output
// ─────────────────────────────────────────────────────────────────────────────

export type ReasoningModelOutput = {
  readonly signals: ReasoningSignals;
  readonly reasoningState: import('@/core/digital-twin/types').ReasoningState;
  readonly explanation: string;
};
