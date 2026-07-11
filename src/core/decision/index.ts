/**
 * Decision Engine — canonical orchestration layer (decision-v1).
 *
 * @see docs/models/DECISION_ENGINE.md
 */

export { DECISION_ENGINE_VERSION } from './decision-state';
export type {
  DecisionConfidenceTier,
  DecisionConflict,
  DecisionDomain,
  DecisionEngineInput,
  DecisionEngineOutput,
  DecisionEvidence,
  DecisionLimitingFactor,
  DecisionPriority,
  DecisionSeverity,
  DecisionState,
  PrimaryDecision,
  SuppressedDecisionEvidence,
} from './decision-state';

export { runDecisionEngine } from './decision-engine';
export { decisionStateToReasoningState, serializeDecisionState } from './adapters';
export type { SerializedDecisionState } from './adapters';

export { DOMAIN_SAFETY_PRIORITY } from './priority';
