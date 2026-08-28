/**
 * ENVIRONMENT INFERENCE ORCHESTRATOR (Phase 2)
 *
 * Pipeline:
 *   1. Load / fetch environmental observation records (immutable evidence)
 *   2. Build TodayEnvironment via frozen environment-v1.1 API
 *   3. Persist DecisionRecord
 *   4. Update Digital Twin environmental cache (stress + impact + meta)
 *
 * Twin state is rebuildable from observations at any time.
 */

import { randomUUID } from 'node:crypto';

import { buildTodayEnvironment, fetchAndIngestEnvironmentalRecords } from '@/core/environment';
import type { EnvironmentalObservationRecord } from '@/core/environment';
import type { DigitalTwinRepository } from '@/core/digital-twin/repository';
import type { DecisionRecord, DecisionRecordRepository } from '@/core/inference/types';
import type { EnvironmentalObservationRepository } from '@/core/inference/environment/repository';
import type {
  EnvironmentalModelOutput,
  EnvironmentalTwinState,
} from '@/core/inference/environment/types';
import type { EnvironmentalProviderRegistry } from '@/core/environment/provider';
import type { GeoLocation } from '@/core/environment';
import { approximateTrainingDayUtcRange } from '@/lib/training/training-day';

export type EnvironmentInferenceResult = {
  readonly athleteId: string;
  readonly trainingDayId: string;
  readonly output: EnvironmentalModelOutput;
  readonly decisionRecordId: string | null;
  readonly digitalTwinUpdated: boolean;
  readonly computedAt: Date;
};

export type EnvironmentOrchestratorDeps = {
  observationRepo: EnvironmentalObservationRepository;
  digitalTwinRepo: DigitalTwinRepository;
  decisionRecordRepo: DecisionRecordRepository;
  providerRegistry: EnvironmentalProviderRegistry;
  resolveLocation: (athleteId: string, trainingDayId: string) => Promise<GeoLocation>;
};

function buildTwinState(
  trainingDayId: string,
  todayEnvironment: ReturnType<typeof buildTodayEnvironment>,
  computedAt: Date,
): EnvironmentalTwinState {
  return {
    stress: todayEnvironment.stress,
    impact: todayEnvironment.impact,
    meta: {
      trainingDayId,
      observationRecordIds: todayEnvironment.records.map((r) => r.id),
      confidence: todayEnvironment.confidence,
      dataCompleteness: todayEnvironment.dataCompleteness,
      computedAt,
      modelId: 'environment-v1.1',
    },
  };
}

export function rebuildEnvironmentalTwinStateFromRecords(input: {
  athleteId: string;
  trainingDayId: string;
  referenceAt: Date;
  location: GeoLocation;
  records: readonly EnvironmentalObservationRecord[];
  computedAt?: Date;
}): EnvironmentalTwinState {
  const computedAt = input.computedAt ?? new Date();
  const todayEnvironment = buildTodayEnvironment({
    athleteId: input.athleteId,
    trainingDayId: input.trainingDayId,
    referenceAt: input.referenceAt,
    location: input.location,
    records: input.records,
    computedAt,
  });
  return buildTwinState(input.trainingDayId, todayEnvironment, computedAt);
}

async function refreshEnvironmentalRecordsIfNeeded(
  deps: EnvironmentOrchestratorDeps,
  input: {
    athleteId: string;
    trainingDayId: string;
    location: GeoLocation;
    forceRefresh: boolean;
    records: readonly EnvironmentalObservationRecord[];
  },
): Promise<readonly EnvironmentalObservationRecord[]> {
  if (!input.forceRefresh && input.records.length > 0) {
    return input.records;
  }

  const { gte: from, lte: to } = approximateTrainingDayUtcRange(input.trainingDayId);
  const outcome = await fetchAndIngestEnvironmentalRecords(deps.providerRegistry, {
    athleteId: input.athleteId,
    location: input.location,
    from,
    to,
    trainingDayId: input.trainingDayId,
  });
  if (outcome.records.length === 0) {
    return input.records;
  }

  await deps.observationRepo.saveMany(outcome.records);
  return deps.observationRepo.findActiveForTrainingDay(input.athleteId, input.trainingDayId);
}

