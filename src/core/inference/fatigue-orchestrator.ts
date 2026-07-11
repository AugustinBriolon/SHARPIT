/**
 * FATIGUE INTELLIGENCE ORCHESTRATOR
 *
 * Connects the Feature Engine, Fatigue Model, Digital Twin, and Decision Records
 * into a single end-to-end inference pipeline for fatigue.
 *
 * Pipeline for one training day:
 *   1. Resolve DayFeatures from the FeatureEngine
 *   2. Read previous FatigueState + RecoveryState from Digital Twin
 *   3. Reconstruct fatigue history (consecutive accumulation days + recent indices)
 *   4. Run the Fatigue Model (pure function → no side effects)
 *   5. Persist the Decision Record (immutable audit trail)
 *   6. Update the Digital Twin with the new FatigueState
 *   7. Return the full result to the caller
 *
 * The orchestrator handles all side effects.
 * The Fatigue Model itself is pure (no database calls, no randomness).
 *
 * Error handling: steps 5-6 failures are non-fatal — inference result is
 * returned regardless of persistence failures.
 */

import { randomUUID } from 'node:crypto';

import type { FeatureEngine } from '@/core/features/engine';
import type { DigitalTwinRepository } from '@/core/digital-twin/repository';
import type { DecisionRecordRepository } from './types';

import { runFatigueModel } from './fatigue/model';
import type { FatigueModelOutput, FatigueModelContext } from './fatigue/types';
import type { DecisionRecord } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Result type
// ─────────────────────────────────────────────────────────────────────────────

export type FatigueInferenceResult = {
  readonly athleteId: string;
  readonly trainingDayId: string;
  readonly output: FatigueModelOutput;
  readonly decisionRecordId: string | null;
  readonly digitalTwinUpdated: boolean;
  readonly computedAt: Date;
};

// ─────────────────────────────────────────────────────────────────────────────
// Input summary builder
// ─────────────────────────────────────────────────────────────────────────────

