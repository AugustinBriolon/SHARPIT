/**
 * DIGITAL TWIN — Repository Port
 *
 * Hexagonal port for persisting and retrieving the Digital Twin.
 * The Inference Orchestrator depends on this interface — no concrete
 * storage technology is referenced here.
 *
 * Invariants:
 *   - One Digital Twin per athlete (upsert semantics in save).
 *   - findOrCreate must always return a Twin (creates empty state if absent).
 *   - updateRecovery applies a partial state update without overwriting
 *     other sub-dimensions (future models must follow the same pattern).
 */

import type {
  DigitalTwin,
  RecoveryState,
  FatigueState,
  AdaptationState,
  ReasoningState,
} from './types';

export interface DigitalTwinRepository {
  /**
   * Find the Digital Twin for an athlete.
   * Creates one with empty state if it doesn't exist yet (cold start).
   */
  findOrCreate(athleteId: string): Promise<DigitalTwin>;

  /**
   * Update the RecoveryState sub-dimension of the Digital Twin.
   * Other sub-dimensions are left unchanged.
   */
  updateRecovery(athleteId: string, recoveryState: RecoveryState): Promise<DigitalTwin>;

  /**
   * Get the current recovery score for trend computation.
   */
  getPreviousRecoveryScore(athleteId: string): Promise<number | null>;

  /**
   * Update the FatigueState sub-dimension of the Digital Twin.
   * Other sub-dimensions are left unchanged.
   */
  updateFatigue(athleteId: string, fatigueState: FatigueState): Promise<DigitalTwin>;

  /**
   * Get the current fatigue state (for the Fatigue Model context).
   * Returns null on cold start.
   */
  getPreviousFatigueState(athleteId: string): Promise<FatigueState | null>;

  /**
   * Update the AdaptationState sub-dimension of the Digital Twin.
   * Other sub-dimensions are left unchanged.
   */
  updateAdaptation(athleteId: string, adaptationState: AdaptationState): Promise<DigitalTwin>;

  /**
   * Get the current adaptation state.
   * Returns null on cold start.
   */
  getPreviousAdaptationState(athleteId: string): Promise<AdaptationState | null>;

  /**
   * Update the ReasoningState sub-dimension of the Digital Twin.
   * Other sub-dimensions are left unchanged.
   */
  updateReasoning(athleteId: string, reasoningState: ReasoningState): Promise<DigitalTwin>;

  /**
   * Get the current reasoning state.
   * Returns null on cold start.
   */
  getPreviousReasoningState(athleteId: string): Promise<ReasoningState | null>;
}