function buildEnvironmentDecisionRecord(input: {
  recordId: string;
  athleteId: string;
  trainingDayId: string;
  twinState: EnvironmentalTwinState;
  records: readonly EnvironmentalObservationRecord[];
  location: GeoLocation;
  computedAt: Date;
}): DecisionRecord {
  return {
    id: input.recordId,
    athleteId: input.athleteId,
    trainingDayId: input.trainingDayId,
    modelId: 'environment-v1.1',
    modelVersion: 'v1.1',
    confidence: input.twinState.meta.confidence,
    signals: {
      observationCount: input.records.length,
      dataCompleteness: input.twinState.meta.dataCompleteness,
    },
    stateUpdate: {
      stress: input.twinState.stress,
      impact: input.twinState.impact,
      meta: {
        ...input.twinState.meta,
        computedAt: input.twinState.meta.computedAt.toISOString(),
      },
    } as unknown as Record<string, unknown>,
    decision: {
      trainingImpact:
        input.twinState.impact.confidence > 0 ? 'ENVIRONMENT_ACTIVE' : 'ENVIRONMENT_SUPPRESSED',
    },
    recommendation: {
      hydrationDemandMultiplier: input.twinState.impact.hydration.demandMultiplier,
    } as unknown as Record<string, unknown>,
    inputSummary: {
      trainingDayId: input.trainingDayId,
      observationRecordIds: input.twinState.meta.observationRecordIds,
      location: input.location,
    },
    computedAt: input.computedAt,
    createdAt: input.computedAt,
  };
}

async function persistEnvironmentInferenceOutputs(
  deps: EnvironmentOrchestratorDeps,
  input: {
    athleteId: string;
    record: DecisionRecord;
    twinState: EnvironmentalTwinState;
    recordId: string;
  },
): Promise<{ decisionRecordId: string | null; digitalTwinUpdated: boolean }> {
  let decisionRecordId: string | null = input.recordId;
  let digitalTwinUpdated = false;

  try {
    await deps.decisionRecordRepo.save(input.record);
  } catch (err) {
    console.error('[EnvironmentOrchestrator] Failed to persist DecisionRecord:', err);
    decisionRecordId = null;
  }

  try {
    await deps.digitalTwinRepo.updateEnvironmentalState(input.athleteId, input.twinState);
    digitalTwinUpdated = true;
  } catch (err) {
    console.error('[EnvironmentOrchestrator] Failed to update Digital Twin:', err);
  }

  return { decisionRecordId, digitalTwinUpdated };
}

export class EnvironmentInferenceOrchestrator {
  constructor(private readonly deps: EnvironmentOrchestratorDeps) {}

  async run(
    athleteId: string,
    trainingDayId: string,
    options?: { forceRefresh?: boolean },
  ): Promise<EnvironmentInferenceResult> {
    const computedAt = new Date();
    const forceRefresh = options?.forceRefresh ?? false;
    const location = await this.deps.resolveLocation(athleteId, trainingDayId);
    const referenceAt = new Date(`${trainingDayId}T12:00:00.000Z`);

    const initialRecords = await this.deps.observationRepo.findActiveForTrainingDay(
      athleteId,
      trainingDayId,
    );
    const records = await refreshEnvironmentalRecordsIfNeeded(this.deps, {
      athleteId,
      trainingDayId,
      location,
      forceRefresh,
      records: initialRecords,
    });

    const twinState = rebuildEnvironmentalTwinStateFromRecords({
      athleteId,
      trainingDayId,
      referenceAt,
      location,
      records,
      computedAt,
    });

    const recordId = randomUUID();
    const record = buildEnvironmentDecisionRecord({
      recordId,
      athleteId,
      trainingDayId,
      twinState,
      records,
      location,
      computedAt,
    });
    const { decisionRecordId, digitalTwinUpdated } = await persistEnvironmentInferenceOutputs(
      this.deps,
      { athleteId, record, twinState, recordId },
    );

    return {
      athleteId,
      trainingDayId,
      output: {
        stress: twinState.stress,
        impact: twinState.impact,
        meta: twinState.meta,
      },
      decisionRecordId,
      digitalTwinUpdated,
      computedAt,
    };
  }

  async rebuildFromObservations(
    athleteId: string,
    trainingDayId: string,
  ): Promise<EnvironmentalTwinState> {
    const location = await this.deps.resolveLocation(athleteId, trainingDayId);
    const records = await this.deps.observationRepo.findActiveForTrainingDay(
      athleteId,
      trainingDayId,
    );
    return rebuildEnvironmentalTwinStateFromRecords({
      athleteId,
      trainingDayId,
      referenceAt: new Date(`${trainingDayId}T12:00:00.000Z`),
      location,
      records,
    });
  }

  async getLatest(
    athleteId: string,
    trainingDayId: string,
  ): Promise<EnvironmentInferenceResult | null> {
    const cached = await this.deps.digitalTwinRepo.getEnvironmentalState(athleteId);
    if (!cached || cached.meta.trainingDayId !== trainingDayId) {
      return null;
    }

    return {
      athleteId,
      trainingDayId,
      output: {
        stress: cached.stress,
        impact: cached.impact,
        meta: cached.meta,
      },
      decisionRecordId: null,
      digitalTwinUpdated: true,
      computedAt: cached.meta.computedAt,
    };
  }
}
