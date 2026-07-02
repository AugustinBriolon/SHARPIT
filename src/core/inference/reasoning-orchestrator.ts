/**
 * REASONING ENGINE ORCHESTRATOR
 *
 * Connects the Digital Twin and Decision Records into a single end-to-end
 * synthesis pipeline for the Reasoning Engine.
 *
 * Pipeline for one training day:
 *   1. Read full AthleteState from the Digital Twin (recovery + fatigue + adaptation)
 *   2. Run the Reasoning Model (pure function → no side effects)
 *   3. Persist the Decision Record (immutable audit trail)
 *   4. Update the Digital Twin with the new ReasoningState
 *   5. Return the full result to the caller
 *
 * Key architectural difference vs. other orchestrators:
 *   NO FeatureEngine dependency — the Reasoning Engine reads exclusively from the
 *   Digital Twin. It performs second-order inference over already-computed states.
 *
 * Error handling: steps 3–4 failures are non-fatal — inference result is
 * returned regardless of persistence failures.
 */

import { randomUUID } from 'node:crypto';

import type { DigitalTwinRepository } from '@/core/digital-twin/repository';
import type { DecisionRecordRepository } from './types';

import { runReasoningModel } from './reasoning/model';
import type { ReasoningModelOutput } from './reasoning/types';
import type { DecisionRecord } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Result type
// ─────────────────────────────────────────────────────────────────────────────

export type ReasoningInferenceResult = {
  readonly athleteId: string;
  readonly trainingDayId: string;
  readonly output: ReasoningModelOutput;
  readonly decisionRecordId: string | null;
  readonly digitalTwinUpdated: boolean;
  readonly computedAt: Date;
};

// ─────────────────────────────────────────────────────────────────────────────
// Orchestrator
// ─────────────────────────────────────────────────────────────────────────────

export type ReasoningOrchestratorDeps = {
  digitalTwinRepo: DigitalTwinRepository;
  decisionRecordRepo: DecisionRecordRepository;
};

export class ReasoningInferenceOrchestrator {
  constructor(private readonly deps: ReasoningOrchestratorDeps) {}

  /**
   * Run the complete Reasoning inference pipeline for one training day.
   */
  async run(athleteId: string, trainingDayId: string): Promise<ReasoningInferenceResult> {
    const computedAt = new Date();

    // ── Step 1: Read full AthleteState from Digital Twin ──────────────────
    const twin = await this.deps.digitalTwinRepo.findOrCreate(athleteId);
    const athleteState = twin.state;

    // ── Step 2: Run the Reasoning Model (pure — no side effects) ─────────
    const output = runReasoningModel({
      trainingDayId,
      athleteId,
      athleteState,
    });

    // ── Step 3: Persist Decision Record ───────────────────────────────────
    const recordId = randomUUID();
    let decisionRecordId: string | null = recordId;
    let digitalTwinUpdated = false;

    const record: DecisionRecord = {
      id: recordId,
      athleteId,
      trainingDayId,
      modelId: 'reasoning-v1',
      modelVersion: 'v1',
      confidence: output.reasoningState.confidence,
      signals: output.signals as unknown as Record<string, unknown>,
      stateUpdate: {
        ...output.reasoningState,
        computedAt: output.reasoningState.computedAt.toISOString(),
      } as unknown as Record<string, unknown>,
      decision: {
        overallVerdict: output.reasoningState.overallVerdict,
        topAction: output.reasoningState.topAction,
      } as unknown as Record<string, unknown>,
      recommendation: {
        opportunities: output.reasoningState.opportunities,
        keyFindings: output.reasoningState.keyFindings,
      } as unknown as Record<string, unknown>,
      inputSummary: {
        trainingDayId,
        hasRecoveryState: output.signals.hasRecoveryState,
        hasFatigueState: output.signals.hasFatigueState,
        hasAdaptationState: output.signals.hasAdaptationState,
        availableModelCount: output.signals.availableModelCount,
      },
      computedAt,
      createdAt: computedAt,
    };

    try {
      await this.deps.decisionRecordRepo.save(record);
    } catch (err) {
      console.error('[ReasoningOrchestrator] Failed to persist DecisionRecord:', err);
      decisionRecordId = null;
    }

    // ── Step 4: Update Digital Twin ────────────────────────────────────────
    try {
      await this.deps.digitalTwinRepo.updateReasoning(athleteId, output.reasoningState);
      digitalTwinUpdated = true;
    } catch (err) {
      console.error('[ReasoningOrchestrator] Failed to update Digital Twin:', err);
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
   * Retrieve the current reasoning state without re-running inference.
   */
  async getLatest(
    athleteId: string,
    trainingDayId: string,
  ): Promise<ReasoningInferenceResult | null> {
    const record = await this.deps.decisionRecordRepo.findLatest(
      athleteId,
      'reasoning-v1',
      trainingDayId,
    );
    if (!record) return null;

    const stateUpdate = record.stateUpdate as Record<string, unknown>;
    const output: ReasoningModelOutput = {
      signals: record.signals as import('./reasoning/types').ReasoningSignals,
      reasoningState: {
        ...(stateUpdate as Omit<import('@/core/digital-twin/types').ReasoningState, 'computedAt'>),
        computedAt: new Date((stateUpdate.computedAt as string) ?? record.computedAt),
      } as import('@/core/digital-twin/types').ReasoningState,
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
