/**
 * PHYSICAL HEALTH ENGINE — Singleton
 */

import { PhysicalHealthInferenceOrchestrator } from '@sharpit/core/inference/physical-health-orchestrator';
import { PrismaDigitalTwinRepository } from '@sharpit/server/infrastructure/digital-twin/prisma-digital-twin-repository';
import { PrismaDecisionRecordRepository } from '@sharpit/server/infrastructure/inference/prisma-decision-record-repository';
import { PrismaConditionRepository } from '@sharpit/server/infrastructure/physical-health/prisma-condition-repository';
import { prisma } from '@sharpit/db/client';

function createPhysicalHealthEngine(): PhysicalHealthInferenceOrchestrator {
  return new PhysicalHealthInferenceOrchestrator({
    conditionRepo: new PrismaConditionRepository(prisma),
    digitalTwinRepo: new PrismaDigitalTwinRepository(prisma),
    decisionRecordRepo: new PrismaDecisionRecordRepository(prisma),
  });
}

let _engine: PhysicalHealthInferenceOrchestrator | null = null;

export function getPhysicalHealthEngine(): PhysicalHealthInferenceOrchestrator {
  if (!_engine) {
    _engine = createPhysicalHealthEngine();
  }
  return _engine;
}

export const physicalHealthEngine = {
  run: (athleteId: string, trainingDayId: string) =>
    getPhysicalHealthEngine().run(athleteId, trainingDayId),
  getLatest: (athleteId: string, trainingDayId: string) =>
    getPhysicalHealthEngine().getLatest(athleteId, trainingDayId),
};
