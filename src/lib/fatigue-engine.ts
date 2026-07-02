/**
 * FATIGUE INTELLIGENCE — Singleton
 *
 * Wires the production infrastructure to the Fatigue Inference Orchestrator.
 *
 * Usage:
 *   import { fatigueEngine } from '@/lib/fatigue-engine'
 *   const result = await fatigueEngine.run(athleteId, trainingDayId)
 */

import { FatigueInferenceOrchestrator } from '@/core/inference/fatigue-orchestrator';
import { PrismaDigitalTwinRepository } from '@/infrastructure/digital-twin/prisma-digital-twin-repository';
import { PrismaDecisionRecordRepository } from '@/infrastructure/inference/prisma-decision-record-repository';
import { featureEngine } from '@/lib/feature-engine';
import { prisma } from '@/lib/prisma';

function createFatigueEngine(): FatigueInferenceOrchestrator {
  const digitalTwinRepo = new PrismaDigitalTwinRepository(prisma);
  const decisionRecordRepo = new PrismaDecisionRecordRepository(prisma);

  return new FatigueInferenceOrchestrator({
    featureEngine,
    digitalTwinRepo,
    decisionRecordRepo,
  });
}

let _fatigueEngine: FatigueInferenceOrchestrator | null = null;

export function getFatigueEngine(): FatigueInferenceOrchestrator {
  if (!_fatigueEngine) {
    _fatigueEngine = createFatigueEngine();
  }
  return _fatigueEngine;
}

export const fatigueEngine = {
  run: (athleteId: string, trainingDayId: string) =>
    getFatigueEngine().run(athleteId, trainingDayId),
  getLatest: (athleteId: string, trainingDayId: string) =>
    getFatigueEngine().getLatest(athleteId, trainingDayId),
};
