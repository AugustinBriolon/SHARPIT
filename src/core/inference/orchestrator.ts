/**
 * RECOVERY INFERENCE ORCHESTRATOR
 *
 * Connects the Feature Engine, Recovery Model, Digital Twin, and Decision Records
 * into a single end-to-end inference pipeline.
 *
 * Pipeline for one training day:
 *   1. Resolve DayFeatures from the FeatureEngine
 *   2. Read previous recovery score from Digital Twin
 *   3. Run the Recovery Model (pure function → no side effects)
 *   4. Persist the Decision Record (immutable audit trail)
 *   5. Update the Digital Twin with the new RecoveryState
 *   6. Return the full result to the caller
 *
 * The orchestrator handles all side effects.
 * The Recovery Model itself is pure (no database calls, no randomness).
 *
 * Error handling: any step 4-5 failure is non-fatal to the caller —
 * the inference result is returned regardless of persistence failures.
 * Infrastructure errors are logged but not propagated.
 */

import { randomUUID } from 'node:crypto';

import type { FeatureEngine } from '@/core/features/engine';
import type { DigitalTwinRepository } from '@/core/digital-twin/repository';
import type { DecisionRecordRepository } from './types';

import { runRecoveryModel } from './recovery/model';
import type { RecoveryModelOutput, RecoveryModelContext } from './recovery/types';
import type { DecisionRecord } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Result type
// ─────────────────────────────────────────────────────────────────────────────

export type RecoveryInferenceResult = {
  readonly athleteId: string;
  readonly trainingDayId: string;

  /** The full model output (score, signals, decision, recommendation, explanation). */
  readonly output: RecoveryModelOutput;

  /** The Decision Record that was persisted (null if persistence failed). */
  readonly decisionRecordId: string | null;

  /** True if the Digital Twin was successfully updated. */
  readonly digitalTwinUpdated: boolean;

  readonly computedAt: Date;
};

// ─────────────────────────────────────────────────────────────────────────────
// Input summary builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract the key feature values used for inference.
 * Stored in the Decision Record for future audit and explanation.
 * This is NOT the full DayFeatures — only the values the model consumed.
 */
function buildInputSummary(
  features: import('@/core/features/types').DayFeatures,
): Record<string, unknown> {
  const recovery = features.recovery !== 'PENDING' ? features.recovery : null;
  const load = features.load !== 'PENDING' ? features.load : null;

  return {
    trainingDayId: features.trainingDayId,
    recovery: recovery
      ? {
          hrvAbsolute: recovery.hrvAbsolute,
          hrvDeltaFromBaseline: recovery.hrvDeltaFromBaseline,
          rhrAbsolute: recovery.rhrAbsolute,
          rhrDeltaFromBaseline: recovery.rhrDeltaFromBaseline,
          sleepEfficiencyPercent: recovery.sleepEfficiencyPercent,
          sleepDebtMin: recovery.sleepDebtMin,
          subjectiveWellnessIndex: recovery.subjectiveWellnessIndex,
          rpeVsTargetZone: recovery.rpeVsTargetZone,
          confidence: recovery.confidence,
        }
      : null,
    load: load
      ? {
          acwr: load.acwr,
          acuteLoad: load.acuteLoad,
          chronicLoad: load.chronicLoad,
          loadMonotony: load.loadMonotony,
          confidence: load.confidence,
        }
      : null,
    sessionCount: features.sessions.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Orchestrator
// ─────────────────────────────────────────────────────────────────────────────

export type RecoveryOrchestratorDeps = {
  featureEngine: FeatureEngine;
  digitalTwinRepo: DigitalTwinRepository;
  decisionRecordRepo: DecisionRecordRepository;
};

export class RecoveryInferenceOrchestrator {
  constructor(private readonly deps: RecoveryOrchestratorDeps) {}

  /**
   * Run the complete Recovery Inference pipeline for one training day.
   * Returns the full result including recommendation and explanation.
   */
  async run(athleteId: string, trainingDayId: string): Promise<RecoveryInferenceResult> {
    const computedAt = new Date();

    // ── Step 1: Get DayFeatures ────────────────────────────────────────────
    const features = await this.deps.featureEngine.getDayFeatures(athleteId, trainingDayId);

    // ── Step 2: Get previous recovery score for trend computation ──────────
    const previousScore = await this.deps.digitalTwinRepo.getPreviousRecoveryScore(athleteId);

    const context: RecoveryModelContext = {
      athleteId,
      trainingDayId,
      previousReadinessScore: previousScore,
    };

    // ── Step 3: Run the Recovery Model (pure — no side effects) ───────────
    const output = runRecoveryModel(features, context);

    // ── Step 4: Persist Decision Record ───────────────────────────────────
    const recordId = randomUUID();
    let decisionRecordId: string | null = recordId;
    let digitalTwinUpdated = false;

    const record: DecisionRecord = {
      id: recordId,
      athleteId,
      trainingDayId,
      modelId: 'recovery-synthesis-v1',
      modelVersion: 'v1',
      confidence: output.recoveryState.confidence,
      signals: output.signals as unknown as Record<string, unknown>,
      stateUpdate: output.recoveryState as unknown as Record<string, unknown>,
      decision: output.decision as unknown as Record<string, unknown>,
      recommendation: output.recommendation as unknown as Record<string, unknown>,
      explanation: output.explanation,
      inputSummary: buildInputSummary(features),
      computedAt,
      createdAt: computedAt,
    };

    try {
      await this.deps.decisionRecordRepo.save(record);
    } catch (err) {
      console.error('[RecoveryOrchestrator] Failed to persist DecisionRecord:', err);
      decisionRecordId = null;
    }

    // ── Step 5: Update Digital Twin ────────────────────────────────────────
    try {
      await this.deps.digitalTwinRepo.updateRecovery(athleteId, output.recoveryState);
      digitalTwinUpdated = true;
    } catch (err) {
      console.error('[RecoveryOrchestrator] Failed to update Digital Twin:', err);
    }

    return {
      athleteId,
      trainingDayId,
      output,
      decisionRecordId,
      digitalTwinUpdated,
      computedAt,
    };
  }

  /**
   * Retrieve the current recovery state without re-running inference.
   * Used by the API when the latest Decision Record is still fresh.
   */
  async getLatest(
    athleteId: string,
    trainingDayId: string,
  ): Promise<RecoveryInferenceResult | null> {
    const record = await this.deps.decisionRecordRepo.findLatest(
      athleteId,
      'recovery-synthesis-v1',
      trainingDayId,
    );
    if (!record) return null;

    // Reconstruct output from the stored record
    const output: RecoveryModelOutput = {
      signals: record.signals as import('./recovery/types').RecoverySignals,
      recoveryState: {
        ...(record.stateUpdate as Omit<
          import('@/core/digital-twin/types').RecoveryState,
          'computedAt'
        >),
        computedAt: new Date(
          (record.stateUpdate as { computedAt: string }).computedAt ?? record.computedAt,
        ),
      } as import('@/core/digital-twin/types').RecoveryState,
      decision: record.decision as import('./recovery/types').RecoveryDecision,
      recommendation: record.recommendation as import('./recovery/types').RecoveryRecommendation,
      explanation: record.explanation,
    };

    return {
      athleteId,
      trainingDayId,
      output,
      decisionRecordId: record.id,
      digitalTwinUpdated: true,
      computedAt: record.computedAt,
    };
  }
}
