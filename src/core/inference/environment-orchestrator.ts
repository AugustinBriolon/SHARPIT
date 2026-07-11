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
import { approximateTrainingDayUtcRange } from '@/lib/training-day';

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

    let records = await this.deps.observationRepo.findActiveForTrainingDay(
      athleteId,
      trainingDayId,
    );

    if (forceRefresh || records.length === 0) {
      const { gte: from, lte: to } = approximateTrainingDayUtcRange(trainingDayId);
      const outcome = await fetchAndIngestEnvironmentalRecords(this.deps.providerRegistry, {
        athleteId,
        location,
        from,
        to,
        trainingDayId,
      });
      if (outcome.records.length > 0) {
        await this.deps.observationRepo.saveMany(outcome.records);
        records = await this.deps.observationRepo.findActiveForTrainingDay(
          athleteId,
          trainingDayId,
        );
      }
    }

    const twinState = rebuildEnvironmentalTwinStateFromRecords({
      athleteId,
      trainingDayId,
      referenceAt,
      location,
      records,
      computedAt,
    });

    const recordId = randomUUID();
    let decisionRecordId: string | null = recordId;
    let digitalTwinUpdated = false;

    const record: DecisionRecord = {
      id: recordId,
      athleteId,
      trainingDayId,
      modelId: 'environment-v1.1',
      modelVersion: 'v1.1',
      confidence: twinState.meta.confidence,
      signals: {
        observationCount: records.length,
        dataCompleteness: twinState.meta.dataCompleteness,
      },
      stateUpdate: {
        stress: twinState.stress,
        impact: twinState.impact,
        meta: {
          ...twinState.meta,
          computedAt: twinState.meta.computedAt.toISOString(),
        },
      } as unknown as Record<string, unknown>,
      decision: {
        trainingImpact:
          twinState.impact.confidence > 0 ? 'ENVIRONMENT_ACTIVE' : 'ENVIRONMENT_SUPPRESSED',
      },
      recommendation: {
        hydrationDemandMultiplier: twinState.impact.hydration.demandMultiplier,
      } as unknown as Record<string, unknown>,
      inputSummary: {
        trainingDayId,
        observationRecordIds: twinState.meta.observationRecordIds,
        location,
      },
      computedAt,
      createdAt: computedAt,
    };

    try {
      await this.deps.decisionRecordRepo.save(record);
    } catch (err) {
      console.error('[EnvironmentOrchestrator] Failed to persist DecisionRecord:', err);
      decisionRecordId = null;
    }

    try {
      await this.deps.digitalTwinRepo.updateEnvironmentalState(athleteId, twinState);
      digitalTwinUpdated = true;
    } catch (err) {
      console.error('[EnvironmentOrchestrator] Failed to update Digital Twin:', err);
    }

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
    if (!cached || cached.meta.trainingDayId !== trainingDayId) return null;

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
