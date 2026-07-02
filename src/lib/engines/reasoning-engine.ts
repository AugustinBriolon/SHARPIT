/**
 * REASONING ENGINE — Singleton
 *
 * Wires the production infrastructure to the Reasoning Inference Orchestrator.
 * No FeatureEngine dependency — reads exclusively from the Digital Twin.
 *
 * Usage:
 *   import { reasoningEngine } from '@/lib/engines/reasoning-engine'
 *   const result = await reasoningEngine.run(athleteId, trainingDayId)
 */

import { ReasoningInferenceOrchestrator } from '@/core/inference/reasoning-orchestrator';
import { PrismaDigitalTwinRepository } from '@/infrastructure/digital-twin/prisma-digital-twin-repository';
import { PrismaDecisionRecordRepository } from '@/infrastructure/inference/prisma-decision-record-repository';
import { prisma } from '@/lib/prisma';

function createReasoningEngine(): ReasoningInferenceOrchestrator {
  const digitalTwinRepo = new PrismaDigitalTwinRepository(prisma);
  const decisionRecordRepo = new PrismaDecisionRecordRepository(prisma);

  return new ReasoningInferenceOrchestrator({
    digitalTwinRepo,
    decisionRecordRepo,
  });
}

let _reasoningEngine: ReasoningInferenceOrchestrator | null = null;

export function getReasoningEngine(): ReasoningInferenceOrchestrator {
  if (!_reasoningEngine) {
    _reasoningEngine = createReasoningEngine();
  }
  return _reasoningEngine;
}

export const reasoningEngine = {
  run: (athleteId: string, trainingDayId: string) =>
    getReasoningEngine().run(athleteId, trainingDayId),
  getLatest: (athleteId: string, trainingDayId: string) =>
    getReasoningEngine().getLatest(athleteId, trainingDayId),
};
