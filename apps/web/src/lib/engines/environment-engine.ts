/**
 * Environmental Context Engine — singleton (Phase 2).
 */

import { EnvironmentInferenceOrchestrator } from '@/core/inference/environment-orchestrator';
import { PrismaDigitalTwinRepository } from '@/infrastructure/digital-twin/prisma-digital-twin-repository';
import { PrismaDecisionRecordRepository } from '@/infrastructure/inference/prisma-decision-record-repository';
import { PrismaEnvironmentalObservationRepository } from '@/infrastructure/environment/prisma-environment-observation-repository';
import { createEnvironmentalProviderRegistry } from '@/lib/environment/environment-provider-registry';
import { resolveAthleteGeoLocation } from '@/lib/environment/athlete-location';
import { prisma } from '@/lib/prisma';

function createEnvironmentEngine(): EnvironmentInferenceOrchestrator {
  return new EnvironmentInferenceOrchestrator({
    observationRepo: new PrismaEnvironmentalObservationRepository(prisma),
    digitalTwinRepo: new PrismaDigitalTwinRepository(prisma),
    decisionRecordRepo: new PrismaDecisionRecordRepository(prisma),
    providerRegistry: createEnvironmentalProviderRegistry(),
    resolveLocation: (athleteId, trainingDayId) =>
      resolveAthleteGeoLocation(prisma, athleteId, trainingDayId),
  });
}

let _engine: EnvironmentInferenceOrchestrator | null = null;

export function getEnvironmentEngine(): EnvironmentInferenceOrchestrator {
  if (!_engine) {
    _engine = createEnvironmentEngine();
  }
  return _engine;
}

export const environmentEngine = {
  run: (athleteId: string, trainingDayId: string, options?: { forceRefresh?: boolean }) =>
    getEnvironmentEngine().run(athleteId, trainingDayId, options),
  getLatest: (athleteId: string, trainingDayId: string) =>
    getEnvironmentEngine().getLatest(athleteId, trainingDayId),
  rebuildFromObservations: (athleteId: string, trainingDayId: string) =>
    getEnvironmentEngine().rebuildFromObservations(athleteId, trainingDayId),
};
