/**
 * ADAPTATION INTELLIGENCE — Singleton
 *
 * Wires the production infrastructure to the Adaptation Inference Orchestrator.
 *
 * Usage:
 *   import { adaptationEngine } from '@/lib/engines/adaptation-engine'
 *   const result = await adaptationEngine.run(athleteId, trainingDayId)
 */

import { AdaptationInferenceOrchestrator } from '@/core/inference/adaptation-orchestrator';
import { PrismaDigitalTwinRepository } from '@/infrastructure/digital-twin/prisma-digital-twin-repository';
import { PrismaDecisionRecordRepository } from '@/infrastructure/inference/prisma-decision-record-repository';
import { featureEngine } from '@/lib/engines/feature-engine';
import { prisma } from '@/lib/prisma';

function createAdaptationEngine(): AdaptationInferenceOrchestrator {
  const digitalTwinRepo = new PrismaDigitalTwinRepository(prisma);
  const decisionRecordRepo = new PrismaDecisionRecordRepository(prisma);

  return new AdaptationInferenceOrchestrator({
    featureEngine,
    digitalTwinRepo,
    decisionRecordRepo,
  });
}

let _adaptationEngine: AdaptationInferenceOrchestrator | null = null;

export function getAdaptationEngine(): AdaptationInferenceOrchestrator {
  if (!_adaptationEngine) {
    _adaptationEngine = createAdaptationEngine();
  }
  return _adaptationEngine;
}

export const adaptationEngine = {
  run: (athleteId: string, trainingDayId: string) =>
    getAdaptationEngine().run(athleteId, trainingDayId),
  getLatest: (athleteId: string, trainingDayId: string) =>
    getAdaptationEngine().getLatest(athleteId, trainingDayId),
};
