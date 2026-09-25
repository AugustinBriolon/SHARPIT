/**
 * Physical Health — Condition Repository Port
 *
 * Loads persisted conditions + observations for inference.
 */

import type { ConditionInferenceInput } from '@/core/inference/physical-health/types';

export interface ConditionRepository {
  /** All conditions with observations for inference (including resolved history). */
  findAllForInference(referenceTrainingDayId: string): Promise<ConditionInferenceInput[]>;

  /** Feature-engine compatible history from persisted conditions. */
  getConditionHistoryForFeatures(referenceTrainingDayId: string): Promise<{
    activeConditions: Array<{
      id: string;
      severity: number;
      affectsTraining: boolean;
    }>;
    severityHistory14d: Array<{ severity: number; timestamp: Date }>;
  }>;

  /** Persist inferred state back to Condition rows. */
  applyInferredUpdates(
    updates: readonly {
      conditionId: string;
      severity: number;
      status: string;
      confidence: number;
      estimatedRecoveryDays: number | null;
      recurrenceCount: number;
      lastObservationAt: Date | null;
    }[],
  ): Promise<void>;
}