function buildInputSummary(
  features: import('@/core/features/types').DayFeatures,
  context: FatigueModelContext,
): Record<string, unknown> {
  const load = features.load !== 'PENDING' ? features.load : null;
  const recovery = features.recovery !== 'PENDING' ? features.recovery : null;

  return {
    trainingDayId: features.trainingDayId,
    load: load
      ? {
          acwr: load.acwr,
          acuteLoad: load.acuteLoad,
          chronicLoad: load.chronicLoad,
          loadMonotony: load.loadMonotony,
          confidence: load.confidence,
        }
      : null,
    recovery: recovery
      ? {
          sleepDebtMin: recovery.sleepDebtMin,
          subjectiveWellnessIndex: recovery.subjectiveWellnessIndex,
          confidence: recovery.confidence,
        }
      : null,
    sessionCount: features.sessions.length,
    consecutiveAccumulationDays: context.consecutiveAccumulationDays,
    recentHistoryLength: context.recentFatigueHistory.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Orchestrator
// ─────────────────────────────────────────────────────────────────────────────

export type FatigueOrchestratorDeps = {
  featureEngine: FeatureEngine;
  digitalTwinRepo: DigitalTwinRepository;
  decisionRecordRepo: DecisionRecordRepository;
};

export class FatigueInferenceOrchestrator {
  constructor(private readonly deps: FatigueOrchestratorDeps) {}

  /**
   * Run the complete Fatigue Inference pipeline for one training day.
   */
  async run(athleteId: string, trainingDayId: string): Promise<FatigueInferenceResult> {
    const computedAt = new Date();

    // ── Step 1: Get DayFeatures ────────────────────────────────────────────
    const [features, previousFatigueState, environmentalImpact] = await Promise.all([
      this.deps.featureEngine.getDayFeatures(athleteId, trainingDayId),
      this.deps.digitalTwinRepo.getPreviousFatigueState(athleteId),
      this.deps.digitalTwinRepo.getEnvironmentalImpact(athleteId),
    ]);

    // ── Step 2: Get context from Digital Twin ──────────────────────────────
    const recoveryState = (await this.deps.digitalTwinRepo.findOrCreate(athleteId)).state.recovery;

    // ── Step 3: Reconstruct fatigue history from Decision Records ──────────
    const { consecutiveAccumulationDays, recentFatigueHistory } = await this.buildFatigueHistory(
      athleteId,
      previousFatigueState,
    );

    const context: FatigueModelContext = {
      athleteId,
      trainingDayId,
      recoveryState,
      consecutiveAccumulationDays,
      recentFatigueHistory,
      environmentalImpact,
    };

    // ── Step 4: Run the Fatigue Model (pure — no side effects) ────────────
    const output = runFatigueModel(features, context);

    // ── Step 5: Persist Decision Record ───────────────────────────────────
    const recordId = randomUUID();
    let decisionRecordId: string | null = recordId;
    let digitalTwinUpdated = false;

    const record: DecisionRecord = {
      id: recordId,
      athleteId,
      trainingDayId,
      modelId: 'fatigue-v1',
      modelVersion: 'v1',
      confidence: output.fatigueState.confidence,
      signals: output.signals as unknown as Record<string, unknown>,
      stateUpdate: {
        ...output.fatigueState,
        computedAt: output.fatigueState.computedAt.toISOString(),
      } as unknown as Record<string, unknown>,
      decision: output.decision as unknown as Record<string, unknown>,
      recommendation: output.recommendation as unknown as Record<string, unknown>,
      inputSummary: buildInputSummary(features, context),
      computedAt,
      createdAt: computedAt,
    };

    try {
      await this.deps.decisionRecordRepo.save(record);
    } catch (err) {
      console.error('[FatigueOrchestrator] Failed to persist DecisionRecord:', err);
      decisionRecordId = null;
    }

    // ── Step 6: Update Digital Twin ────────────────────────────────────────
    try {
      await this.deps.digitalTwinRepo.updateFatigue(athleteId, output.fatigueState);
      digitalTwinUpdated = true;
    } catch (err) {
      console.error('[FatigueOrchestrator] Failed to update Digital Twin:', err);
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
   * Retrieve the current fatigue state without re-running inference.
   */
  async getLatest(
    athleteId: string,
    trainingDayId: string,
  ): Promise<FatigueInferenceResult | null> {
    const record = await this.deps.decisionRecordRepo.findLatest(
      athleteId,
      'fatigue-v1',
      trainingDayId,
    );
    if (!record) return null;

    const output: FatigueModelOutput = {
      signals: record.signals as import('./fatigue/types').FatigueSignals,
      fatigueState: {
        ...(record.stateUpdate as Omit<import('./fatigue/types').FatigueState, 'computedAt'>),
        computedAt: new Date(
          (record.stateUpdate as { computedAt: string }).computedAt ?? record.computedAt,
        ),
      } as import('./fatigue/types').FatigueState,
      decision: record.decision as import('./fatigue/types').FatigueDecision,
      recommendation: record.recommendation as import('./fatigue/types').FatigueRecommendation,
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

  // ─────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Reconstruct fatigue history context from Decision Records.
   * Queries the last 14 fatigue Decision Records to build the context arrays
   * needed by the Fatigue Model's CumulativeTrajectory dimension.
   */
  private async buildFatigueHistory(
    athleteId: string,
    previousFatigueState: import('./fatigue/types').FatigueState | null,
  ): Promise<{
    consecutiveAccumulationDays: number;
    recentFatigueHistory: readonly number[];
  }> {
    const ACCUMULATION_THRESHOLD = 55;

    // Load the last 14 Decision Records for this model
    let records: Array<{
      stateUpdate: Record<string, unknown>;
    }> = [];

    try {
      records = (await this.deps.decisionRecordRepo.findRecent(
        athleteId,
        'fatigue-v1',
        14,
      )) as typeof records;
    } catch {
      // findRecent might not be implemented — fall back to previousFatigueState only
    }

    if (records.length === 0 && previousFatigueState) {
      // Minimal cold-start: use previous state index only
      const idx = previousFatigueState.fatigueIndex;
      if (idx !== null) {
        return {
          consecutiveAccumulationDays: idx > ACCUMULATION_THRESHOLD ? 1 : 0,
          recentFatigueHistory: [idx],
        };
      }
    }

    // Build history from records (most recent first)
    const history: number[] = [];
    for (const r of records) {
      const idx = (r.stateUpdate as { fatigueIndex?: number | null }).fatigueIndex;
      if (idx !== null && idx !== undefined) history.push(idx);
    }

    // Count consecutive accumulation days from the start of history
    let consecutiveAccumulationDays = 0;
    for (const v of history) {
      if (v > ACCUMULATION_THRESHOLD) consecutiveAccumulationDays++;
      else break;
    }

    return { consecutiveAccumulationDays, recentFatigueHistory: history };
  }
}
